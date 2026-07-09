"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { apiPostJSON } from "@/lib/api/client";
import { streamSSE } from "@/lib/api/sse";
import type { ChatMessage } from "@/lib/api/types";

interface GeneralChatValue {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (query: string) => Promise<void>;
  clear: () => void;
}

const GeneralChatContext = createContext<GeneralChatValue | null>(null);

export function GeneralChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (query: string) => {
    const history = messages;
    setError(null);
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: "user", content: query }, { role: "assistant", content: "" }]);

    try {
      const res = await apiPostJSON("/chat/general", { query, history });
      if (!res.ok || !res.body) {
        throw new Error(`Request failed (${res.status})`);
      }

      await streamSSE(res, (event, data) => {
        if (event === "chunk") {
          const content = data.content as string;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              ...next[next.length - 1],
              content: next[next.length - 1].content + content,
            };
            return next;
          });
        } else if (event === "error") {
          setError(data.error as string);
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsStreaming(false);
    }
  }, [messages]);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return (
    <GeneralChatContext.Provider value={{ messages, isStreaming, error, sendMessage, clear }}>
      {children}
    </GeneralChatContext.Provider>
  );
}

export function useGeneralChat(): GeneralChatValue {
  const ctx = useContext(GeneralChatContext);
  if (!ctx) throw new Error("useGeneralChat must be used within GeneralChatProvider");
  return ctx;
}
