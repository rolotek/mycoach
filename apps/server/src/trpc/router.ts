import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Context } from "./context";
import {
  userSettings,
  userApiKeys,
  tokenUsage,
  conversations,
  documents,
  userFacts,
  memories,
  agents,
  agentExecutions,
  agentFeedback,
  agentVersions,
  projects,
  projectDocuments,
  projectLinks,
  projectMilestones,
  projectTasks,
} from "../db/schema";
import { encrypt, decrypt } from "../crypto/encryption";
import { validateApiKey } from "../llm/providers";
import { seedStarterAgents } from "../agents/templates";
import { checkAndEvolveAgent, saveAgentVersion } from "../agents/prompt-evolver";
import { eq, and, desc, asc, sql, isNull, gte } from "drizzle-orm";
import { updateSettingsSchema } from "@mycoach/shared";
import { embedText } from "../memory/embeddings";

const t = initTRPC.context<Context>().create();

export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: { ...ctx, user: ctx.user, session: ctx.session! },
  });
});

const settingsRouter = t.router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, ctx.user.id));
    return result[0] ?? null;
  }),
  update: protectedProcedure
    .input(updateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, ctx.user.id));
      if (existing.length > 0) {
        await ctx.db
          .update(userSettings)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(userSettings.userId, ctx.user.id));
      } else {
        await ctx.db.insert(userSettings).values({
          userId: ctx.user.id,
          ...input,
        });
      }
      return { success: true };
    }),
});

const apiKeyRouter = t.router({
  save: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["anthropic", "openai", "google"]),
        apiKey: z.string().min(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const valid = await validateApiKey(input.provider, input.apiKey);
      if (!valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Invalid API key — could not authenticate with provider",
        });
      }
      const encryptedKey = encrypt(input.apiKey);
      await ctx.db
        .insert(userApiKeys)
        .values({
          userId: ctx.user.id,
          provider: input.provider,
          encryptedKey,
          isValid: true,
          lastValidatedAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [userApiKeys.userId, userApiKeys.provider],
          set: {
            encryptedKey,
            isValid: true,
            lastValidatedAt: new Date(),
            updatedAt: new Date(),
          },
        });
      return { success: true, provider: input.provider };
    }),
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: userApiKeys.id,
        provider: userApiKeys.provider,
        isValid: userApiKeys.isValid,
        lastValidatedAt: userApiKeys.lastValidatedAt,
        createdAt: userApiKeys.createdAt,
        encryptedKey: userApiKeys.encryptedKey,
      })
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, ctx.user.id));
    return rows.map((r) => {
      let maskedKey = "";
      try {
        const raw = decrypt(r.encryptedKey);
        maskedKey =
          raw.length <= 11
            ? raw
            : `${raw.slice(0, 7)}...${raw.slice(-4)}`;
      } catch {
        maskedKey = "•••";
      }
      return {
        id: r.id,
        provider: r.provider,
        isValid: r.isValid,
        lastValidatedAt: r.lastValidatedAt,
        createdAt: r.createdAt,
        maskedKey,
      };
    });
  }),
  delete: protectedProcedure
    .input(z.object({ provider: z.enum(["anthropic", "openai", "google"]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(userApiKeys)
        .where(
          and(
            eq(userApiKeys.userId, ctx.user.id),
            eq(userApiKeys.provider, input.provider)
          )
        );
      return { success: true };
    }),
});

