"use client";

import type { DuplicateReport } from "@/types/datacleaning";

export function DuplicateCard({ report }: { report: DuplicateReport }) {
  const hasIssues = report.duplicate_row_count > 0 || report.duplicate_column_count > 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
      <h3 className="mb-4 text-sm font-medium text-zinc-200">Duplicates</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
          <p className="text-2xl font-semibold text-zinc-100">{report.duplicate_row_count}</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">Duplicate rows</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
          <p className="text-2xl font-semibold text-zinc-100">{report.duplicate_column_count}</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">Duplicate columns</p>
        </div>
      </div>
      {hasIssues && report.duplicate_column_names.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {report.duplicate_column_names.map((col) => (
            <span
              key={col}
              className="rounded-full border border-rose-500/20 bg-rose-500/[0.06] px-2.5 py-1 text-[11px] text-rose-300"
            >
              {col}
            </span>
          ))}
        </div>
      )}
      {!hasIssues && <p className="mt-3 text-xs text-zinc-500">No duplicates detected. ✨</p>}
    </div>
  );
}
