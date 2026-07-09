"use client";

import { Info } from "lucide-react";
import type { DashboardMetadata } from "@/lib/api/types";
import { AnimatedSection, Card, SectionHeading } from "./ui";

export function MetadataPanel({ metadata }: { metadata: DashboardMetadata }) {
  const items: { label: string; value: string }[] = [
    { label: "Dataset Name", value: metadata.dataset_name ?? "Untitled dataset" },
    { label: "Generated Time", value: new Date(metadata.generated_at).toLocaleString() },
    { label: "Analysis Duration", value: `${metadata.analysis_time_ms.toFixed(1)} ms` },
    { label: "Rows", value: metadata.row_count.toLocaleString() },
    { label: "Columns", value: metadata.column_count.toLocaleString() },
  ];

  return (
    <AnimatedSection delay={0.5}>
      <SectionHeading title="Dataset Metadata" icon={<Info size={16} />} />
      <Card>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {items.map((item) => (
            <div key={item.label}>
              <dt className="text-[0.68rem] uppercase tracking-wide text-slate-500">{item.label}</dt>
              <dd className="mt-1 truncate text-sm text-slate-200">{item.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </AnimatedSection>
  );
}
