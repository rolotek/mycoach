"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

export default function NewChatPage() {
  const router = useRouter();
  const create = trpc.conversation.create.useMutation({
    onSuccess: (data) => {
      router.replace(`/chat/${data.id}`);
    },
  });

  useEffect(() => {
    create.mutate({});
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-neutral-500">
        {create.isPending ? "Creating conversation..." : "Redirecting..."}
      </p>
    </div>
  );
}
