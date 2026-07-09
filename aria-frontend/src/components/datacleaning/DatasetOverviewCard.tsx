"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { DatasetOverview } from "@/lib/api/types";

const DTYPE_COLORS: Record<string, string> = {
  numeric: "#34d399",
  categorical: "#22d3ee",
  datetime: "#a78bfa",
  boolean: "#fbbf24",
  other: "#71717a",
};

function classifyDtype(dtype: string): string {
  const lower = dtype.toLowerCase();
  if (lower.includes("int") || lower.includes("float")) return "numeric";
  if (lower.includes("datetime")) return "datetime";
  if (lower.includes("bool")) return "boolean";
  if (lower.includes("object") || lower.includes("category")) return "categorical";
  return "other";
}

export function DatasetOverviewCard({ overview }: { overview: DatasetOverview }) {
  const counts: Record<string, number> = {};
  Object.values(overview.dtypes).forEach((dtype) => {
    const key = classifyDtype(dtype);
    counts[key] = (counts[key] ?? 0) + 1;
  });
  const chartData = Object.entries(counts).map(([name, value]) => ({ name, value }));

  const stats = [
    { label: "Rows", value: overview.rows.toLocaleString() },
    { label: "Columns", value: overview.columns.toLocaleString() },
    { label: "Memory", value: overview.memory_usage_human },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
      <h3 className="mb-4 text-sm font-medium text-zinc-200">Dataset Overview</h3>
      <div className="flex items-center gap-5">
        <div className="h-28 w-28 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={32}
                outerRadius={52}
                paddingAngle={3}
                stroke="none"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={DTYPE_COLORS[entry.name] ?? "#71717a"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#0a0a0a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2.5">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">{stat.label}</span>
              <span className="text-sm font-semibold text-zinc-100">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {chartData.map((entry) => (
          <span
            key={entry.name}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-zinc-400"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: DTYPE_COLORS[entry.name] ?? "#71717a" }}
            />
            {entry.name} · {entry.value}
          </span>
        ))}
      </div>
    </div>
  );
}
