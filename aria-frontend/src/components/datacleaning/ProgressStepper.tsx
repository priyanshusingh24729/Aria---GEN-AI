"use client";

import { motion } from "framer-motion";
import type { DataCleaningStep } from "@/lib/api/types";

const STEPS: { key: DataCleaningStep; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "analysis", label: "Analyze" },
  { key: "preview", label: "Preview" },
  { key: "cleaning", label: "Clean" },
  { key: "feature-engineering", label: "Engineer" },
  { key: "feature-extraction", label: "Select" },
  { key: "finalize", label: "Finalize" },
];

export function ProgressStepper({ current }: { current: DataCleaningStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="flex w-full items-center gap-1 overflow-x-auto pb-1">
      {STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isActive = index === currentIndex;
        return (
          <div key={step.key} className="flex flex-1 items-center gap-1 min-w-[92px]">
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors duration-300",
                  isActive
                    ? "border-emerald-400 bg-emerald-400/10 text-emerald-300 shadow-[0_0_0_4px_rgba(52,211,153,0.08)]"
                    : isDone
                    ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300"
                    : "border-white/10 bg-white/[0.03] text-zinc-500",
                ].join(" ")}
              >
                {isDone ? "✓" : index + 1}
              </div>
              <span
                className={[
                  "text-[11px] whitespace-nowrap tracking-wide",
                  isActive ? "text-emerald-300 font-medium" : "text-zinc-500",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className="relative -mt-4 h-px flex-1 bg-white/10 overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-emerald-400/70"
                  initial={false}
                  animate={{ width: index < currentIndex ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
