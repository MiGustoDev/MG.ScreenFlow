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
  onTrimChange,
  onTrimCommit,
  onSeek,
  onTogglePlay,
  onVolumeChange,
  onToggleMute,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragMode>(null);

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

  const startPct = pct(trim.start);
  const endPct = pct(trim.end);
  const playPct = pct(currentTime);

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

      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        className="relative h-14 w-full cursor-pointer touch-none select-none rounded-lg bg-slate-800"
      >
        {/* selected region */}
        <div
          className="absolute inset-y-0 rounded-lg bg-sky-500/25 ring-2 ring-sky-500/70"
          style={{ left: startPct, right: `calc(100% - ${endPct})` }}
        >
          {/* start handle */}
          <div
            onPointerDown={(e) => {
              e.stopPropagation();
              setDrag('start');
            }}
            className="absolute left-0 top-0 flex h-full w-3 -translate-x-1/2 cursor-ew-resize touch-none items-center justify-center rounded-l-lg bg-sky-500 text-white shadow-sm"
          >
            <GripHorizontal size={12} className="rotate-90 opacity-80" />
          </div>
          {/* end handle */}
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

        {/* playhead */}
        <div
          className="pointer-events-none absolute top-0 z-10 h-full w-0.5 -translate-x-1/2 bg-rose-500"
          style={{ left: playPct }}
        >
          <div className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 rounded-sm bg-rose-500" />
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-slate-500">
        <span>0:00</span>
        <span>{formatTimePrecise(duration / 2)}</span>
        <span>{formatTimePrecise(duration)}</span>
      </div>
    </div>
  );
}

