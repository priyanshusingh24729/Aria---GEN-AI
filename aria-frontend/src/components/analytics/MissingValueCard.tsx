"use client";

import { motion } from "framer-motion";
import { PieChart } from "lucide-react";
import type { MissingValueReport } from "@/lib/api/types";
import { AnimatedSection, Card, SectionHeading } from "./ui";

export function MissingValueCard({ report }: { report: MissingValueReport[] }) {
  if (report.length === 0) return null;
  const sorted = [...report].sort((a, b) => b.missing_percentage - a.missing_percentage);

  return (
    <AnimatedSection delay={0.35}>
      <SectionHeading
        title="Missing Value Report"
        subtitle={`${report.length} column${report.length === 1 ? "" : "s"} with missing data`}
        icon={<PieChart size={16} />}
      />
      <Card>
        <div className="space-y-3">
          {sorted.map((row) => (
            <div key={row.column}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-slate-300">{row.column}</span>
                <span className="tabular-nums text-slate-500">
                  {row.missing_count.toLocaleString()} · {row.missing_percentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${row.missing_percentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full rounded-full bg-amber-400"
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </AnimatedSection>
  );
}
