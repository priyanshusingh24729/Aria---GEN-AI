"use client";

import { ModeShell } from "@/components/chat/ModeShell";
import { AnalyticsProvider } from "@/context/AnalyticsContext";
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import { AnalyticsBody } from "@/components/analytics/AnalyticsPage";

export default function AnalyticsDashboardPage() {
  return (
    <AnalyticsProvider>
      <ModeShell header={<AnalyticsHeader />}>
        <AnalyticsBody />
      </ModeShell>
    </AnalyticsProvider>
  );
}
