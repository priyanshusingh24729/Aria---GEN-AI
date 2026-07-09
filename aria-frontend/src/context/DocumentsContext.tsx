"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiDelete, apiGet, apiPostForm, apiPostJSON } from "@/lib/api/client";
import { streamSSE } from "@/lib/api/sse";
import type { DocMessage, DocStatus, RagSource } from "@/lib/api/types";

interface DocumentsValue {
  messages: DocMessage[];
  status: DocStatus;
  isStreaming: boolean;
  isUploading: boolean;
  uploadError: string | null;
  chatError: string | null;
  uploadDocuments: (files: File[], chunkSize: number, chunkOverlap: number) => Promise<void>;
  sendMessage: (query: string) => Promise<void>;
  deleteDatabase: () => Promise<void>;
  clearChat: () => void;
}

const DocumentsContext = createContext<DocumentsValue | null>(null);

const EMPTY_STATUS: DocStatus = { ready: false, num_chunks: 0, doc_names: [] };

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<DocMessage[]>([]);
  const [status, setStatus] = useState<DocStatus>(EMPTY_STATUS);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  // Pick up whatever the backend already has indexed (it's global/in-process
  // state, so a page reload shouldn't show "no documents" if there are some).
  useEffect(() => {
    apiGet("/documents/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setStatus(data))
      .catch(() => {
        /* backend not reachable yet — leave default status */
      });
  }, []);

  const uploadDocuments = useCallback(async (files: File[], chunkSize: number, chunkOverlap: number) => {
    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    formData.append("chunk_size", String(chunkSize));
    formData.append("chunk_overlap", String(chunkOverlap));

    try {
      const res = await apiPostForm("/documents/upload", formData);
      const data = await res.json();
      if (!data.success) {
        setUploadError(data.error ?? "Failed to process documents.");
        return;
      }
      setStatus({ ready: true, num_chunks: data.num_chunks, doc_names: data.doc_names });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const sendMessage = useCallback(async (query: string) => {
    const history = messages.map(({ role, content }) => ({ role, content }));
    setChatError(null);
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: "user", content: query }, { role: "assistant", content: "" }]);

    try {
      const res = await apiPostJSON("/chat/rag", { query, history });
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
        } else if (event === "sources") {
          const sources = data.sources as RagSource[];
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], sources };
            return next;
          });
        } else if (event === "error") {
          setChatError(data.error as string);
        }
      });
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsStreaming(false);
    }
  }, [messages]);

  const deleteDatabase = useCallback(async () => {
    await apiDelete("/documents/");
    setStatus(EMPTY_STATUS);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setChatError(null);
  }, []);

  return (
    <DocumentsContext.Provider
      value={{
        messages,
        status,
        isStreaming,
        isUploading,
        uploadError,
        chatError,
        uploadDocuments,
        sendMessage,
        deleteDatabase,
        clearChat,
      }}
    >
      {children}
    </DocumentsContext.Provider>
  );
}

export function useDocuments(): DocumentsValue {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error("useDocuments must be used within DocumentsProvider");
  return ctx;
}
