"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

interface GlassAuthCardProps {
  children: ReactNode;
  className?: string;
}

export function GlassAuthCard({
  children,
  className = "",
}: GlassAuthCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Keeping these variables so you don't have to change imports/variables
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);
  const borderGlow = useMotionTemplate`radial-gradient(220px circle at ${glowX}% ${glowY}%, rgb(var(--aria-glow-b) / 0.25), transparent 70%)`;

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    // Intentionally left empty for performance
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.97,
        y: 16,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
      }}
      transition={{
        duration: 0.45,
        ease: "easeOut",
      }}
      className="relative w-full"
    >
      <motion.div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        className={`group relative rounded-[20px] p-[1px] ${className}`}
      >
        {/* Lightweight hover border */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[20px]
                     bg-gradient-to-r
                     from-cyan-400/20
                     via-blue-400/20
                     to-violet-400/20
                     opacity-0
                     transition-opacity
                     duration-300
                     group-hover:opacity-100"
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[20px] border border-border"
        />

        <div
          className="
            relative
            rounded-[20px]
            border
            border-border/60
            bg-surface2/60
            bg-white/5
            border-white/10
            px-7
            py-8
            shadow-xl
            sm:px-9
            sm:py-10
          "
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
          />

          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}