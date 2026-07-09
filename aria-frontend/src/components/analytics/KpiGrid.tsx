"use client";

import { TrendingUp } from "lucide-react";
import type { KPI } from "@/lib/api/types";
import { AnimatedSection, SectionHeading } from "./ui";
import { formatKpiValue } from "@/lib/analytics-format";
import { motion } from "framer-motion";

export function KpiGrid({ kpis }: { kpis: KPI[] }) {
  if (kpis.length === 0) return null;

  return (
    <AnimatedSection delay={0.05}>
      <SectionHeading
        title="Key Performance Indicators"
        subtitle="Auto-derived from the dataset's numeric columns"
        icon={<TrendingUp size={16} />}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={`${kpi.label}-${i}`}
            whileHover={{ y: -3 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
          >
            <p className="text-[0.7rem] uppercase tracking-wider text-slate-500">{kpi.label}</p>
            <p className="mt-2 truncate text-xl font-semibold text-white tabular-nums">
              {formatKpiValue(kpi)}
            </p>
            {kpi.source_column && (
              <p className="mt-1 truncate text-[0.68rem] text-slate-600">
                from <span className="text-slate-500">{kpi.source_column}</span>
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </AnimatedSection>
  );
}
