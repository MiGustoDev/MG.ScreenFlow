import { RotateCcw, RotateCw, RefreshCw, FlipHorizontal, FlipVertical } from 'lucide-react';
import type { FlipState, Rotation } from '@/types';

interface RotationControlsProps {
  rotation: Rotation;
  flip?: FlipState;
  originalWidth?: number;
  originalHeight?: number;
  onRotate: (delta: 90 | 180 | 270) => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onReset: () => void;
}

interface RotButton {
  label: string;
  delta: 90 | 180 | 270;
  icon: React.ReactNode;
}

const BUTTONS: RotButton[] = [
  { label: '90° izq.', delta: 270, icon: <RotateCcw size={18} /> },
  { label: '90° der.', delta: 90, icon: <RotateCw size={18} /> },
  { label: '180°', delta: 180, icon: <RefreshCw size={18} /> },
];

export function RotationControls({
  rotation,
  flip = { horizontal: false, vertical: false },
  originalWidth = 1920,
  originalHeight = 1080,
  onRotate,
  onFlipHorizontal,
  onFlipVertical,
  onReset,
}: RotationControlsProps) {
  const currentWidth = rotation === 90 || rotation === 270 ? originalHeight : originalWidth;
  const currentHeight = rotation === 90 || rotation === 270 ? originalWidth : originalHeight;
  const isVertical = currentHeight > currentWidth;
  const orientation = isVertical ? 'Vertical' : 'Horizontal';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-200">Rotación y Espejado</h3>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isVertical ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
            {orientation} ({currentWidth}x{currentHeight}) · {rotation}°
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {BUTTONS.map((b) => (
            <button
              key={b.label}
              onClick={() => onRotate(b.delta)}
              className="flex flex-col items-center justify-center gap-1 rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-2.5 text-xs font-medium text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-800 active:scale-95"
            >
              {b.icon}
              {b.label}
            </button>
          ))}
          <button
            onClick={onReset}
            className="flex flex-col items-center justify-center gap-1 rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-2.5 text-xs font-medium text-slate-400 transition-all hover:border-slate-600 hover:bg-slate-800 active:scale-95"
          >
            <RotateCcw size={18} className="opacity-60" />
            Reset
          </button>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800">
        <h4 className="mb-2 text-xs font-medium text-slate-400">Espejar (Flip)</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onFlipHorizontal}
            className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all active:scale-95 ${
              flip.horizontal
                ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FlipHorizontal size={16} />
            Horizontal
          </button>
          <button
            onClick={onFlipVertical}
            className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all active:scale-95 ${
              flip.vertical
                ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FlipVertical size={16} />
            Vertical
          </button>
        </div>
      </div>
    </div>
  );
}
