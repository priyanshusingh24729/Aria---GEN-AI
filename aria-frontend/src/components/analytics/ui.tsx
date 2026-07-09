"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Shared visual primitives for the Analytics module — Aria's premium
 * enterprise design language: dark canvas (#0B1220), glassmorphism cards,
 * violet -> blue accent gradient, 20px radius, soft shadows. Every export
 * keeps its original signature so CategoryCards, KpiGrid, StatisticsTable,
 * etc. don't need prop changes — only the visual language underneath moves.
 */

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`group relative overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)] ${
        padded ? "p-5" : ""
      } ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[20px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-violet-500/[0.06] via-transparent to-blue-500/[0.06]" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-gradient-to-br from-violet-500/20 to-blue-500/20 text-violet-300">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
}) {
  const tones: Record<string, string> = {
    neutral: "border-white/[0.08] bg-white/5 text-slate-300",
    good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    bad: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    info: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.68rem] font-medium tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function AnimatedSection({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
}

export function StatTile({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  hint?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
    >
      <div className="flex items-center justify-between">
        <p className="text-[0.7rem] uppercase tracking-wider text-slate-500">{label}</p>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-white/[0.08] text-violet-300">
            {icon}
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[0.7rem] text-slate-500">{hint}</p>}
    </motion.div>
  );
}