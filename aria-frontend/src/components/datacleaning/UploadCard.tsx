"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useDataCleaning } from "@/context/DataCleaningContext";

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls", ".json"];

export function UploadCard() {
  const { upload, isLoading, uploadProgress, error } = useDataCleaning();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ACCEPTED_EXTENSIONS.includes(ext)) return;
      void upload(file);
    },
    [upload]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto w-full max-w-2xl"
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={[
          "group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed px-8 py-16 text-center backdrop-blur-xl transition-all duration-300",
          isDragging
            ? "border-emerald-400/70 bg-emerald-400/[0.06] scale-[1.01]"
            : "border-white/10 bg-white/[0.02] hover:border-emerald-400/40 hover:bg-white/[0.04]",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-60" />

        <div className="relative flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-3xl shadow-inner">
            🧹
          </div>
          <div>
            <p className="text-base font-medium text-zinc-100">
              {isDragging ? "Drop it here" : "Drag & drop your dataset"}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              or <span className="text-emerald-400 underline underline-offset-4">browse files</span> from
              your computer
            </p>
          </div>
          <div className="flex gap-2 text-[11px] text-zinc-500">
            {ACCEPTED_EXTENSIONS.map((ext) => (
              <span
                key={ext}
                className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 uppercase tracking-wide"
              >
                {ext.replace(".", "")}
              </span>
            ))}
          </div>
        </div>
      </div>

      {isLoading && uploadProgress > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs text-zinc-500">
            <span>Uploading…</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-center text-xs text-rose-300">{error}</p>}
    </motion.div>
  );
}
