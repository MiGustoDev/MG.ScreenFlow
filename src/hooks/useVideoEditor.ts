import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  EditorStatus,
  ExportFormat,
  ExportProgress,
  FlipState,
  Rotation,
  TrimRange,
  VideoMeta,
  EditorHistoryEntry,
  VideoWallLayout,
} from '@/types';
import { clamp } from '@/lib/format';
import { exportVideo } from '@/lib/exportVideo';
import { exportVideoWall } from '@/lib/exportVideoWall';
import { exportImage, exportImageWall } from '@/lib/exportImage';
import { generateThumbnails } from '@/lib/generateThumbnails';

const MIN_TRIM_SECONDS = 0.1;

export interface UseVideoEditor {
  videoRef: React.RefObject<HTMLVideoElement>;
  imageRef: React.RefObject<HTMLImageElement>;
  status: EditorStatus;
  error: string | null;
  objectUrl: string | null;
  meta: VideoMeta | null;
  rotation: Rotation;
  flip: FlipState;
  trim: TrimRange;
  currentTime: number;
  isPlaying: boolean;
  exportFormat: ExportFormat;
  exportProgress: ExportProgress | null;
  exportUrl: string | null;
  exportName: string | null;
  volume: number;
  isMuted: boolean;
  playbackSpeed: number;
  canUndo: boolean;
  canRedo: boolean;
  wallLayout: VideoWallLayout | null;
  loadFile: (file: File) => void;
  reset: () => void;
  rotate: (delta: 90 | 180 | 270) => void;
  resetRotation: () => void;
  toggleFlipHorizontal: () => void;
  toggleFlipVertical: () => void;
  setTrim: (trim: TrimRange) => void;
  commitTrim: () => void;
  setExportFormat: (format: ExportFormat) => void;
  setWallLayout: (layout: VideoWallLayout | null) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackSpeed: (speed: number) => void;
  undo: () => void;
  redo: () => void;
  exportCurrent: () => Promise<void>;
  cancelExport: () => void;
  clearExport: () => void;
  renameFile: (name: string) => void;
  thumbnails: string[];
}

