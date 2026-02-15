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
  const milestoneId = searchParams.get("milestoneId") ?? undefined;
  const getOrCreate = trpc.conversation.getOrCreateCoaching.useMutation({
    onSuccess: (data) => {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      if (milestoneId) params.set("milestoneId", milestoneId);
      const qs = params.toString();
      const url = qs ? `/chat/${data.id}?${qs}` : `/chat/${data.id}`;
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
