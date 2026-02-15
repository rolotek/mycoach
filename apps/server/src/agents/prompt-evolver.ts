import { generateText, Output } from "ai";
import { z } from "zod";
import { eq, and, desc, gt } from "drizzle-orm";
import { db } from "../db";
import {
  agents,
  agentFeedback,
  agentVersions,
  agentExecutions,
} from "../db/schema";
import { getModel } from "../llm/providers";

const revisionSchema = z.object({
  revisedPrompt: z.string(),
  changesSummary: z.string(),
  reasoning: z.string(),
});

const META_PROMPT = `You are a prompt engineer improving an AI agent's system prompt based on user feedback.

Rules:
- Preserve the agent's core identity and purpose.
- Incorporate patterns from positive feedback; address issues in negative feedback.
- Apply user corrections literally when provided.
- Keep the prompt concise; do not bloat.
- Do NOT add capabilities the original prompt didn't have.
- Do NOT remove core instructions unless feedback specifically contradicts them.

Output a revised system prompt, a short summary of changes, and brief reasoning.`;

export async function evolveAgentPrompt(
  agentId: string,
  currentPrompt: string,
  feedback: Array<{
    rating: string;
    correction: string | null;
    task: string;
    result: string;
  }>,
  modelId: string
): Promise<{
  revisedPrompt: string;
  changesSummary: string;
  reasoning: string;
} | null> {
  if (feedback.length < 3) return null;

  const feedbackText = feedback
    .map(
      (f) =>
        `[${f.rating}] task: ${f.task.slice(0, 500)}${f.task.length > 500 ? "..." : ""}\nresult: ${f.result.slice(0, 500)}${f.result.length > 500 ? "..." : ""}${f.correction ? `\ncorrection: ${f.correction}` : ""}`
    )
    .join("\n\n");

  const result = await generateText({
    model: getModel(modelId),
    system: META_PROMPT,
    prompt: `Current system prompt:\n\n${currentPrompt}\n\n---\nFeedback (rating, task excerpt, result excerpt, correction if any):\n\n${feedbackText}`,
    output: Output.object({ schema: revisionSchema }),
  });

  const output = result.output;
  if (!output) return null;
  return {
    revisedPrompt: output.revisedPrompt,
    changesSummary: output.changesSummary,
    reasoning: output.reasoning,
  };
}

export async function saveAgentVersion(
  database: typeof db,
  agentId: string,
  currentSystemPrompt: string,
  changeSource: "manual" | "evolution" | "initial",
  changeSummary: string | null
): Promise<void> {
  const [maxRow] = await database
    .select({ version: agentVersions.version })
    .from(agentVersions)
    .where(eq(agentVersions.agentId, agentId))
    .orderBy(desc(agentVersions.version))
    .limit(1);
  const nextVersion = maxRow ? maxRow.version + 1 : 1;
  await database.insert(agentVersions).values({
    agentId,
    version: nextVersion,
    systemPrompt: currentSystemPrompt,
    changeSource,
    changeSummary,
  });
}

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function checkAndEvolveAgent(
  agentId: string,
  userId: string
): Promise<void> {
  try {
    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.userId, userId)));
    if (!agent) return;

    const [lastEvolution] = await db
      .select()
      .from(agentVersions)
      .where(
        and(
          eq(agentVersions.agentId, agentId),
          eq(agentVersions.changeSource, "evolution")
        )
      )
      .orderBy(desc(agentVersions.createdAt))
      .limit(1);

    const feedbackWhere = lastEvolution
      ? and(
          eq(agentFeedback.agentId, agentId),
          gt(agentFeedback.createdAt, lastEvolution.createdAt)
        )
      : eq(agentFeedback.agentId, agentId);

    const allFeedback = await db
      .select()
      .from(agentFeedback)
      .where(feedbackWhere)
      .orderBy(desc(agentFeedback.createdAt));

    const hasActionable =
      allFeedback.some((f) => f.rating === "negative") ||
      allFeedback.some((f) => f.correction != null && f.correction.trim() !== "");
    if (allFeedback.length < 3 || !hasActionable) return;

    if (
      lastEvolution &&
      Date.now() - lastEvolution.createdAt.getTime() < ONE_HOUR_MS
    )
      return;

    const enriched: Array<{
      rating: string;
      correction: string | null;
      task: string;
      result: string;
    }> = [];
    for (const f of allFeedback) {
      let task = "";
      let result = "";
      if (f.executionId) {
        const [ex] = await db
          .select({ task: agentExecutions.task, result: agentExecutions.result })
          .from(agentExecutions)
          .where(eq(agentExecutions.id, f.executionId));
        if (ex) {
          task = ex.task ?? "";
          result = ex.result ?? "";
        }
      }
      enriched.push({
        rating: f.rating,
        correction: f.correction,
        task,
        result,
      });
    }

    const modelId =
      process.env.PROMPT_EVOLUTION_MODEL ??
      process.env.COACH_FACT_MODEL ??
      "ollama:llama3.1";
    const revision = await evolveAgentPrompt(
      agentId,
      agent.systemPrompt,
      enriched,
      modelId
    );
    if (!revision) return;

    await saveAgentVersion(
      db,
      agentId,
      agent.systemPrompt,
      "evolution",
      revision.changesSummary
    );
    await db
      .update(agents)
      .set({
        systemPrompt: revision.revisedPrompt,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId));
  } catch (err) {
    console.error("checkAndEvolveAgent failed:", err);
  }
}
