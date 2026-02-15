import { Hono } from "hono";
import { streamText, createAgentUIStream, createUIMessageStreamResponse } from "ai";
import { convertToModelMessages, tool } from "ai";
import type { UIMessage } from "ai";
import type { ExecutedDispatchResult } from "../agents/resolve-approved-dispatch";
import { eq, and, desc, isNull, gte, sql } from "drizzle-orm";
import { db } from "../db";
import {
  conversations,
  userFacts,
  agents,
  tokenUsage,
  userSettings,
  projects,
  projectDocuments,
  projectLinks,
  documents,
} from "../db/schema";
import { resolveUserModel, ApiKeyRequiredError } from "../llm/providers";
import { calculateCostCents } from "../llm/pricing";
import { buildChiefOfStaff } from "../agents/chief-of-staff";
import { resolveApprovedDispatchTools } from "../agents/resolve-approved-dispatch";
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

/**
 * Extract a user-facing error message from LLM/API errors (e.g. APICallError).
 * Surfaces provider messages like "model 'llama3.1' not found" instead of generic stack traces.
 */
function extractUserFacingErrorMessage(error: unknown): string {
  const err = error as {
    message?: string;
    data?: { error?: { message?: string } };
    responseBody?: string;
  };
  if (err?.data?.error?.message && typeof err.data.error.message === "string") {
    return err.data.error.message;
  }
  if (typeof err?.responseBody === "string") {
    try {
      const parsed = JSON.parse(err.responseBody) as { error?: { message?: string } };
      if (parsed?.error?.message) return parsed.error.message;
    } catch {
      // ignore parse errors
    }
  }
  if (typeof err?.message === "string" && err.message) {
    return err.message;
  }
  return "Something went wrong while calling the model. Please try again or check your Settings.";
}

/**
 * Returns a ReadableStream that first emits tool-output-available chunks for each
 * executed dispatch so the client can show the result card, then forwards the agent stream.
 */
function prependToolOutputAvailableChunks(
  agentStream: ReadableStream<Record<string, unknown>>,
  executedResults: ExecutedDispatchResult[]
): ReadableStream<Record<string, unknown>> {
  const prependChunks = executedResults.map((r) => ({
    type: "tool-output-available" as const,
    toolCallId: r.toolCallId,
    output: r.output,
    providerExecuted: true,
  }));
  let prependIndex = 0;
  let reader: ReadableStreamDefaultReader<Record<string, unknown>> | null = null;
  return new ReadableStream({
    pull(controller) {
      if (prependIndex < prependChunks.length) {
        controller.enqueue(prependChunks[prependIndex++] as Record<string, unknown>);
        return;
      }
      if (!reader) {
        reader = agentStream.getReader();
      }
      return reader.read().then((result) => {
        if (result.done) {
          controller.close();
        } else {
          controller.enqueue(result.value);
        }
      });
    },
    cancel(reason) {
      reader?.cancel(reason);
    },
  });
}

/**
 * Wrap a UI message stream so that if the source stream errors, we push an error chunk
 * (type: 'error', errorText) before closing, so the client can display it.
 */
function wrapStreamWithErrorChunk(
  source: ReadableStream<Record<string, unknown>>,
  onError: (error: unknown) => string
): ReadableStream<Record<string, unknown>> {
  return new ReadableStream({
    async start(controller) {
      const reader = source.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          controller.enqueue(value);
        }
      } catch (err) {
        try {
          controller.enqueue({
            type: "error",
            errorText: onError(err),
          } as Record<string, unknown>);
        } catch {
          // ignore enqueue after close
        }
        controller.close();
      }
    },
  });
}

const chatApp = new Hono<{
  Variables: {
    user: (typeof auth)["$Infer"]["Session"]["user"] | null;
    session: (typeof auth)["$Infer"]["Session"]["session"] | null;
  };
}>();

async function checkBudget(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  if (!settings?.monthlyBudgetCents) return { allowed: true, remaining: Infinity };
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const [result] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${tokenUsage.estimatedCostCents}), 0)`,
    })
    .from(tokenUsage)
    .where(
      and(
        eq(tokenUsage.userId, userId),
        gte(tokenUsage.createdAt, startOfMonth)
      )
    );
  const spent = result?.total ?? 0;
  const remaining = settings.monthlyBudgetCents - spent;
  return { allowed: remaining > 0, remaining };
}

async function trackUsage(params: {
  userId: string;
  conversationId: string | null;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}) {
  await db.insert(tokenUsage).values({
    userId: params.userId,
    conversationId: params.conversationId,
    provider: params.provider,
    model: params.model,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    estimatedCostCents: calculateCostCents(
      params.model,
      params.inputTokens,
      params.outputTokens
    ),
  });
}

/** Load project by id and userId; return context string for system prompt, or empty if not found. */
async function loadProjectContext(
  projectId: string,
  userId: string
): Promise<string> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  if (!project) return "";

  const projectDocs = await db
    .select({ filename: documents.filename })
    .from(projectDocuments)
    .innerJoin(documents, eq(projectDocuments.documentId, documents.id))
    .where(
      and(
        eq(projectDocuments.projectId, projectId),
        eq(documents.userId, userId)
      )
    );
  const links = await db
    .select({ url: projectLinks.url, label: projectLinks.label })
    .from(projectLinks)
    .where(eq(projectLinks.projectId, projectId));

  const docList =
    projectDocs.length > 0
      ? projectDocs.map((d) => d.filename).join(", ")
      : "None";
  const linkList =
    links.length > 0
      ? links.map((l) => `${l.label}: ${l.url}`).join("\n")
      : "None";

  return `Project: ${project.name}
