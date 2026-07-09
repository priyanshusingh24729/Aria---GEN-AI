"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDataCleaning } from "@/context/DataCleaningContext";
import type {
  FeatureEngineeringId,
  FeatureEngineeringOperation,
  FeatureEngineeringParams,
  FeatureEngineeringSuggestion,
} from "@/types/datacleaning";
import { EmptyState } from "./EmptyState";

const ICONS: Record<FeatureEngineeringId, string> = {
  date_features: "📅",
  age_calculation: "🎂",
  bmi: "⚖️",
  income_groups: "💰",
  binning: "🗂️",
  interaction_features: "✖️",
  polynomial_features: "📈",
  log_transform: "㏒",
  sqrt_transform: "√",
  ratio_features: "➗",
  aggregated_features: "Σ",
  rolling_statistics: "📊",
  lag_features: "⏮️",
  custom_formula: "🧮",
};

function ConfigForm({
  suggestion,
  onSubmit,
}: {
  suggestion: FeatureEngineeringSuggestion;
  onSubmit: (params: FeatureEngineeringParams) => void;
}) {
  const columns = suggestion.applicable_columns;
  const [colA, setColA] = useState(columns[0] ?? "");
  const [colB, setColB] = useState(columns[1] ?? columns[0] ?? "");
  const [operation, setOperation] = useState("multiply");
  const [formula, setFormula] = useState("");
  const [outputColumn, setOutputColumn] = useState("");

  const submit = () => {
    switch (suggestion.id) {
      case "date_features":
        onSubmit({ column: colA, parts: ["year", "month", "day", "quarter", "is_weekend"] });
        return;
      case "age_calculation":
        onSubmit({ dob_column: colA, output_column: outputColumn || "age" });
        return;
      case "bmi":
        onSubmit({ weight_kg_column: colA, height_m_column: colB, output_column: outputColumn || "bmi" });
        return;
      case "interaction_features":
        onSubmit({ column_a: colA, column_b: colB, operation, output_column: outputColumn || undefined });
        return;
      case "ratio_features":
        onSubmit({ numerator_column: colA, denominator_column: colB, output_column: outputColumn || undefined });
        return;
      case "log_transform":
      case "sqrt_transform":
        onSubmit({ columns: [colA] });
        return;
      case "custom_formula":
        onSubmit({ output_column: outputColumn || "custom_feature", formula });
        return;
      default:
        onSubmit({ columns: [colA] });
    }
  };

  const needsColA = suggestion.id !== "custom_formula";
  const needsColB = ["bmi", "interaction_features", "ratio_features"].includes(suggestion.id);
  const needsOperation = suggestion.id === "interaction_features";
  const needsOutput = ["age_calculation", "bmi", "interaction_features", "ratio_features", "custom_formula"].includes(
    suggestion.id
  );

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
      {needsColA && (
        <label className="block text-xs text-zinc-500">
          {["bmi"].includes(suggestion.id) ? "Weight column" : "Column"}
          <select
            value={colA}
            onChange={(e) => setColA(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-400/50"
          >
            {columns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      )}
      {needsColB && (
        <label className="block text-xs text-zinc-500">
          {suggestion.id === "bmi" ? "Height column (m)" : "Second column"}
          <select
            value={colB}
            onChange={(e) => setColB(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-400/50"
          >
            {columns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      )}
      {needsOperation && (
        <label className="block text-xs text-zinc-500">
          Operation
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-400/50"
          >
            <option value="multiply">Multiply</option>
            <option value="add">Add</option>
            <option value="subtract">Subtract</option>
            <option value="divide">Divide</option>
          </select>
        </label>
      )}
      {suggestion.id === "custom_formula" && (
        <label className="block text-xs text-zinc-500">
          Formula (pandas eval syntax)
          <input
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="e.g. price * quantity"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-400/50"
          />
        </label>
      )}
      {needsOutput && (
        <label className="block text-xs text-zinc-500">
          Output column name (optional)
          <input
            value={outputColumn}
            onChange={(e) => setOutputColumn(e.target.value)}
            placeholder="auto-generated if left blank"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 outline-none focus:border-emerald-400/50"
          />
        </label>
      )}
      <button
        onClick={submit}
        className="w-full rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 py-2 text-sm font-semibold text-black transition-shadow hover:shadow-[0_0_20px_rgba(52,211,153,0.3)]"
      >
        Create Feature
      </button>
    </div>
  );
}

export function FeatureEngineeringPanel() {
  const { featureSuggestions, applyFeatureEngineering, featureEngineeringResults, isLoading } = useDataCleaning();
  const [openId, setOpenId] = useState<FeatureEngineeringId | null>(null);

  if (featureSuggestions.length === 0) {
    return (
      <EmptyState
        icon="🧠"
        title="No feature suggestions available"
        description="We look for date, ratio, and demographic columns to suggest new features."
      />
    );
  }

  const handleSubmit = (id: FeatureEngineeringId, params: FeatureEngineeringParams) => {
    const op: FeatureEngineeringOperation = { id, params };
    void applyFeatureEngineering([op]);
    setOpenId(null);
  };

  return (
    <div className="space-y-3">
      {featureSuggestions.map((s) => (
        <div key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
          <button
            onClick={() => setOpenId(openId === s.id ? null : s.id)}
            className="flex w-full items-start gap-3 text-left"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg">
              {ICONS[s.id] ?? "🧩"}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-100">{s.title}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{s.description}</p>
            </div>
            <span className="text-zinc-500">{openId === s.id ? "−" : "+"}</span>
          </button>
          <AnimatePresence>
            {openId === s.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <ConfigForm suggestion={s} onSubmit={(params) => handleSubmit(s.id, params)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {featureEngineeringResults.length > 0 && (
        <div className="space-y-2 pt-2">
          {featureEngineeringResults.map((r, i) => (
            <div
              key={`${r.id}-${i}`}
              className={[
                "flex items-center gap-3 rounded-xl border px-4 py-2.5 text-xs backdrop-blur-xl",
                r.success ? "border-emerald-500/15 bg-emerald-500/[0.04] text-emerald-200" : "border-rose-500/15 bg-rose-500/[0.04] text-rose-200",
              ].join(" ")}
            >
              <span>{r.success ? "✓" : "✕"}</span>
              <span className="flex-1">{r.message}</span>
              {r.columns_created.length > 0 && (
                <span className="text-zinc-500">+{r.columns_created.join(", ")}</span>
              )}
            </div>
          ))}
        </div>
      )}
      {isLoading && <p className="text-xs text-zinc-500">Working…</p>}
    </div>
  );
}
