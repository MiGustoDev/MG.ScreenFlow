import React from 'react';
import { Scissors, Sparkles, X, Loader2, Undo2, Redo2, Pencil, Check } from 'lucide-react';
import { useVideoEditor } from '@/hooks/useVideoEditor';
import { Dropzone } from '@/components/Dropzone';
import { VideoStage } from '@/components/VideoStage';
import { RotationControls } from '@/components/RotationControls';
import { Timeline } from '@/components/Timeline';
import { ExportBar } from '@/components/ExportBar';
import { VideoWallPicker } from '@/components/VideoWallPicker';
import { formatBytes, formatTimePrecise } from '@/lib/format';

function App() {
  const editor = useVideoEditor();
  const {
    videoRef,
    status,
    error,
    objectUrl,
    meta,
    rotation,
    flip,
    trim,
    currentTime,
    isPlaying,
    exportFormat,
    exportProgress,
    exportUrl,
    exportName,
    volume,
    isMuted,
    playbackSpeed,
    canUndo,
    canRedo,
    loadFile,
    reset,
    rotate,
    resetRotation,
    toggleFlipHorizontal,
    toggleFlipVertical,
    setTrim,
    commitTrim,
    setExportFormat,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setPlaybackSpeed,
    undo,
    redo,
    exportCurrent,
    cancelExport,
    clearExport,
    renameFile,
    wallLayout,
    setWallLayout,
    thumbnails,
  } = editor;

  // Inline filename editing state
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [draftName, setDraftName] = React.useState('');
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  const startEditingName = () => {
    if (!meta) return;
    setDraftName(meta.name);
    setIsEditingName(true);
    // Focus after render
    setTimeout(() => nameInputRef.current?.select(), 0);
  };

  const commitEditingName = () => {
    renameFile(draftName);
    setIsEditingName(false);
  };

  const cancelEditingName = () => {
    setIsEditingName(false);
  };

  const showEditor = status === 'ready' || status === 'exporting' || status === 'exported';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-slate-900/90 border border-slate-800 p-1 shadow-sm">
              <img src="/Logo Mi Gusto 2025.png" alt="ScreenFlow Logo" className="h-full w-full object-contain" />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-bold tracking-tight text-white sm:text-base">
                ScreenFlow
              </h1>
              <p className="hidden text-xs text-slate-400 sm:block">
                Editor de video para pantallas de la marca
              </p>
            </div>
          </div>
          {showEditor && (
            <div className="flex items-center gap-2">
              <button
                onClick={undo}
                disabled={!canUndo}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-slate-300 transition hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Deshacer"
              >
                <Undo2 size={15} />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-slate-300 transition hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Rehacer"
              >
                <Redo2 size={15} />
              </button>
              <span className="mx-1 h-5 w-px bg-slate-800" />
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
              >
                <X size={14} />
                Nuevo video
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {status === 'idle' && (
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 text-center">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
                <Sparkles size={13} />
                100% en tu navegador · sin subir nada a un servidor
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Rotá, cortá y descargá tu video
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                Subí un video, corregí la orientación, recortá el tramo que quieras conservar y
                exportalo en alta calidad.
              </p>
            </div>
            <Dropzone onFile={loadFile} />
          </div>
        )}

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
            <Loader2 size={32} className="animate-spin text-sky-500" />
            <p className="text-sm font-medium">Cargando video…</p>
          </div>
        )}

        {status === 'error' && !showEditor && (
          <div className="mx-auto max-w-2xl">
            <div className="mb-6 rounded-lg border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
            <Dropzone onFile={loadFile} />
          </div>
        )}

        {showEditor && meta && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Preview + timeline */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              <VideoStage
                videoRef={videoRef}
                objectUrl={objectUrl}
                rotation={rotation}
                flip={flip}
                isPlaying={isPlaying}
                onTogglePlay={togglePlay}
              />
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm sm:p-5">
                <Timeline
                  duration={meta.duration}
                  trim={trim}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onTrimChange={setTrim}
                  onTrimCommit={commitTrim}
                  onSeek={seek}
                  onTogglePlay={togglePlay}
                  volume={volume}
                  isMuted={isMuted}
                  onVolumeChange={setVolume}
                  onToggleMute={toggleMute}
                  thumbnails={thumbnails}
                />
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm sm:p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-200">Detalles</h3>
                <dl className="space-y-2 text-sm">
                  <div className="group flex justify-between gap-2">
                    <dt className="shrink-0 text-slate-400">Archivo</dt>
                    <dd className="flex min-w-0 items-center gap-1.5 font-medium text-slate-200">
                      {isEditingName ? (
                        <>
                          <input
                            ref={nameInputRef}
                            autoFocus
                            type="text"
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEditingName();
                              if (e.key === 'Escape') cancelEditingName();
                            }}
                            className="w-full min-w-0 truncate rounded-md border border-sky-500 bg-slate-800 px-2 py-0.5 text-sm text-slate-100 outline-none ring-1 ring-sky-500/60 focus:ring-sky-400"
                          />
                          <button
                            onClick={commitEditingName}
                            title="Confirmar nombre"
                            className="shrink-0 rounded p-0.5 text-sky-400 transition hover:bg-sky-500/20"
                          >
                            <Check size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="truncate" title={meta.name}>{meta.name}</span>
                          <button
                            onClick={startEditingName}
                            title="Renombrar archivo"
                            className="shrink-0 rounded p-0.5 text-slate-500 opacity-0 transition hover:bg-slate-700 hover:text-slate-300 group-hover:opacity-100"
                          >
                            <Pencil size={12} />
                          </button>
                        </>
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Duración</dt>
                    <dd className="font-medium text-slate-200">
                      {formatTimePrecise(meta.duration)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Resolución</dt>
                    <dd className="font-medium text-slate-200">
                      {meta.width}×{meta.height}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Tamaño</dt>
                    <dd className="font-medium text-slate-200">{formatBytes(meta.size)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-5">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm sm:p-5">
                <RotationControls
                  rotation={rotation}
                  flip={flip}
                  originalWidth={meta.width}
                  originalHeight={meta.height}
                  onRotate={rotate}
                  onFlipHorizontal={toggleFlipHorizontal}
                  onFlipVertical={toggleFlipVertical}
                  onReset={resetRotation}
                />
              </div>

              {/* Speed control */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm sm:p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-200">Velocidad de Reproducción</h3>
                <div className="grid grid-cols-5 gap-1.5">
                  {[0.25, 0.5, 1, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`rounded-lg py-1.5 text-xs font-semibold transition active:scale-95 ${
                        playbackSpeed === speed
                          ? 'bg-sky-500 text-white'
                          : 'border border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              <VideoWallPicker
                value={wallLayout}
                onChange={setWallLayout}
              />

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm sm:p-5">
                <ExportBar
                  status={status}
                  progress={exportProgress}
                  exportFormat={exportFormat}
                  exportUrl={exportUrl}
                  exportName={exportName}
                  error={error}
                  onFormatChange={setExportFormat}
                  onExport={exportCurrent}
                  onCancel={cancelExport}
                  onDismiss={clearExport}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 text-center text-xs text-slate-600 sm:px-6">
        ScreenFlow — el video se procesa localmente en tu navegador.
      </footer>
    </div>
  );
}

export default App;
