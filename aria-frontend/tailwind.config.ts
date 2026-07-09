import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
    theme: {
        extend: {
              colors: {
                      bg: "#0d0f14",
                              surface: "#13161e",
                                      surface2: "#1a1e2a",
                                              border: "#252a38",
                                                      accent: "#6ee7b7",
                                                              accent2: "#38bdf8",
                                                                      text: "#e8eaf2",
                                                                              "text-dim": "#8891aa",
                                                                                      "text-dimmer": "#4a5268",
                                                                                              danger: "#f87171",
                                                                                                    },
                                                                                                          fontFamily: {
                                                                                                                  display: ["var(--font-syne)", "sans-serif"],
                                                                                                                          body: ["var(--font-dm-sans)", "sans-serif"],
                                                                                                                                },
                                                                                                                                      keyframes: {
                                                                                                                                              breathe: {
                                                                                                                                                        "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
                                                                                                                                                                  "50%": { opacity: "0.75", transform: "scale(1.08)" },
                                                                                                                                                                          },
                                                                                                                                                                                  pulse: {
                                                                                                                                                                                            "0%, 100%": { opacity: "1" },
                                                                                                                                                                                                      "50%": { opacity: "0.4" },
                                                                                                                                                                                                              },
                                                                                                                                                                                                                    },
                                                                                                                                                                                                                          animation: {
                                                                                                                                                                                                                                  breathe: "breathe 8s ease-in-out infinite",
                                                                                                                                                                                                                                          pulse: "pulse 2s infinite",
                                                                                                                                                                                                                                                },
                                                                                                                                                                                                                                                    },
                                                                                                                                                                                                                                                      },
                                                                                                                                                                                                                                                        plugins: [],
                                                                                                                                                                                                                                                        };

                                                                                                                                                                                                                                                        export default config;
                                                                                                                                                                                                                                                        