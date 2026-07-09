"use client";

import { motion } from "framer-motion";
import type { CleaningResultItem } from "@/types/datacleaning";
import { EmptyState } from "./EmptyState";

export function CleaningResults({ results }: { results: CleaningResultItem[] }) {
  if (results.length === 0) {
    return <EmptyState icon="🧾" title="No cleaning operations run yet" />;
  }

  const successCount = results.filter((r) => r.success).length;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-1 text-xs text-emerald-300">
          {successCount} succeeded
        </span>
        {successCount < results.length && (
          <span className="rounded-full border border-rose-500/20 bg-rose-500/[0.06] px-3 py-1 text-xs text-rose-300">
            {results.length - successCount} failed
          </span>
        )}
      </div>

      <div className="space-y-2">
        {results.map((result, i) => (
          <motion.div
            key={`${result.id}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className={[
              "flex items-start gap-3 rounded-xl border px-4 py-3 backdrop-blur-xl",
              result.success
                ? "border-emerald-500/15 bg-emerald-500/[0.04]"
                : "border-rose-500/15 bg-rose-500/[0.04]",
            ].join(" ")}
          >
            <span className={result.success ? "text-emerald-400" : "text-rose-400"}>
              {result.success ? "✓" : "✕"}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-100">{result.id}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{result.message}</p>
              {result.success && Object.keys(result.details).length > 0 && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-black/40 p-2 text-[11px] text-zinc-400">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
