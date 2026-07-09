"use client";

import { ShieldAlert } from "lucide-react";
import type { OutlierReport } from "@/lib/api/types";
import { AnimatedSection, Badge, Card, SectionHeading } from "./ui";

function statusFor(pct: number): { label: string; tone: "good" | "warn" | "bad" } {
  if (pct >= 10) return { label: "High", tone: "bad" };
  if (pct >= 3) return { label: "Moderate", tone: "warn" };
  return { label: "Low", tone: "good" };
}

export function OutlierTable({ outliers }: { outliers: OutlierReport[] }) {
  if (outliers.length === 0) return null;

  return (
    <AnimatedSection delay={0.3}>
      <SectionHeading
        title="Outlier Report"
        subtitle="IQR method — 1.5× interquartile range"
        icon={<ShieldAlert size={16} />}
      />
      <Card padded={false} className="overflow-hidden">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="bg-[#0d1420]">
            <tr>
              <th className="border-b border-white/[0.08] px-4 py-2.5 font-medium text-slate-400">Column</th>
              <th className="border-b border-white/[0.08] px-4 py-2.5 font-medium text-slate-400">Outlier Count</th>
              <th className="border-b border-white/[0.08] px-4 py-2.5 font-medium text-slate-400">Percentage</th>
              <th className="border-b border-white/[0.08] px-4 py-2.5 font-medium text-slate-400">Bounds</th>
              <th className="border-b border-white/[0.08] px-4 py-2.5 font-medium text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {outliers.map((o) => {
              const status = statusFor(o.outlier_percentage);
              return (
                <tr key={o.column} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 font-medium text-slate-200">{o.column}</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-400">{o.outlier_count.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-400">{o.outlier_percentage.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-500">
                    [{o.lower_bound.toFixed(2)}, {o.upper_bound.toFixed(2)}]
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </AnimatedSection>
  );
}