const usageRouter = t.router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRows = await ctx.db
      .select({
        provider: tokenUsage.provider,
        model: tokenUsage.model,
        totalInput: sql<number>`COALESCE(SUM(${tokenUsage.inputTokens}), 0)`,
        totalOutput: sql<number>`COALESCE(SUM(${tokenUsage.outputTokens}), 0)`,
        totalCost: sql<number>`COALESCE(SUM(${tokenUsage.estimatedCostCents}), 0)`,
        requestCount: sql<number>`COUNT(*)`,
      })
      .from(tokenUsage)
      .where(
        and(
          eq(tokenUsage.userId, ctx.user.id),
          gte(tokenUsage.createdAt, startOfMonth)
        )
      )
      .groupBy(tokenUsage.provider, tokenUsage.model);
    const [settings] = await ctx.db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, ctx.user.id));
    const totalCostCents = monthlyRows.reduce(
      (sum, r) => sum + (Number(r.totalCost) ?? 0),
      0
    );
    const byProvider = Object.entries(
      monthlyRows.reduce<Record<string, number>>((acc, r) => {
        const p = r.provider ?? "unknown";
        acc[p] = (acc[p] ?? 0) + Number(r.totalCost ?? 0);
        return acc;
      }, {})
    )
      .filter(([, cents]) => cents > 0)
      .map(([provider, totalCostCents]) => ({ provider, totalCostCents }))
      .sort((a, b) => b.totalCostCents - a.totalCostCents);
    return {
      breakdown: monthlyRows.map((r) => ({
        provider: r.provider,
        model: r.model,
        totalInput: Number(r.totalInput),
        totalOutput: Number(r.totalOutput),
        totalCost: Number(r.totalCost),
        requestCount: Number(r.requestCount),
      })),
      byProvider,
      totalCostCents,
      monthlyBudgetCents: settings?.monthlyBudgetCents ?? null,
      periodStart: startOfMonth.toISOString(),
    };
  }),
});

const llmRouter = t.router({
  listProviders: publicProcedure.query(() => [
    {
      id: "anthropic",
      name: "Anthropic (Claude)",
      models: [
        {
          id: "anthropic:claude-sonnet-4-20250514",
          name: "Claude Sonnet 4",
          providerId: "anthropic",
        },
        {
          id: "anthropic:claude-haiku-3-20250414",
          name: "Claude Haiku 3",
          providerId: "anthropic",
        },
      ],
    },
    {
      id: "openai",
      name: "OpenAI",
      models: [
        { id: "openai:gpt-4o", name: "GPT-4o", providerId: "openai" },
        { id: "openai:gpt-4o-mini", name: "GPT-4o Mini", providerId: "openai" },
      ],
    },
    {
      id: "google",
      name: "Google (Gemini)",
      models: [
        { id: "google:gemini-2.0-flash", name: "Gemini 2.0 Flash", providerId: "google" },
        { id: "google:gemini-1.5-pro", name: "Gemini 1.5 Pro", providerId: "google" },
        { id: "google:gemini-1.5-flash", name: "Gemini 1.5 Flash", providerId: "google" },
      ],
    },
    {
      id: "ollama",
      name: "Ollama (Local)",
      models: [
        { id: "ollama:llama3.1", name: "Llama 3.1", providerId: "ollama" },
      ],
    },
  ]),
});

