"use client";

import { ArrowUp } from "lucide-react";
import { useRef, useState } from "react";

interface ChatComposerProps {
  placeholder: string;
  disabled?: boolean;
  onSend: (text: string) => void;
}

export function ChatComposer({ placeholder, disabled, onSend }: ChatComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    requestAnimationFrame(resize);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="sticky bottom-0 bg-gradient-to-t from-bg via-bg to-transparent px-6 pb-6 pt-10">
      <div className="mx-auto flex max-w-[760px] items-end gap-2 rounded-[26px] border-[1.5px] border-[#2e3450] bg-[#1e2130] px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.45)] focus-within:border-accent/55">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            resize();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[0.95rem] text-text placeholder-text-dimmer outline-none"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#22d3ee] transition-transform disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:scale-105"
        >
          <ArrowUp className="h-[17px] w-[17px] text-bg" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
