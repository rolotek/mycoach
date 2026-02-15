import { randomUUID } from "node:crypto";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { agentExecutions, conversations, tokenUsage } from "../db/schema";
import { resolveUserModel } from "../llm/providers";
import { calculateCostCents } from "../llm/pricing";

export type SpecialistAgent = {
  id: string;
  name: string;
  systemPrompt: string;
};

export async function executeSpecialistAgent(
  agent: SpecialistAgent,
  task: string,
  context: string | undefined,
  userId: string,
  conversationId: string | undefined,
  agentPreferredModel?: string | null,
  projectId?: string
): Promise<{
  agentName: string;
  result: string;
  executionId: string;
  agentId: string;
  taskThreadId: string;
}> {
  const [execution] = await db
    .insert(agentExecutions)
    .values({
      userId,
      agentId: agent.id,
      conversationId: conversationId ?? null,
      projectId: projectId ?? null,
      task,
      status: "running",
    })
    .returning({ id: agentExecutions.id });

  if (!execution) throw new Error("Failed to create agent execution row");

  const resolved = await resolveUserModel(userId, agentPreferredModel ?? undefined);

  try {
    const result = await generateText({
      model: resolved.model,
      system: agent.systemPrompt,
      prompt: context
        ? `Task: ${task}\n\nContext: ${context}`
        : `Task: ${task}`,
    });

    db.insert(tokenUsage)
      .values({
        userId,
        conversationId: conversationId ?? null,
        provider: resolved.provider,
        model: resolved.modelName,
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
        estimatedCostCents: calculateCostCents(
          resolved.modelName,
          result.usage?.inputTokens ?? 0,
          result.usage?.outputTokens ?? 0
        ),
      })
      .catch((err) => console.error("Agent usage tracking failed:", err));

    await db
      .update(agentExecutions)
      .set({
        status: "completed",
        result: result.text,
        completedAt: new Date(),
      })
      .where(eq(agentExecutions.id, execution.id));

    const [taskThread] = await db
      .insert(conversations)
      .values({
        userId,
        type: "task",
        parentId: conversationId ?? null,
        projectId: projectId ?? null,
        title: `${agent.name}: ${task.slice(0, 80)}${task.length > 80 ? "…" : ""}`,
        mode: "task",
        messages: [
          {
            id: randomUUID(),
            role: "user",
            parts: [{ type: "text", text: `Task: ${task}` }],
          },
          {
            id: randomUUID(),
            role: "assistant",
            parts: [{ type: "text", text: result.text }],
          },
        ],
      })
      .returning({ id: conversations.id });

    const taskThreadId = taskThread?.id ?? "";

    return {
      agentName: agent.name,
      result: result.text,
      executionId: execution.id,
      agentId: agent.id,
      taskThreadId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(agentExecutions)
      .set({
        status: "failed",
        result: message,
        completedAt: new Date(),
      })
      .where(eq(agentExecutions.id, execution.id));
    throw err;
  }
}
