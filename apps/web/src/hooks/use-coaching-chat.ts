"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";

const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";

export function useCoachingChat(
  chatId: string,
  mode: string = "auto",
  initialMessages?: UIMessage[]
) {
  return useChat({
    id: chatId,
    messages: initialMessages,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    transport: new DefaultChatTransport({
      api: `${SERVER_URL}/api/chat`,
      credentials: "include",
      body: { chatId, mode },
    }),
  });
}
