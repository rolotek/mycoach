"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ChatMarkdown } from "@/components/chat-markdown";
import { AgentApprovalCard } from "./agent-approval";
import { AgentResultCard, AgentDeniedCard, AgentSummaryCard } from "./agent-result";

export type MessageListMessage = {
  id?: string;
  role: string;
  /** Model id used for this message (e.g. "google:gemini-2.0-flash"). Set by server when persisting. */
  modelId?: string | null;
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
      taskThreadId?: string;
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

/** If the model output raw coaching-tool JSON, show the inner message instead. */
function normalizeCoachText(raw: string): string {
  const t = raw.trim();
  if (!t.startsWith("{")) return raw;
  try {
    const parsed = JSON.parse(t) as { name?: string; parameters?: { message?: string } };
    if (parsed?.name === "coaching" && typeof parsed?.parameters?.message === "string")
      return parsed.parameters.message;
  } catch {
    // not JSON or wrong shape
  }
  return raw;
}

/** Resolve model id (e.g. "google:gemini-2.0-flash") to display name from providers list. */
function getModelDisplayName(
  modelId: string | null | undefined,
  providers: { id: string; models: { id: string; name: string }[] }[]
): string | undefined {
  if (!modelId) return undefined;
  for (const p of providers) {
    const m = p.models.find((x) => x.id === modelId);
    if (m) return m.name;
  }
  return undefined;
}

export function MessageList({
  messages,
  status,
  addToolApprovalResponse,
  coachModelLabel,
  providers = [],
}: {
  messages: MessageListMessage[];
  status: string;
  addToolApprovalResponse?: (options: {
    id: string;
    approved: boolean;
    reason?: string;
  }) => void;
  /** Unused: kept for backwards compatibility. We only show model when message.modelId is set. */
  coachModelLabel?: string | null;
  /** Provider list to resolve message.modelId to display name (per-message). */
  providers?: { id: string; models: { id: string; name: string }[] }[];
}) {
  const t = useTranslations("chat");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        {t("startConversation")}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {messages.map((m, index) => {
        const isUser = m.role === "user";
        const textParts = m.parts?.filter((p) => p.type === "text") ?? [];
        const rawText = textParts.map((p) => (p as { text?: string }).text).join("") ?? "";
        const text = isUser ? rawText : normalizeCoachText(rawText);
        const dispatchParts = m.parts?.filter(
          (p) => typeof p.type === "string" && p.type.startsWith("tool-dispatch_")
        ) ?? [];
        const key = typeof m.id === "string" && m.id.trim() ? m.id : `msg-${index}`;

        return (
          <div
            key={key}
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
                      taskThreadId?: string;
                    };
                  };
                  const toolName = part.type.startsWith("tool-")
                    ? part.type.slice(5)
                    : part.type;
                  const agentName = extractAgentName(toolName);
                  if (part.state === "approval-requested" && part.approval?.id && addToolApprovalResponse) {
                    return (
                      <div key={`${key}-${i}`} className="max-w-[85%]">
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
                    if (out.taskThreadId) {
                      return (
                        <div key={`${key}-${i}`} className="max-w-[85%]">
                          <AgentSummaryCard
                            agentName={out.agentName ?? agentName}
                            task={part.input?.task ?? "Agent task"}
                            taskThreadId={out.taskThreadId}
                          />
                        </div>
                      );
                    }
                    const result =
                      typeof out.result === "string"
                        ? out.result
                        : String(out.result ?? "");
                    const name = out.agentName ?? agentName;
                    return (
                      <div key={`${key}-${i}`} className="max-w-[85%]">
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
                      <div key={`${key}-${i}`} className="max-w-[85%]">
                        <AgentDeniedCard />
                      </div>
                    );
                  }
                  if (part.state === "call" || part.state === "input-available") {
                    return (
                      <div
                        key={`${key}-${i}`}
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
                  {isUser
                    ? t("you")
                    : (() => {
                        const label = getModelDisplayName(
                          (m as MessageListMessage).modelId,
                          providers
                        );
                        return label ? `${t("coach")} · ${label}` : t("coach");
                      })()}
                </div>
                <div className="mt-1 whitespace-pre-wrap break-words">
                  <ChatMarkdown content={text} />
                </div>
              </div>
            )}
          </div>
        );
      })}
      {(status === "submitted" || status === "streaming") && (
        <div className="flex justify-start" aria-label={t("thinking")}>
          <div className="rounded-lg bg-muted px-4 py-2 text-muted-foreground">
            <span className="flex items-center gap-1">
              <span
                className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
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
