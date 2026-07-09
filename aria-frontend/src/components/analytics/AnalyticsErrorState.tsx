"use client";

import { EmptyState } from "@/components/datacleaning/EmptyState";

export function AnalyticsErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="px-8 py-6">
      <EmptyState
        icon="⚠️"
        title="Couldn't analyze this dataset"
        description={message}
        action={
          <button
            onClick={onRetry}
            className="rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-violet-500/20 transition hover:opacity-90"
          >
            Retry
          </button>
        }
      />
    </div>
  );
}

export function AnalyticsEmptyState({ onSelect }: { onSelect: () => void }) {
  return (
    <div className="px-8 py-6">
      <EmptyState
        icon="▦"
        title="No dataset loaded yet"
        description="Select a CSV or JSON dataset to generate a full analytics dashboard — summary stats, KPIs, trends, correlation, and AI insights."
        action={
          <button
            onClick={onSelect}
            className="rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-violet-500/20 transition hover:opacity-90"
          >
            Select Dataset
          </button>
        }
      />
    </div>
  );
}
