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

  const buildRedirectUrl = (id: string) => {
    const params = new URLSearchParams();
    if (projectId) params.set("projectId", projectId);
    if (milestoneId) params.set("milestoneId", milestoneId);
    const qs = params.toString();
    return qs ? `/chat/${id}?${qs}` : `/chat/${id}`;
  };

  const getOrCreateCoaching = trpc.conversation.getOrCreateCoaching.useMutation({
    onSuccess: (data) => {
      router.replace(buildRedirectUrl(data.id));
    },
  });

  const getOrCreateProjectThread = trpc.conversation.getOrCreateProjectThread.useMutation({
    onSuccess: (data) => {
      router.replace(buildRedirectUrl(data.id));
    },
  });

  useEffect(() => {
    if (projectId) {
      getOrCreateProjectThread.mutate({
        projectId,
        milestoneId: milestoneId ?? null,
      });
    } else {
      getOrCreateCoaching.mutate();
    }
  }, [projectId, milestoneId]);

  const isPending = projectId
    ? getOrCreateProjectThread.isPending
    : getOrCreateCoaching.isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">
        {isPending ? t("loadingSession") : t("redirecting")}
      </p>
    </div>
  );
}
