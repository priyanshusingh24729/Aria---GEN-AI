"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Sigma } from "lucide-react";
import type { NumericColumnStats } from "@/lib/api/types";
import { AnimatedSection, Card, SectionHeading } from "./ui";
import { formatNumber } from "@/lib/analytics-format";

type SortKey = keyof NumericColumnStats;

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "column", label: "Column" },
  { key: "count", label: "Count" },
  { key: "mean", label: "Mean" },
  { key: "median", label: "Median" },
  { key: "minimum", label: "Min" },
  { key: "maximum", label: "Max" },
  { key: "std", label: "Std" },
  { key: "variance", label: "Variance" },
  { key: "p25", label: "25%" },
  { key: "p50", label: "50%" },
  { key: "p75", label: "75%" },
];

export function StatisticsTable({ stats }: { stats: NumericColumnStats[] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("column");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const rows = useMemo(() => {
    const filtered = stats.filter((row) =>
      row.column.toLowerCase().includes(query.trim().toLowerCase())
    );
    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
    return sorted;
  }, [stats, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  if (stats.length === 0) return null;

  return (
    <AnimatedSection delay={0.1}>
      <SectionHeading
        title="Numeric Statistics"
        subtitle={`${stats.length} numeric column${stats.length === 1 ? "" : "s"}`}
        icon={<Sigma size={16} />}
        action={
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search columns…"
              className="w-44 rounded-lg border border-white/[0.08] bg-white/[0.03] py-1.5 pl-8 pr-3 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-violet-500/40"
            />
          </div>
        }
      />
      <Card padded={false} className="overflow-hidden">
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-[#0d1420]">
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="cursor-pointer select-none whitespace-nowrap border-b border-white/[0.08] px-4 py-2.5 font-medium text-slate-400 hover:text-violet-300"
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ArrowUp size={11} />
                        ) : (
                          <ArrowDown size={11} />
                        )
                      ) : (
                        <ArrowUpDown size={11} className="opacity-30" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.column} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-200">
                    {row.column}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-400">{formatNumber(row.count, 0)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-400">{formatNumber(row.mean)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-400">{formatNumber(row.median)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-400">{formatNumber(row.minimum)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-400">{formatNumber(row.maximum)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-400">{formatNumber(row.std)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-400">{formatNumber(row.variance)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-400">{formatNumber(row.p25)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-400">{formatNumber(row.p50)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-400">{formatNumber(row.p75)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-slate-500">
                    No columns match &quot;{query}&quot;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AnimatedSection>
  );
}
