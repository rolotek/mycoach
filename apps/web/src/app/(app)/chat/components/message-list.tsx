"use client";

import { useEffect, useRef } from "react";
import { AgentApprovalCard } from "./agent-approval";
import { AgentResultCard, AgentDeniedCard } from "./agent-result";

export type MessageListMessage = {
  id?: string;
  role: string;
  parts: Array<{
    type: string;
    text?: string;
    state?: string;
    input?: { task?: string };
    approval?: { id: string };
    output?: { agentName?: string; result?: string };
  }>;
};

function extractAgentName(toolName: string): string {
  const withoutPrefix = toolName.startsWith("dispatch_")
    ? toolName.slice("dispatch_".length)
    : toolName;
  const withSpaces = withoutPrefix.replace(/[-_]/g, " ");
  return withSpaces
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

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
  addToolApprovalResponse,
}: {
  messages: MessageListMessage[];
  status: string;
  addToolApprovalResponse?: (options: {
    id: string;
    approved: boolean;
    reason?: string;
  }) => void;
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
        const isUser = m.role === "user";
        const textParts = m.parts?.filter((p) => p.type === "text") ?? [];
        const text = textParts.map((p) => (p as { text?: string }).text).join("") ?? "";
        const dispatchParts = m.parts?.filter(
          (p) => typeof p.type === "string" && p.type.startsWith("tool-dispatch_")
        ) ?? [];

        return (
          <div
            key={m.id ?? Math.random()}
            className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}
          >
            {!isUser && dispatchParts.length > 0 && (
              <>
                {dispatchParts.map((p, i) => {
                  const part = p as {
                    type: string;
                    state?: string;
                    input?: { task?: string };
                    approval?: { id: string };
                    output?: { agentName?: string; result?: string };
                  };
                  const toolName = part.type.startsWith("tool-")
                    ? part.type.slice(5)
                    : part.type;
                  const agentName = extractAgentName(toolName);
                  if (part.state === "approval-requested" && part.approval?.id && addToolApprovalResponse) {
                    return (
                      <div key={`${m.id}-${i}`} className="max-w-[85%]">
                        <AgentApprovalCard
                          agentName={agentName}
                          task={part.input?.task ?? ""}
                          onApprove={() =>
                            addToolApprovalResponse({
                              id: part.approval!.id,
                              approved: true,
                            })
                          }
                          onDeny={() =>
                            addToolApprovalResponse({
                              id: part.approval!.id,
                              approved: false,
                            })
                          }
                        />
                      </div>
                    );
                  }
                  if (part.state === "output-available" && part.output) {
                    const out = part.output as {
                      agentName?: string;
                      result?: string;
                    };
                    const result = typeof out.result === "string" ? out.result : String(out.result ?? "");
                    const name = out.agentName ?? agentName;
                    return (
                      <div key={`${m.id}-${i}`} className="max-w-[85%]">
                        <AgentResultCard agentName={name} result={result} />
                      </div>
                    );
                  }
                  if (part.state === "output-denied") {
                    return (
                      <div key={`${m.id}-${i}`} className="max-w-[85%]">
                        <AgentDeniedCard />
                      </div>
                    );
                  }
                  if (part.state === "call" || part.state === "input-available") {
                    return (
                      <div
                        key={`${m.id}-${i}`}
                        className="max-w-[85%] rounded-lg bg-neutral-100 px-4 py-2 text-sm text-neutral-500"
                      >
                        Routing to {agentName}...
                      </div>
                    );
                  }
                  return null;
                })}
              </>
            )}
            {text.length > 0 && (
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
            )}
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
