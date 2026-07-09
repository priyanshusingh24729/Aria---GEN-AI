"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { analyzeDataset } from "@/lib/api/analytics";
import type { AnalyticsDashboardResponse } from "@/lib/api/types";

type Status = "idle" | "loading" | "success" | "error";

interface AnalyticsContextValue {
  status: Status;
  data: AnalyticsDashboardResponse | null;
  error: string | null;
  datasetName: string | null;
  /** Raw rows behind the current analysis — used to render on-demand chart
   *  previews (e.g. "Generate Chart" in the recommendations section)
   *  without a second round-trip to the backend. */
  records: Record<string, unknown>[] | null;
  analyze: (records: Record<string, unknown>[], datasetName?: string) => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<AnalyticsDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [datasetName, setDatasetName] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, unknown>[] | null>(null);

  // Kept so "Refresh" can re-run the exact same analysis without the caller
  // needing to hold on to the records array itself.
  const lastRecords = useRef<Record<string, unknown>[] | null>(null);

  const analyze = useCallback(
    async (newRecords: Record<string, unknown>[], name?: string) => {
      lastRecords.current = newRecords;
      setRecords(newRecords);
      setDatasetName(name ?? null);
      setStatus("loading");
      setError(null);
      try {
        const result = await analyzeDataset({ records: newRecords, dataset_name: name ?? null });
        setData(result);
        setStatus("success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to analyze dataset.");
        setStatus("error");
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    if (!lastRecords.current) return;
    await analyze(lastRecords.current, datasetName ?? undefined);
  }, [analyze, datasetName]);

  const reset = useCallback(() => {
    lastRecords.current = null;
    setData(null);
    setError(null);
    setDatasetName(null);
    setRecords(null);
    setStatus("idle");
  }, []);

  const value = useMemo(
    () => ({ status, data, error, datasetName, records, analyze, refresh, reset }),
    [status, data, error, datasetName, records, analyze, refresh, reset]
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalyticsContext(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    throw new Error("useAnalyticsContext must be used within an AnalyticsProvider");
  }
  return ctx;
}
