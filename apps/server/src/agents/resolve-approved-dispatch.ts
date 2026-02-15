import type { UIMessage } from "ai";
import { executeSpecialistAgent } from "./agent-executor";
import type { AgentRow } from "./agent-tools";

export type ExecutedDispatchResult = {
  toolCallId: string;
  output: {
    agentName: string;
    result: string;
    executionId: string;
    agentId: string;
    taskThreadId: string;
  };
};

/**
 * Mutates `messages` in place: for any assistant-message part that is an approved
 * dispatch tool call (approval.approved === true) without a result yet, runs the
 * specialist agent and sets the part to output-available with the result.
 * Returns the list of executed results so the server can emit tool-output-available
 * chunks and the client can show the result card.
 */
export async function resolveApprovedDispatchTools(
  messages: UIMessage[],
  agents: AgentRow[],
  userId: string,
  conversationId: string | undefined
): Promise<ExecutedDispatchResult[]> {
  const executed: ExecutedDispatchResult[] = [];
  for (const msg of messages) {
    if (msg.role !== "assistant" || !Array.isArray(msg.parts)) continue;
    for (const part of msg.parts) {
      const p = part as {
        type?: string;
        toolCallId?: string;
        state?: string;
        approval?: { id: string; approved?: boolean };
        input?: { task?: string; context?: string };
        output?: { agentName?: string; result?: string };
        providerExecuted?: boolean;
      };
      if (
        typeof p.type !== "string" ||
        !p.type.startsWith("tool-dispatch_") ||
        p.approval?.approved !== true ||
        (p.state !== "approval-requested" && p.state !== "approval-responded") ||
        p.output != null
      )
        continue;
      const slug = p.type.replace(/^tool-dispatch_/, "");
      const agent = agents.find((a) => a.slug === slug);
      if (!agent) continue;
      const task = p.input?.task ?? "";
      const context = p.input?.context;
      try {
        const { agentName, result, executionId, agentId, taskThreadId } =
          await executeSpecialistAgent(
            {
              id: agent.id,
              name: agent.name,
              systemPrompt: agent.systemPrompt,
            },
            task,
            context,
            userId,
            conversationId,
            agent.preferredModel ?? null
          );
        const output = { agentName, result, executionId, agentId, taskThreadId };
        Object.assign(p, {
          state: "output-available",
          output,
          providerExecuted: true,
        });
        if (p.toolCallId) executed.push({ toolCallId: p.toolCallId, output });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        Object.assign(p, {
          state: "output-error",
          errorText: message,
          providerExecuted: true,
        });
      }
    }
  }
  return executed;
}
