import { MP4_CANDIDATES, WEBM_CANDIDATES, type ExportFormat } from '@/types';

export function pickSupportedMimeType(format: ExportFormat): string {
  if (typeof MediaRecorder === 'undefined') {
    return format === 'mp4' ? 'video/mp4' : 'video/webm';
  }

  const candidates = format === 'mp4' ? MP4_CANDIDATES : WEBM_CANDIDATES;
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }

  // Fallback al otro formato si el seleccionado no está disponible
  const fallbackCandidates = format === 'mp4' ? WEBM_CANDIDATES : MP4_CANDIDATES;
  for (const candidate of fallbackCandidates) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }

  return format === 'mp4' ? 'video/mp4' : 'video/webm';
}

export function isFormatSupported(format: ExportFormat): boolean {
  if (typeof MediaRecorder === 'undefined') return true;
  const candidates = format === 'mp4' ? MP4_CANDIDATES : WEBM_CANDIDATES;
  return candidates.some((c) => MediaRecorder.isTypeSupported(c));
}

export function mimeToExtension(mime: string): string {
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('webm')) return 'webm';
  return 'mp4';
}

