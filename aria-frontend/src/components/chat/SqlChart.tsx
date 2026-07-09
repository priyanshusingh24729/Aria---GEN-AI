"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ChartConfig } from "@/lib/api/types";

interface SqlChartProps {
  chart: ChartConfig;
}

// High-contrast palette for dark backgrounds
const COLORS = [
  "#22d3ee", // cyan — primary
  "#a78bfa", // violet
  "#34d399", // emerald
  "#fb923c", // orange
  "#f472b6", // pink
  "#facc15", // yellow
  "#60a5fa", // blue
];

const AXIS_COLOR = "#4b5563";
const GRID_COLOR = "#1f2937";
const TICK_STYLE = { fontSize: 11, fill: "#9ca3af" } as const;
const LEGEND_STYLE = { fontSize: 12, color: "#9ca3af" } as const;

const TOOLTIP_STYLE = {
  background: "#0d1117",
  border: "1px solid #1f2937",
  borderRadius: "0.5rem",
  fontSize: 13,
  color: "#e5e7eb",
  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
} as const;

// How many data points to show per page for bar / line
const PAGE_SIZE = 15;

// ── Helpers ──────────────────────────────────────────────────────────────────

function truncate(str: unknown, max = 13): string {
  const s = String(str ?? "");
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function yFormat(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: unknown; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ ...TOOLTIP_STYLE, padding: "10px 14px", minWidth: 160, maxWidth: 300 }}>
      <p style={{ margin: "0 0 6px", fontSize: 12, color: "#6b7280", wordBreak: "break-word" }}>
        {label}
      </p>
      {payload.map((entry, i) => (
        <p key={i} style={{ margin: "2px 0", color: entry.color, fontWeight: 600, fontSize: 13 }}>
          {entry.name}:{" "}
          <span style={{ color: "#e5e7eb" }}>
            {typeof entry.value === "number"
              ? entry.value.toLocaleString()
              : String(entry.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

// ── Pagination controls ───────────────────────────────────────────────────────

// Max visible dots — beyond this we show a progress bar instead
const MAX_DOTS = 12;

function PaginationBar({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;

  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalItems);
  const useDots = totalPages <= MAX_DOTS;
  const progressPct = ((page + 1) / totalPages) * 100;

  return (
    <div className="flex items-center gap-3 border-t border-[#1f2937] px-4 py-2.5 mt-1">

      {/* Prev button */}
      <button
        onClick={onPrev}
        disabled={page === 0}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#1f2937] bg-[#141824] text-[#9ca3af] transition hover:border-cyan-500 hover:text-cyan-400 disabled:opacity-25 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={14} />
      </button>

      {/* Middle — dots or progress bar */}
      <div className="flex flex-1 min-w-0 flex-col gap-1">
        {useDots ? (
          <div className="flex gap-1 justify-center">
            {Array.from({ length: totalPages }).map((_, i) => (
              <span
                key={i}
                className={`inline-block h-1.5 rounded-full transition-all duration-200 ${
                  i === page ? "w-4 bg-cyan-400" : "w-1.5 bg-[#374151]"
                }`}
              />
            ))}
          </div>
        ) : (
          <div className="w-full h-1.5 rounded-full bg-[#1f2937] overflow-hidden">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
        <p className="text-center text-[0.68rem] text-[#6b7280] tabular-nums leading-none">
          <span className="text-[#9ca3af] font-medium">{from}–{to}</span>
          {" "}of{" "}
          <span className="text-[#9ca3af] font-medium">{totalItems}</span>
          {" "}·{" "}
          <span className="text-cyan-500">{page + 1}</span>
          <span className="text-[#4b5563]">/{totalPages}</span>
        </p>
      </div>

      {/* Next button */}
      <button
        onClick={onNext}
        disabled={page === totalPages - 1}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#1f2937] bg-[#141824] text-[#9ca3af] transition hover:border-cyan-500 hover:text-cyan-400 disabled:opacity-25 disabled:cursor-not-allowed"
      >
        <ChevronRight size={14} />
      </button>

    </div>
  );
}

// ── Bar chart with pagination ─────────────────────────────────────────────────

function PaginatedBarChart({
  data,
  xKey,
  yKey,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const slice = useMemo(
    () => data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [data, page]
  );

  return (
    <>
      <ResponsiveContainer width="100%" height={380}>
        <BarChart data={slice} margin={{ top: 8, right: 16, left: 0, bottom: 60 }}>
          <CartesianGrid vertical={false} stroke={GRID_COLOR} />
          <XAxis
            dataKey={xKey}
            tick={{ ...TICK_STYLE }}
            tickLine={false}
            axisLine={{ stroke: AXIS_COLOR }}
            tickFormatter={(v) => truncate(v)}
            angle={-40}
            textAnchor="end"
            interval={0}
            height={64}
          />
          <YAxis
            tick={{ ...TICK_STYLE }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={yFormat}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#ffffff08" }} />
          <Legend wrapperStyle={LEGEND_STYLE} />
          <Bar dataKey={yKey} fill={COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
      <PaginationBar
        page={page}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        totalItems={data.length}
        onPrev={() => setPage((p) => Math.max(0, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
      />
    </>
  );
}

// ── Line chart with pagination ────────────────────────────────────────────────

function PaginatedLineChart({
  data,
  xKey,
  yKey,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const slice = useMemo(
    () => data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [data, page]
  );

  return (
    <>
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={slice} margin={{ top: 8, right: 16, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis
            dataKey={xKey}
            tick={{ ...TICK_STYLE }}
            tickLine={false}
            axisLine={{ stroke: AXIS_COLOR }}
            tickFormatter={(v) => truncate(v)}
            angle={-40}
            textAnchor="end"
            interval={0}
            height={64}
          />
          <YAxis
            tick={{ ...TICK_STYLE }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={yFormat}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={LEGEND_STYLE} />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={COLORS[0]}
            strokeWidth={2.5}
            dot={{ r: 3, fill: COLORS[0], strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#fff", stroke: COLORS[0], strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <PaginationBar
        page={page}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        totalItems={data.length}
        onPrev={() => setPage((p) => Math.max(0, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
      />
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SqlChart({ chart }: SqlChartProps) {
  const { type, title, data, xKey, yKey, nameKey, valueKey } = chart;

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 rounded-xl border border-[#1f2937] bg-[#0d1117] text-sm text-[#6b7280]">
        No chart data available.
      </div>
    );
  }

  const renderBody = () => {
    switch (type) {
      case "bar": {
        if (!xKey || !yKey) return null;
        return <PaginatedBarChart data={data} xKey={xKey} yKey={yKey} />;
      }

      case "line": {
        if (!xKey || !yKey) return null;
        return <PaginatedLineChart data={data} xKey={xKey} yKey={yKey} />;
      }

      case "pie": {
        if (!nameKey || !valueKey) return null;
        // For many slices, hide inline labels and rely on tooltip + legend only
        const manySlices = data.length > 8;
        return (
          <ResponsiveContainer width="100%" height={420}>
            <PieChart margin={{ top: 16, right: 24, left: 24, bottom: 16 }}>
              <Pie
                data={data}
                dataKey={valueKey}
                nameKey={nameKey}
                cx="50%"
                cy="45%"
                outerRadius={manySlices ? 140 : 130}
                innerRadius={manySlices ? 64 : 56}
                paddingAngle={manySlices ? 1 : 3}
                label={
                  manySlices
                    ? false
                    : ({ name, percent }: { name?: string; percent?: number }) =>
                        `${truncate(name ?? "", 12)} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={!manySlices && { stroke: "#374151", strokeWidth: 1 }}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ ...LEGEND_STYLE, paddingTop: 16 }}
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                formatter={(value: string) => truncate(value, 18)}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      }

      case "scatter": {
        if (!xKey || !yKey) return null;

        // Detect if xKey is numeric across the dataset
        const xIsNumeric = data.every(
          (r) => r[xKey] !== null && r[xKey] !== "" && !isNaN(Number(r[xKey]))
        );
        const yIsNumeric = data.every(
          (r) => r[yKey] !== null && r[yKey] !== "" && !isNaN(Number(r[yKey]))
        );

        // ── Both axes numeric: true scatter ──────────────────────
        if (xIsNumeric && yIsNumeric) {
          const scatterData = data.map((r) => ({
            ...r,
            [xKey]: Number(r[xKey]),
            [yKey]: Number(r[yKey]),
          }));
          return (
            <ResponsiveContainer width="100%" height={380}>
              <ScatterChart margin={{ top: 16, right: 24, left: 0, bottom: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis
                  dataKey={xKey}
                  type="number"
                  name={xKey}
                  tick={{ ...TICK_STYLE }}
                  tickLine={false}
                  axisLine={{ stroke: AXIS_COLOR }}
                  tickFormatter={yFormat}
                  label={{ value: xKey, position: "insideBottom", offset: -12, fontSize: 11, fill: "#6b7280" }}
                />
                <YAxis
                  dataKey={yKey}
                  type="number"
                  name={yKey}
                  tick={{ ...TICK_STYLE }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  tickFormatter={yFormat}
                  label={{ value: yKey, angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "#6b7280" }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3", stroke: "#374151" }} />
                <Scatter data={scatterData} fill={COLORS[0]} opacity={0.85} />
              </ScatterChart>
            </ResponsiveContainer>
          );
        }

        // ── Categorical X + numeric Y: dot-plot / bubble chart ───
        // Map string labels to numeric indices, render as bar-style dots
        const labels = [...new Set(data.map((r) => String(r[xKey] ?? "")))];
        const dotData = data.map((r, i) => ({
          index: labels.indexOf(String(r[xKey] ?? "")),
          label: String(r[xKey] ?? ""),
          value: Number(r[yKey]) || 0,
          _i: i,
        }));

        return (
          <div className="flex flex-col gap-2">
            {/* Info banner */}
            <div className="flex items-center gap-2 rounded-lg border border-[#1f2937] bg-[#141824] px-3 py-2 text-[0.72rem] text-[#9ca3af]">
              <span className="text-cyan-400">ⓘ</span>
              <span>
                <strong className="text-white">{xKey}</strong> is categorical — showing a dot plot.
                Switch to <strong className="text-white">Bar</strong> for a better view.
              </span>
            </div>

            <ResponsiveContainer width="100%" height={360}>
              <ScatterChart margin={{ top: 16, right: 24, left: 0, bottom: 56 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis
                  dataKey="index"
                  type="number"
                  domain={[-0.5, labels.length - 0.5]}
                  ticks={labels.map((_, i) => i)}
                  tickFormatter={(i: number) => truncate(labels[i] ?? "", 12)}
                  tick={{ ...TICK_STYLE }}
                  tickLine={false}
                  axisLine={{ stroke: AXIS_COLOR }}
                  angle={-40}
                  textAnchor="end"
                  height={72}
                  interval={0}
                />
                <YAxis
                  dataKey="value"
                  type="number"
                  tick={{ ...TICK_STYLE }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  tickFormatter={yFormat}
                  label={{ value: yKey, angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "#6b7280" }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload as { label: string; value: number } | undefined;
                    if (!d) return null;
                    return (
                      <div style={{ ...TOOLTIP_STYLE, padding: "10px 14px", minWidth: 160 }}>
                        <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b7280", wordBreak: "break-word" }}>
                          {d.label}
                        </p>
                        <p style={{ margin: 0, color: COLORS[0], fontWeight: 600, fontSize: 13 }}>
                          {yKey}: <span style={{ color: "#e5e7eb" }}>{d.value.toLocaleString()}</span>
                        </p>
                      </div>
                    );
                  }}
                  cursor={{ strokeDasharray: "3 3", stroke: "#374151" }}
                />
                <Scatter
                  data={dotData}
                  fill={COLORS[0]}
                  opacity={0.9}
                  shape={(props: any) => { 
                    const cx = typeof props.cx === "number" ? props.cx : 0;
                    const cy = typeof props.cy === "number" ? props.cy : 0;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill={COLORS[0]}
                        stroke="#0d1117"
                        strokeWidth={1.5}
                        opacity={0.9}
                      />
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        );
      }

      default:
        return (
          <div className="flex items-center justify-center h-40 text-sm text-[#6b7280]">
            Unsupported chart type: {type}
          </div>
        );
    }
  };

  const body = renderBody();

  return (
    <div className="rounded-xl border border-[#1f2937] bg-[#0d1117] shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-[#1f2937] bg-[#111827] px-5 py-3">
        <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
        <p className="text-[0.8rem] font-semibold text-white tracking-wide truncate">
          {title || "Visualization"}
        </p>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {data.length > PAGE_SIZE && (type === "bar" || type === "line") && (
            <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[0.65rem] text-cyan-400 font-medium">
              {data.length} pts · paginated
            </span>
          )}
          <span className="rounded-md border border-[#1f2937] bg-[#141824] px-2 py-0.5 text-[0.68rem] font-mono uppercase tracking-widest text-[#6b7280]">
            {type}
          </span>
        </div>
      </div>

      {/* Body */}
      {body ? (
        <div className="px-2 pt-4 pb-1">{body}</div>
      ) : (
        <div className="flex items-center justify-center h-40 text-sm text-[#6b7280]">
          Missing required keys for chart type &quot;{type}&quot;.
        </div>
      )}
    </div>
  );
}