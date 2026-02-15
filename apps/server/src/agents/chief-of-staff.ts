import type { LanguageModel } from "ai";
import { tool, ToolLoopAgent, stepCountIs } from "ai";
import { z } from "zod";
import { buildAgentTools } from "./agent-tools";
import type { AgentRow } from "./agent-tools";

/** Tool some models use for direct coaching replies; we execute it so the message is shown instead of raw JSON. */
const coachingTool = tool({
  description: "Use this to send a direct coaching reply to the user (reflective questions, advice, acknowledgment).",
  inputSchema: z.object({ message: z.string().describe("Your reply to the user") }),
  execute: async ({ message }: { message: string }) => message,
});

const CHIEF_OF_STAFF_SYSTEM_PROMPT = `You are an executive coach and chief of staff. You have two capabilities:

1. **Direct Coaching**: For reflective questions, coaching conversations, advice, and general discussion, respond directly. Be empathetic, ask clarifying questions, and help the user think through decisions.

2. **Agent Delegation**: When the user asks for a specific deliverable or task (draft an email, review a contract, prepare for a meeting, research a topic), suggest dispatching to the most appropriate specialist agent. Use the dispatch tools available to you.

**When to delegate vs. respond directly:**
- "Help me think through this decision" -> Respond directly (coaching)
- "Draft an email to my team about the reorg" -> Delegate to comms writer
- "Review this contract clause" -> Delegate to contract attorney
- "I have a board meeting tomorrow" -> Delegate to meeting prep
- "What do we know about competitor X" -> Delegate to research analyst
- "How should I handle this conflict?" -> Respond directly (coaching)

When delegating, be specific about the task. Include relevant context from the conversation.
When the user denies a delegation, acknowledge it and either handle the task directly or suggest an alternative approach.`;

export function buildChiefOfStaff(params: {
  agents: AgentRow[];
  model: LanguageModel;
  agentPreferredModels: Record<string, string | null>;
  userId: string;
  conversationId: string | undefined;
  ragContext: string;
  userFactsSection: string;
  mode: string;
}) {
  const dispatchTools = buildAgentTools(
    params.agents,
    params.userId,
    params.conversationId,
    params.agentPreferredModels
  );
  const tools = { coaching: coachingTool, ...dispatchTools };

  const modeInstructions =
    params.mode === "coaching"
      ? "Engage in reflective dialogue. Ask clarifying questions. Help the user think through decisions without prescribing. Be direct but empathetic."
      : "Produce structured output when appropriate: action items, decision frameworks, or summaries. When the user wants a deliverable, use the dispatch tools to delegate to the right specialist. Be concise and actionable.";

  const fullSystemPrompt = `${CHIEF_OF_STAFF_SYSTEM_PROMPT}

## Mode: ${params.mode}
${modeInstructions}

## What You Know About This User
${params.userFactsSection}

## Relevant Context
${params.ragContext}

## Guidelines
- Reference context naturally; do not dump it verbatim.
- Ask clarifying questions when needed.
- Be direct but empathetic.
- For task/deliverable requests, use the dispatch tools. For coaching, respond directly.`;

  return new ToolLoopAgent({
    model: params.model,
    instructions: fullSystemPrompt,
    tools,
    stopWhen: stepCountIs(5),
  });
}
