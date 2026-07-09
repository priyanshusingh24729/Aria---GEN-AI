"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

interface FxButtonProps {
  children: ReactNode;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export function FxButton({ children }: FxButtonProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [hovered, setHovered] = useState(false);

  const rippleId = useRef(0);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const el = wrapperRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const id = rippleId.current++;

    setRipples((prev) => [
      ...prev,
      {
        id,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      },
    ]);

    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 650);
  }

  return (
    <motion.div
      ref={wrapperRef}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onPointerDown={handlePointerDown}
      whileHover={{
        y: -2,
        scale: 1.02,
      }}
      whileTap={{
        scale: 0.98,
      }}
      transition={{
        duration: 0.2,
      }}
      className="group relative overflow-hidden rounded-[12px]"
    >
      {/* One-time shimmer */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{
              x: "-120%",
            }}
            animate={{
              x: "120%",
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: 0.7,
              ease: "easeOut",
            }}
          />
        )}
      </AnimatePresence>

      {/* Ripple */}
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            aria-hidden
            className="pointer-events-none absolute rounded-full bg-white/25"
            style={{
              left: r.x,
              top: r.y,
              translateX: "-50%",
              translateY: "-50%",
            }}
            initial={{
              width: 8,
              height: 8,
              opacity: 0.5,
            }}
            animate={{
              width: 320,
              height: 320,
              opacity: 0,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: 0.6,
              ease: "easeOut",
            }}
          />
        ))}
      </AnimatePresence>

      {children}
    </motion.div>
  );
}