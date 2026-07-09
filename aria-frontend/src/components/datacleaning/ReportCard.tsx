"use client";

import { motion } from "framer-motion";
import { useDataCleaning } from "@/context/DataCleaningContext";
import type { CleaningReport, ExportFormat } from "@/types/datacleaning";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
      <p className="text-xl font-semibold text-zinc-100">{value}</p>
      <p className="mt-0.5 text-[11px] text-zinc-500">{label}</p>
    </div>
  );
}

export function ReportCard({ report }: { report: CleaningReport }) {
  const { download, isLoading } = useDataCleaning();
  const format = (new URL(report.download_url ?? "", "http://x").searchParams.get("format") ??
    "csv") as ExportFormat;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-emerald-400/20 bg-gradient-to-b from-emerald-400/[0.06] to-transparent p-6 backdrop-blur-xl"
    >
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-100">Cleaning Report</h3>
        <span className="text-xs text-zinc-500">{report.execution_time_seconds}s</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Rows before" value={report.rows_before.toLocaleString()} />
        <Stat label="Rows after" value={report.rows_after.toLocaleString()} />
        <Stat label="Columns before" value={report.columns_before} />
        <Stat label="Columns after" value={report.columns_after} />
        <Stat label="Missing values removed" value={report.missing_values_removed} />
        <Stat label="Duplicates removed" value={report.duplicates_removed} />
        <Stat label="Features created" value={report.features_created.length} />
        <Stat label="Features removed" value={report.features_removed.length} />
      </div>

      {Object.keys(report.columns_renamed).length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-zinc-400">Columns Renamed</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(report.columns_renamed).map(([from, to]) => (
              <span
                key={from}
                className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-zinc-300"
              >
                {from} → {to}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-zinc-400">Operations Applied</p>
        <div className="flex flex-wrap gap-1.5">
          {report.operations_applied.map((op, i) => (
            <span
              key={`${op}-${i}`}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-zinc-400"
            >
              {op}
            </span>
          ))}
        </div>
      </div>

      <button
        disabled={isLoading}
        onClick={() => void download(format)}
        className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 py-3 text-sm font-semibold text-black transition-shadow hover:shadow-[0_0_24px_rgba(52,211,153,0.35)] disabled:opacity-40 sm:w-auto sm:px-8"
      >
        ⬇ Download Cleaned Dataset
      </button>
    </motion.div>
  );
}
