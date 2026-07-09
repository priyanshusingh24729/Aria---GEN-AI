"use client";

import { useMemo, useState } from "react";
import { LineChart as LineChartIcon } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ChartConfig, TrendAnalysis, TrendGranularity } from "@/lib/api/types";
import { AnimatedSection, Card, SectionHeading } from "./ui";
import SqlChart from "@/components/chat/SqlChart";

type ChartKind = "line" | "bar" | "area";

const GRANULARITY_ORDER: TrendGranularity[] = ["day", "week", "month", "year"];

function bestGranularity(available: TrendGranularity[]): TrendGranularity {
  // Prefer month for readability; fall back through the ordered list.
  if (available.includes("month")) return "month";
  return GRANULARITY_ORDER.find((g) => available.includes(g)) ?? available[0];
}

function AreaTrend({ data, metric }: { data: { period: string; value: number }[]; metric: string }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#1f2937" />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={{ stroke: "#4b5563" }}
          angle={-35}
          textAnchor="end"
          height={56}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} width={56} />
        <Tooltip
          contentStyle={{
            background: "#0d1420",
            border: "1px solid #1f2937",
            borderRadius: "0.75rem",
            fontSize: 12,
          }}
          labelStyle={{ color: "#6b7280" }}
        />
        <Area type="monotone" dataKey="value" name={metric} stroke="#A78BFA" strokeWidth={2.5} fill="url(#trendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function TrendWidget({ metricColumn, seriesByGranularity }: {
  metricColumn: string;
  seriesByGranularity: Partial<Record<TrendGranularity, { period: string; value: number }[]>>;
}) {
  const available = (Object.keys(seriesByGranularity) as TrendGranularity[]).filter(
    (g) => (seriesByGranularity[g]?.length ?? 0) > 0
  );
  const [granularity, setGranularity] = useState<TrendGranularity>(bestGranularity(available));
  const [kind, setKind] = useState<ChartKind>("line");

  const points = seriesByGranularity[granularity] ?? [];

  const chartConfig: ChartConfig = useMemo(
    () => ({
      type: kind === "area" ? "line" : kind,
      title: `${metricColumn} over time`,
      xKey: "period",
      yKey: "value",
      data: points,
    }),
    [kind, metricColumn, points]
  );

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] px-4 py-2.5">
        <p className="mr-auto truncate text-xs font-semibold text-white">{metricColumn}</p>

        <div className="flex overflow-hidden rounded-md border border-white/[0.08]">
          {available.map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-2.5 py-1 text-[0.68rem] capitalize transition ${
                granularity === g ? "bg-violet-500/20 text-violet-300" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="flex overflow-hidden rounded-md border border-white/[0.08]">
          {(["line", "bar", "area"] as ChartKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`px-2.5 py-1 text-[0.68rem] capitalize transition ${
                kind === k ? "bg-violet-500/20 text-violet-300" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 pb-2 pt-3">
        {points.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-600">
            No data points at this granularity.
          </div>
        ) : kind === "area" ? (
          <AreaTrend data={points} metric={metricColumn} />
        ) : (
          <SqlChart chart={chartConfig} />
        )}
      </div>
    </Card>
  );
}

export function TrendCharts({ trend }: { trend: TrendAnalysis }) {
  const byMetric = useMemo(() => {
    const grouped = new Map<string, Partial<Record<TrendGranularity, { period: string; value: number }[]>>>();
    for (const s of trend.series) {
      if (!grouped.has(s.metric_column)) grouped.set(s.metric_column, {});
      grouped.get(s.metric_column)![s.granularity as TrendGranularity] = s.points;
    }
    return grouped;
  }, [trend.series]);

  if (!trend.series.length) return null;

  return (
    <AnimatedSection delay={0.2}>
      <SectionHeading
        title="Trend Analysis"
        subtitle={trend.datetime_column ? `Based on ${trend.datetime_column}` : undefined}
        icon={<LineChartIcon size={16} />}
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from(byMetric.entries()).map(([metric, series]) => (
          <TrendWidget key={metric} metricColumn={metric} seriesByGranularity={series} />
        ))}
      </div>
    </AnimatedSection>
  );
}
