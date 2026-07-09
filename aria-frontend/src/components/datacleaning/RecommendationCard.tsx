"use client";

import { motion } from "framer-motion";
import type { Recommendation } from "@/lib/api/types";

const ICONS: Record<string, string> = {
  remove_duplicate_rows: "🧬",
  remove_duplicate_columns: "🧬",
  fill_missing: "🩹",
  fix_data_types: "🔧",
  trim_whitespace: "✂️",
  standardize_text: "🔤",
  remove_constant_columns: "🪫",
  remove_low_variance_columns: "📉",
  remove_highly_correlated: "🔗",
  remove_outliers: "🎯",
  drop_columns_with_nulls: "🗑️",
  normalize: "📐",
};

export function RecommendationCard({
  recommendation,
  checked,
  onToggle,
}: {
  recommendation: Recommendation;
  checked: boolean;
  onToggle: (id: Recommendation["id"]) => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={() => onToggle(recommendation.id)}
      whileTap={{ scale: 0.98 }}
      className={[
        "flex w-full items-start gap-3 rounded-2xl border p-4 text-left backdrop-blur-xl transition-colors duration-200",
        checked
          ? "border-emerald-400/50 bg-emerald-400/[0.07]"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
      ].join(" ")}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg">
        {ICONS[recommendation.id] ?? "🧹"}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-zinc-100">{recommendation.title}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{recommendation.description}</p>
      </div>
      <div
        className={[
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          checked ? "border-emerald-400 bg-emerald-400 text-black" : "border-white/20 bg-transparent",
        ].join(" ")}
      >
        {checked && "✓"}
      </div>
    </motion.button>
  );
}
