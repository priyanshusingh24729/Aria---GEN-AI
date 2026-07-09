import type { KPI } from "@/lib/api/types";

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function formatKpiValue(kpi: KPI): string {
  if (kpi.format === "currency") {
    return kpi.value.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });
  }
  if (kpi.format === "percentage") {
    return `${formatNumber(kpi.value, 1)}%`;
  }
  return formatNumber(kpi.value, 2);
}

export function qualityTone(score: number): "good" | "warn" | "bad" {
  if (score >= 80) return "good";
  if (score >= 55) return "warn";
  return "bad";
}

export function qualityColor(score: number): string {
  if (score >= 80) return "#34d399"; // emerald
  if (score >= 55) return "#facc15"; // yellow
  return "#f87171"; // red
}

// Diverging blue -> transparent -> red scale for correlation heatmap cells.
export function correlationColor(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "rgba(255,255,255,0.03)";
  const clamped = Math.max(-1, Math.min(1, value));
  if (clamped >= 0) {
    return `rgba(34, 211, 238, ${0.12 + clamped * 0.68})`; // cyan toward positive
  }
  return `rgba(244, 114, 182, ${0.12 + Math.abs(clamped) * 0.68})`; // pink toward negative
}
