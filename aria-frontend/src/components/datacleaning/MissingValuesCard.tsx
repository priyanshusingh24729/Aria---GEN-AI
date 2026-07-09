"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import type { MissingValuesReport } from "@/types/datacleaning";
import { EmptyState } from "./EmptyState";

export function MissingValuesCard({ report }: { report: MissingValuesReport }) {
  if (report.total_missing === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
        <h3 className="mb-4 text-sm font-medium text-zinc-200">Missing Values</h3>
        <EmptyState icon="✨" title="No missing values" description="This dataset is fully populated." />
      </div>
    );
  }

  const chartData = report.columns_affected
    .slice()
    .sort((a, b) => b.missing_count - a.missing_count)
    .slice(0, 8)
    .map((c) => ({ column: c.column, missing: c.missing_count, pct: c.missing_percentage }));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-zinc-200">Missing Values</h3>
        <span className="text-xs text-amber-300">{report.total_missing.toLocaleString()} total</span>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="column"
              width={90}
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{
                background: "#0a0a0a",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="missing" radius={[0, 6, 6, 0]} fill="#fbbf24" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px] text-zinc-500">
        Across {report.columns_affected.length} column{report.columns_affected.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
