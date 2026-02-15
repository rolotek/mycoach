import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { agentExecutions } from "../db/schema";
import { getModel } from "../llm/providers";

export type SpecialistAgent = {
  id: string;
  name: string;
  systemPrompt: string;
};

export async function executeSpecialistAgent(
  agent: SpecialistAgent,
  task: string,
  context: string | undefined,
  modelId: string,
  userId: string,
  conversationId: string | undefined
): Promise<{
  agentName: string;
  result: string;
  executionId: string;
  agentId: string;
}> {
  const [execution] = await db
    .insert(agentExecutions)
    .values({
      userId,
      agentId: agent.id,
      conversationId: conversationId ?? null,
      task,
      status: "running",
    })
    .returning({ id: agentExecutions.id });

  if (!execution) throw new Error("Failed to create agent execution row");

  try {
    const result = await generateText({
      model: getModel(modelId),
      system: agent.systemPrompt,
      prompt: context
        ? `Task: ${task}\n\nContext: ${context}`
        : `Task: ${task}`,
    });

    await db
      .update(agentExecutions)
      .set({
        status: "completed",
        result: result.text,
        completedAt: new Date(),
      })
      .where(eq(agentExecutions.id, execution.id));

    return {
      agentName: agent.name,
      result: result.text,
      executionId: execution.id,
      agentId: agent.id,
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
