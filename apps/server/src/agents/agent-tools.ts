import { tool } from "ai";
import type { ToolSet } from "ai";
import { z } from "zod";
import { executeSpecialistAgent } from "./agent-executor";

export type AgentRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  systemPrompt: string;
  preferredModel?: string | null;
};

const taskSchema = z.object({
  task: z.string().describe("The specific task to delegate"),
  context: z
    .string()
    .optional()
    .describe("Additional context from the conversation"),
});

export function buildAgentTools(
  agents: AgentRow[],
  userId: string,
  conversationId: string | undefined,
  agentPreferredModels?: Record<string, string | null>
): ToolSet {
  const tools: ToolSet = {};
  for (const agent of agents) {
    tools[`dispatch_${agent.slug}`] = tool({
      description: `Delegate to "${agent.name}": ${agent.description}`,
      inputSchema: taskSchema,
      needsApproval: true,
      execute: async ({ task, context }: { task: string; context?: string }) =>
        executeSpecialistAgent(
          { id: agent.id, name: agent.name, systemPrompt: agent.systemPrompt },
          task,
          context,
          userId,
          conversationId,
          agentPreferredModels?.[agent.id] ?? agent.preferredModel ?? null
        ),
    }) as ToolSet[string];
  }
  return tools;
}
