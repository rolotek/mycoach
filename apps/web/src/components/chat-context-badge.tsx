"use client";

import { FolderKanban } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useTranslations } from "next-intl";

type ChatContextBadgeProps = {
  projectId?: string | null;
  milestoneId?: string | null;
};

export function ChatContextBadge({
  projectId,
  milestoneId,
}: ChatContextBadgeProps) {
  const t = useTranslations("projects");
  const { data: project } = trpc.project.get.useQuery(
    { id: projectId! },
    { enabled: !!projectId }
  );

  if (!projectId || !project) return null;

  const sectionPart =
    milestoneId && project.milestones?.length
      ? (() => {
          const m = project.milestones.find((mil) => mil.id === milestoneId);
          return m ? ` > ${m.title}` : "";
        })()
      : "";

  const docCount =
    milestoneId != null
      ? (project.documents ?? []).filter(
          (d: { milestoneId?: string | null }) =>
            !d.milestoneId || d.milestoneId === milestoneId
        ).length
      : (project.documents ?? []).length;
  const linkCount =
    milestoneId != null
      ? (project.links ?? []).filter(
          (l: { milestoneId?: string | null }) =>
            !l.milestoneId || l.milestoneId === milestoneId
        ).length
      : (project.links ?? []).length;

  const parts = [`${project.name}${sectionPart}`];
  if (docCount > 0) parts.push(`${docCount} ${t("contextDocs")}`);
  if (linkCount > 0) parts.push(`${linkCount} ${t("contextLinks")}`);

  return (
    <div className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground">
      <FolderKanban className="h-3 w-3 shrink-0" />
      <span>
        {t("usingContext")}: {parts.join(" + ")}
      </span>
    </div>
  );
}
