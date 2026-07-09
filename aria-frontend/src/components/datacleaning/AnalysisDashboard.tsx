"use client";

import { motion } from "framer-motion";
import type { AnalysisReport } from "@/types/datacleaning";
import { DatasetOverviewCard } from "./DatasetOverviewCard";
import { MissingValuesCard } from "./MissingValuesCard";
import { DuplicateCard } from "./DuplicateCard";

function InfoCard({
  title,
  emptyLabel,
  isEmpty,
  children,
}: {
  title: string;
  emptyLabel: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
      <h3 className="mb-3 text-sm font-medium text-zinc-200">{title}</h3>
      {isEmpty ? <p className="text-xs text-zinc-500">{emptyLabel}</p> : children}
    </div>
  );
}

function Chip({ children, tone = "zinc" }: { children: React.ReactNode; tone?: "zinc" | "amber" | "rose" | "cyan" }) {
  const tones: Record<string, string> = {
    zinc: "border-white/10 bg-white/[0.03] text-zinc-300",
    amber: "border-amber-500/20 bg-amber-500/[0.06] text-amber-300",
    rose: "border-rose-500/20 bg-rose-500/[0.06] text-rose-300",
    cyan: "border-cyan-500/20 bg-cyan-500/[0.06] text-cyan-300",
  };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] ${tones[tone]}`}>{children}</span>
  );
}

export function AnalysisDashboard({ analysis }: { analysis: AnalysisReport }) {
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
  };
  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      <motion.div variants={item}>
        <DatasetOverviewCard overview={analysis.overview} />
      </motion.div>

      <motion.div variants={item}>
        <MissingValuesCard report={analysis.missing_values} />
      </motion.div>

      <motion.div variants={item}>
        <DuplicateCard report={analysis.duplicates} />
      </motion.div>

      <motion.div variants={item}>
        <InfoCard
          title="Invalid Data Types"
          emptyLabel="All columns look correctly typed."
          isEmpty={analysis.invalid_data_types.length === 0}
        >
          <ul className="space-y-2">
            {analysis.invalid_data_types.map((issue) => (
              <li key={issue.column} className="text-xs text-zinc-400">
                <span className="font-medium text-zinc-200">{issue.column}</span> — {issue.reason}
              </li>
            ))}
          </ul>
        </InfoCard>
      </motion.div>

      <motion.div variants={item}>
        <InfoCard
          title="Constant Columns"
          emptyLabel="No single-value columns found."
          isEmpty={analysis.constant_columns.length === 0}
        >
          <div className="flex flex-wrap gap-1.5">
            {analysis.constant_columns.map((c) => (
              <Chip key={c.column} tone="rose">
                {c.column}
              </Chip>
            ))}
          </div>
        </InfoCard>
      </motion.div>

      <motion.div variants={item}>
        <InfoCard
          title="Whitespace Issues"
          emptyLabel="No stray whitespace detected."
          isEmpty={analysis.whitespace_issues.length === 0}
        >
          <ul className="space-y-1.5">
            {analysis.whitespace_issues.map((w) => (
              <li key={w.column} className="flex justify-between text-xs text-zinc-400">
                <span className="text-zinc-200">{w.column}</span>
                <span>{w.affected_rows} rows</span>
              </li>
            ))}
          </ul>
        </InfoCard>
      </motion.div>

      <motion.div variants={item}>
        <InfoCard
          title="Mixed Case Issues"
          emptyLabel="Text casing is consistent."
          isEmpty={analysis.mixed_case_issues.length === 0}
        >
          <ul className="space-y-2">
            {analysis.mixed_case_issues.map((m) => (
              <li key={m.column} className="text-xs text-zinc-400">
                <span className="font-medium text-zinc-200">{m.column}</span>:{" "}
                {m.example_variants.join(" / ")}
              </li>
            ))}
          </ul>
        </InfoCard>
      </motion.div>

      <motion.div variants={item}>
        <InfoCard
          title="Outliers (IQR)"
          emptyLabel="No outliers detected."
          isEmpty={analysis.outliers.length === 0}
        >
          <ul className="space-y-1.5">
            {analysis.outliers.map((o) => (
              <li key={o.column} className="flex justify-between text-xs text-zinc-400">
                <span className="text-zinc-200">{o.column}</span>
                <span>{o.outlier_count} pts</span>
              </li>
            ))}
          </ul>
        </InfoCard>
      </motion.div>

      <motion.div variants={item}>
        <InfoCard
          title="Highly Correlated Columns"
          emptyLabel="No strongly correlated pairs (|r| ≥ 0.9)."
          isEmpty={analysis.highly_correlated_features.length === 0}
        >
          <ul className="space-y-1.5">
            {analysis.highly_correlated_features.map((pair) => (
              <li key={`${pair.column_a}-${pair.column_b}`} className="flex justify-between text-xs text-zinc-400">
                <span>
                  {pair.column_a} ↔ {pair.column_b}
                </span>
                <span className="text-cyan-300">{pair.correlation.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </InfoCard>
      </motion.div>

      <motion.div variants={item}>
        <InfoCard
          title="Low Variance Columns"
          emptyLabel="No near-constant numeric columns."
          isEmpty={analysis.low_variance_columns.length === 0}
        >
          <ul className="space-y-1.5">
            {analysis.low_variance_columns.map((v) => (
              <li key={v.column} className="flex justify-between text-xs text-zinc-400">
                <span className="text-zinc-200">{v.column}</span>
                <span>{v.variance.toFixed(4)}</span>
              </li>
            ))}
          </ul>
        </InfoCard>
      </motion.div>

      <motion.div variants={item}>
        <InfoCard
          title="Potential Target Columns"
          emptyLabel="No obvious target column found."
          isEmpty={analysis.potential_target_columns.length === 0}
        >
          <div className="flex flex-wrap gap-1.5">
            {analysis.potential_target_columns.map((col) => (
              <Chip key={col} tone="cyan">
                {col}
              </Chip>
            ))}
          </div>
        </InfoCard>
      </motion.div>

      <motion.div variants={item}>
        <InfoCard
          title="Potential ID Columns"
          emptyLabel="No identifier-like columns found."
          isEmpty={analysis.potential_id_columns.length === 0}
        >
          <div className="flex flex-wrap gap-1.5">
            {analysis.potential_id_columns.map((col) => (
              <Chip key={col} tone="amber">
                {col}
              </Chip>
            ))}
          </div>
        </InfoCard>
      </motion.div>
    </motion.div>
  );
}
