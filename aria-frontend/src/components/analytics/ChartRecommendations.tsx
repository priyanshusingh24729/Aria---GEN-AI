"use client";

import { useMemo, useState } from "react";
import {
  Wand2,
  BarChart2,
  LineChart as LineIcon,
  PieChart as PieIcon,
  ScatterChart as ScatterIcon,
  Grid3x3,
  BarChartHorizontal,
} from "lucide-react";
import type { ChartConfig, ChartRecommendation } from "@/lib/api/types";
import { AnimatedSection, Card, SectionHeading } from "./ui";
import { useAnalyticsContext } from "@/context/AnalyticsContext";
import SqlChart from "@/components/chat/SqlChart";

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  "Bar Chart": BarChart2,
  "Pie Chart": PieIcon,
  Histogram: BarChartHorizontal,
  "Scatter Plot": ScatterIcon,
  "Line Chart": LineIcon,
  Heatmap: Grid3x3,
};

// Bins a numeric column into ~10 buckets so "Histogram" recommendations can
// be rendered with the existing bar-chart renderer.
function buildHistogram(records: Record<string, unknown>[], column: string) {
  const values = records
    .map((r) => Number(r[column]))
    .filter((v) => Number.isFinite(v));
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ bin: min.toFixed(1), count: values.length }];

  const bucketCount = 10;
  const width = (max - min) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    bin: `${(min + i * width).toFixed(1)}–${(min + (i + 1) * width).toFixed(1)}`,
    count: 0,
  }));
  for (const v of values) {
    const idx = Math.min(bucketCount - 1, Math.floor((v - min) / width));
    buckets[idx].count += 1;
  }
  return buckets;
}

function buildChartConfig(
  rec: ChartRecommendation,
  records: Record<string, unknown>[]
): ChartConfig | null {
  switch (rec.chart_type) {
    case "Bar Chart": {
      const [catCol, numCol] = rec.columns;
      const totals = new Map<string, number>();
      for (const r of records) {
        const key = String(r[catCol] ?? "—");
        const val = Number(r[numCol]) || 0;
        totals.set(key, (totals.get(key) ?? 0) + val);
      }
      const data = Array.from(totals.entries())
        .map(([name, value]) => ({ [catCol]: name, [numCol]: value }))
        .sort((a, b) => Number(b[numCol]) - Number(a[numCol]))
        .slice(0, 25);
      return { type: "bar", title: rec.reason, xKey: catCol, yKey: numCol, data };
    }
    case "Pie Chart": {
      const [catCol] = rec.columns;
      const counts = new Map<string, number>();
      for (const r of records) {
        const key = String(r[catCol] ?? "—");
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      const data = Array.from(counts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12);
      return { type: "pie", title: rec.reason, nameKey: "name", valueKey: "count", data };
    }
    case "Histogram": {
      const [numCol] = rec.columns;
      const data = buildHistogram(records, numCol);
      return { type: "bar", title: rec.reason, xKey: "bin", yKey: "count", data };
    }
    case "Scatter Plot": {
      const [xCol, yCol] = rec.columns;
      const data = records.map((r) => ({ [xCol]: r[xCol], [yCol]: r[yCol] }));
      return { type: "scatter", title: rec.reason, xKey: xCol, yKey: yCol, data };
    }
    case "Line Chart": {
      const [dtCol, numCol] = rec.columns;
      const data = records
        .filter((r) => r[dtCol] !== null && r[dtCol] !== undefined)
        .map((r) => ({ [dtCol]: String(r[dtCol]), [numCol]: Number(r[numCol]) || 0 }))
        .sort((a, b) => String(a[dtCol]).localeCompare(String(b[dtCol])));
      return { type: "line", title: rec.reason, xKey: dtCol, yKey: numCol, data };
    }
    default:
      return null; // e.g. "Heatmap" — already covered by the Correlation section
  }
}

export function ChartRecommendations({ charts }: { charts: ChartRecommendation[] }) {
  const { records } = useAnalyticsContext();
  const [active, setActive] = useState<number | null>(null);

  if (charts.length === 0) return null;

  return (
    <AnimatedSection delay={0.45}>
      <SectionHeading
        title="Recommended Charts"
        subtitle="Suggested visualizations based on your column types"
        icon={<Wand2 size={16} />}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {charts.map((rec, i) => {
          const Icon = ICONS[rec.chart_type] ?? BarChart2;
          const isActive = active === i;
          return (
            <Card key={i} className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-400">
                  <Icon size={14} />
                </div>
                <p className="text-sm font-medium text-white">{rec.chart_type}</p>
              </div>
              <p className="text-xs text-slate-500">{rec.reason}</p>
              <p className="truncate text-[0.68rem] text-slate-600">{rec.columns.join(" · ")}</p>
              <button
                onClick={() => setActive(isActive ? null : i)}
                disabled={!records || rec.chart_type === "Heatmap"}
                className="mt-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[0.72rem] font-medium text-slate-200 transition hover:border-violet-500/40 hover:text-violet-300 disabled:opacity-40"
              >
                {rec.chart_type === "Heatmap"
                  ? "See Correlation section"
                  : isActive
                    ? "Hide Chart"
                    : "Generate Chart"}
              </button>

              {isActive && records && (
                <ChartPreview rec={rec} records={records} />
              )}
            </Card>
          );
        })}
      </div>
    </AnimatedSection>
  );
}

function ChartPreview({
  rec,
  records,
}: {
  rec: ChartRecommendation;
  records: Record<string, unknown>[];
}) {
  const config = useMemo(() => buildChartConfig(rec, records), [rec, records]);
  if (!config) return null;
  return (
    <div className="mt-1 -mx-1">
      <SqlChart chart={config} />
    </div>
  );
}