const conversationRouter = t.router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: conversations.id,
        title: conversations.title,
        mode: conversations.mode,
        type: conversations.type,
        parentId: conversations.parentId,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(eq(conversations.userId, ctx.user.id))
      .orderBy(desc(conversations.updatedAt));
  }),
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.id),
            eq(conversations.userId, ctx.user.id)
          )
        );
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),
  create: protectedProcedure
    .input(
      z.object({
        mode: z.enum(["auto", "coaching", "task"]).default("auto"),
        type: z.enum(["coaching", "task"]).default("coaching").optional(),
        parentId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(conversations)
        .values({
          userId: ctx.user.id,
          mode: input.mode,
          type: input.type ?? "coaching",
          parentId: input.parentId ?? null,
        })
        .returning({ id: conversations.id, mode: conversations.mode });
      return row!;
    }),
  getOrCreateCoaching: protectedProcedure.mutation(async ({ ctx }) => {
    const [existing] = await ctx.db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.userId, ctx.user.id),
          eq(conversations.type, "coaching")
        )
      )
      .orderBy(desc(conversations.updatedAt))
      .limit(1);
    if (existing) return existing;
    const [row] = await ctx.db
      .insert(conversations)
      .values({
        userId: ctx.user.id,
        type: "coaching",
        mode: "auto",
      })
      .returning();
    return row!;
  }),
  reset: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [conv] = await ctx.db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.id),
            eq(conversations.userId, ctx.user.id),
            eq(conversations.type, "coaching")
          )
        );
      if (!conv)
        throw new TRPCError({ code: "NOT_FOUND", message: "Coaching conversation not found" });
      await ctx.db
        .delete(memories)
        .where(eq(memories.conversationId, input.id));
      await ctx.db
        .update(conversations)
        .set({
          messages: [],
          title: null,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, input.id));
      return { success: true };
    }),
  listTaskThreads: protectedProcedure
    .input(z.object({ parentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: conversations.id,
          title: conversations.title,
          createdAt: conversations.createdAt,
          updatedAt: conversations.updatedAt,
        })
        .from(conversations)
        .where(
          and(
            eq(conversations.userId, ctx.user.id),
            eq(conversations.parentId, input.parentId),
            eq(conversations.type, "task")
          )
        )
        .orderBy(desc(conversations.createdAt));
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(memories)
        .where(
          and(
            eq(memories.userId, ctx.user.id),
            eq(memories.conversationId, input.id)
          )
        );
      await ctx.db
        .delete(conversations)
        .where(
          and(
            eq(conversations.id, input.id),
            eq(conversations.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),
  updateMode: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        mode: z.enum(["auto", "coaching", "task"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(conversations)
        .set({ mode: input.mode, updatedAt: new Date() })
        .where(
          and(
            eq(conversations.id, input.id),
            eq(conversations.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),
});

const documentRouter = t.router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: documents.id,
        filename: documents.filename,
        mimeType: documents.mimeType,
        size: documents.size,
        status: documents.status,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(eq(documents.userId, ctx.user.id))
      .orderBy(desc(documents.createdAt));
  }),
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(memories)
        .where(
          and(
            eq(memories.userId, ctx.user.id),
            eq(memories.type, "document_chunk"),
            sql`${memories.metadata}->>'documentId' = ${input.id}`
          )
        );
      await ctx.db
        .delete(documents)
        .where(
          and(
            eq(documents.id, input.id),
            eq(documents.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),
});

const userFactCategories = [
  "goal",
  "preference",
  "context",
  "relationship",
  "work",
  "personal",
] as const;

const userFactRouter = t.router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: userFacts.id,
        userId: userFacts.userId,
        category: userFacts.category,
        fact: userFacts.fact,
        confidence: userFacts.confidence,
        source: userFacts.source,
        sourceId: userFacts.sourceId,
        createdAt: userFacts.createdAt,
        updatedAt: userFacts.updatedAt,
      })
      .from(userFacts)
      .where(eq(userFacts.userId, ctx.user.id))
      .orderBy(asc(userFacts.category), desc(userFacts.createdAt));
  }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        fact: z.string().optional(),
        category: z.enum(userFactCategories).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(userFacts)
        .where(
          and(
            eq(userFacts.id, input.id),
            eq(userFacts.userId, ctx.user.id)
          )
        );
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const updates: Partial<typeof userFacts.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.fact !== undefined) updates.fact = input.fact;
      if (input.category !== undefined) updates.category = input.category;

      if (input.fact !== undefined && input.fact !== existing.fact) {
        try {
          updates.embedding = await embedText(input.fact);
        } catch {
          // keep existing embedding if embed fails
        }
      }

      const [updated] = await ctx.db
        .update(userFacts)
        .set(updates)
        .where(
          and(
            eq(userFacts.id, input.id),
            eq(userFacts.userId, ctx.user.id)
          )
        )
        .returning({
          id: userFacts.id,
          category: userFacts.category,
          fact: userFacts.fact,
          confidence: userFacts.confidence,
          source: userFacts.source,
          sourceId: userFacts.sourceId,
          createdAt: userFacts.createdAt,
          updatedAt: userFacts.updatedAt,
        });
      return updated!;
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(userFacts)
        .where(
          and(
            eq(userFacts.id, input.id),
            eq(userFacts.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),
});

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

