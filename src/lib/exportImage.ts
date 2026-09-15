import type { ExportProgress, FlipState, Rotation, VideoWallLayout } from '@/types';

export interface ExportImageOptions {
  source: HTMLImageElement;
  rotation: Rotation;
  flip?: FlipState;
  format?: 'png' | 'jpg';
  onProgress?: (p: ExportProgress) => void;
  signal?: AbortSignal;
}

export interface ExportImageWallOptions extends ExportImageOptions {
  layout: VideoWallLayout;
}

export interface ExportImageResult {
  blob: Blob;
  url: string;
  extension: string;
  mimeType: string;
}

function computeRotatedDimensions(w: number, h: number, rotation: Rotation) {
  return rotation === 90 || rotation === 270
    ? { width: h, height: w }
    : { width: w, height: h };
}

export async function exportImage(opts: ExportImageOptions): Promise<ExportImageResult> {
  const { source, rotation, flip, format = 'png', onProgress, signal } = opts;
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const extension = format === 'png' ? 'png' : 'jpg';

  onProgress?.({ phase: 'preparing', fraction: 0 });

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const { width: cw, height: ch } = computeRotatedDimensions(
    source.naturalWidth,
    source.naturalHeight,
    rotation,
  );

  if (cw === 0 || ch === 0) {
    throw new Error('La imagen no tiene dimensiones válidas.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el contexto de canvas.');

  onProgress?.({ phase: 'rendering', fraction: 0.5 });

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cw, ch);
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  if (flip) {
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  }
  ctx.drawImage(source, -source.naturalWidth / 2, -source.naturalHeight / 2);
  ctx.restore();

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  onProgress?.({ phase: 'finalizing', fraction: 0.8 });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('No se pudo generar la imagen.'));
    }, mimeType, 1.0);
  });

  const url = URL.createObjectURL(blob);
  onProgress?.({ phase: 'done', fraction: 1 });

  return { blob, url, extension, mimeType };
}

export async function exportImageWall(opts: ExportImageWallOptions): Promise<ExportImageResult> {
  const { source, rotation, flip, format = 'png', layout, onProgress, signal } = opts;
  const { cols, rows } = layout;
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const extension = format === 'png' ? 'png' : 'jpg';

  onProgress?.({ phase: 'preparing', fraction: 0 });

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const { width: canvasW, height: canvasH } = computeRotatedDimensions(
    source.naturalWidth,
    source.naturalHeight,
    rotation,
  );

  if (canvasW === 0 || canvasH === 0) {
    throw new Error('La imagen no tiene dimensiones válidas.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el contexto de canvas.');

  onProgress?.({ phase: 'rendering', fraction: 0.5 });

  // 1. Renderizar la imagen completa a un canvas offscreen
  const offscreen = document.createElement('canvas');
  offscreen.width = canvasW;
  offscreen.height = canvasH;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) throw new Error('No se pudo crear el contexto de canvas offscreen.');

  offCtx.imageSmoothingEnabled = true;
  offCtx.imageSmoothingQuality = 'high';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  offCtx.fillStyle = '#000';
  offCtx.fillRect(0, 0, canvasW, canvasH);
  offCtx.save();
  offCtx.translate(canvasW / 2, canvasH / 2);
  offCtx.rotate((rotation * Math.PI) / 180);
  if (flip) {
    offCtx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  }
  offCtx.drawImage(source, -source.naturalWidth / 2, -source.naturalHeight / 2);
  offCtx.restore();

  // 2. Copiar cada tile al canvas final
  const GAP = Math.max(2, Math.round(Math.min(canvasW, canvasH) * 0.004));
  const totalGapX = GAP * (cols - 1);
  const totalGapY = GAP * (rows - 1);
  const cellW = (canvasW - totalGapX) / cols;
  const cellH = (canvasH - totalGapY) / rows;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasW, canvasH);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const destX = col * (cellW + GAP);
      const destY = row * (cellH + GAP);

      const srcX = col * (canvasW / cols);
      const srcY = row * (canvasH / rows);
      const srcW = canvasW / cols;
      const srcH = canvasH / rows;

      ctx.drawImage(offscreen, srcX, srcY, srcW, srcH, destX, destY, cellW, cellH);
    }
  }

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  onProgress?.({ phase: 'finalizing', fraction: 0.8 });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('No se pudo generar la imagen.'));
    }, mimeType, 1.0);
  });

  const url = URL.createObjectURL(blob);
  onProgress?.({ phase: 'done', fraction: 1 });

  return { blob, url, extension, mimeType };
}
