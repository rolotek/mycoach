import { generateText, Output } from "ai";
import type { UIMessage } from "ai";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { userFacts } from "../db/schema";
import { getModel } from "../llm/providers";
import { embedText } from "./embeddings";

const factSchema = z.object({
  facts: z.array(
    z.object({
      category: z.enum([
        "goal",
        "preference",
        "context",
        "relationship",
        "work",
        "personal",
      ]),
      fact: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
});

export async function extractFacts(
  conversationId: string,
  userId: string,
  messages: UIMessage[]
): Promise<void> {
  const recentMessages = messages.slice(-4);
  if (recentMessages.length === 0) return;

  const conversationText = recentMessages
    .map((m) => {
      const content = m.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") ?? JSON.stringify(m.parts);
      return `${m.role}: ${content}`;
    })
    .join("\n");

  const modelId =
    process.env.COACH_FACT_MODEL ??
    `ollama:${process.env.OLLAMA_MODEL || "llama3.1:8b"}`;

  try {
    const result = await generateText({
      model: getModel(modelId),
      system: `Extract key facts about the user from this conversation excerpt.
Only extract facts that are clearly stated or strongly implied by the user.
Do NOT extract facts about the assistant or general knowledge.
Return a JSON object with a "facts" array. Each fact should have:
- category: one of "goal", "preference", "context", "relationship", "work", "personal"
- fact: a concise statement about the user
- confidence: 0.0 to 1.0 (how confident you are this is a real fact about the user)

If no clear facts are present, return {"facts": []}.`,
      prompt: conversationText,
      output: Output.object({ schema: factSchema }),
    });

    const extracted = result.output;
    if (!extracted?.facts || extracted.facts.length === 0) return;

    for (const fact of extracted.facts) {
      const existing = await db
        .select()
        .from(userFacts)
        .where(
          and(
            eq(userFacts.userId, userId),
            eq(userFacts.category, fact.category),
            eq(userFacts.fact, fact.fact)
          )
        );

      if (existing.length > 0) continue;

      let embedding: number[] | null = null;
      try {
        embedding = await embedText(fact.fact);
      } catch {
        // store without embedding if embedding fails
      }

      await db.insert(userFacts).values({
        userId,
        category: fact.category,
        fact: fact.fact,
        confidence: fact.confidence,
        source: "conversation",
        sourceId: conversationId,
        embedding,
      });
    }
  } catch (err) {
    console.error("Fact extraction error:", err);
  }
}
