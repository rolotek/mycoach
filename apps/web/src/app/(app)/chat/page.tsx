"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

export default function ChatPage() {
  const router = useRouter();
  const getOrCreate = trpc.conversation.getOrCreateCoaching.useMutation({
    onSuccess: (data) => {
      router.replace(`/chat/${data.id}`);
    },
  });

  useEffect(() => {
    getOrCreate.mutate();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">
        {getOrCreate.isPending ? "Loading coaching session..." : "Redirecting..."}
      </p>
    </div>
  );
}
