"use client";

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
    <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50/50 px-4 py-3">
      <div className="text-sm font-medium text-indigo-900">
        Chief of Staff suggests: Delegate to {agentName}
      </div>
      <p className="mt-1 text-sm text-neutral-700">{task}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={disabled}
          className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={onDeny}
          disabled={disabled}
          className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          Deny
        </button>
      </div>
    </div>
  );
}
