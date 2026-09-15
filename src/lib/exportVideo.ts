import type { VideoExportFormat, ExportProgress, FlipState, Rotation, TrimRange, VideoQualityProfile, VideoResolutionOption } from '@/types';
import { pickSupportedMimeType, mimeToExtension } from './pickMimeType';

export interface ExportOptions {
  source: HTMLVideoElement;
  trim: TrimRange;
  rotation: Rotation;
  flip?: FlipState;
  format?: VideoExportFormat;
  quality?: VideoQualityProfile;
  resolution?: VideoResolutionOption;
  onProgress?: (p: ExportProgress) => void;
  signal?: AbortSignal;
}

export interface ExportResult {
  blob: Blob;
  url: string;
  extension: string;
  mimeType: string;
}

const BITRATES: Record<VideoQualityProfile, number> = {
  compressed: 3_000_000,
  balanced: 6_500_000,
  high: 14_000_000,
};

function computeTargetDimensions(
  w: number,
  h: number,
  rotation: Rotation,
  resolution: VideoResolutionOption = 'original',
) {
  const { width: rawW, height: rawH } = computeRotatedDimensions(w, h, rotation);
  if (resolution === 'original') return { width: rawW, height: rawH };

  let maxDim = Infinity;
  if (resolution === '1080p') maxDim = 1080;
  else if (resolution === '720p') maxDim = 720;
  else if (resolution === '480p') maxDim = 480;

  const minRawDim = Math.min(rawW, rawH);
  if (minRawDim > maxDim) {
    const scale = maxDim / minRawDim;
    const cw = Math.round((rawW * scale) / 2) * 2;
    const ch = Math.round((rawH * scale) / 2) * 2;
    return { width: cw, height: ch };
  }

  return { width: rawW, height: rawH };
}

function getSourceVideoFps(video: HTMLVideoElement): number {
  try {
    const stream = (video as HTMLVideoElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    }).captureStream?.() || (video as HTMLVideoElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    }).mozCaptureStream?.();
    if (stream) {
      const tracks = stream.getVideoTracks();
      if (tracks.length > 0) {
        const frameRate = tracks[0].getSettings().frameRate;
        if (frameRate && frameRate > 0) {
          return frameRate;
        }
      }
    }
  } catch {
    /* ignore */
  }
  return 30; // fallback por defecto
}

