"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAnalyticsContext } from "@/context/AnalyticsContext";
import { AnalyticsSkeleton } from "./AnalyticsSkeleton";
import { AnalyticsErrorState, AnalyticsEmptyState } from "./AnalyticsErrorState";
import { SummaryCards } from "./SummaryCards";
import { KpiGrid } from "./KpiGrid";
import { StatisticsTable } from "./StatisticsTable";
import { CategoryCards } from "./CategoryCards";
import { TrendCharts } from "./TrendCharts";
import { CorrelationHeatmap } from "./CorrelationHeatmap";
import { OutlierTable } from "./OutlierTable";
import { MissingValueCard } from "./MissingValueCard";
import { InsightCards } from "./InsightCards";
import { ChartRecommendations } from "./ChartRecommendations";
import { MetadataPanel } from "./MetadataPanel";
import { parseDatasetFile } from "@/lib/analytics-parse";
import { dashboardRef } from "@/lib/analytics-export";

export function AnalyticsBody() {
  const { status, data, error, analyze, refresh } = useAnalyticsContext();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    try {
      const { records, datasetName } = await parseDatasetFile(file);
      await analyze(records, datasetName);
    } catch {
      // Surfaced inline by AnalyticsHeader's own uploader for the common
      // path; this fallback input just needs to not throw unhandled.
    }
  }

  return (
    <div className="flex h-full flex-col">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {status === "loading" && (
            <motion.div key="loading" exit={{ opacity: 0 }}>
              <AnalyticsSkeleton />
            </motion.div>
          )}

          {status === "error" && error && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <AnalyticsErrorState message={error} onRetry={() => void refresh()} />
            </motion.div>
          )}

          {status === "idle" && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <AnalyticsEmptyState onSelect={() => inputRef.current?.click()} />
            </motion.div>
          )}

          {status === "success" && data && (
            <motion.div
              key="content"
              ref={dashboardRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8 bg-[#0B1220] px-8 py-6"
            >
              <SummaryCards summary={data.summary} quality={data.quality_score} />
              <KpiGrid kpis={data.kpis} />
              <StatisticsTable stats={data.numeric_statistics} />
              <CategoryCards categories={data.category_analysis} />
              <TrendCharts trend={data.trend_analysis} />
              <CorrelationHeatmap correlation={data.correlation} />
              <OutlierTable outliers={data.outliers} />
              <MissingValueCard report={data.missing_report} />
              <InsightCards insights={data.insights} />
              <ChartRecommendations charts={data.recommended_charts} />
              <MetadataPanel metadata={data.metadata} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}