"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

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

  if (submitted === "positive") {
    return (
      <div className="mt-2 border-t border-green-200 pt-2 text-sm text-neutral-500">
        Thanks for the feedback
      </div>
    );
  }
  if (submitted === "negative" && showCorrection) {
    return (
      <div className="mt-2 border-t border-green-200 pt-2">
        <textarea
          placeholder="What should have been different?"
          value={correctionText}
          onChange={(e) => setCorrectionText(e.target.value)}
          className="mb-2 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
          rows={2}
        />
        <button
          type="button"
          onClick={submitCorrection}
          className="rounded bg-neutral-200 px-2 py-1 text-sm hover:bg-neutral-300"
        >
          Submit correction
        </button>
      </div>
    );
  }
  if (submitted === "negative" && !showCorrection) {
    return (
      <div className="mt-2 border-t border-green-200 pt-2 text-sm text-neutral-500">
        Noted — this will help improve future results
      </div>
    );
  }
  return (
    <div className="mt-2 flex items-center gap-2 border-t border-green-200 pt-2">
      <button
        type="button"
        onClick={submitPositive}
        className="rounded p-1.5 text-neutral-500 hover:bg-green-50 hover:text-green-600"
        title="Thumbs up"
      >
        +1
      </button>
      <button
        type="button"
        onClick={submitNegative}
        className="rounded p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600"
        title="Thumbs down"
      >
        -1
      </button>
    </div>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts: React.ReactNode[] = [];
    let rest = line;
    while (rest.length > 0) {
      const boldMatch = rest.match(/\*\*(.+?)\*\*/);
      const listMatch = rest.match(/^-\s+/);
      if (listMatch) {
        parts.push(
          <span key={`${i}-list`} className="ml-4 list-disc">
            • {rest.slice(listMatch[0].length)}
          </span>
        );
        break;
      }
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) {
          parts.push(rest.slice(0, boldMatch.index));
        }
        parts.push(
          <strong key={`${i}-b-${parts.length}`}>{boldMatch[1]}</strong>
        );
        rest = rest.slice(boldMatch.index + boldMatch[0].length);
      } else {
        parts.push(rest);
        break;
      }
    }
    return (
      <span key={i}>
        {parts.length ? parts : line}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
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
  return (
    <div className="rounded-lg border-2 border-green-200 bg-green-50/50 px-4 py-3">
      <div className="text-sm font-medium text-green-900">
        Result from {agentName}
      </div>
      <div className="mt-2 whitespace-pre-wrap break-words text-sm text-neutral-800">
        {renderMarkdown(result)}
      </div>
      {executionId && agentId && (
        <FeedbackButtons executionId={executionId} agentId={agentId} />
      )}
    </div>
  );
}

export function AgentDeniedCard() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-100 px-4 py-2 text-sm text-neutral-500">
      Agent dispatch was declined
    </div>
  );
}
