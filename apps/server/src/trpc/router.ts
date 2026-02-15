import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Context } from "./context";
import {
  userSettings,
  conversations,
  documents,
  userFacts,
  memories,
  agents,
  agentExecutions,
  agentFeedback,
  agentVersions,
} from "../db/schema";
import { seedStarterAgents } from "../agents/templates";
import { checkAndEvolveAgent, saveAgentVersion } from "../agents/prompt-evolver";
import { eq, and, desc, asc, sql, isNull } from "drizzle-orm";
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
      ],
    },
    {
      id: "openai",
      name: "OpenAI",
      models: [
        { id: "openai:gpt-4o", name: "GPT-4o", providerId: "openai" },
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

export const appRouter = t.router({
  settings: settingsRouter,
  llm: llmRouter,
  conversation: conversationRouter,
  document: documentRouter,
  userFact: userFactRouter,
  agent: agentRouter,
  agentFeedback: agentFeedbackRouter,
  agentVersion: agentVersionRouter,
});

export type AppRouter = typeof appRouter;
