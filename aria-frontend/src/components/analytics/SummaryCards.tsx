"use client";

import { Rows3, Columns3, MemoryStick, AlertTriangle, Copy, Gauge } from "lucide-react";
import type { DatasetSummary, DataQualityScore } from "@/lib/api/types";
import { AnimatedSection, SectionHeading, StatTile } from "./ui";
import { formatNumber, qualityColor } from "@/lib/analytics-format";

export function SummaryCards({
  summary,
  quality,
}: {
  summary: DatasetSummary;
  quality: DataQualityScore;
}) {
  return (
    <AnimatedSection>
      <SectionHeading title="Dataset Summary" subtitle="Shape, size, and cleanliness at a glance" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Total Rows" value={formatNumber(summary.total_rows, 0)} icon={<Rows3 size={16} />} />
        <StatTile
          label="Total Columns"
          value={formatNumber(summary.total_columns, 0)}
          icon={<Columns3 size={16} />}
        />
        <StatTile
          label="Memory Usage"
          value={summary.memory_usage_readable}
          icon={<MemoryStick size={16} />}
        />
        <StatTile
          label="Missing Values"
          value={`${formatNumber(summary.missing_values, 0)}`}
          hint={`${summary.missing_percentage.toFixed(1)}% of cells`}
          icon={<AlertTriangle size={16} />}
        />
        <StatTile
          label="Duplicate Rows"
          value={formatNumber(summary.duplicate_rows, 0)}
          icon={<Copy size={16} />}
        />
        <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between">
            <p className="text-[0.7rem] uppercase tracking-wider text-slate-500">Data Quality</p>
            <Gauge size={16} style={{ color: qualityColor(quality.score) }} />
          </div>
          <p
            className="mt-2 text-2xl font-semibold tabular-nums"
            style={{ color: qualityColor(quality.score) }}
          >
            {quality.score.toFixed(0)}
            <span className="text-sm text-slate-500">/100</span>
          </p>
        </div>
      </div>
    </AnimatedSection>
  );
}
