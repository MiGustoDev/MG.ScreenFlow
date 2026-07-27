import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, GripHorizontal, Volume2, Volume1, VolumeX } from 'lucide-react';
import type { TrimRange } from '@/types';
import { formatTimePrecise, clamp } from '@/lib/format';

interface TimelineProps {
  duration: number;
  trim: TrimRange;
  currentTime: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  thumbnails?: string[];
  onTrimChange: (trim: TrimRange) => void;
  onTrimCommit: () => void;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
}

type DragMode = 'start' | 'end' | 'playhead' | null;

export function Timeline({
  duration,
  trim,
  currentTime,
  isPlaying,
  volume,
  isMuted,
  thumbnails = [],
  onTrimChange,
  onTrimCommit,
  onSeek,
  onTogglePlay,
  onVolumeChange,
  onToggleMute,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragMode>(null);

  // Hover preview state
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);

  const pct = (t: number) => `${(t / (duration || 1)) * 100}%`;

  const timeFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || !duration) return 0;
      const rect = track.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      return ratio * duration;
    },
    [duration],
  );

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const t = timeFromClientX(e.clientX);
      if (drag === 'start') {
        onTrimChange({ start: t, end: trim.end });
      } else if (drag === 'end') {
        onTrimChange({ start: trim.start, end: t });
      } else if (drag === 'playhead') {
        onSeek(t);
      }
    };
    const onUp = () => {
      setDrag(null);
      if (drag === 'start' || drag === 'end') {
        onTrimCommit();
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, timeFromClientX, onTrimChange, onSeek, trim.start, trim.end, onTrimCommit]);

  const handleTrackPointerDown = (e: React.PointerEvent) => {
    if (drag) return;
    const t = timeFromClientX(e.clientX);
    onSeek(t);
    setDrag('playhead');
  };

  const handleTrackMouseMove = (e: React.MouseEvent) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const t = timeFromClientX(e.clientX);
    const relativeX = e.clientX - rect.left;
    setHoverTime(t);
    setHoverX(relativeX);
  };

  const handleTrackMouseLeave = () => {
    setHoverTime(null);
  };

  // Get thumbnail closest to the given time
  const getThumbnailForTime = (t: number): string | null => {
    if (!thumbnails.length) return null;
    const idx = Math.round((t / (duration || 1)) * (thumbnails.length - 1));
    return thumbnails[clamp(idx, 0, thumbnails.length - 1)] ?? null;
  };

  const startPct = pct(trim.start);
  const endPct = pct(trim.end);
  const playPct = pct(currentTime);

  // Hover tooltip dimensions
  const TOOLTIP_W = 120;
  const TOOLTIP_H = 68;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Línea de tiempo</h3>
        <span className="text-xs text-slate-400">
          Selección: {formatTimePrecise(trim.start)} – {formatTimePrecise(trim.end)} ·{' '}
          {formatTimePrecise(trim.end - trim.start)}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSeek(trim.start)}
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
              title="Ir al inicio"
            >
              <SkipBack size={16} />
            </button>
            <button
              onClick={onTogglePlay}
              className="rounded-md bg-sky-500 p-1.5 text-white transition hover:bg-sky-400"
              title={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              onClick={() => onSeek(trim.end)}
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
              title="Ir al final"
            >
              <SkipForward size={16} />
            </button>
          </div>
          <span className="text-xs font-medium text-slate-300">
            {formatTimePrecise(currentTime)} / {formatTimePrecise(duration)}
          </span>
        </div>

        {/* Volume controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMute}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            title={isMuted ? 'Activar sonido' : 'Silenciar'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX size={16} />
            ) : volume < 0.5 ? (
              <Volume1 size={16} />
            ) : (
              <Volume2 size={16} />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              onVolumeChange(parseFloat(e.target.value));
              if (isMuted) onToggleMute();
            }}
            className="h-1.5 w-20 cursor-pointer appearance-none rounded-lg bg-slate-700 accent-sky-500"
          />
        </div>
      </div>

      {/* Track */}
      <div className="relative">
        <div
          ref={trackRef}
          onPointerDown={handleTrackPointerDown}
          onMouseMove={handleTrackMouseMove}
          onMouseLeave={handleTrackMouseLeave}
          className="relative h-16 w-full cursor-pointer touch-none select-none overflow-hidden rounded-lg bg-slate-800"
        >
          {/* Thumbnail strip */}
          {thumbnails.length > 0 && (
            <div className="absolute inset-0 flex opacity-60">
              {thumbnails.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  draggable={false}
                  className="h-full shrink-0 object-cover"
                  style={{ width: `${100 / thumbnails.length}%` }}
                />
              ))}
            </div>
          )}

          {/* Darkened overlay outside trim region */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 bg-slate-950/60"
            style={{ width: startPct }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 bg-slate-950/60"
            style={{ width: `calc(100% - ${endPct})` }}
          />

          {/* Selected region with handles nested inside */}
          <div
            className="absolute inset-y-0 rounded-lg ring-2 ring-sky-500/80"
            style={{ left: startPct, right: `calc(100% - ${endPct})` }}
          >
            {/* Start handle */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                setDrag('start');
              }}
              className="absolute left-0 top-0 flex h-full w-3 -translate-x-1/2 cursor-ew-resize touch-none items-center justify-center rounded-l-lg bg-sky-500 text-white shadow-sm"
            >
              <GripHorizontal size={12} className="rotate-90 opacity-80" />
            </div>

            {/* End handle */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                setDrag('end');
              }}
              className="absolute right-0 top-0 flex h-full w-3 translate-x-1/2 cursor-ew-resize touch-none items-center justify-center rounded-r-lg bg-sky-500 text-white shadow-sm"
            >
              <GripHorizontal size={12} className="rotate-90 opacity-80" />
            </div>
          </div>

          {/* Playhead */}
          <div
            className="pointer-events-none absolute top-0 z-10 h-full w-0.5 -translate-x-1/2 bg-rose-500 shadow-[0_0_6px_1px_rgb(244_63_94_/_0.6)]"
            style={{ left: playPct }}
          >
            <div className="absolute -top-0.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-sm bg-rose-500" />
          </div>

          {/* Hover line */}
          {hoverTime !== null && !drag && (
            <div
              className="pointer-events-none absolute top-0 z-20 h-full w-px -translate-x-1/2 bg-white/40"
              style={{ left: hoverX }}
            />
          )}
        </div>

        {/* Hover preview tooltip — rendered outside the clipping overflow:hidden container */}
        {hoverTime !== null && !drag && (() => {
          const thumb = getThumbnailForTime(hoverTime);
          const track = trackRef.current;
          const trackW = track?.offsetWidth ?? 1;
          // Clamp tooltip position so it stays inside the track
          const tooltipLeft = clamp(hoverX - TOOLTIP_W / 2, 0, trackW - TOOLTIP_W);

          return (
            <div
              className="pointer-events-none absolute z-30 overflow-hidden rounded-lg border border-slate-600/80 bg-slate-900 shadow-xl shadow-black/50"
              style={{
                bottom: '100%',
                left: tooltipLeft,
                width: TOOLTIP_W,
                marginBottom: 8,
              }}
            >
              {thumb ? (
                <img
                  src={thumb}
                  alt={formatTimePrecise(hoverTime)}
                  className="block w-full object-cover"
                  style={{ height: TOOLTIP_H }}
                />
              ) : (
                <div
                  className="flex items-center justify-center bg-slate-800 text-xs text-slate-400"
                  style={{ height: TOOLTIP_H }}
                >
                  {formatTimePrecise(hoverTime)}
                </div>
              )}
              <div className="bg-slate-900 px-2 py-1 text-center text-[10px] font-medium text-slate-300">
                {formatTimePrecise(hoverTime)}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="flex justify-between text-[10px] text-slate-500">
        <span>0:00</span>
        <span>{formatTimePrecise(duration / 2)}</span>
        <span>{formatTimePrecise(duration)}</span>
      </div>
    </div>
  );
}
