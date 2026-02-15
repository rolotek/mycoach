"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { UIMessage } from "ai";
import Link from "next/link";
import { Menu } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCoachingChat } from "@/hooks/use-coaching-chat";
import { MessageList, type MessageListMessage } from "../components/message-list";
import { ChatInput } from "../components/chat-input";
import { ModeToggle } from "../components/mode-toggle";
import { ConversationSidebar } from "../components/conversation-sidebar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatIdPage() {
  const params = useParams();
  const chatId = params.id as string;
  const [mode, setMode] = useState("auto");
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: conv, isLoading: convLoading } =
    trpc.conversation.get.useQuery(
      { id: chatId },
      { enabled: !!chatId }
    );
  const isTaskThread = conv?.type === "task";

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
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        <div className="hidden w-64 shrink-0 border-r border-border bg-card md:block">
          <Skeleton className="m-2 h-9 w-full" />
          <Skeleton className="m-2 h-12 w-full" />
          <Skeleton className="m-2 h-12 w-full" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center min-w-0">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-4 h-32 w-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <ConversationSidebar
        activeChatId={chatId}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open conversations"
            >
              <Menu className="h-5 w-5" />
            </Button>
            {isTaskThread && (
              <Link
                href="/chat"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Back to coaching
              </Link>
            )}
            <h1 className="text-lg font-medium text-foreground">
              {isTaskThread ? (conv?.title ?? "Task") : "Coaching"}
            </h1>
          </div>
          {!isTaskThread && <ModeToggle mode={mode} onChange={setMode} />}
        </header>
        <MessageList
          messages={messages as MessageListMessage[]}
          status={status}
          addToolApprovalResponse={addToolApprovalResponse}
        />
        {!isTaskThread && (
          <ChatInput
            input={input}
            handleInputChange={(e) => setInput(e.target.value)}
            handleSubmit={handleSubmit}
            status={status}
          />
        )}
      </div>
    </div>
  );
}
