"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useDataCleaning } from "@/context/DataCleaningContext";
import type { CleaningOperation, OperationId } from "@/types/datacleaning";
import { RecommendationCard } from "./RecommendationCard";
import { EmptyState } from "./EmptyState";

export function CleaningPanel() {
  const { recommendations, applyCleaning, isLoading } = useDataCleaning();
  const [selected, setSelected] = useState<Set<OperationId>>(new Set());

  const toggle = (id: OperationId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = () => {
    const operations: CleaningOperation[] = Array.from(selected).map((id) => ({ id, params: {} }));
    void applyCleaning(operations);
  };

  if (recommendations.length === 0) {
    return (
      <EmptyState
        icon="✨"
        title="Nothing to clean"
        description="We didn't find any issues that need attention right now."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {recommendations.map((rec) => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            checked={selected.has(rec.id)}
            onToggle={toggle}
          />
        ))}
      </div>

      <motion.div
        initial={false}
        animate={{ opacity: selected.size > 0 ? 1 : 0.5 }}
        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur-xl"
      >
        <span className="text-xs text-zinc-500">
          {selected.size} operation{selected.size === 1 ? "" : "s"} selected
        </span>
        <button
          disabled={selected.size === 0 || isLoading}
          onClick={handleApply}
          className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:shadow-[0_0_24px_rgba(52,211,153,0.35)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          Apply Cleaning
        </button>
      </motion.div>
    </div>
  );
}
