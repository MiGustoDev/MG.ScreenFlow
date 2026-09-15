import { LayoutGrid } from 'lucide-react';
import type { VideoWallLayout } from '@/types';

interface VideoWallPickerProps {
  value: VideoWallLayout | null;
  mediaType?: 'video' | 'image';
  onChange: (layout: VideoWallLayout | null) => void;
}

const LAYOUTS: Array<{ layout: VideoWallLayout | null; label: string; cols: number; rows: number }> = [
  { layout: null, label: 'Normal', cols: 1, rows: 1 },
  { layout: { cols: 2, rows: 1, label: '2×1' }, label: '2×1', cols: 2, rows: 1 },
  { layout: { cols: 1, rows: 2, label: '1×2' }, label: '1×2', cols: 1, rows: 2 },
  { layout: { cols: 2, rows: 2, label: '2×2' }, label: '2×2', cols: 2, rows: 2 },
  { layout: { cols: 3, rows: 2, label: '3×2' }, label: '3×2', cols: 3, rows: 2 },
  { layout: { cols: 2, rows: 3, label: '2×3' }, label: '2×3', cols: 2, rows: 3 },
];

function GridPreview({
  cols,
  rows,
  active,
}: {
  cols: number;
  rows: number;
  active: boolean;
}) {
  const W = 40;
  const H = 32;
  const gap = 1.5;
  const cellW = (W - gap * (cols - 1)) / cols;
  const cellH = (H - gap * (rows - 1)) / rows;

  const cells: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ x: c * (cellW + gap), y: r * (cellH + gap) });
    }
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className="shrink-0"
    >
      {cells.map((cell, i) => (
        <rect
          key={i}
          x={cell.x}
          y={cell.y}
          width={cellW}
          height={cellH}
          rx={1.5}
          fill={active ? 'rgb(14 165 233 / 0.7)' : 'rgb(100 116 139 / 0.4)'}
          stroke={active ? 'rgb(56 189 248)' : 'rgb(100 116 139 / 0.6)'}
          strokeWidth={0.8}
        />
      ))}
    </svg>
  );
}

export function VideoWallPicker({ value, mediaType = 'video', onChange }: VideoWallPickerProps) {
  const activeKey = value ? `${value.cols}x${value.rows}` : 'normal';
  const isImage = mediaType === 'image';
  const term = isImage ? 'la imagen' : 'el video';
  const TermCapitalized = isImage ? 'La imagen' : 'El video';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm sm:p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
        <LayoutGrid size={14} className="text-sky-400" />
        {isImage ? 'Mural de Pantallas (Wall)' : 'Video Wall'}
      </h3>
      <p className="mb-3 text-xs text-slate-500 leading-relaxed">
        Replica {term} en una cuadrícula de celdas. {TermCapitalized} exportado contendrá el grid completo.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {LAYOUTS.map(({ layout, label, cols, rows }) => {
          const key = layout ? `${layout.cols}x${layout.rows}` : 'normal';
          const isActive = key === activeKey;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(layout)}
              title={label}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-all ${
                isActive
                  ? 'border-sky-500/70 bg-sky-500/15 text-sky-300 shadow-sm shadow-sky-500/20'
                  : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <GridPreview cols={cols} rows={rows} active={isActive} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {value && (
        <p className="mt-3 text-center text-xs text-sky-400/80">
          {TermCapitalized} se exportará como grid <strong>{value.cols}×{value.rows}</strong>
          {' '}({value.cols * value.rows} {value.cols * value.rows === 1 ? 'celda' : 'celdas'})
        </p>
      )}
    </div>
  );
}
