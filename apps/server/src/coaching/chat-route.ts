import { Hono } from "hono";
import { streamText, createAgentUIStreamResponse } from "ai";
import { convertToModelMessages, tool } from "ai";
import type { UIMessage } from "ai";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { conversations, userFacts, agents } from "../db/schema";
import { getModel } from "../llm/providers";
import { buildChiefOfStaff } from "../agents/chief-of-staff";
import { buildSystemPrompt } from "./system-prompt";
import { detectMode, type ConversationMode } from "./mode-detector";
import {
  actionItemsSchema,
  decisionFrameworkSchema,
  summarySchema,
} from "./structured-outputs";
import { retrieveContext } from "../memory/retriever";
import { extractFacts } from "../memory/fact-extractor";
import { auth } from "../auth";

const chatApp = new Hono<{
  Variables: {
    user: (typeof auth)["$Infer"]["Session"]["user"] | null;
    session: (typeof auth)["$Infer"]["Session"]["session"] | null;
  };
}>();

chatApp.post("/api/chat", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json<{
    messages: UIMessage[];
    chatId?: string;
    mode?: ConversationMode;
  }>();

  const { messages, mode: modeOverride = "auto" } = body;
  let chatId = body.chatId;

  if (!chatId) {
    const [conv] = await db
      .insert(conversations)
      .values({ userId: user.id, mode: modeOverride })
      .returning();
    chatId = conv.id;
  }

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const queryText =
    lastUserMsg?.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? "";

  const effectiveMode = detectMode(queryText, modeOverride);
  const relevantContext = await retrieveContext(user.id, queryText);

  const facts = await db
    .select({ category: userFacts.category, fact: userFacts.fact })
    .from(userFacts)
    .where(eq(userFacts.userId, user.id))
    .orderBy(desc(userFacts.confidence))
    .limit(20);

  const modelId =
    process.env.COACH_CHAT_MODEL ??
    `ollama:${process.env.OLLAMA_MODEL || "llama3.1"}`;

  const contextSection =
    relevantContext.length > 0
      ? relevantContext
          .map((r) => `- ${r.content}`)
          .join("\n")
      : "No prior context available.";
  const factsByCategory = facts.reduce<Record<string, string[]>>(
    (acc, { category, fact }) => {
      if (!acc[category]) acc[category] = [];
      acc[category].push(fact);
      return acc;
    },
    {}
  );
  const factsSection =
    Object.keys(factsByCategory).length > 0
      ? Object.entries(factsByCategory)
          .map(([cat, f]) => `**${cat}:** ${f.join("; ")}`)
          .join("\n")
      : "No facts recorded yet.";

  const userAgents = await db
    .select()
    .from(agents)
    .where(eq(agents.userId, user.id));

  if (userAgents.length > 0) {
    const chiefOfStaff = buildChiefOfStaff({
      agents: userAgents,
      modelId,
      userId: user.id,
      conversationId: chatId ?? undefined,
      ragContext: contextSection,
      userFactsSection: factsSection,
      mode: effectiveMode,
    });
    const response = await createAgentUIStreamResponse({
      agent: chiefOfStaff,
      uiMessages: messages,
      headers: { "X-Chat-Id": chatId! },
      onFinish: async ({ messages: updatedMessages }) => {
        await db
          .update(conversations)
          .set({
            messages: updatedMessages,
            updatedAt: new Date(),
            title:
              messages.length <= 2 ? queryText.slice(0, 100) : undefined,
          })
          .where(
            and(
              eq(conversations.id, chatId!),
              eq(conversations.userId, user.id)
            )
          );
        extractFacts(chatId!, user.id, updatedMessages).catch((err) =>
          console.error("Fact extraction failed:", err)
        );
      },
    });
    return response;
  }

  const systemPrompt = buildSystemPrompt(
    relevantContext,
    facts,
    effectiveMode
  );

  const taskTools =
    effectiveMode === "task"
      ? {
          tools: {
            createActionItems: tool({
              description:
                "Create a structured list of action items with priorities and due dates",
              inputSchema: actionItemsSchema,
            }),
            createDecisionFramework: tool({
              description:
                "Create a structured decision framework with options, pros/cons, and recommendation",
              inputSchema: decisionFrameworkSchema,
            }),
            createSummary: tool({
              description:
                "Create a structured summary with key points, decisions, and next steps",
              inputSchema: summarySchema,
            }),
          },
        }
      : {};

  const modelMessages = await convertToModelMessages(messages, {
    tools: effectiveMode === "task" ? taskTools.tools : undefined,
  });
  const result = streamText({
    model: getModel(modelId),
    system: systemPrompt,
    messages: modelMessages,
    ...taskTools,
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: false,
    headers: { "X-Chat-Id": chatId },
    onFinish: async ({ messages: updatedMessages }) => {
      await db
        .update(conversations)
        .set({
          messages: updatedMessages,
          updatedAt: new Date(),
          title:
            messages.length <= 2 ? queryText.slice(0, 100) : undefined,
        })
        .where(
          and(
            eq(conversations.id, chatId!),
            eq(conversations.userId, user.id)
          )
        );

      extractFacts(chatId!, user.id, updatedMessages).catch((err) =>
        console.error("Fact extraction failed:", err)
      );
    },
  });
});

export { chatApp };
