"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { apiDelete, apiPostForm, apiPostJSON } from "@/lib/api/client";
import { streamSSE } from "@/lib/api/sse";
import type {
  ChartConfig,
  SqlExchange,
  SqlSession,
} from "@/lib/api/types";

interface SqlValue {
  session: SqlSession | null;
  exchanges: SqlExchange[];
  isUploading: boolean;
  isQuerying: boolean;
  uploadError: string | null;
  uploadFile: (file: File) => Promise<void>;
  ask: (question: string) => Promise<void>;
  clearSession: () => Promise<void>;
}

const SqlContext = createContext<SqlValue | null>(null);

// Named export — used by ChatStateProvider and any other consumer
export function SqlProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SqlSession | null>(null);
  const [exchanges, setExchanges] = useState<SqlExchange[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiPostForm("/sql/upload", formData);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail ?? `Upload failed (${res.status})`);
      }
      const data = await res.json();
      setSession({
        sessionId: data.session_id,
        tables: data.tables,
        schemaText: data.schema_text,
        sourceName: data.source_name,
      });
      setExchanges([]);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const ask = useCallback(async (question: string) => {
    if (!session) return;

    setIsQuerying(true);
    setExchanges((prev) => [...prev, { question, streaming: true }]);

    const updateLast = (patch: Partial<SqlExchange>) => {
      setExchanges((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], ...patch };
        return next;
      });
    };

    try {
      const res = await apiPostJSON("/sql/query", {
        session_id: session.sessionId,
        question,
      });
      if (!res.ok || !res.body) {
        throw new Error(`Request failed (${res.status})`);
      }

      await streamSSE(res, (event, data) => {
        if (event === "cannot_answer") {
          updateLast({
            cannotAnswerReason: data.reason as string,
            streaming: false,
          });
        } else if (event === "sql") {
          updateLast({ sql: data.sql as string });
        } else if (event === "results") {
          updateLast({
            rows: data.rows as Record<string, unknown>[],
            rowCount: data.row_count as number,
            explanation: "",
          });
        } else if (event === "chart") {
         updateLast({
  chart: { ...(data as unknown as ChartConfig) },
});
        } else if (event === "chunk") {
          const content = data.content as string;
          setExchanges((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = {
              ...last,
              explanation: (last.explanation ?? "") + content,
            };
            return next;
          });
        } else if (event === "error") {
          updateLast({ error: data.error as string, streaming: false });
        }
      });

      updateLast({ streaming: false });
    } catch (e) {
      updateLast({
        error: e instanceof Error ? e.message : "Something went wrong.",
        streaming: false,
      });
    } finally {
      setIsQuerying(false);
    }
  }, [session]);

  const clearSession = useCallback(async () => {
    if (session) {
      await apiDelete(`/sql/session?session_id=${session.sessionId}`).catch(() => {});
    }
    setSession(null);
    setExchanges([]);
    setUploadError(null);
  }, [session]);

  return (
    <SqlContext.Provider
      value={{
        session,
        exchanges,
        isUploading,
        isQuerying,
        uploadError,
        uploadFile,
        ask,
        clearSession,
      }}
    >
      {children}
    </SqlContext.Provider>
  );
}

export function useSql(): SqlValue {
  const ctx = useContext(SqlContext);
  if (!ctx) throw new Error("useSql must be used within SqlProvider");
  return ctx;
}

// Default export alias — satisfies Next.js App Router SSR ESM resolution
// when ChatStateProvider or layout.tsx imports this module as a default
export default SqlProvider;