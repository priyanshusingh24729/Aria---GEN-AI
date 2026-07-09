"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface FloatingLogoProps {
  children: ReactNode;
}

/**
 * Wrap your existing logo render with this — it does not alter the logo
 * itself (no color, no markup change), it only adds entrance + idle motion.
 *
 *   <FloatingLogo>
 *     <Logo />
 *   </FloatingLogo>
 */
export function FloatingLogo({ children }: FloatingLogoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative inline-flex"
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <div
          aria-hidden="true"
          className="absolute -inset-3 -z-10 rounded-full opacity-60 blur-xl"
          style={{
            background:
              "radial-gradient(circle, rgb(var(--aria-glow-a, 96 220 200) / 0.35), transparent 70%)",
          }}
        />
        {children}
      </motion.div>
    </motion.div>
  );
}
