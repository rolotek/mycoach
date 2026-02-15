import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Context } from "./context";
import {
  userSettings,
  conversations,
  documents,
  userFacts,
  memories,
} from "../db/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(conversations)
        .values({ userId: ctx.user.id, mode: input.mode })
        .returning({ id: conversations.id, mode: conversations.mode });
      return row!;
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

export const appRouter = t.router({
  settings: settingsRouter,
  llm: llmRouter,
  conversation: conversationRouter,
  document: documentRouter,
  userFact: userFactRouter,
});

export type AppRouter = typeof appRouter;