const agentFeedbackRouter = t.router({
  create: protectedProcedure
    .input(
      z.object({
        agentId: z.string().uuid(),
        executionId: z.string().uuid().optional(),
        rating: z.enum(["positive", "negative"]),
        correction: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(agentFeedback)
        .values({
          userId: ctx.user.id,
          agentId: input.agentId,
          executionId: input.executionId ?? null,
          rating: input.rating,
          correction: input.correction ?? null,
        })
        .returning();
      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      checkAndEvolveAgent(input.agentId, ctx.user.id).catch((err) =>
        console.error("Evolution check failed:", err)
      );
      return row;
    }),
  listByAgent: protectedProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(agentFeedback)
        .where(
          and(
            eq(agentFeedback.agentId, input.agentId),
            eq(agentFeedback.userId, ctx.user.id)
          )
        )
        .orderBy(desc(agentFeedback.createdAt));
    }),
});

const agentVersionRouter = t.router({
  list: protectedProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [agent] = await ctx.db
        .select()
        .from(agents)
        .where(
          and(
            eq(agents.id, input.agentId),
            eq(agents.userId, ctx.user.id)
          )
        );
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db
        .select()
        .from(agentVersions)
        .where(eq(agentVersions.agentId, input.agentId))
        .orderBy(desc(agentVersions.version))
        .limit(20);
    }),
  revert: protectedProcedure
    .input(
      z.object({
        agentId: z.string().uuid(),
        versionId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [agent] = await ctx.db
        .select()
        .from(agents)
        .where(
          and(
            eq(agents.id, input.agentId),
            eq(agents.userId, ctx.user.id)
          )
        );
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
      const [targetVersion] = await ctx.db
        .select()
        .from(agentVersions)
        .where(
          and(
            eq(agentVersions.id, input.versionId),
            eq(agentVersions.agentId, input.agentId)
          )
        );
      if (!targetVersion) throw new TRPCError({ code: "NOT_FOUND" });
      await saveAgentVersion(
        ctx.db,
        input.agentId,
        agent.systemPrompt,
        "manual",
        `Reverted to version ${targetVersion.version}`
      );
      const [updated] = await ctx.db
        .update(agents)
        .set({
          systemPrompt: targetVersion.systemPrompt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(agents.id, input.agentId),
            eq(agents.userId, ctx.user.id)
          )
        )
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),
});

