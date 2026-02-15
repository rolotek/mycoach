"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ThumbsUp, ThumbsDown, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ChatMarkdown } from "@/components/chat-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function AgentSummaryCard({
  agentName,
  task,
  taskThreadId,
}: {
  agentName: string;
  task: string;
  taskThreadId?: string;
}) {
  const t = useTranslations("chat");
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{agentName}</Badge>
          <span className="text-xs text-muted-foreground">{t("completed")}</span>
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">{task}</p>
      </div>
      {taskThreadId && (
        <Link
          href={`/chat/${taskThreadId}`}
          className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {t("viewResult")}
          <ExternalLink className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

export function FeedbackButtons({
  executionId,
  agentId,
}: {
  executionId: string;
  agentId: string;
}) {
  const [submitted, setSubmitted] = useState<null | "positive" | "negative">(
    null
  );
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  const createMut = trpc.agentFeedback.create.useMutation();

  const submitPositive = () => {
    createMut.mutate(
      { agentId, executionId, rating: "positive" },
      { onSuccess: () => setSubmitted("positive") }
    );
  };
  const submitNegative = () => {
    createMut.mutate(
      { agentId, executionId, rating: "negative" },
      { onSuccess: () => setSubmitted("negative") }
    );
    setShowCorrection(true);
  };
  const submitCorrection = () => {
    createMut.mutate(
      {
        agentId,
        executionId,
        rating: "negative",
        correction: correctionText || undefined,
      },
      { onSuccess: () => setShowCorrection(false) }
    );
  };

  const t = useTranslations("chat");
  if (submitted === "positive") {
    return (
      <div className="mt-2 border-t border-border pt-2 text-sm text-muted-foreground">
        {t("thanksForFeedback")}
      </div>
    );
  }
  if (submitted === "negative" && showCorrection) {
    return (
      <div className="mt-2 border-t border-border pt-2">
        <Textarea
          placeholder={t("whatShouldBeDifferent")}
          value={correctionText}
          onChange={(e) => setCorrectionText(e.target.value)}
          className="mb-2 min-h-[60px]"
          rows={2}
        />
        <Button size="sm" variant="secondary" onClick={submitCorrection}>
          {t("submitCorrection")}
        </Button>
      </div>
    );
  }
  if (submitted === "negative" && !showCorrection) {
    return (
      <div className="mt-2 border-t border-border pt-2 text-sm text-muted-foreground">
        {t("notedImprove")}
      </div>
    );
  }
  return (
    <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={submitPositive}
        title="Thumbs up"
      >
        <ThumbsUp className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={submitNegative}
        title="Thumbs down"
      >
        <ThumbsDown className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function AgentResultCard({
  agentName,
  result,
  executionId,
  agentId,
}: {
  agentName: string;
  result: string;
  executionId?: string;
  agentId?: string;
}) {
  const tChat = useTranslations("chat");
  return (
    <div className="rounded-lg border border-border border-l-4 border-l-primary bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{tChat("resultFrom")}</span>
        <Badge variant="secondary">{agentName}</Badge>
      </div>
      <div className="mt-2 break-words text-sm text-foreground">
        <ChatMarkdown content={result} />
      </div>
      {executionId && agentId && (
        <FeedbackButtons executionId={executionId} agentId={agentId} />
      )}
    </div>
  );
}

export function AgentDeniedCard() {
  const t = useTranslations("chat");
  return (
    <div className="rounded-lg border border-border bg-muted px-4 py-2 text-sm text-muted-foreground">
      {t("agentDeclined")}
    </div>
  );
}
