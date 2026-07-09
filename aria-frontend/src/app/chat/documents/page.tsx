"use client";

import { FolderOpen, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/chat/Button";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { EmptyState } from "@/components/chat/EmptyState";
import { ModeHeader } from "@/components/chat/ModeHeader";
import { ModeShell } from "@/components/chat/ModeShell";
import { SidebarSectionLabel } from "@/components/chat/SidebarSectionLabel";
import { SourceList } from "@/components/chat/SourceList";
import { StatCard } from "@/components/chat/StatCard";
import { UploadDropzone } from "@/components/chat/UploadDropzone";
import { useDocuments } from "@/context/DocumentsContext";
import { AIBackdrop } from "@/components/auth/ai-backdrop";
import { GlassAuthCard } from "@/components/auth/glass-auth-card";
function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-[0.78rem] text-text-dim">
        <span>{label}</span>
        <span className="text-text-dimmer">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface2 accent-accent"
      />
    </div>
  );
}

export default function DocumentAssistantPage() {
  const {
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
  } = useDocuments();

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);

  const dbStatus = status.ready ? "Ready" : "No Database";

  return (
    <ModeShell
      header={
        <ModeHeader
          subtitle="Document Assistant · RAG"
          badge={`Document Assistant · DB: ${dbStatus} · ${status.num_chunks} chunks`}
          dotColor={status.ready ? "#6ee7b7" : "#f87171"}
        />
      }
      sidebarExtra={
        <>
        
          <SidebarSectionLabel>Documents</SidebarSectionLabel>
          {/* <GlassAuthCard className="w-full"> */}
          <UploadDropzone
            accept=".pdf,.docx,.txt,.md,.csv"
            multiple
            label="Click or drag files here"
            hint="pdf · docx · txt · md · csv"
            onFiles={(files) => setPendingFiles(files)}
          />
          {/* </GlassAuthCard> */}

          {pendingFiles.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
              {pendingFiles.map((f, i) => (
                <div
                  key={i}
                  className="truncate rounded-[8px] border border-border bg-surface2 px-2.5 py-1.5 text-[0.78rem] text-text"
                >
                  📄 {f.name}
                </div>
              ))}
            </div>
            
          )}

          <SidebarSectionLabel>Chunking</SidebarSectionLabel>
          <Slider label="Chunk size" value={chunkSize} min={200} max={2000} step={100} onChange={setChunkSize} />
          <Slider
            label="Chunk overlap"
            value={chunkOverlap}
            min={0}
            max={500}
            step={50}
            onChange={setChunkOverlap}
          />

          <Button
            variant="primary"
            className="mt-2"
            disabled={pendingFiles.length === 0 || isUploading}
            onClick={() => uploadDocuments(pendingFiles, chunkSize, chunkOverlap)}
          >
            {isUploading ? "Processing…" : "⚡ Process documents"}
          </Button>

          {uploadError && (
            <div className="mt-2 rounded-[8px] border border-danger/40 bg-surface2 px-3 py-2 text-[0.78rem] text-danger">
              {uploadError}
            </div>
          )}

          {status.ready && (
            <>
              <SidebarSectionLabel>Database</SidebarSectionLabel>
              <StatCard label="Status" value="● Ready" small />
              <StatCard label="Indexed chunks" value={status.num_chunks} />
              <StatCard label="Documents" value={status.doc_names.length} />
              <Button variant="danger" className="mt-1" onClick={deleteDatabase}>
                🗑️ Delete vector database
              </Button>
            </>
          )}

          <SidebarSectionLabel>Session</SidebarSectionLabel>
          <Button variant="danger" onClick={clearChat} disabled={messages.length === 0}>
            Clear chat
          </Button>
        </>
      }
    >
      {messages.length === 0 ? (
        status.ready ? (
          <EmptyState
            icon={MessageCircle}
            title="Ready to answer questions"
            text="Your documents are indexed. Ask anything about the uploaded content."
          />
        ) : (
          <EmptyState
            icon={FolderOpen}
            title="No documents indexed yet"
            text="Upload PDF, Word, TXT, Markdown, or CSV files in the sidebar and click Process documents to build the knowledge base."
          />
        )
      ) : (
        <div className="mx-auto flex w-full max-w-[780px] flex-1 flex-col gap-3 px-6 py-6">
          {messages.map((m, i) => (
            <div key={i}>
              <ChatBubble
                role={m.role}
                content={m.content}
                isStreaming={isStreaming && i === messages.length - 1 && m.role === "assistant"}
              />
              {m.sources && <SourceList sources={m.sources} />}
            </div>
          ))}
          {chatError && (
            <div className="rounded-[8px] border border-danger/40 bg-surface2 px-3.5 py-2.5 text-[0.85rem] text-danger">
              ⚠️ {chatError}
            </div>
          )}
        </div>
      )}

      <div className="mx-auto w-full max-w-[780px]">
        <ChatComposer
          placeholder="Ask a question about your documents…"
          disabled={isStreaming}
          onSend={sendMessage}
        />
      </div>
    </ModeShell>
  );
}