export function useVideoEditor(): UseVideoEditor {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<EditorStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [flip, setFlip] = useState<FlipState>({ horizontal: false, vertical: false });
  const [trim, setTrimState] = useState<TrimRange>({ start: 0, end: 0 });
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('mp4');
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [exportName, setExportName] = useState<string | null>(null);

  // Video Wall
  const [wallLayout, setWallLayout] = useState<VideoWallLayout | null>(null);

  // Thumbnails
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  
  // Feature states
  const [volume, setVolumeState] = useState<number>(1);
  const [isMuted, setIsMutedState] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeedState] = useState<number>(1);
  
  // History states
  const [past, setPast] = useState<EditorHistoryEntry[]>([]);
  const [future, setFuture] = useState<EditorHistoryEntry[]>([]);
  
  const trimBeforeDragRef = useRef<TrimRange | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cleanupUrl = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  const pendingFileRef = useRef<{ file: File; url: string } | null>(null);

  const pushToHistory = useCallback((
    currentTrim = trim,
    currentRotation = rotation,
    currentFlip = flip,
    currentSpeed = playbackSpeed,
    currentWall = wallLayout,
    currentName = meta?.name,
  ) => {
    const entry: EditorHistoryEntry = {
      trim: { ...currentTrim },
      rotation: currentRotation,
      flip: { ...currentFlip },
      playbackSpeed: currentSpeed,
      wallLayout: currentWall,
      name: currentName,
    };
    setPast((prev) => [...prev, entry]);
    setFuture([]);
  }, [trim, rotation, flip, playbackSpeed, wallLayout, meta?.name]);

  const loadFile = useCallback(
    (file: File) => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) {
        setError('El archivo no es un video o imagen válido.');
        setStatus('error');
        return;
      }
      cleanupUrl(objectUrl);
      cleanupUrl(exportUrl);
      setExportUrl(null);
      setExportName(null);
      setExportProgress(null);
      setError(null);
      setStatus('loading');
      setRotation(0);
      setFlip({ horizontal: false, vertical: false });
      setCurrentTime(0);
      setIsPlaying(false);
      setPlaybackSpeedState(1);
      setVolumeState(1);
      setIsMutedState(false);
      setWallLayout(null);
      setPast([]);
      setFuture([]);
      setThumbnails([]);
      // Default export format based on media type
      if (isImage) {
        setExportFormat('png');
      } else {
        setExportFormat('mp4');
      }

      const url = URL.createObjectURL(file);
      pendingFileRef.current = { file, url };
      setObjectUrl(url);
    },
    [objectUrl, exportUrl, cleanupUrl],
  );

  // Attach metadata listeners once the <video> or <img> element picks up the new src.
  useEffect(() => {
    if (!objectUrl || !pendingFileRef.current) return;
    if (pendingFileRef.current.url !== objectUrl) return;

    const { file } = pendingFileRef.current;
    const isImage = file.type.startsWith('image/');

    // ── Image path ─────────────────────────────────────────────────────────────
    if (isImage) {
      const img = new Image();
      img.onload = () => {
        setMeta({
          type: 'image',
          duration: 0,
          width: img.naturalWidth,
          height: img.naturalHeight,
          name: file.name,
          size: file.size,
        });
        setTrimState({ start: 0, end: 0 });
        setStatus('ready');
        pendingFileRef.current = null;
      };
      img.onerror = () => {
        setError('No se pudo cargar la imagen.');
        setStatus('error');
        pendingFileRef.current = null;
      };
      img.src = objectUrl;
      return;
    }

    // ── Video path ─────────────────────────────────────────────────────────────
    const checkAndSetLoaded = (video: HTMLVideoElement) => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      setMeta({
        type: 'video',
        duration,
        width: video.videoWidth,
        height: video.videoHeight,
        name: file.name,
        size: file.size,
      });
      setTrimState({ start: 0, end: duration });
      setStatus('ready');
      pendingFileRef.current = null;

      // Generar thumbnails de manera asíncrona
      generateThumbnails(objectUrl, duration, 12).then(setThumbnails);
    };

    const video = videoRef.current;
    if (video) {
      if (video.readyState >= 1) {
        checkAndSetLoaded(video);
        return;
      }

      const onLoaded = () => {
        checkAndSetLoaded(video);
        cleanup();
      };
      const onError = () => {
        setError('No se pudo cargar el video.');
        setStatus('error');
        cleanup();
      };
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
      };
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onError);
      return cleanup;
    } else {
      // Fallback: load metadata via a temporary Video object if <video> ref is not mounted yet
      const tempVideo = document.createElement('video');
      tempVideo.src = objectUrl;
      const onLoaded = () => {
        checkAndSetLoaded(tempVideo);
        cleanup();
      };
      const onError = () => {
        setError('No se pudo cargar el video.');
        setStatus('error');
        cleanup();
      };
      const cleanup = () => {
        tempVideo.removeEventListener('loadedmetadata', onLoaded);
        tempVideo.removeEventListener('error', onError);
        tempVideo.src = '';
      };
      tempVideo.addEventListener('loadedmetadata', onLoaded);
      tempVideo.addEventListener('error', onError);
      return cleanup;
    }
  }, [objectUrl]);

  // Sync volume, mute, and speed to video element
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      video.muted = isMuted;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, status]);

  const reset = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    cleanupUrl(objectUrl);
    cleanupUrl(exportUrl);
    setObjectUrl(null);
    setMeta(null);
    setRotation(0);
    setFlip({ horizontal: false, vertical: false });
    setTrimState({ start: 0, end: 0 });
    setCurrentTime(0);
    setIsPlaying(false);
    setExportProgress(null);
    setExportUrl(null);
    setExportName(null);
    setError(null);
    setStatus('idle');
    setPlaybackSpeedState(1);
    setVolumeState(1);
    setIsMutedState(false);
    setWallLayout(null);
    setPast([]);
    setFuture([]);
    setThumbnails([]);
  }, [objectUrl, exportUrl, cleanupUrl]);

  const rotate = useCallback((delta: 90 | 180 | 270) => {
    pushToHistory(trim, rotation, flip, playbackSpeed);
    setRotation((r) => (((r + delta) % 360) as Rotation));
  }, [pushToHistory, trim, rotation, flip, playbackSpeed]);

  const resetRotation = useCallback(() => {
    pushToHistory(trim, rotation, flip, playbackSpeed);
    setRotation(0);
  }, [pushToHistory, trim, rotation, flip, playbackSpeed]);

  const toggleFlipHorizontal = useCallback(() => {
    pushToHistory(trim, rotation, flip, playbackSpeed);
    setFlip((f) => ({ ...f, horizontal: !f.horizontal }));
  }, [pushToHistory, trim, rotation, flip, playbackSpeed]);

  const toggleFlipVertical = useCallback(() => {
    pushToHistory(trim, rotation, flip, playbackSpeed);
    setFlip((f) => ({ ...f, vertical: !f.vertical }));
  }, [pushToHistory, trim, rotation, flip, playbackSpeed]);

  const changeWallLayout = useCallback((layout: VideoWallLayout | null) => {
    pushToHistory(trim, rotation, flip, playbackSpeed, wallLayout, meta?.name);
    setWallLayout(layout);
  }, [pushToHistory, trim, rotation, flip, playbackSpeed, wallLayout, meta?.name]);

  const setTrim = useCallback(
    (next: TrimRange) => {
      if (!meta) return;
      const dur = meta.duration;
      const start = clamp(next.start, 0, dur - MIN_TRIM_SECONDS);
      const end = clamp(next.end, start + MIN_TRIM_SECONDS, dur);
      
      // If we haven't started tracking this drag gesture yet, record the start trim
      if (trimBeforeDragRef.current === null) {
        trimBeforeDragRef.current = { ...trim };
      }
      
      setTrimState({ start, end });
    },
    [meta, trim],
  );

  const commitTrim = useCallback(() => {
    if (trimBeforeDragRef.current !== null) {
      // Create history using the trim before the drag started, but other current values
      const entry: EditorHistoryEntry = {
        trim: { ...trimBeforeDragRef.current },
        rotation,
        flip: { ...flip },
        playbackSpeed,
        wallLayout,
        name: meta?.name,
      };
      setPast((prev) => [...prev, entry]);
      setFuture([]);
      trimBeforeDragRef.current = null;
    }
  }, [rotation, flip, playbackSpeed, wallLayout, meta?.name]);

  const setPlaybackSpeed = useCallback((speed: number) => {
    pushToHistory(trim, rotation, flip, playbackSpeed);
    setPlaybackSpeedState(speed);
  }, [pushToHistory, trim, rotation, flip, playbackSpeed]);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(clamp(vol, 0, 1));
  }, []);

  const toggleMute = useCallback(() => {
    setIsMutedState((prev) => !prev);
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    const currentEntry: EditorHistoryEntry = {
      trim: { ...trim },
      rotation,
      flip: { ...flip },
      playbackSpeed,
      wallLayout,
      name: meta?.name,
    };

    setPast(newPast);
    setFuture((prev) => [currentEntry, ...prev]);

    setTrimState(previous.trim);
    setRotation(previous.rotation);
    setFlip(previous.flip);
    setPlaybackSpeedState(previous.playbackSpeed);
    if (previous.wallLayout !== undefined) setWallLayout(previous.wallLayout);
    if (previous.name !== undefined && meta) {
      setMeta((prev) => (prev ? { ...prev, name: previous.name! } : prev));
    }
  }, [past, trim, rotation, flip, playbackSpeed, wallLayout, meta]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    const currentEntry: EditorHistoryEntry = {
      trim: { ...trim },
      rotation,
      flip: { ...flip },
      playbackSpeed,
      wallLayout,
      name: meta?.name,
    };

    setPast((prev) => [...prev, currentEntry]);
    setFuture(newFuture);

    setTrimState(next.trim);
    setRotation(next.rotation);
    setFlip(next.flip);
    setPlaybackSpeedState(next.playbackSpeed);
    if (next.wallLayout !== undefined) setWallLayout(next.wallLayout);
    if (next.name !== undefined && meta) {
      setMeta((prev) => (prev ? { ...prev, name: next.name! } : prev));
    }
  }, [future, trim, rotation, flip, playbackSpeed, wallLayout, meta]);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video || !objectUrl) return;
    const end = trim.end;
    if (video.currentTime >= end - 0.05) {
      video.currentTime = trim.start;
    }
    video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [objectUrl, trim]);

  const pause = useCallback(() => {
    videoRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const seek = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = clamp(time, 0, meta?.duration ?? 0);
      setCurrentTime(video.currentTime);
    },
    [meta],
  );

  const exportCurrent = useCallback(async () => {
    if (!objectUrl || !meta) return;
    if (status === 'exporting') return;

    cleanupUrl(exportUrl);
    setExportUrl(null);
    setExportName(null);
    setError(null);
    setStatus('exporting');
    setExportProgress({ phase: 'preparing', fraction: 0 });

    const controller = new AbortController();
    abortRef.current = controller;

    const base = meta.name.replace(/\.[^.]+$/, '');

    try {
      let result;

      // ── Image export ─────────────────────────────────────────────────────────
      if (meta.type === 'image') {
        const img = imageRef.current;
        if (!img) throw new Error('No se encontró el elemento de imagen.');
        const imgFormat = (exportFormat === 'png' || exportFormat === 'jpg') ? exportFormat : 'png';

        if (wallLayout) {
          result = await exportImageWall({
            source: img,
            rotation,
            flip,
            format: imgFormat,
            layout: wallLayout,
            signal: controller.signal,
            onProgress: setExportProgress,
          });
          setExportName(`${base}_wall${wallLayout.cols}x${wallLayout.rows}.${result.extension}`);
        } else {
          result = await exportImage({
            source: img,
            rotation,
            flip,
            format: imgFormat,
            signal: controller.signal,
            onProgress: setExportProgress,
          });
          setExportName(`${base}_editado.${result.extension}`);
        }
      } else {
        // ── Video export ────────────────────────────────────────────────────────
        const video = videoRef.current;
        if (!video) throw new Error('No se encontró el elemento de video.');
        const videoFormat = (exportFormat === 'mp4' || exportFormat === 'webm') ? exportFormat : 'mp4';

        video.pause();
        setIsPlaying(false);

        if (wallLayout) {
          result = await exportVideoWall({
            source: video,
            trim,
            rotation,
            flip,
            format: videoFormat,
            layout: wallLayout,
            signal: controller.signal,
            onProgress: setExportProgress,
          });
          setExportName(`${base}_wall${wallLayout.cols}x${wallLayout.rows}.${result.extension}`);
        } else {
          result = await exportVideo({
            source: video,
            trim,
            rotation,
            flip,
            format: videoFormat,
            signal: controller.signal,
            onProgress: setExportProgress,
          });
          setExportName(`${base}_editado.${result.extension}`);
        }
      }

      setExportUrl(result.url);
      setStatus('exported');
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') {
        setStatus('ready');
        setExportProgress(null);
      } else {
        setError((e as Error)?.message ?? 'Error al exportar.');
        setStatus('error');
      }
    } finally {
      abortRef.current = null;
    }
  }, [objectUrl, meta, status, trim, rotation, flip, exportFormat, exportUrl, wallLayout, cleanupUrl]);

  const cancelExport = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearExport = useCallback(() => {
    cleanupUrl(exportUrl);
    setExportUrl(null);
    setExportName(null);
    setExportProgress(null);
    if (status === 'exported' || status === 'error') setStatus('ready');
  }, [exportUrl, status, cleanupUrl]);

  const renameFile = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed || !meta) return;
    setMeta((prev) => prev ? { ...prev, name: trimmed } : prev);
  }, [meta]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => {
      if (status === 'exporting') return;
      setCurrentTime(video.currentTime);
      if (video.currentTime >= trim.end - 0.05 && !video.paused) {
        video.pause();
        setIsPlaying(false);
      }
    };
    const onPlay = () => {
      if (status === 'exporting') return;
      setIsPlaying(true);
    };
    const onPause = () => {
      if (status === 'exporting') return;
      setIsPlaying(false);
    };
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [trim.end, status]);

  useEffect(() => () => {
    cleanupUrl(objectUrl);
    cleanupUrl(exportUrl);
  }, [objectUrl, exportUrl, cleanupUrl]);

  return {
    videoRef,
    imageRef,
    status,
    error,
    objectUrl,
    meta,
    rotation,
    flip,
    trim,
    currentTime,
    isPlaying,
    exportFormat,
    exportProgress,
    exportUrl,
    exportName,
    volume,
    isMuted,
    playbackSpeed,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    wallLayout,
    loadFile,
    reset,
    rotate,
    resetRotation,
    toggleFlipHorizontal,
    toggleFlipVertical,
    setTrim,
    commitTrim,
    setExportFormat,
    setWallLayout: changeWallLayout,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setPlaybackSpeed,
    undo,
    redo,
    exportCurrent,
    cancelExport,
    clearExport,
    renameFile,
    thumbnails,
  };
}


