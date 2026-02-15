"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";

export default function ChatPage() {
  const t = useTranslations("chat");
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") ?? undefined;
  const getOrCreate = trpc.conversation.getOrCreateCoaching.useMutation({
    onSuccess: (data) => {
      const url = projectId
        ? `/chat/${data.id}?projectId=${encodeURIComponent(projectId)}`
        : `/chat/${data.id}`;
      router.replace(url);
    },
  });

  useEffect(() => {
    getOrCreate.mutate();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">
        {getOrCreate.isPending ? t("loadingSession") : t("redirecting")}
      </p>
    </div>
  );
}
