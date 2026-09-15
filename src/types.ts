export type Rotation = 0 | 90 | 180 | 270;

export interface FlipState {
  horizontal: boolean;
  vertical: boolean;
}

export type EditorStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'exporting'
  | 'exported'
  | 'error';

export interface ExportProgress {
  phase: 'preparing' | 'rendering' | 'finalizing' | 'done';
  /** 0..1 fraction of the rendering phase completed. */
  fraction: number;
}

export interface VideoMeta {
  type: 'video' | 'image';
  duration: number;
  width: number;
  height: number;
  name: string;
  size: number;
}

export interface TrimRange {
  start: number;
  end: number;
}

export type VideoExportFormat = 'mp4' | 'webm';
export type ImageExportFormat = 'png' | 'jpg';
export type ExportFormat = VideoExportFormat | ImageExportFormat;

export interface VideoWallLayout {
  cols: number;
  rows: number;
  label: string;
}

export const MP4_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
] as const;

export const WEBM_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
] as const;

export const MIME_CANDIDATES = [
  ...WEBM_CANDIDATES,
  ...MP4_CANDIDATES,
] as const;

export type ExportMimeType = string;

export interface EditorHistoryEntry {
  trim: TrimRange;
  rotation: Rotation;
  flip: FlipState;
  playbackSpeed: number;
  wallLayout?: VideoWallLayout | null;
  name?: string;
  objectUrl?: string | null;
  meta?: VideoMeta | null;
}


