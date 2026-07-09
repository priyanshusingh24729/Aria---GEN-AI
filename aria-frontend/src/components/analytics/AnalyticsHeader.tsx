"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, UploadCloud, BarChart3, Download, Loader2 } from "lucide-react";
import { useAnalyticsContext } from "@/context/AnalyticsContext";
import { parseDatasetFile, DatasetParseError } from "@/lib/analytics-parse";
import { downloadDashboardAsPdf, DashboardExportError } from "@/lib/analytics-export";

export function AnalyticsHeader() {
  const { status, data, analyze, refresh, datasetName } = useAnalyticsContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const isLoading = status === "loading";

  async function handleFile(file: File) {
    setUploadError(null);
    try {
      const { records, datasetName: name } = await parseDatasetFile(file);
      await analyze(records, name);
    } catch (err) {
      setUploadError(
        err instanceof DatasetParseError
          ? err.message
          : "Couldn't read that file. Try a CSV or JSON export."
      );
    }
  }

  async function handleDownload() {
    setExportError(null);
    setIsExporting(true);
    try {
      await downloadDashboardAsPdf(datasetName);
    } catch (err) {
      setExportError(
        err instanceof DashboardExportError
          ? err.message
          : "Couldn't generate the PDF. Try again."
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 border-b border-white/[0.06] px-8 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-lg shadow-violet-500/20">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="font-syne text-xl font-bold text-white">Analytics Dashboard</h1>
            <p className="text-xs text-slate-500">
              AI-powered statistics, trends, and data quality for any dataset.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          <button
            onClick={() => inputRef.current?.click()}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-slate-200 backdrop-blur-xl transition hover:border-violet-500/40 hover:text-violet-300 disabled:opacity-40"
          >
            <UploadCloud size={14} />
            {data ? "Load dataset" : "Select dataset"}
          </button>

          <motion.button
            onClick={() => refresh()}
            disabled={isLoading || !data}
            whileTap={{ scale: 0.94 }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 px-3.5 py-2 text-xs font-medium text-white shadow-lg shadow-violet-500/20 transition hover:opacity-90 disabled:opacity-40"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </motion.button>

          <motion.button
            onClick={() => void handleDownload()}
            disabled={isLoading || !data || status !== "success" || isExporting}
            whileTap={{ scale: 0.94 }}
            title="Download this dashboard as a PDF report"
            className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-300 backdrop-blur-xl transition hover:bg-emerald-500/20 disabled:opacity-40"
          >
            {isExporting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {isExporting ? "Preparing PDF…" : "Download Report"}
          </motion.button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[0.7rem] text-slate-500">
        {datasetName && (
          <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-slate-300">
            {datasetName}
          </span>
        )}
        {data && (
          <span>
            Analyzed {new Date(data.metadata.generated_at).toLocaleString()} ·{" "}
            {data.metadata.analysis_time_ms.toFixed(0)}ms
          </span>
        )}
        {uploadError && <span className="text-rose-400">{uploadError}</span>}
        {exportError && <span className="text-rose-400">{exportError}</span>}
      </div>
    </div>
  );
}