"use client";

import { useState } from "react";
import { useDataCleaning } from "@/context/DataCleaningContext";
import type { FeatureExtractionMethod } from "@/types/datacleaning";
import { FeatureImportanceChart } from "./FeatureImportanceChart";

const METHODS: { value: FeatureExtractionMethod; label: string; supervised: boolean }[] = [
  { value: "pca", label: "PCA", supervised: false },
  { value: "variance_threshold", label: "Variance Threshold", supervised: false },
  { value: "select_k_best", label: "Select K Best", supervised: true },
  { value: "mutual_info", label: "Mutual Information", supervised: true },
  { value: "rfe", label: "RFE", supervised: true },
  { value: "chi_square", label: "Chi-Square", supervised: true },
  { value: "anova", label: "ANOVA", supervised: true },
  { value: "tree_importance", label: "Decision Tree", supervised: true },
  { value: "random_forest_importance", label: "Random Forest", supervised: true },
  { value: "xgboost_importance", label: "XGBoost", supervised: true },
  { value: "lasso", label: "Lasso", supervised: true },
];

export function FeatureExtractionPanel() {
  const {
    analysis,
    runFeatureExtraction,
    confirmFeatureSelection,
    selectedFeatures,
    featureImportances,
    isLoading,
  } = useDataCleaning();

  const [method, setMethod] = useState<FeatureExtractionMethod>("pca");
  const [targetColumn, setTargetColumn] = useState<string>(analysis?.potential_target_columns[0] ?? "");
  const [nFeatures, setNFeatures] = useState<number>(10);
  const [varianceThreshold, setVarianceThreshold] = useState<number>(0.01);

  const activeMethod = METHODS.find((m) => m.value === method);
  const columns = analysis?.column_groups.numerical ?? [];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
        <h3 className="mb-4 text-sm font-medium text-zinc-200">Feature Extraction Method</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {METHODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMethod(m.value)}
              className={[
                "rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                method === m.value
                  ? "border-emerald-400/50 bg-emerald-400/[0.08] text-emerald-300"
                  : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20",
              ].join(" ")}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {activeMethod?.supervised && (
            <label className="block text-xs text-zinc-500">
              Target column
              <select
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-400/50"
              >
                {(analysis?.potential_target_columns.length ? analysis.potential_target_columns : columns).map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  )
                )}
              </select>
            </label>
          )}
          {method !== "variance_threshold" && (
            <label className="block text-xs text-zinc-500">
              Number of features
              <input
                type="number"
                min={1}
                value={nFeatures}
                onChange={(e) => setNFeatures(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-400/50"
              />
            </label>
          )}
          {method === "variance_threshold" && (
            <label className="block text-xs text-zinc-500">
              Variance threshold
              <input
                type="number"
                step="0.001"
                value={varianceThreshold}
                onChange={(e) => setVarianceThreshold(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-400/50"
              />
            </label>
          )}
        </div>

        <button
          disabled={isLoading}
          onClick={() =>
            void runFeatureExtraction(
              method,
              activeMethod?.supervised ? targetColumn : null,
              method === "variance_threshold" ? null : nFeatures,
              varianceThreshold
            )
          }
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 py-2.5 text-sm font-semibold text-black transition-shadow hover:shadow-[0_0_24px_rgba(52,211,153,0.35)] disabled:opacity-40 sm:w-auto sm:px-6"
        >
          Run Extraction
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
        <h3 className="mb-4 text-sm font-medium text-zinc-200">Feature Importance</h3>
        <FeatureImportanceChart importances={featureImportances} />
      </div>

      {selectedFeatures.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-200">Selected Features</h3>
            <button
              onClick={() => void confirmFeatureSelection(selectedFeatures)}
              className="rounded-lg border border-emerald-400/40 bg-emerald-400/[0.08] px-3.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-400/[0.14] transition-colors"
            >
              Keep These Columns
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedFeatures.map((f, i) => (
              <span
                key={f}
                className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-zinc-300"
              >
                #{i + 1} {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