Description: ${project.description ?? "(none)"}
Attached documents: ${docList}
Links:\n${linkList}`;
}

chatApp.post("/api/chat", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const budgetCheck = await checkBudget(user.id);
  if (!budgetCheck.allowed) {
    return c.json(
      {
        error:
          "Monthly budget exceeded. Update your budget in Settings to continue.",
      },
      429
    );
  }

  const body = await c.req.json<{
    messages: UIMessage[];
    chatId?: string;
    mode?: ConversationMode;
    projectId?: string;
  }>();

  const { messages, mode: modeOverride = "auto" } = body;
  let chatId = body.chatId;
  const requestProjectId = body.projectId ?? null;

  // Validate projectId belongs to user; load context for prompt injection
  let projectContext = "";
  let validProjectId: string | null = null;
  if (requestProjectId) {
    const [project] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, requestProjectId),
          eq(projects.userId, user.id)
        )
      );
    if (project) {
      validProjectId = project.id;
      projectContext = await loadProjectContext(project.id, user.id);
    }
  }

  if (!chatId) {
    const [conv] = await db
      .insert(conversations)
      .values({
        userId: user.id,
        mode: modeOverride,
        projectId: validProjectId,
      })
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

  let resolved: Awaited<ReturnType<typeof resolveUserModel>>;
  try {
    resolved = await resolveUserModel(user.id);
  } catch (err) {
    if (err instanceof ApiKeyRequiredError) {
      return c.json({ error: err.message }, 400);
    }
    throw err;
  }

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

  const [convRow] = await db
    .select({ projectId: conversations.projectId })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, chatId!),
        eq(conversations.userId, user.id)
      )
    );
  const conversationProjectId =
    convRow?.projectId ?? validProjectId ?? undefined;

  const userAgents = await db
    .select()
    .from(agents)
    .where(and(eq(agents.userId, user.id), isNull(agents.archivedAt)));

  if (userAgents.length > 0) {
    const agentPreferredModels: Record<string, string | null> = {};
    for (const a of userAgents) {
      agentPreferredModels[a.id] = a.preferredModel ?? null;
    }
    const executedResults = await resolveApprovedDispatchTools(
      messages,
      userAgents,
      user.id,
      chatId ?? undefined,
      conversationProjectId
    );
    const chiefOfStaff = buildChiefOfStaff({
      agents: userAgents,
      model: resolved.model,
      agentPreferredModels,
      userId: user.id,
      conversationId: chatId ?? undefined,
      ragContext: contextSection,
      userFactsSection: factsSection,
      mode: effectiveMode,
      projectContext: projectContext || undefined,
    });
    const agentStream = await createAgentUIStream({
      agent: chiefOfStaff,
      uiMessages: messages,
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
    const streamWithToolResults = prependToolOutputAvailableChunks(
      agentStream as ReadableStream<Record<string, unknown>>,
      executedResults
    );
    const streamWithErrorHandling = wrapStreamWithErrorChunk(
      streamWithToolResults,
      extractUserFacingErrorMessage
    );
    return createUIMessageStreamResponse({
      stream: streamWithErrorHandling,
      headers: { "X-Chat-Id": chatId! },
    });
  }

  const systemPrompt = buildSystemPrompt(
    relevantContext,
    facts,
    effectiveMode,
    projectContext || undefined
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
    model: resolved.model,
    system: systemPrompt,
    messages: modelMessages,
    ...taskTools,
    onFinish: async ({ totalUsage }) => {
      trackUsage({
        userId: user.id,
        conversationId: chatId ?? null,
        provider: resolved.provider,
        model: resolved.modelName,
        inputTokens: totalUsage?.inputTokens ?? 0,
        outputTokens: totalUsage?.outputTokens ?? 0,
      }).catch((err) => console.error("Usage tracking failed:", err));
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: false,
    headers: { "X-Chat-Id": chatId },
    onError: extractUserFacingErrorMessage,
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
