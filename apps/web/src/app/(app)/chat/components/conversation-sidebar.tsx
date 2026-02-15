"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60 * 60 * 1000) return "Just now";
  if (diff < 24 * 60 * 60 * 1000) return "Today";
  if (diff < 7 * 24 * 60 * 60 * 1000) return "This week";
  return date.toLocaleDateString();
}

export function ConversationSidebar({
  activeChatId,
}: {
  activeChatId: string;
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

  return (
    <aside className="flex w-64 flex-col border-r border-neutral-200 bg-white">
      <Link
        href="/chat"
        className="m-2 rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
      >
        New Chat
      </Link>
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="text-sm text-neutral-500">Loading...</div>
        ) : (
          (conversations ?? []).map((c) => (
            <div
              key={c.id}
              className={`group flex items-center justify-between gap-1 rounded-lg px-2 py-2 ${
                activeChatId === c.id ? "bg-blue-50" : "hover:bg-neutral-50"
              }`}
            >
              <Link
                href={`/chat/${c.id}`}
                className="min-w-0 flex-1 truncate text-sm text-neutral-800"
              >
                <span className="block truncate">
                  {c.title || "New conversation"}
                </span>
                <span className="text-xs text-neutral-500">
                  {formatDate(c.updatedAt)}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Delete this conversation?")) {
                    deleteMut.mutate({ id: c.id });
                  }
                }}
                className="rounded p-1 text-neutral-400 opacity-0 hover:bg-neutral-200 hover:text-neutral-700 group-hover:opacity-100"
                aria-label="Delete"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