export async function exportVideo(opts: ExportOptions): Promise<ExportResult> {
  const { source, trim, rotation, flip, format = 'mp4', quality = 'balanced', resolution = 'original', onProgress, signal } = opts;
  const mimeType = pickSupportedMimeType(format as VideoExportFormat);

  const fps = getSourceVideoFps(source);

  onProgress?.({ phase: 'preparing', fraction: 0 });

  const { width: cw, height: ch } = computeTargetDimensions(
    source.videoWidth,
    source.videoHeight,
    rotation,
    resolution,
  );
  if (cw === 0 || ch === 0) {
    throw new Error('El video no tiene dimensiones válidas.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el contexto de canvas.');

  const stream = canvas.captureStream(fps);

  let audioContext: AudioContext | null = null;
  const audioStreams = captureVideoStream(source);

  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
      const audioSource = audioContext.createMediaElementSource(source);
      const audioDest = audioContext.createMediaStreamDestination();
      audioSource.connect(audioDest);
      for (const track of audioDest.stream.getAudioTracks()) {
        stream.addTrack(track);
      }
    } else {
      for (const s of audioStreams) {
        for (const t of s.getAudioTracks()) stream.addTrack(t);
      }
    }
  } catch {
    // Fallback if MediaElementSource is already connected or unsupported
    for (const s of audioStreams) {
      for (const t of s.getAudioTracks()) stream.addTrack(t);
    }
  }

  const recorderOptions: MediaRecorderOptions = {};
  if (MediaRecorder.isTypeSupported(mimeType)) {
    recorderOptions.mimeType = mimeType;
  }
  recorderOptions.videoBitsPerSecond = BITRATES[quality] ?? BITRATES.balanced;

  const recorder = new MediaRecorder(stream, recorderOptions);


  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  let recorderError: Error | null = null;
  const done = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => {
      if (recorderError) reject(recorderError);
      else resolve();
    };
    recorder.onerror = (e) => {
      const errorEvent = e as unknown as { error?: { message?: string }; message?: string };
      const errMessage = errorEvent.error?.message || errorEvent.message || 'Error desconocido del codificador';
      recorderError = new Error('Error de grabación: ' + errMessage);
      reject(recorderError);
    };
  });

  onProgress?.({ phase: 'rendering', fraction: 0 });

  const start = Math.max(0, trim.start);
  const end = Math.min(source.duration || trim.end, trim.end);
  const duration = Math.max(0, end - start);
  if (duration <= 0) throw new Error('El rango de corte no es válido.');

  const playbackRate = source.playbackRate || 1;
  const effectiveDuration = duration / playbackRate;

  const originalMuted = source.muted;
  if (!audioContext) {
    source.muted = true;
  }

  await seekTo(source, start);

  recorder.start(250);

  let aborted = false;
  const onAbort = () => {
    aborted = true;
    try {
      if (recorder.state !== 'inactive') recorder.stop();
    } catch {
      /* ignore */
    }
  };
  signal?.addEventListener('abort', onAbort);

  try {
    await source.play();
  } catch {
    /* ignore autoplay restrictions if any */
  }

  const startTimeMs = performance.now();

  await new Promise<void>((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      clearInterval(fallbackTimer);
      onProgress?.({ phase: 'rendering', fraction: 1 });
      resolve();
    };

    const fallbackTimer = setInterval(() => {
      const elapsed = (performance.now() - startTimeMs) / 1000;
      if (source.currentTime >= end - 0.05 || elapsed >= effectiveDuration + 0.3 || source.ended || aborted) {
        finish();
      }
    }, 200);

    const renderFrame = () => {
      if (aborted || resolved) return;

      const elapsed = (performance.now() - startTimeMs) / 1000;
      const currentVideoTime = source.currentTime;

      drawFrame(ctx, source, rotation, flip, cw, ch);

      const fraction = Math.min(1, Math.max(0, elapsed / effectiveDuration));
      onProgress?.({ phase: 'rendering', fraction });

      if (currentVideoTime >= end - 0.05 || elapsed >= effectiveDuration + 0.3 || source.ended) {
        finish();
        return;
      }

      setTimeout(renderFrame, 1000 / fps);
    };

    setTimeout(renderFrame, 1000 / fps);
  });


  signal?.removeEventListener('abort', onAbort);

  try {
    source.pause();
    source.muted = originalMuted;
  } catch {
    /* ignore */
  }

  onProgress?.({ phase: 'finalizing', fraction: 1 });

  if (recorder.state !== 'inactive') {
    try {
      recorder.requestData();
    } catch {
      /* ignore */
    }
    try {
      recorder.stop();
    } catch {
      /* ignore */
    }
  }

  // Wait for onstop with 1.5s max fallback timeout so it never hangs
  await Promise.race([
    done,
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]);

  stream.getTracks().forEach((t) => t.stop());
  audioStreams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
  try {
    audioContext?.close();
  } catch {
    /* ignore */
  }

  const rawMime = recorder.mimeType || mimeType;
  const cleanMime = rawMime.split(';')[0]; // e.g. "video/webm" or "video/mp4"
  const finalExtension = mimeToExtension(rawMime);

  let blob = new Blob(chunks, { type: cleanMime });
  if (blob.size === 0) {
    throw new Error('No se pudieron capturar los datos del video exportado.');
  }

  // Repair WebM metadata so that the video is seekable in native players (like Windows Media Player)
  if (cleanMime.includes('webm')) {
    try {
      const durationMs = effectiveDuration * 1000;
      const ysFixWebmDuration = (await import('fix-webm-duration')).default;
      blob = await new Promise<Blob>((resolve) => {
        ysFixWebmDuration(blob, durationMs, (fixed) => {
          resolve(fixed);
        });
      });
    } catch (err) {
      console.error('Error fixing WebM duration metadata:', err);
    }
  }

  const url = URL.createObjectURL(blob);
  onProgress?.({ phase: 'done', fraction: 1 });
  return { blob, url, extension: finalExtension, mimeType: cleanMime };
}

function computeRotatedDimensions(w: number, h: number, rotation: Rotation) {
  return rotation === 90 || rotation === 270
    ? { width: h, height: w }
    : { width: w, height: h };
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  rotation: Rotation,
  flip: FlipState | undefined,
  cw: number,
  ch: number,
) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cw, ch);
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  if (flip) {
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  }
  ctx.drawImage(video, -video.videoWidth / 2, -video.videoHeight / 2);
  ctx.restore();
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = time;
  });
}

function captureVideoStream(video: HTMLVideoElement): MediaStream[] {
  const streams: MediaStream[] = [];
  try {
    const anyVideo = video as HTMLVideoElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    };
    const v = anyVideo.captureStream?.();
    if (v) streams.push(v);
    const m = anyVideo.mozCaptureStream?.();
    if (m) streams.push(m);
  } catch {
    /* ignore */
  }
  return streams;
}
