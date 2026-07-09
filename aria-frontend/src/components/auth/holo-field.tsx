"use client";

import type { ReactNode } from "react";

interface FieldGlowProps {
  children: ReactNode;
}

/**
 * Adds a focus glow ring around any field without touching the field's
 * own markup or props — relies on :focus-within, so it works whether
 * the input inside is a raw <input> or your AuthInput component.
 *
 *   <FieldGlow>
 *     <AuthInput ... />
 *   </FieldGlow>
 */
export function FieldGlow({ children }: FieldGlowProps) {
  return (
    <div className="group relative rounded-[10px] transition-transform duration-200 focus-within:-translate-y-px">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px rounded-[10px] opacity-0 ring-2 ring-accent/50 transition-opacity duration-300 group-focus-within:opacity-100"
        style={{
          boxShadow: "0 0 0 4px rgb(var(--aria-glow-a, 96 220 200) / 0.12)",
        }}
      />
      {children}
    </div>
  );
}