"use client";

import { Tags } from "lucide-react";
import { motion } from "framer-motion";
import type { CategoryColumnAnalysis } from "@/lib/api/types";
import { AnimatedSection, Card, SectionHeading } from "./ui";

const BAR_COLORS = ["#8B5CF6", "#3B82F6", "#22d3ee", "#f472b6", "#34d399"];

export function CategoryCards({ categories }: { categories: CategoryColumnAnalysis[] }) {
  if (categories.length === 0) return null;

  return (
    <AnimatedSection delay={0.15}>
      <SectionHeading
        title="Category Analysis"
        subtitle={`${categories.length} categorical column${categories.length === 1 ? "" : "s"}`}
        icon={<Tags size={16} />}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((cat) => (
          <Card key={cat.column}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="truncate text-sm font-medium text-white">{cat.column}</h3>
              <span className="shrink-0 text-[0.68rem] text-slate-500">
                {cat.unique_count} unique
              </span>
            </div>
            <div className="space-y-2.5">
              {cat.top_categories.map((cv, i) => (
                <div key={cv.value}>
                  <div className="mb-1 flex items-center justify-between text-[0.72rem]">
                    <span className="truncate text-slate-300">{cv.value}</span>
                    <span className="shrink-0 tabular-nums text-slate-500">
                      {cv.count.toLocaleString()} · {cv.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cv.percentage}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                    />
                  </div>
                </div>
              ))}
              {cat.top_categories.length === 0 && (
                <p className="text-xs text-slate-600">No values.</p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </AnimatedSection>
  );
}
