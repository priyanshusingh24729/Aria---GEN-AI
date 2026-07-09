"use client";

import { useRef } from "react";

/**
 * Lightweight AI backdrop.
 *
 * Uses only:
 * - Background AI video
 * - SVG floor grid
 * - Dark cinematic overlays
 *
 * No canvas.
 * No particles.
 * No requestAnimationFrame.
 * No mouse tracking.
 */

const VIDEO_SRC = "/videos/aria-ai-backdrop.mp4";

export function AIBackdrop() {
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden bg-black"
      style={
        {
          "--aria-glow-a": "96 220 200",
          "--aria-glow-b": "63 192 234",
        } as React.CSSProperties
      }
    >
      {/* Background Video */}
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-70"
        autoPlay
        muted
        // loop
        playsInline
        preload="metadata"
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>

      {/* Optional AI Circuit Floor */}
      <svg
        className="absolute bottom-0 left-1/2 h-[42%] w-[140%] -translate-x-1/2 opacity-[0.15]"
        viewBox="0 0 1000 300"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="floorFade" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="rgb(var(--aria-glow-b))"
              stopOpacity="0"
            />
            <stop
              offset="100%"
              stopColor="rgb(var(--aria-glow-b))"
              stopOpacity="0.75"
            />
          </linearGradient>
        // </defs>

        {Array.from({ length: 13 }).map((_, i) => {
          const x = (i / 12) * 1000;
          const spread = (x - 500) * 0.6;

          return (
            <line
              key={i}
              x1={500}
              y1={0}
              x2={500 + spread}
              y2={300}
              stroke="url(#floorFade)"
              strokeWidth={1}
            />
          );
        })}

        {[80, 150, 220, 280].map((y, i) => (
          <line
            key={i}
            x1={0}
            y1={y}
            x2={1000}
            y2={y}
            stroke="url(#floorFade)"
            strokeWidth={1}
          />
        ))}
      </svg>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/40" />

      {/* Bottom Fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

      {/* Soft Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, transparent 35%, rgba(0,0,0,0.45) 100%)",
        }}
      />
    </div>
  );
}