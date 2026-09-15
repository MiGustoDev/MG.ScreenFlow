import type { FlipState, Rotation, VideoWallLayout } from '@/types';

interface VideoStageProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  imageRef?: React.RefObject<HTMLImageElement>;
  objectUrl: string | null;
  rotation: Rotation;
  flip?: FlipState;
  isPlaying: boolean;
  mediaType?: 'video' | 'image';
  wallLayout?: VideoWallLayout | null;
  onTogglePlay: () => void;
}

export function VideoStage({
  videoRef,
  imageRef,
  objectUrl,
  rotation,
  flip,
  isPlaying,
  mediaType = 'video',
  wallLayout,
  onTogglePlay,
}: VideoStageProps) {
  const flipX = flip?.horizontal ? -1 : 1;
  const flipY = flip?.vertical ? -1 : 1;
  const transform = `rotate(${rotation}deg) scale(${flipX}, ${flipY})`;

  const cols = wallLayout?.cols ?? 1;
  const rows = wallLayout?.rows ?? 1;
  const hasWall = cols > 1 || rows > 1;

  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-slate-950 p-3 sm:p-4 border border-slate-800 w-full min-h-[350px] max-h-[60vh] aspect-video group">
      {/* Active layout badge */}
      {hasWall && (
        <div className="absolute top-5 right-5 z-20 flex items-center gap-1.5 rounded-full bg-sky-500/90 px-3 py-1 text-xs font-semibold text-white shadow-md backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          Video Wall {cols}×{rows} ({cols * rows} pantallas)
        </div>
      )}

      <div className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl ${
        mediaType === 'image'
          ? 'bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%),linear-gradient(-45deg,#1e293b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e293b_75%),linear-gradient(-45deg,transparent_75%,#1e293b_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px] bg-slate-950'
          : 'bg-black'
      }`}>
        {mediaType === 'image' ? (
          <img
            ref={imageRef}
            src={objectUrl ?? undefined}
            alt="Imagen cargada"
            className="max-h-full max-w-full object-contain transition-transform duration-300 ease-out"
            style={{ transform }}
            draggable={false}
          />
        ) : (
          <>
            <video
              ref={videoRef}
              src={objectUrl ?? undefined}
              className="max-h-full max-w-full object-contain transition-transform duration-300 ease-out"
              style={{ transform }}
              playsInline
              onClick={onTogglePlay}
            />
            {objectUrl && (
              <button
                onClick={onTogglePlay}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 rounded-full bg-slate-900/80 border border-slate-700/60 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-slate-800 hover:scale-105 active:scale-95"
              >
                {isPlaying ? 'Pausar' : 'Reproducir'}
              </button>
            )}
          </>
        )}

        {/* Live Video Wall Grid Overlay */}
        {hasWall && (
          <div className="pointer-events-none absolute inset-0 z-10 grid gap-1 p-1 bg-black/10"
               style={{
                 gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                 gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
               }}>
            {Array.from({ length: cols * rows }).map((_, i) => (
              <div
                key={i}
                className="relative rounded-sm border border-sky-400/40 bg-sky-500/5 shadow-[inset_0_0_12px_rgba(14,165,233,0.15)] flex items-center justify-center"
              >
                <span className="text-[10px] font-bold text-sky-300/60 bg-slate-950/80 px-1.5 py-0.5 rounded border border-sky-400/30">
                  Panel {i + 1}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
