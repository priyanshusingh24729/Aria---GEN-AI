"use client";

import { Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/chat/Button";
import { ModeHeader } from "@/components/chat/ModeHeader";
import { ModeShell } from "@/components/chat/ModeShell";
import { SidebarSectionLabel } from "@/components/chat/SidebarSectionLabel";
import { DataCleaningProvider, useDataCleaning } from "@/context/DataCleaningContext";
import { ProgressStepper } from "@/components/datacleaning/ProgressStepper";
import { UploadCard } from "@/components/datacleaning/UploadCard";
import { AnalysisDashboard } from "@/components/datacleaning/AnalysisDashboard";
import { PreviewTable } from "@/components/datacleaning/PreviewTable";
import { CleaningPanel } from "@/components/datacleaning/CleaningPanel";
import { CleaningResults } from "@/components/datacleaning/CleaningResults";
import { FeatureEngineeringPanel } from "@/components/datacleaning/FeatureEngineeringPanel";
import { FeatureExtractionPanel } from "@/components/datacleaning/FeatureExtractionPanel";
import { FinalizeCard } from "@/components/datacleaning/FinalizeCard";
import { ReportCard } from "@/components/datacleaning/ReportCard";
import { CardSkeleton } from "@/components/datacleaning/LoadingSkeleton";
import { EmptyState } from "@/components/datacleaning/EmptyState";
import { ErrorState } from "@/components/datacleaning/ErrorState";
import type { DataCleaningStep } from "@/lib/api/types";

const SECTION_META: Record<
  Exclude<DataCleaningStep, "upload">,
  { title: string; subtitle: string }
> = {
  analysis: { title: "Dataset Analysis", subtitle: "A full read-only scan of your data quality" },
  preview: { title: "Dataset Preview", subtitle: "Live view of the current dataset state" },
  cleaning: { title: "Recommended Cleaning", subtitle: "Pick the operations you want to apply" },
  results: { title: "Cleaning Results", subtitle: "What changed after your last cleaning run" },
  "feature-engineering": { title: "Feature Engineering", subtitle: "Create new signal from existing columns" },
  "feature-extraction": { title: "Feature Extraction", subtitle: "Rank and select the features that matter" },
  finalize: { title: "Finalize", subtitle: "Export your cleaned dataset and review the report" },
};

function SectionShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        <p className="text-sm text-text-dim">{subtitle}</p>
      </div>
      {children}
    </motion.section>
  );
}

function NavButtons() {
  const { step, goToStep, loadFeatureSuggestions } = useDataCleaning();

  const order: DataCleaningStep[] = [
    "analysis",
    "preview",
    "cleaning",
    "results",
    "feature-engineering",
    "feature-extraction",
    "finalize",
  ];
  const idx = order.indexOf(step);
  if (idx === -1) return null;

  const next = order[idx + 1];
  const prev = idx > 0 ? order[idx - 1] : null;

  const goNext = () => {
    if (!next) return;
    if (next === "feature-engineering") {
      void loadFeatureSuggestions();
      return;
    }
    goToStep(next);
  };

  return (
    <div className="flex items-center justify-between pt-2">
      <button
        disabled={!prev}
        onClick={() => prev && goToStep(prev)}
        className="rounded-[8px] border border-border px-4 py-2 text-xs font-medium text-text-dim transition-colors hover:border-accent2/40 hover:text-text disabled:opacity-0"
      >
        ← Back
      </button>
      {next && (
        <button
          onClick={goNext}
          className="rounded-[8px] border border-border bg-surface2 px-5 py-2 text-xs font-medium text-text transition-colors hover:border-accent/40 hover:text-accent"
        >
          Continue to {SECTION_META[next as Exclude<DataCleaningStep, "upload">].title} →
        </button>
      )}
    </div>
  );
}

function DataCleaningBody() {
  const { step, analysis, preview, cleaningResults, finalReport, isLoading } = useDataCleaning();

  if (step === "upload") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <UploadCard />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-6">
      <ProgressStepper current={step} />

      <AnimatePresence mode="wait">
        {step === "analysis" && (
          <SectionShell key="analysis" {...SECTION_META.analysis}>
            {isLoading && !analysis ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : analysis ? (
              <>
                <AnalysisDashboard analysis={analysis} />
                <NavButtons />
              </>
            ) : (
              <EmptyState title="No analysis yet" />
            )}
          </SectionShell>
        )}

        {step === "preview" && (
          <SectionShell key="preview" {...SECTION_META.preview}>
            <PreviewTable preview={preview} />
            <NavButtons />
          </SectionShell>
        )}

        {step === "cleaning" && (
          <SectionShell key="cleaning" {...SECTION_META.cleaning}>
            <CleaningPanel />
          </SectionShell>
        )}

        {step === "results" && (
          <SectionShell key="results" {...SECTION_META.results}>
            <CleaningResults results={cleaningResults} />
            <NavButtons />
          </SectionShell>
        )}

        {step === "feature-engineering" && (
          <SectionShell key="feature-engineering" {...SECTION_META["feature-engineering"]}>
            <FeatureEngineeringPanel />
            <NavButtons />
          </SectionShell>
        )}

        {step === "feature-extraction" && (
          <SectionShell key="feature-extraction" {...SECTION_META["feature-extraction"]}>
            <FeatureExtractionPanel />
            <NavButtons />
          </SectionShell>
        )}

        {step === "finalize" && (
          <SectionShell key="finalize" {...SECTION_META.finalize}>
            <FinalizeCard />
            {finalReport && <ReportCard report={finalReport} />}
          </SectionShell>
        )}
      </AnimatePresence>
    </div>
  );
}

function DataCleaningPageInner() {
  const { step, error, clearError, filename, reset } = useDataCleaning();

  return (
    <ModeShell
      header={
        <ModeHeader
          subtitle="AI-Powered Data Cleaning"
          badge={filename ? `Data Analytics · ${filename}` : "Data Analytics · No file loaded"}
        />
      }
      sidebarExtra={
        <>
          <SidebarSectionLabel>Session</SidebarSectionLabel>
          <Button variant="danger" onClick={reset} disabled={step === "upload"}>
            Start over
          </Button>
        </>
      }
    >
      {error && (
        <div className="px-6 pt-6">
          <ErrorState message={error} onDismiss={clearError} />
        </div>
      )}
      <DataCleaningBody />
    </ModeShell>
  );
}

export default function DataCleaningPage() {
  return (
    <DataCleaningProvider>
      <DataCleaningPageInner />
    </DataCleaningProvider>
  );
}