const agentRouter = t.router({
  list: protectedProcedure.query(async ({ ctx }) => {
    await seedStarterAgents(ctx.db, ctx.user.id);
    return ctx.db
      .select()
      .from(agents)
      .where(and(eq(agents.userId, ctx.user.id), isNull(agents.archivedAt)))
      .orderBy(asc(agents.name));
  }),
  listAll: protectedProcedure.query(async ({ ctx }) => {
    await seedStarterAgents(ctx.db, ctx.user.id);
    return ctx.db
      .select()
      .from(agents)
      .where(eq(agents.userId, ctx.user.id))
      .orderBy(asc(agents.archivedAt), asc(agents.name));
  }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().min(1).max(500),
        systemPrompt: z.string().min(1),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let slug = slugFromName(input.name);
      const baseSlug = slug;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const [row] = await ctx.db
            .insert(agents)
            .values({
              userId: ctx.user.id,
              name: input.name,
              slug,
              description: input.description,
              systemPrompt: input.systemPrompt,
              icon: input.icon ?? null,
              isStarter: false,
            })
            .returning();
          return row!;
        } catch (err) {
          const isUniqueViolation =
            err &&
            typeof err === "object" &&
            "code" in err &&
            (err as { code: string }).code === "23505";
          if (isUniqueViolation && attempt === 0) {
            slug = `${baseSlug}-${Date.now()}`;
            continue;
          }
          throw err;
        }
      }
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().min(1).max(500).optional(),
        systemPrompt: z.string().min(1).optional(),
        icon: z.string().optional(),
        preferredModel: z.string().max(100).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [existingAgent] = await ctx.db
        .select()
        .from(agents)
        .where(
          and(
            eq(agents.id, input.id),
            eq(agents.userId, ctx.user.id)
          )
        );
      if (!existingAgent) throw new TRPCError({ code: "NOT_FOUND" });

      const updates: {
        name?: string;
        slug?: string;
        description?: string;
        systemPrompt?: string;
        icon?: string | null;
        preferredModel?: string | null;
        updatedAt: Date;
      } = { updatedAt: new Date() };
      if (input.name !== undefined) {
        updates.name = input.name;
        updates.slug = slugFromName(input.name);
      }
      if (input.description !== undefined) updates.description = input.description;
      if (input.systemPrompt !== undefined) {
        if (input.systemPrompt !== existingAgent.systemPrompt) {
          await saveAgentVersion(
            ctx.db,
            input.id,
            existingAgent.systemPrompt,
            "manual",
            null
          );
        }
        updates.systemPrompt = input.systemPrompt;
      }
      if (input.icon !== undefined) updates.icon = input.icon ?? null;
      if (input.preferredModel !== undefined)
        updates.preferredModel = input.preferredModel;

      const [updated] = await ctx.db
        .update(agents)
        .set(updates)
        .where(
          and(
            eq(agents.id, input.id),
            eq(agents.userId, ctx.user.id)
          )
        )
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),
  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(agents)
        .set({ archivedAt: new Date() })
        .where(
          and(
            eq(agents.id, input.id),
            eq(agents.userId, ctx.user.id),
            isNull(agents.archivedAt)
          )
        );
      return { success: true };
    }),
  unarchive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(agents)
        .set({ archivedAt: null })
        .where(
          and(eq(agents.id, input.id), eq(agents.userId, ctx.user.id))
        );
      return { success: true };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(agents)
        .where(
          and(
            eq(agents.id, input.id),
            eq(agents.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),
});

