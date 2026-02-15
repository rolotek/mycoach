"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { RotateCcw, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";


export function ConversationSidebar({
  activeChatId,
  open,
  onOpenChange,
}: {
  activeChatId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useTranslations("chat");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [coachingId, setCoachingId] = useState<string | null>(null);

  function formatDate(d: Date | string): string {
    const date = typeof d === "string" ? new Date(d) : d;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60 * 60 * 1000) return tCommon("justNow");
    if (diff < 24 * 60 * 60 * 1000) return tCommon("today");
    if (diff < 7 * 24 * 60 * 60 * 1000) return tCommon("thisWeek");
    return date.toLocaleDateString();
  }
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const getOrCreate = trpc.conversation.getOrCreateCoaching.useMutation({
    onSuccess: (data) => setCoachingId(data.id),
  });
  const utils = trpc.useUtils();
  const resetMut = trpc.conversation.reset.useMutation({
    onSuccess: () => {
      utils.conversation.get.invalidate({ id: coachingId! });
      utils.conversation.listTaskThreads.invalidate();
      if (activeChatId === coachingId) router.replace(`/chat/${coachingId}`);
    },
  });
  const deleteMut = trpc.conversation.delete.useMutation({
    onSuccess: () => {
      utils.conversation.listTaskThreads.invalidate();
      if (activeChatId) router.push("/chat");
    },
  });

  const { data: taskThreads, isLoading: tasksLoading } =
    trpc.conversation.listTaskThreads.useQuery(
      { parentId: coachingId! },
      { enabled: !!coachingId }
    );

  useEffect(() => {
    if (coachingId == null && !getOrCreate.isPending) getOrCreate.mutate();
  }, [coachingId, getOrCreate.isPending]);

  const handleReset = () => {
    if (!coachingId) return;
    if (!window.confirm(t("resetConfirm"))) return;
    resetMut.mutate({ id: coachingId });
  };

  const content = (
    <>
      {/* Pinned coaching thread */}
      <div className="flex flex-col gap-1 p-2">
        {coachingId ? (
          <>
            <div
              className={`flex items-center justify-between gap-1 rounded-lg px-2 py-2 ${
                activeChatId === coachingId ? "bg-accent" : "hover:bg-accent/50"
              }`}
            >
              <Link
                href={`/chat/${coachingId}`}
                onClick={() => setOpen(false)}
                className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
              >
                {t("coaching")}
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={handleReset}
                aria-label={t("resetCoaching")}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <Skeleton className="h-10 w-full" />
        )}
      </div>
      <Separator />
      {/* Recent tasks */}
      <div className="flex flex-1 flex-col overflow-hidden p-2">
        <span className="mb-1 px-2 text-xs font-medium text-muted-foreground">
          {t("recentTasks")}
        </span>
        {!coachingId || tasksLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : (taskThreads?.length ?? 0) === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">{t("noTasksYet")}</p>
        ) : (
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-0.5">
              {(taskThreads ?? []).map((thread) => (
                <div
                  key={thread.id}
                  className={`group flex items-center justify-between gap-1 rounded-lg px-2 py-2 ${
                    activeChatId === thread.id ? "bg-accent" : "hover:bg-accent/50"
                  }`}
                >
                  <Link
                    href={`/chat/${thread.id}`}
                    onClick={() => setOpen(false)}
                    className="min-w-0 flex-1 truncate text-sm text-foreground"
                  >
                    <span className="block truncate">{thread.title || t("task")}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(thread.updatedAt)}
                    </span>
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (window.confirm(t("deleteTaskConfirm"))) {
                        deleteMut.mutate({ id: thread.id });
                      }
                    }}
                    aria-label={t("deleteTaskThread")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </>
  );

  return (
    <>
      <div className="hidden h-full shrink-0 border-r border-border bg-card md:flex md:w-64 md:flex-col">
        {content}
      </div>
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-64 flex-col p-0">
          <SheetTitle className="sr-only">{t("conversations")}</SheetTitle>
          <div className="flex h-full flex-col">{content}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}
