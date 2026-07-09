import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function ChatBubble({ role, content, isStreaming }: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={`rounded-[14px] border border-border px-4 py-3 text-[0.92rem] leading-relaxed ${
        isUser ? "bg-[#1e2640]" : "bg-[#141824]"
      }`}
    >
      <div className="prose-chat">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || (isStreaming ? "…" : "")}</ReactMarkdown>
        {isStreaming && content && <span className="ml-0.5 inline-block animate-pulse text-accent">▌</span>}
      </div>
    </div>
  );
}