// Phase 8: Projects
const projectRouter = t.router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        dueDate: projects.dueDate,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(eq(projects.userId, ctx.user.id))
      .orderBy(desc(projects.updatedAt));
  }),
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.id),
            eq(projects.userId, ctx.user.id)
          )
        );
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const projectDocs = await ctx.db
        .select({
          id: documents.id,
          filename: documents.filename,
        })
        .from(projectDocuments)
        .innerJoin(documents, eq(projectDocuments.documentId, documents.id))
        .where(
          and(
            eq(projectDocuments.projectId, input.id),
            eq(documents.userId, ctx.user.id)
          )
        );

      const links = await ctx.db
        .select()
        .from(projectLinks)
        .where(eq(projectLinks.projectId, input.id));

      const milestones = await ctx.db
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.projectId, input.id))
        .orderBy(asc(projectMilestones.sortOrder), asc(projectMilestones.createdAt));

      const tasks = await ctx.db
        .select()
        .from(projectTasks)
        .where(eq(projectTasks.projectId, input.id))
        .orderBy(asc(projectTasks.createdAt));

      return {
        ...project,
        documents: projectDocs,
        links,
        milestones,
        tasks,
      };
    }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(500),
        description: z.string().max(2000).optional(),
        status: z.string().max(50).optional(),
        dueDate: z.coerce.date().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(projects)
        .values({
          userId: ctx.user.id,
          name: input.name,
          description: input.description ?? null,
          status: input.status ?? "active",
          dueDate: input.dueDate ?? null,
        })
        .returning();
      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return row;
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(500).optional(),
        description: z.string().max(2000).nullable().optional(),
        status: z.string().max(50).optional(),
        dueDate: z.coerce.date().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.id),
            eq(projects.userId, ctx.user.id)
          )
        );
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.status !== undefined) updates.status = input.status;
      if (input.dueDate !== undefined) updates.dueDate = input.dueDate;
      const [updated] = await ctx.db
        .update(projects)
        .set(updates)
        .where(
          and(
            eq(projects.id, input.id),
            eq(projects.userId, ctx.user.id)
          )
        )
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(projects)
        .where(
          and(
            eq(projects.id, input.id),
            eq(projects.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),
  addDocument: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        documentId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.userId, ctx.user.id)
          )
        );
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      const [doc] = await ctx.db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.id, input.documentId),
            eq(documents.userId, ctx.user.id)
          )
        );
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found or not owned by you" });
      await ctx.db.insert(projectDocuments).values({
        projectId: input.projectId,
        documentId: input.documentId,
      }).onConflictDoNothing({
        target: [projectDocuments.projectId, projectDocuments.documentId],
      });
      return { success: true };
    }),
  removeDocument: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        documentId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(projectDocuments)
        .where(
          and(
            eq(projectDocuments.projectId, input.projectId),
            eq(projectDocuments.documentId, input.documentId)
          )
        );
      return { success: true };
    }),
  addLink: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        url: z.string().url(),
        label: z.string().min(1).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.userId, ctx.user.id)
          )
        );
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const [row] = await ctx.db
        .insert(projectLinks)
        .values({
          projectId: input.projectId,
          url: input.url,
          label: input.label,
        })
        .returning();
      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return row;
    }),
  removeLink: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        linkId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [link] = await ctx.db
        .select()
        .from(projectLinks)
        .innerJoin(projects, eq(projectLinks.projectId, projects.id))
        .where(
          and(
            eq(projectLinks.id, input.linkId),
            eq(projectLinks.projectId, input.projectId),
            eq(projects.userId, ctx.user.id)
          )
        );
      if (!link) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db
        .delete(projectLinks)
        .where(
          and(
            eq(projectLinks.id, input.linkId),
            eq(projectLinks.projectId, input.projectId)
          )
        );
      return { success: true };
    }),
  listMilestones: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.userId, ctx.user.id)
          )
        );
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db
        .select()
        .from(projectMilestones)
        .where(eq(projectMilestones.projectId, input.projectId))
        .orderBy(asc(projectMilestones.sortOrder), asc(projectMilestones.createdAt));
    }),
  createMilestone: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        title: z.string().min(1).max(500),
        dueDate: z.coerce.date().nullable().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.userId, ctx.user.id)
          )
        );
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      const [row] = await ctx.db
        .insert(projectMilestones)
        .values({
          projectId: input.projectId,
          title: input.title,
          dueDate: input.dueDate ?? null,
          sortOrder: input.sortOrder ?? 0,
        })
        .returning();
      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return row;
    }),
  updateMilestone: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(500).optional(),
        dueDate: z.coerce.date().nullable().optional(),
        sortOrder: z.number().int().optional(),
        status: z.string().max(50).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [milestone] = await ctx.db
        .select()
        .from(projectMilestones)
        .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
        .where(
          and(
            eq(projectMilestones.id, input.id),
            eq(projects.userId, ctx.user.id)
          )
        );
      if (!milestone) throw new TRPCError({ code: "NOT_FOUND" });
      const updates: Record<string, unknown> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.dueDate !== undefined) updates.dueDate = input.dueDate;
      if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
      if (input.status !== undefined) updates.status = input.status;
      const [updated] = await ctx.db
        .update(projectMilestones)
        .set(updates)
        .where(eq(projectMilestones.id, input.id))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),
  deleteMilestone: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [milestone] = await ctx.db
        .select()
        .from(projectMilestones)
        .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
        .where(
          and(
            eq(projectMilestones.id, input.id),
            eq(projects.userId, ctx.user.id)
          )
        );
      if (!milestone) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db
        .delete(projectMilestones)
        .where(eq(projectMilestones.id, input.id));
      return { success: true };
    }),
  listTasks: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.userId, ctx.user.id)
          )
        );
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db
        .select()
        .from(projectTasks)
        .where(eq(projectTasks.projectId, input.projectId))
        .orderBy(asc(projectTasks.createdAt));
    }),
  createTask: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        milestoneId: z.string().uuid().nullable().optional(),
        title: z.string().min(1).max(500),
        description: z.string().max(2000).optional(),
        status: z.string().max(50).optional(),
        dueDate: z.coerce.date().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.userId, ctx.user.id)
          )
        );
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      if (input.milestoneId) {
        const [milestone] = await ctx.db
          .select()
          .from(projectMilestones)
          .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
          .where(
            and(
              eq(projectMilestones.id, input.milestoneId),
              eq(projectMilestones.projectId, input.projectId),
              eq(projects.userId, ctx.user.id)
            )
          );
        if (!milestone) throw new TRPCError({ code: "NOT_FOUND", message: "Milestone not found or not in this project" });
      }
      const [row] = await ctx.db
        .insert(projectTasks)
        .values({
          projectId: input.projectId,
          milestoneId: input.milestoneId ?? null,
          title: input.title,
          description: input.description ?? null,
          status: input.status ?? "todo",
          dueDate: input.dueDate ?? null,
        })
        .returning();
      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return row;
    }),
  updateTask: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(500).optional(),
        description: z.string().max(2000).nullable().optional(),
        status: z.string().max(50).optional(),
        dueDate: z.coerce.date().nullable().optional(),
        conversationId: z.string().uuid().nullable().optional(),
        milestoneId: z.string().uuid().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [task] = await ctx.db
        .select()
        .from(projectTasks)
        .innerJoin(projects, eq(projectTasks.projectId, projects.id))
        .where(
          and(
            eq(projectTasks.id, input.id),
            eq(projects.userId, ctx.user.id)
          )
        );
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      if (input.milestoneId !== undefined && input.milestoneId !== null) {
        const [milestone] = await ctx.db
          .select()
          .from(projectMilestones)
          .where(
            and(
              eq(projectMilestones.id, input.milestoneId),
              eq(projectMilestones.projectId, task.project_tasks.projectId)
            )
          );
        if (!milestone) throw new TRPCError({ code: "NOT_FOUND", message: "Milestone not found or not in this project" });
      }
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description;
      if (input.status !== undefined) updates.status = input.status;
      if (input.dueDate !== undefined) updates.dueDate = input.dueDate;
      if (input.conversationId !== undefined) updates.conversationId = input.conversationId;
      if (input.milestoneId !== undefined) updates.milestoneId = input.milestoneId;
      const [updated] = await ctx.db
        .update(projectTasks)
        .set(updates)
        .where(eq(projectTasks.id, input.id))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),
  deleteTask: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [task] = await ctx.db
        .select()
        .from(projectTasks)
        .innerJoin(projects, eq(projectTasks.projectId, projects.id))
        .where(
          and(
            eq(projectTasks.id, input.id),
            eq(projects.userId, ctx.user.id)
          )
        );
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db
        .delete(projectTasks)
        .where(eq(projectTasks.id, input.id));
      return { success: true };
    }),
});

export const appRouter = t.router({
  settings: settingsRouter,
  apiKey: apiKeyRouter,
  usage: usageRouter,
  llm: llmRouter,
  conversation: conversationRouter,
  document: documentRouter,
  userFact: userFactRouter,
  agent: agentRouter,
  agentFeedback: agentFeedbackRouter,
  agentVersion: agentVersionRouter,
  project: projectRouter,
});

export type AppRouter = typeof appRouter;
