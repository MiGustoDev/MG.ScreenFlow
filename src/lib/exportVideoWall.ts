import type { VideoExportFormat, ExportProgress, FlipState, Rotation, TrimRange, VideoWallLayout } from '@/types';
import { pickSupportedMimeType, mimeToExtension } from './pickMimeType';

export interface ExportVideoWallOptions {
  source: HTMLVideoElement;
  trim: TrimRange;
  rotation: Rotation;
  flip?: FlipState;
  format?: VideoExportFormat;
  layout: VideoWallLayout;
  onProgress?: (p: ExportProgress) => void;
  signal?: AbortSignal;
}

export interface ExportResult {
  blob: Blob;
  url: string;
  extension: string;
  mimeType: string;
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
        if (frameRate && frameRate > 0) return frameRate;
      }
    }
  } catch { /* ignore */ }
  return 30;
}

function computeRotatedDimensions(w: number, h: number, rotation: Rotation) {
  return rotation === 90 || rotation === 270
    ? { width: h, height: w }
    : { width: w, height: h };
}

/**
 * Dibuja un frame del video wall.
 *
 * Lógica:
 * 1. Se renderiza el video completo (con rotación y flip) en un canvas offscreen
 *    del mismo tamaño que el canvas final.
 * 2. Cada celda (col, row) del grid extrae el CROP que le corresponde
 *    del canvas offscreen y lo dibuja en su posición en el canvas final.
 *
 * El resultado es el video PARTIDO en tiles, no replicado.
 * Un pequeño gap negro entre celdas simula los marcos físicos de un video wall real.
 */
function drawWallFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  rotation: Rotation,
  flip: FlipState | undefined,
  canvasW: number,
  canvasH: number,
  cols: number,
  rows: number,
) {
  // ── 1. Renderizar el video completo a un canvas offscreen ──────────────────
  const offscreen = document.createElement('canvas');
  offscreen.width = canvasW;
  offscreen.height = canvasH;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  offCtx.fillStyle = '#000';
  offCtx.fillRect(0, 0, canvasW, canvasH);
  offCtx.save();
  offCtx.translate(canvasW / 2, canvasH / 2);
  offCtx.rotate((rotation * Math.PI) / 180);
  if (flip) {
    offCtx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  }
  // Dibujar el video escalado al tamaño total del canvas
  offCtx.drawImage(video, -canvasW / 2, -canvasH / 2, canvasW, canvasH);
  offCtx.restore();

  // ── 2. Copiar cada tile al canvas final ────────────────────────────────────
  // Gap en píxeles entre celdas para simular los marcos físicos del video wall
  const GAP = Math.max(2, Math.round(Math.min(canvasW, canvasH) * 0.004));
  const totalGapX = GAP * (cols - 1);
  const totalGapY = GAP * (rows - 1);
  const cellW = (canvasW - totalGapX) / cols;
  const cellH = (canvasH - totalGapY) / rows;

  // Fondo negro (gaps quedan en negro)
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasW, canvasH);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Posición destino en el canvas final
      const destX = col * (cellW + GAP);
      const destY = row * (cellH + GAP);

      // Posición fuente en el offscreen: cada celda extrae su porción proporcional
      // (sin gap — el offscreen tiene el video continuo sin gaps)
      const srcX = col * (canvasW / cols);
      const srcY = row * (canvasH / rows);
      const srcW = canvasW / cols;
      const srcH = canvasH / rows;

      ctx.drawImage(offscreen, srcX, srcY, srcW, srcH, destX, destY, cellW, cellH);
    }
  }
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
  } catch { /* ignore */ }
  return streams;
}

export async function exportVideoWall(opts: ExportVideoWallOptions): Promise<ExportResult> {
  const { source, trim, rotation, flip, format = 'mp4', layout, onProgress, signal } = opts;
  const { cols, rows } = layout;

  const mimeType = pickSupportedMimeType(format);

  onProgress?.({ phase: 'preparing', fraction: 0 });

  // El canvas de salida tiene las mismas dimensiones que el video (con rotación aplicada)
  const { width: canvasW, height: canvasH } = computeRotatedDimensions(
    source.videoWidth,
    source.videoHeight,
    rotation,
  );
  if (canvasW === 0 || canvasH === 0) throw new Error('El video no tiene dimensiones válidas.');

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el contexto de canvas.');

  const fps = getSourceVideoFps(source);
  const stream = canvas.captureStream(fps);

  // Agregar audio
  const audioStreams = captureVideoStream(source);
  for (const s of audioStreams) {
    for (const t of s.getAudioTracks()) stream.addTrack(t);
  }

  const recorderOptions: MediaRecorderOptions = {};
  if (MediaRecorder.isTypeSupported(mimeType)) {
    recorderOptions.mimeType = mimeType;
  }
  recorderOptions.videoBitsPerSecond = 10_000_000;

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
      const errorEvent = e as unknown as { error?: { message?: string } };
      const msg = errorEvent.error?.message || 'Error desconocido del codificador';
      recorderError = new Error('Error de grabación: ' + msg);
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
  source.muted = true;
  await seekTo(source, start);

  recorder.start(250);

  let aborted = false;
  const onAbort = () => {
    aborted = true;
    try { if (recorder.state !== 'inactive') recorder.stop(); } catch { /* ignore */ }
  };
  signal?.addEventListener('abort', onAbort);

  try { await source.play(); } catch { /* ignore autoplay */ }

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

      drawWallFrame(ctx, source, rotation, flip, canvasW, canvasH, cols, rows);

      const fraction = Math.min(1, Math.max(0, elapsed / effectiveDuration));
      onProgress?.({ phase: 'rendering', fraction });

      if (source.currentTime >= end - 0.05 || elapsed >= effectiveDuration + 0.3 || source.ended) {
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
  } catch { /* ignore */ }

  onProgress?.({ phase: 'finalizing', fraction: 1 });

  if (recorder.state !== 'inactive') {
    try { recorder.requestData(); } catch { /* ignore */ }
    try { recorder.stop(); } catch { /* ignore */ }
  }

  await Promise.race([
    done,
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]);

  stream.getTracks().forEach((t) => t.stop());
  audioStreams.forEach((s) => s.getTracks().forEach((t) => t.stop()));

  const rawMime = recorder.mimeType || mimeType;
  const cleanMime = rawMime.split(';')[0];
  const finalExtension = mimeToExtension(rawMime);

  let blob = new Blob(chunks, { type: cleanMime });
  if (blob.size === 0) throw new Error('No se pudieron capturar los datos del video wall exportado.');

  if (cleanMime.includes('webm')) {
    try {
      const durationMs = effectiveDuration * 1000;
      const fixWebm = (await import('fix-webm-duration')).default;
      blob = await new Promise<Blob>((resolve) => {
        fixWebm(blob, durationMs, (fixed) => resolve(fixed));
      });
    } catch (err) {
      console.error('Error fixing WebM duration metadata:', err);
    }
  }

  const url = URL.createObjectURL(blob);
  onProgress?.({ phase: 'done', fraction: 1 });
  return { blob, url, extension: finalExtension, mimeType: cleanMime };
}
