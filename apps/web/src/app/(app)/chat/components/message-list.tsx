"use client";

import { useEffect, useRef } from "react";

type UIMessage = {
  id?: string;
  role: string;
  parts: Array<{ type: string; text?: string }>;
};

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts: React.ReactNode[] = [];
    let rest = line;
    while (rest.length > 0) {
      const boldMatch = rest.match(/\*\*(.+?)\*\*/);
      const listMatch = rest.match(/^-\s+/);
      if (listMatch) {
        parts.push(
          <span key={`${i}-list`} className="ml-4 list-disc">
            • {rest.slice(listMatch[0].length)}
          </span>
        );
        break;
      }
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) {
          parts.push(rest.slice(0, boldMatch.index));
        }
        parts.push(
          <strong key={`${i}-b-${parts.length}`}>{boldMatch[1]}</strong>
        );
        rest = rest.slice(boldMatch.index + boldMatch[0].length);
      } else {
        parts.push(rest);
        break;
      }
    }
    return (
      <span key={i}>
        {parts.length ? parts : line}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

export function MessageList({
  messages,
  status,
}: {
  messages: UIMessage[];
  status: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-neutral-500">
        Start a conversation with your coach
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {messages.map((m) => {
        const text =
          m.parts
            ?.filter((p): p is { type: string; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("") ?? "";
        const isUser = m.role === "user";
        return (
          <div
            key={m.id ?? Math.random()}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                isUser
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-100 text-neutral-900"
              }`}
            >
              <div className="text-xs font-medium opacity-80">
                {isUser ? "You" : "Coach"}
              </div>
              <div className="mt-1 whitespace-pre-wrap break-words">
                {renderMarkdown(text)}
              </div>
            </div>
          </div>
        );
      })}
      {status === "streaming" && (
        <div className="flex justify-start">
          <div className="rounded-lg bg-neutral-100 px-4 py-2 text-neutral-500">
            ...
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
