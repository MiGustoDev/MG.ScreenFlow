import type { FlipState, Rotation } from '@/types';

interface VideoStageProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  imageRef?: React.RefObject<HTMLImageElement>;
  objectUrl: string | null;
  rotation: Rotation;
  flip?: FlipState;
  isPlaying: boolean;
  mediaType?: 'video' | 'image';
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
  onTogglePlay,
}: VideoStageProps) {
  const flipX = flip?.horizontal ? -1 : 1;
  const flipY = flip?.vertical ? -1 : 1;
  const transform = `rotate(${rotation}deg) scale(${flipX}, ${flipY})`;

  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-slate-950 p-3 sm:p-4 border border-slate-800 w-full min-h-[350px] max-h-[60vh] aspect-video">
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-black">
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
                className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-md transition hover:bg-white/30"
              >
                {isPlaying ? 'Pausar' : 'Reproducir'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
