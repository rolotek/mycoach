"use client";

import { Button } from "@/components/ui/button";

export function AgentApprovalCard({
  agentName,
  task,
  onApprove,
  onDeny,
  disabled,
}: {
  agentName: string;
  task: string;
  onApprove: () => void;
  onDeny: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-lg border-2 border-primary/20 bg-primary/5 px-4 py-3">
      <div className="text-sm font-medium text-foreground">
        Chief of Staff suggests: Delegate to {agentName}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{task}</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={onApprove} disabled={disabled}>
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={onDeny} disabled={disabled}>
          Deny
        </Button>
      </div>
    </div>
  );
}
