"use client";

import { ChevronDown, ImageIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/chat/Button";
import { EmptyState } from "@/components/chat/EmptyState";
import { ModeHeader } from "@/components/chat/ModeHeader";
import { ModeShell } from "@/components/chat/ModeShell";
import { SidebarSectionLabel } from "@/components/chat/SidebarSectionLabel";
import { StatCard } from "@/components/chat/StatCard";
import { useImages } from "@/context/ImagesContext";

export default function ImageGenerationPage() {
  const { history, isGenerating, error, generate, clearHistory } = useImages();
  const [prompt, setPrompt] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const latest = history[history.length - 1];
  const previous = history.slice(0, -1);

  function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;
    generate(trimmed);
  }

  return (
    <ModeShell
      header={
        <ModeHeader
          subtitle="Image Generation · FLUX Schnell"
          badge="Image Generation · Fal AI · FLUX Schnell"
          dotColor="#a78bfa"
        />
      }
      sidebarExtra={
        <>
          <SidebarSectionLabel>Image Generation</SidebarSectionLabel>
          <StatCard label="Model" value="FLUX Schnell" small />
          <StatCard label="Provider" value="Fal AI" small />
          <StatCard label="Images generated" value={history.length} />

          <SidebarSectionLabel>Session</SidebarSectionLabel>
          <Button variant="danger" onClick={clearHistory} disabled={history.length === 0}>
            🗑️ Clear image history
          </Button>
        </>
      }
    >
      <div className="mx-auto flex w-full max-w-[780px] flex-1 flex-col px-6 py-6">
        <p className="mb-4 text-[0.9rem] leading-relaxed text-text-dim">
          Describe any scene, style, or concept and Aria will generate a high-quality image using{" "}
          <span style={{ color: "#a78bfa" }}>FLUX Schnell</span> via Fal AI.
        </p>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. A futuristic Tokyo street at night, neon reflections on wet pavement, cinematic lighting, 4K"
          rows={4}
          className="rounded-[10px] border-[1.5px] border-border bg-surface2 px-3.5 py-3 text-[0.92rem] text-text placeholder-text-dimmer outline-none focus:border-accent/50"
        />
        <p className="mb-3 mt-1.5 text-[0.75rem] text-text-dimmer">
          💡 Tip: Be specific — mention style, lighting, colors, mood, and resolution for best results.
        </p>

        <Button
          variant="primary"
          className="w-fit px-5"
          disabled={!prompt.trim() || isGenerating}
          onClick={handleGenerate}
        >
          {isGenerating ? "✨ Generating…" : "✦ Generate image"}
        </Button>

        {error && (
          <div className="mt-3 rounded-[8px] border border-danger/40 bg-surface2 px-3.5 py-2.5 text-[0.85rem] text-danger">
            ⚠️ {error}
          </div>
        )}

        {latest ? (
          <div className="mt-8">
            <SidebarSectionLabel>Latest generation</SidebarSectionLabel>
            <img
              src={latest.url ?? undefined}
              alt={latest.prompt}
              className="w-full rounded-[14px] border border-border"
            />
            <p className="mt-2 text-[0.78rem] italic text-text-dimmer">&ldquo;{latest.prompt}&rdquo;</p>

            {previous.length > 0 && (
              <div className="mt-4 rounded-[8px] border border-border">
                <button
                  onClick={() => setHistoryOpen((o) => !o)}
                  className="flex w-full items-center justify-between px-3.5 py-2 text-left text-[0.8rem] text-text-dim"
                >
                  <span>
                    🖼️ Image history <span className="text-text-dimmer">({previous.length} previous)</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
                </button>
                {historyOpen && (
                  <div className="flex flex-col gap-4 border-t border-border px-3.5 py-3">
                    {[...previous].reverse().map((item, i) => (
                      <div key={i}>
                        <p className="mb-1.5 text-[0.78rem] italic text-text-dimmer">&ldquo;{item.prompt}&rdquo;</p>
                        <img
                          src={item.url ?? undefined}
                          alt={item.prompt}
                          className="w-full rounded-[10px] border border-border"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              icon={ImageIcon}
              title="No images yet"
              text="Type a detailed description above and click Generate image to create your first image."
            />
          </div>
        )}
      </div>
    </ModeShell>
  );
}
