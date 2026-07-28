import { useCallback, useRef, useState } from 'react';
import { UploadCloud, Film } from 'lucide-react';

interface DropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function Dropzone({ onFile, disabled }: DropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      onFile(files[0]);
    },
    [onFile],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        handleFiles(e.dataTransfer.files);
      }}
      className={`relative flex flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-all duration-200 sm:py-24 ${
        dragging
          ? 'border-sky-500 bg-sky-500/10 scale-[1.01]'
          : 'border-slate-700 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-900'
      } ${disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
          dragging ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
        }`}
      >
        {dragging ? <Film size={28} /> : <UploadCloud size={28} />}
      </div>
      <div className="space-y-1.5">
        <p className="text-base font-semibold text-slate-100 sm:text-lg">
          {dragging ? 'Soltá tu archivo acá' : 'Arrastrá tu video'}
        </p>
        <p className="text-sm text-slate-400">
          o <span className="font-medium text-sky-400">hacé clic para seleccionar</span> un archivo
        </p>
      </div>
      <p className="text-xs text-slate-500">MP4, WebM, MOV — se procesa todo en tu navegador</p>
    </div>
  );
}
