"use client";

import { ChevronDown, FileText } from "lucide-react";
import { useState } from "react";
import type { RagSource } from "@/lib/api/types";

export function SourceList({ sources }: { sources: RagSource[] }) {
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mt-2 rounded-[8px] border border-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3.5 py-2 text-left text-[0.8rem] text-text-dim"
      >
        <span>
          📖 Sources Used <span className="text-text-dimmer">({sources.length})</span>
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border px-3.5 py-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {sources.map((src, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface2 px-2.5 py-1 text-[0.74rem] text-text-dim"
              >
                <FileText className="h-3 w-3" />
                {src.source_file}
                {src.page !== null && ` · p.${src.page + 1}`}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {sources.map((src, i) => (
              <div
                key={i}
                className="rounded-[8px] border border-border bg-surface2 px-3 py-2 text-[0.8rem] leading-relaxed text-text-dim"
              >
                {src.content}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
