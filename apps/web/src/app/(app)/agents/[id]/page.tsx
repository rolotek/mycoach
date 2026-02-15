"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";

export default function AgentDetailPage() {
  const id = useParams().id as string;
  const utils = trpc.useUtils();
  const { data: agents } = trpc.agent.listAll.useQuery();
  const { data: versions, isLoading: versionsLoading } =
    trpc.agentVersion.list.useQuery({ agentId: id });
  const { data: feedbackList } = trpc.agentFeedback.listByAgent.useQuery({
    agentId: id,
  });
  const revertMut = trpc.agentVersion.revert.useMutation({
    onSuccess: () => {
      utils.agentVersion.list.invalidate();
      utils.agent.listAll.invalidate();
    },
  });

  const agent = agents?.find((a) => a.id === id);

  const positiveCount = feedbackList?.filter((f) => f.rating === "positive").length ?? 0;
  const negativeCount = feedbackList?.filter((f) => f.rating === "negative").length ?? 0;

  if (!agent) {
    return (
      <div className="min-h-screen bg-neutral-50 p-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/agents"
            className="text-sm text-neutral-600 hover:underline"
          >
            Back to Agents
          </Link>
          <p className="mt-4 text-neutral-500">Agent not found or loading.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/agents"
          className="text-sm text-neutral-600 hover:underline"
        >
          Back to Agents
        </Link>

        <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {agent.icon && (
              <span className="text-2xl" aria-hidden>
                {agent.icon}
              </span>
            )}
            <h1 className="text-xl font-semibold text-neutral-900">
              {agent.name}
            </h1>
            {agent.isStarter && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                Starter
              </span>
            )}
            {agent.archivedAt && (
              <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs text-neutral-600">
                Archived
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-neutral-600">{agent.description}</p>

          <div className="mt-4">
            <h2 className="text-sm font-medium text-neutral-700">
              Current system prompt
            </h2>
            <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded bg-neutral-50 p-4 font-mono text-sm">
              {agent.systemPrompt}
            </pre>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-700">
              Feedback summary
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Total: {feedbackList?.length ?? 0} · Positive: {positiveCount} ·
              Negative: {negativeCount}
            </p>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-medium text-neutral-700">
              Version history
            </h2>
            {versionsLoading ? (
              <p className="mt-2 text-sm text-neutral-500">Loading...</p>
            ) : !versions?.length ? (
              <p className="mt-2 text-sm text-neutral-500">
                No version history yet
              </p>
            ) : (
              <div className="mt-2 space-y-3">
                {versions.map((v) => (
                  <VersionCard
                    key={v.id}
                    version={v}
                    onRevert={() =>
                      revertMut.mutate({ agentId: id, versionId: v.id })
                    }
                    isReverting={revertMut.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VersionCard({
  version,
  onRevert,
  isReverting,
}: {
  version: {
    id: string;
    version: number;
    changeSource: string;
    changeSummary: string | null;
    systemPrompt: string;
    createdAt: string | Date;
  };
  onRevert: () => void;
  isReverting: boolean;
}) {
  const [showPrompt, setShowPrompt] = useState(false);
  const badgeClass =
    version.changeSource === "evolution"
      ? "bg-green-100 text-green-800"
      : version.changeSource === "manual"
        ? "bg-blue-100 text-blue-800"
        : "bg-neutral-100 text-neutral-700";

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-neutral-900">
            Version {version.version}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-xs ${badgeClass}`}
          >
            {version.changeSource}
          </span>
          <span className="text-sm text-neutral-500">
            {new Date(version.createdAt).toLocaleString()}
          </span>
        </div>
        <button
          type="button"
          onClick={onRevert}
          disabled={isReverting}
          className="rounded border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
        >
          Revert to this version
        </button>
      </div>
      {version.changeSummary && (
        <p className="mt-2 text-sm text-neutral-600">{version.changeSummary}</p>
      )}
      <button
        type="button"
        onClick={() => setShowPrompt((s) => !s)}
        className="mt-2 text-xs text-neutral-500 hover:underline"
      >
        {showPrompt ? "Hide prompt" : "Show prompt"}
      </button>
      {showPrompt && (
        <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-white p-2 font-mono text-xs">
          {version.systemPrompt}
        </pre>
      )}
    </div>
  );
}
