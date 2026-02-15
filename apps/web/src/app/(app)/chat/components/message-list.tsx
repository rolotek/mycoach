"use client";

import { useEffect, useRef } from "react";
import { ChatMarkdown } from "@/components/chat-markdown";
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
    output?: {
      agentName?: string;
      result?: string;
      executionId?: string;
      agentId?: string;
    };
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
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
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
                    output?: {
                      agentName?: string;
                      result?: string;
                      executionId?: string;
                      agentId?: string;
                    };
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
                    const out = part.output;
                    const result =
                      typeof out.result === "string"
                        ? out.result
                        : String(out.result ?? "");
                    const name = out.agentName ?? agentName;
                    return (
                      <div key={`${m.id}-${i}`} className="max-w-[85%]">
                        <AgentResultCard
                          agentName={name}
                          result={result}
                          executionId={out.executionId}
                          agentId={out.agentId}
                        />
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
                        className="max-w-[85%] rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground"
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
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <div className="text-xs font-medium opacity-80">
                  {isUser ? "You" : "Coach"}
                </div>
                <div className="mt-1 whitespace-pre-wrap break-words">
                  <ChatMarkdown content={text} />
                </div>
              </div>
            )}
          </div>
        );
      })}
      {status === "streaming" && (
        <div className="flex justify-start">
          <div className="rounded-lg bg-muted px-4 py-2 text-muted-foreground">
            <span className="flex gap-1">
              <span
                className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40"
                style={{ animationDelay: "300ms" }}
              />
            </span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
