"use client";

import { useState } from "react";
import { Grid3x3 } from "lucide-react";
import type { CorrelationMatrix } from "@/lib/api/types";
import { AnimatedSection, Card, SectionHeading } from "./ui";
import { correlationColor } from "@/lib/analytics-format";

export function CorrelationHeatmap({ correlation }: { correlation: CorrelationMatrix | null }) {
  const [hover, setHover] = useState<{ row: string; col: string; value: number | null } | null>(null);

  if (!correlation || correlation.columns.length < 2) return null;
  const { columns, matrix } = correlation;
  const cellSize = columns.length > 14 ? 28 : columns.length > 8 ? 36 : 46;

  return (
    <AnimatedSection delay={0.25}>
      <SectionHeading
        title="Correlation"
        subtitle="Pearson correlation across numeric columns"
        icon={<Grid3x3 size={16} />}
      />
      <Card>
        <div className="overflow-auto">
          <div className="relative inline-block">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `120px repeat(${columns.length}, ${cellSize}px)`,
              }}
            >
              <div />
              {columns.map((col) => (
                <div
                  key={`head-${col}`}
                  className="flex items-end justify-center pb-2 text-[0.6rem] text-slate-500"
                  style={{ writingMode: "vertical-rl", height: 90 }}
                  title={col}
                >
                  <span className="truncate">{col}</span>
                </div>
              ))}

              {matrix.map((row, rIdx) => (
                <div key={`row-${columns[rIdx]}`} className="contents">
                  <div className="flex items-center truncate pr-3 text-[0.68rem] text-slate-400" title={columns[rIdx]}>
                    {columns[rIdx]}
                  </div>
                  {row.map((value, cIdx) => (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      onMouseEnter={() =>
                        setHover({ row: columns[rIdx], col: columns[cIdx], value })
                      }
                      onMouseLeave={() => setHover(null)}
                      className="flex cursor-default items-center justify-center border border-black/20 text-[0.6rem] tabular-nums text-slate-200"
                      style={{
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: correlationColor(value),
                      }}
                    >
                      {value !== null ? value.toFixed(2) : "—"}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[0.68rem] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: correlationColor(-0.9) }} />
            Negative
            <span className="ml-3 h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: correlationColor(0.9) }} />
            Positive
          </div>
          {hover && (
            <span className="text-slate-300">
              {hover.row} × {hover.col}: {hover.value !== null ? hover.value.toFixed(3) : "n/a"}
            </span>
          )}
        </div>
      </Card>
    </AnimatedSection>
  );
}
