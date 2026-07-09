"use client";

import { useState } from "react";
import { useDataCleaning } from "@/context/DataCleaningContext";
import type { ExportFormat } from "@/types/datacleaning";

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "Excel" },
  { value: "json", label: "JSON" },
];

export function FinalizeCard() {
  const { finalize, isLoading, finalReport } = useDataCleaning();
  const [format, setFormat] = useState<ExportFormat>("csv");

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
      <h3 className="mb-1 text-sm font-medium text-zinc-200">Finalize Dataset</h3>
      <p className="mb-4 text-xs text-zinc-500">
        Export your cleaned dataset and generate a full summary report.
      </p>

      <div className="mb-4 flex gap-2">
        {FORMATS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFormat(f.value)}
            className={[
              "rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors",
              format === f.value
                ? "border-emerald-400/50 bg-emerald-400/[0.08] text-emerald-300"
                : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>

      <button
        disabled={isLoading}
        onClick={() => void finalize(format)}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 py-3 text-sm font-semibold text-black transition-shadow hover:shadow-[0_0_24px_rgba(52,211,153,0.35)] disabled:opacity-40 sm:w-auto sm:px-8"
      >
        {finalReport ? "Re-generate Report" : "Finalize & Generate Report"}
      </button>
    </div>
  );
}
