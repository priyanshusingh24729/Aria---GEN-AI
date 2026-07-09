"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { apiPostJSON } from "@/lib/api/client";
import type { ImageItem } from "@/lib/api/types";

interface ImagesValue {
  history: ImageItem[];
  isGenerating: boolean;
  error: string | null;
  generate: (prompt: string) => Promise<void>;
  clearHistory: () => void;
}

const ImagesContext = createContext<ImagesValue | null>(null);

export function ImagesProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<ImageItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (prompt: string) => {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await apiPostJSON("/api/images/generate", { prompt });
      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Image generation failed.");
        return;
      }

      setHistory((prev) => [...prev, { prompt, url: data.url, filepath: data.filepath }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  return (
    <ImagesContext.Provider value={{ history, isGenerating, error, generate, clearHistory }}>
      {children}
    </ImagesContext.Provider>
  );
}

export function useImages(): ImagesValue {
  const ctx = useContext(ImagesContext);
  if (!ctx) throw new Error("useImages must be used within ImagesProvider");
  return ctx;
}
