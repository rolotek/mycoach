"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, PanelLeftClose, PanelLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60 * 60 * 1000) return "Just now";
  if (diff < 24 * 60 * 60 * 1000) return "Today";
  if (diff < 7 * 24 * 60 * 60 * 1000) return "This week";
  return date.toLocaleDateString();
}

function ConversationList({
  activeChatId,
  onItemClick,
}: {
  activeChatId: string;
  onItemClick?: () => void;
}) {
  const router = useRouter();
  const { data: conversations, isLoading } = trpc.conversation.list.useQuery();
  const utils = trpc.useUtils();
  const deleteMut = trpc.conversation.delete.useMutation({
    onSuccess: () => {
      utils.conversation.list.invalidate();
      if (activeChatId) router.push("/chat");
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-2 p-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2">
      {(conversations ?? []).map((c) => (
        <div
          key={c.id}
          className={`group flex items-center justify-between gap-1 rounded-lg px-2 py-2 ${
            activeChatId === c.id ? "bg-accent" : "hover:bg-accent/50"
          }`}
        >
          <Link
            href={`/chat/${c.id}`}
            onClick={onItemClick}
            className="min-w-0 flex-1 truncate text-sm text-foreground"
          >
            <span className="block truncate">{c.title || "New conversation"}</span>
            <span className="text-xs text-muted-foreground">{formatDate(c.updatedAt)}</span>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (window.confirm("Delete this conversation?")) {
                deleteMut.mutate({ id: c.id });
              }
            }}
            aria-label="Delete"
          >
            ×
          </Button>
        </div>
      ))}
    </div>
  );
}

export function ConversationSidebar({
  activeChatId,
  open,
  onOpenChange,
  collapsed,
  onCollapsedChange,
}: {
  activeChatId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const isCollapsed = collapsed ?? internalCollapsed;
  const setCollapsed = onCollapsedChange ?? setInternalCollapsed;

  const content = (
    <>
      <Button className="w-full" size="sm" asChild>
        <Link href="/chat">
          <Plus className="h-4 w-4" />
          New Chat
        </Link>
      </Button>
      <ConversationList
        activeChatId={activeChatId}
        onItemClick={() => setOpen(false)}
      />
    </>
  );

  return (
    <>
      {/* Desktop: collapsible panel */}
      <div className="hidden shrink-0 border-r border-border bg-card md:block">
        <div className="flex h-full w-64 flex-col p-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Conversations</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCollapsed(!isCollapsed)}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>
          {!isCollapsed && content}
        </div>
      </div>
      {/* Mobile: Sheet (trigger is in chat page header) */}
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Conversations</SheetTitle>
          <div className="flex h-full flex-col p-2">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
