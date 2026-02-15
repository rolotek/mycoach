"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentIcon } from "@/components/agent-icon";

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
      <div className="max-w-4xl space-y-6 p-4 md:p-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/agents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </Link>
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Agent not found or loading.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6 p-4 md:p-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/agents">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Agents
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <AgentIcon icon={agent.icon} size="h-6 w-6" />
            <CardTitle className="text-xl">{agent.name}</CardTitle>
            {agent.isStarter && <Badge variant="secondary">Starter</Badge>}
            {agent.archivedAt && <Badge variant="outline">Archived</Badge>}
          </div>
          <CardDescription>{agent.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="prompt">
            <TabsList>
              <TabsTrigger value="prompt">Prompt</TabsTrigger>
              <TabsTrigger value="versions">Versions</TabsTrigger>
              <TabsTrigger value="feedback">Feedback</TabsTrigger>
            </TabsList>
            <TabsContent value="prompt">
              <pre className="mt-4 max-h-64 overflow-auto rounded-lg bg-muted p-4 font-mono text-sm">
                {agent.systemPrompt}
              </pre>
            </TabsContent>
            <TabsContent value="versions">
              {versionsLoading ? (
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : !versions?.length ? (
                <p className="mt-4 text-sm text-muted-foreground">No version history yet</p>
              ) : (
                <div className="mt-4 space-y-3">
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
            </TabsContent>
            <TabsContent value="feedback">
              <p className="mt-4 text-sm text-muted-foreground">
                Total: {feedbackList?.length ?? 0} · Positive: {positiveCount} ·
                Negative: {negativeCount}
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">Version {version.version}</span>
            <Badge
              variant={
                version.changeSource === "evolution" ? "default" : "secondary"
              }
            >
              {version.changeSource}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {new Date(version.createdAt).toLocaleString()}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRevert}
            disabled={isReverting}
          >
            Revert to this version
          </Button>
        </div>
        {version.changeSummary && (
          <p className="text-sm text-muted-foreground">{version.changeSummary}</p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => setShowPrompt((s) => !s)}
        >
          {showPrompt ? "Hide prompt" : "Show prompt"}
        </Button>
        {showPrompt && (
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 font-mono text-xs">
            {version.systemPrompt}
          </pre>
        )}
      </CardHeader>
    </Card>
  );
}
