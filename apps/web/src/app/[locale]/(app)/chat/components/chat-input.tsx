"use client";

import { useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatInput({
  input,
  handleInputChange,
  handleSubmit,
  status,
}: {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  status: string;
}) {
  const t = useTranslations("chat");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  return (
    <form onSubmit={handleSubmit} className="shrink-0 border-t border-border bg-card p-4">
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!isStreaming && input.trim()) {
                handleSubmit(e);
              }
            }
          }}
          placeholder={t("placeholder")}
          rows={1}
          className="max-h-[120px] min-h-[40px] flex-1 resize-none focus-visible:ring-1 focus-visible:ring-ring"
          disabled={isStreaming}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isStreaming}
          aria-label={t("send")}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
