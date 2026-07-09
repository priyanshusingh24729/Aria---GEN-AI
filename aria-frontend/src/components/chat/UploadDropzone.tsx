"use client";

import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

interface UploadDropzoneProps {
  accept: string;
  multiple?: boolean;
  label: string;
  hint?: string;
  onFiles: (files: File[]) => void;
}

export function UploadDropzone({ accept, multiple, label, hint, onFiles }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    onFiles(Array.from(fileList));
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-[10px] border border-dashed px-4 py-6 text-center transition-colors ${
        dragging ? "border-accent bg-accent/[0.04]" : "border-border bg-surface2 hover:border-accent/50"
      }`}
    >
      <UploadCloud className="h-6 w-6 text-text-dimmer" strokeWidth={1.5} />
      <div className="text-[0.82rem] font-medium text-text-dim">{label}</div>
      {hint && <div className="text-[0.74rem] text-text-dimmer">{hint}</div>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
