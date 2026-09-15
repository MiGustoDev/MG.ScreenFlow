import { Download, Loader2, CheckCircle2, X, AlertCircle, FileVideo, Image, Sliders, Feather, Zap, Sparkles } from 'lucide-react';
import type { ExportFormat, ExportProgress, VideoQualityProfile, VideoResolutionOption } from '@/types';
import { isFormatSupported } from '@/lib/pickMimeType';

interface ExportBarProps {
  status: 'ready' | 'exporting' | 'exported' | 'error';
  progress: ExportProgress | null;
  exportFormat: ExportFormat;
  exportUrl: string | null;
  exportName: string | null;
  error: string | null;
  mediaType?: 'video' | 'image';
  videoQuality?: VideoQualityProfile;
  videoResolution?: VideoResolutionOption;
  onFormatChange: (format: ExportFormat) => void;
  onQualityChange?: (quality: VideoQualityProfile) => void;
  onResolutionChange?: (resolution: VideoResolutionOption) => void;
  onExport: () => void;
  onCancel: () => void;
  onDismiss: () => void;
}

const PHASE_LABEL: Record<ExportProgress['phase'], string> = {
  preparing: 'Preparando…',
  rendering: 'Procesando…',
  finalizing: 'Finalizando…',
  done: 'Listo',
};

export function ExportBar({
  status,
  progress,
  exportFormat,
  exportUrl,
  exportName,
  error,
  mediaType = 'video',
  videoQuality = 'balanced',
  videoResolution = 'original',
  onFormatChange,
  onQualityChange,
  onResolutionChange,
  onExport,
  onCancel,
  onDismiss,
}: ExportBarProps) {
  const pct = progress ? Math.round(progress.fraction * 100) : 0;
  const isImage = mediaType === 'image';

  const mp4Supported = isFormatSupported('mp4');
  const webmSupported = isFormatSupported('webm');

  const exportedLabel = isImage ? 'Imagen procesada' : 'Video procesado';
  const processingLabel = isImage ? 'Procesando imagen…' : (PHASE_LABEL[progress?.phase ?? 'preparing']);
  const exportButtonLabel = isImage
    ? `Exportar imagen (${exportFormat.toUpperCase()})`
    : `Exportar y descargar (${exportFormat.toUpperCase()})`;

  return (
    <div className="flex flex-col gap-4">
      {/* Selector de Formato */}
      {status === 'ready' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              {isImage ? (
                <Image size={14} className="text-sky-400" />
              ) : (
                <FileVideo size={14} className="text-sky-400" />
              )}
              Formato de descarga
            </label>

            {isImage ? (
              /* Image format selector */
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => onFormatChange('png')}
                  className={`flex flex-col items-center justify-center rounded-lg py-1.5 px-3 text-xs font-semibold transition ${
                    exportFormat === 'png'
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>PNG</span>
                  <span className="text-[10px] opacity-75 font-normal">Sin pérdida</span>
                </button>
                <button
                  type="button"
                  onClick={() => onFormatChange('jpg')}
                  className={`flex flex-col items-center justify-center rounded-lg py-1.5 px-3 text-xs font-semibold transition ${
                    exportFormat === 'jpg'
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>JPG</span>
                  <span className="text-[10px] opacity-75 font-normal">Comprimido</span>
                </button>
              </div>
            ) : (
              /* Video format selector */
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => onFormatChange('mp4')}
                  className={`flex flex-col items-center justify-center rounded-lg py-1.5 px-3 text-xs font-semibold transition ${
                    exportFormat === 'mp4'
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>MP4</span>
                  {!mp4Supported && (
                    <span className="text-[10px] opacity-75 font-normal">(No nativo)</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onFormatChange('webm')}
                  className={`flex flex-col items-center justify-center rounded-lg py-1.5 px-3 text-xs font-semibold transition ${
                    exportFormat === 'webm'
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>WebM</span>
                  {!webmSupported && (
                    <span className="text-[10px] opacity-75 font-normal">(No nativo)</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Opciones de Optimización y Compresión para Video */}
          {!isImage && (
            <>
              {/* Nivel de Compresión / Bitrate */}
              <div className="flex flex-col gap-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sliders size={14} className="text-sky-400" />
                    Optimización y Compresión
                  </span>
                  <span className="text-[10px] font-normal text-slate-400">
                    {videoQuality === 'compressed' ? '🪶 -60% peso' : videoQuality === 'high' ? '💎 Sin pérdida' : '⚖️ Normal'}
                  </span>
                </label>

                <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-950 p-1 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => onQualityChange?.('compressed')}
                    className={`flex flex-col items-center justify-center rounded-lg py-1.5 px-2 text-[11px] font-semibold transition ${
                      videoQuality === 'compressed'
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-1"><Feather size={12} /> Optimizado</span>
                    <span className="text-[9px] opacity-80 font-normal">Ligero (~3M)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onQualityChange?.('balanced')}
                    className={`flex flex-col items-center justify-center rounded-lg py-1.5 px-2 text-[11px] font-semibold transition ${
                      videoQuality === 'balanced'
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-1"><Zap size={12} /> Equilibrado</span>
                    <span className="text-[9px] opacity-80 font-normal">Normal (~6.5M)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onQualityChange?.('high')}
                    className={`flex flex-col items-center justify-center rounded-lg py-1.5 px-2 text-[11px] font-semibold transition ${
                      videoQuality === 'high'
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-1"><Sparkles size={12} /> Máxima</span>
                    <span className="text-[9px] opacity-80 font-normal">Pesado (~14M)</span>
                  </button>
                </div>
              </div>

              {/* Escala de Resolución de Salida */}
              <div className="flex flex-col gap-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Resolución de Salida</span>
                </label>
                <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800">
                  {(['original', '1080p', '720p', '480p'] as VideoResolutionOption[]).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => onResolutionChange?.(res)}
                      className={`rounded-lg py-1.5 text-center text-[11px] font-semibold transition ${
                        videoResolution === res
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {res === 'original' ? 'Original' : res}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}


      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-2.5 text-sm text-rose-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={onDismiss} className="text-rose-400 hover:text-rose-300">
            <X size={16} />
          </button>
        </div>
      )}

      {status === 'exporting' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-sky-400" />
              {processingLabel} ({exportFormat.toUpperCase()})
            </span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-150"
              style={{ width: `${pct}%` }}
            />
          </div>
          <button
            onClick={onCancel}
            className="self-end text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Cancelar
          </button>
        </div>
      )}

      {status === 'exported' && exportUrl && (
        <div className="flex flex-col gap-2 rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
            <CheckCircle2 size={18} />
            {exportedLabel} ({exportFormat.toUpperCase()})
          </div>
          <a
            href={exportUrl}
            download={exportName ?? `archivo_editado.${exportFormat}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 active:scale-95"
          >
            <Download size={16} />
            Descargar {exportName}
          </a>
        </div>
      )}

      {status === 'ready' && (
        <button
          onClick={onExport}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 active:scale-95"
        >
          <Download size={18} />
          {exportButtonLabel}
        </button>
      )}
    </div>
  );
}
