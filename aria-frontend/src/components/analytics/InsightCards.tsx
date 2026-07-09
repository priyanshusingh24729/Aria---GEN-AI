"use client";

import { motion } from "framer-motion";
import { Lightbulb, Sparkles } from "lucide-react";
import { AnimatedSection, Badge, Card, SectionHeading } from "./ui";

// The backend's `insights` field is a plain string list — no severity field
// is emitted today. This keyword heuristic is a purely cosmetic, client-side
// nicety; remove it if/when the backend starts sending a real severity enum.
function inferSeverity(text: string): "warn" | "bad" | "info" {
  const lower = text.toLowerCase();
  if (lower.includes("significant") || lower.includes("notable")) return "bad";
  if (lower.includes("duplicate") || lower.includes("outlier")) return "warn";
  return "info";
}

export function InsightCards({ insights }: { insights: string[] }) {
  if (insights.length === 0) return null;

  return (
    <AnimatedSection delay={0.4}>
      <SectionHeading title="AI Insights" subtitle="Rule-based patterns detected in your data" icon={<Lightbulb size={16} />} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {insights.map((text, i) => {
          const severity = inferSeverity(text);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
            >
              <Card className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  <Sparkles size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs leading-relaxed text-slate-200">{text}</p>
                  <div className="mt-2">
                    <Badge tone={severity}>
                      {severity === "bad" ? "Attention" : severity === "warn" ? "Review" : "Info"}
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </AnimatedSection>
  );
}
