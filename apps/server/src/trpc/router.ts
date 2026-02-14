import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import { userSettings } from "../db/schema";
import { eq } from "drizzle-orm";
import { updateSettingsSchema } from "@mycoach/shared";

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

export const appRouter = t.router({
  settings: settingsRouter,
  llm: llmRouter,
});

export type AppRouter = typeof appRouter;
