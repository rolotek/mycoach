"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { UIMessage } from "ai";
import { trpc } from "@/lib/trpc";
import { useCoachingChat } from "@/hooks/use-coaching-chat";
import { MessageList, type MessageListMessage } from "../components/message-list";
import { ChatInput } from "../components/chat-input";
import { ModeToggle } from "../components/mode-toggle";
import { ConversationSidebar } from "../components/conversation-sidebar";

export default function ChatIdPage() {
  const params = useParams();
  const chatId = params.id as string;
  const [mode, setMode] = useState("auto");
  const [input, setInput] = useState("");

  const { data: conv, isLoading: convLoading } =
    trpc.conversation.get.useQuery(
      { id: chatId },
      { enabled: !!chatId }
    );

  const {
    messages,
    status,
    sendMessage,
    setMessages,
    addToolApprovalResponse,
  } = useCoachingChat(chatId, mode);

  useEffect(() => {
    if (conv?.messages && Array.isArray(conv.messages) && messages.length === 0) {
      const normalized = conv.messages as UIMessage[];
      setMessages(normalized.map((m) => ({ ...m, id: m.id ?? crypto.randomUUID() })));
    }
  }, [conv?.messages, setMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status === "streaming" || status === "submitted")
      return;
    sendMessage({ text: input.trim() });
    setInput("");
  };

  if (!chatId) return null;
  if (convLoading) {
    return (
      <div className="flex min-h-screen">
        <ConversationSidebar activeChatId={chatId} />
        <div className="flex flex-1 items-center justify-center">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <ConversationSidebar activeChatId={chatId} />
      <main className="flex flex-1 flex-col bg-neutral-50">
        <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-2">
          <h1 className="text-lg font-medium text-neutral-900">Coach</h1>
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
        <MessageList
          messages={messages as MessageListMessage[]}
          status={status}
          addToolApprovalResponse={addToolApprovalResponse}
        />
        <ChatInput
          input={input}
          handleInputChange={(e) => setInput(e.target.value)}
          handleSubmit={handleSubmit}
          status={status}
        />
      </main>
    </div>
  );
}
