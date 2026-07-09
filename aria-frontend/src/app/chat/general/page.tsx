"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/chat/Button";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { EmptyState } from "@/components/chat/EmptyState";
import { ModeHeader } from "@/components/chat/ModeHeader";
import { ModeShell } from "@/components/chat/ModeShell";
import { SidebarSectionLabel } from "@/components/chat/SidebarSectionLabel";
import { useGeneralChat } from "@/context/GeneralChatContext";

export default function GeneralChatPage() {
  const { messages, isStreaming, error, sendMessage, clear } = useGeneralChat();

  return (
    <ModeShell
      header={
        <ModeHeader subtitle="General AI Assistant" badge="General Chat · Mistral Small 2506" />
      }
      sidebarExtra={
        <>
          <SidebarSectionLabel>Session</SidebarSectionLabel>
          <Button variant="danger" onClick={clear} disabled={messages.length === 0}>
            Clear chat
          </Button>
        </>
      }
    >
      {messages.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Ask me anything"
          text="I'm Aria, your AI assistant powered by Mistral. Ask me about any topic — coding, writing, analysis, brainstorming, or just a conversation."
        />
      ) : (
        <div className="mx-auto flex w-full max-w-[780px] flex-1 flex-col gap-3 px-6 py-6">
          {messages.map((m, i) => (
            <ChatBubble
              key={i}
              role={m.role}
              content={m.content}
              isStreaming={isStreaming && i === messages.length - 1 && m.role === "assistant"}
            />
          ))}
          {error && (
            <div className="rounded-[8px] border border-danger/40 bg-surface2 px-3.5 py-2.5 text-[0.85rem] text-danger">
              ⚠️ {error}
            </div>
          )}
        </div>
      )}

      <div className="mx-auto w-full max-w-[780px]">
        <ChatComposer placeholder="Ask me anything…" disabled={isStreaming} onSend={sendMessage} />
      </div>
    </ModeShell>
  );
}
