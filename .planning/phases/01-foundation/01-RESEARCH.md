# Phase 1: Foundation - Research

**Researched:** 2026-02-14
**Domain:** Authentication, account isolation, LLM provider abstraction, monorepo scaffolding
**Confidence:** HIGH (verified with official docs, npm, and multiple sources)

## Summary

Phase 1 establishes the project skeleton and two foundational capabilities: user authentication with account isolation, and a provider-agnostic LLM abstraction layer. The research confirms that the chosen stack (Better Auth + Hono + tRPC + Drizzle + Vercel AI SDK + Turborepo) is well-supported, actively maintained, and has documented integration patterns between all components.

Better Auth (v1.4.18) provides native support for email/password signup, Google OAuth, and Microsoft OAuth out of the box, with a first-class Hono integration and Drizzle ORM adapter for PostgreSQL. The Vercel AI SDK (v6.x) offers a `createProviderRegistry` function that enables exactly the multi-provider pattern needed -- register Anthropic, OpenAI, and Ollama providers once, then reference models by string ID (`anthropic:claude-sonnet-4-20250514`, `ollama:llama3.1`) throughout the codebase. Session persistence across browser refresh is handled natively by Better Auth's cookie-cached sessions.

**Primary recommendation:** Scaffold a Turborepo monorepo with `apps/web` (Next.js), `apps/server` (Hono + tRPC + Better Auth), and `packages/shared` (Zod schemas + types). Wire auth and LLM abstraction as the first two vertical slices. Use application-level `userId` filtering for data isolation (not database-level RLS) since Better Auth sessions provide the user identity at every request.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard | Confidence |
|---------|---------|---------|--------------|------------|
| better-auth | 1.4.18 | Authentication (email/password, OAuth, sessions) | YC-backed, TypeScript-native, self-hosted, built-in Hono integration + Drizzle adapter. Native support for Google and Microsoft OAuth. | HIGH |
| ai (Vercel AI SDK) | 6.0.x | LLM provider abstraction, streaming, structured output | `createProviderRegistry` enables provider-agnostic model access. Supports Anthropic, OpenAI, Ollama. Standard for TypeScript AI apps. | HIGH |
| @ai-sdk/anthropic | 3.0.x | Claude provider for AI SDK | Official provider package, actively maintained | HIGH |
| @ai-sdk/openai | 3.0.x | OpenAI provider for AI SDK | Official provider package, actively maintained | HIGH |
| ollama-ai-provider-v2 | 3.3.x | Ollama provider for AI SDK | Most actively maintained Ollama provider, compatible with AI SDK v6 | MEDIUM |
| hono | 4.11.x | HTTP server framework | Ultralight, TypeScript-native, Web Standard API, native Better Auth compatibility | HIGH |
| @hono/node-server | latest | Node.js adapter for Hono | Required to run Hono on Node.js | HIGH |
| @hono/trpc-server | latest | tRPC middleware for Hono | Official adapter, simple `app.use('/trpc/*', trpcServer(...))` pattern | HIGH |
| @trpc/server | 11.10.x | Type-safe API layer (server) | End-to-end type safety, no code generation needed | HIGH |
| @trpc/client | 11.x | tRPC client for frontend | Pairs with @trpc/server for type-safe API calls | HIGH |
| drizzle-orm | 0.45.x (stable) | Database ORM | TypeScript-first, SQL-like, no binary engine, native RLS support | HIGH |
| drizzle-kit | latest | Drizzle migration CLI | Schema generation, migration management | HIGH |
| pg | latest | PostgreSQL driver | node-postgres, the standard PG driver for Node.js | HIGH |
| zod | 3.x | Schema validation | Used by tRPC, AI SDK, Better Auth -- consistent validation everywhere | HIGH |
| turbo | 2.8.x | Monorepo build orchestration | Caching, parallel builds, workspace management | HIGH |
| next | 15.x | React web framework | Server components, App Router, standard React framework | HIGH |
| react | 19.x | UI library | Required by Next.js 15 | HIGH |
| typescript | 5.7+ | Language | Full-stack type safety | HIGH |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | 5.x | Server state management | tRPC React integration, session state caching |
| @trpc/tanstack-react-query | 11.x | tRPC + React Query integration | Connecting tRPC client to React components |
| tailwindcss | 4.x | Utility-first CSS | All UI styling |
| pino | 9.x | Structured JSON logging | Server-side logging |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Better Auth | Auth.js (NextAuth) | Auth.js is more mature but has complex adapter patterns, less clean TypeScript API, and is Next.js-centric rather than framework-agnostic |
| Better Auth | Lucia Auth | Lucia was deprecated in early 2025; Better Auth is the spiritual successor |
| tRPC | Hono RPC | Hono's built-in RPC gives type safety too, but tRPC has richer middleware, React Query integration, and larger ecosystem |
| Drizzle ORM | Prisma | Prisma has larger community but requires binary engine (deployment complexity), heavier, further from SQL |
| Turborepo | Nx | Nx is more opinionated with project generators; Turborepo is lighter and sufficient for this project |

**Installation:**
```bash
# Root monorepo
npx create-turbo@latest mycoach

# Server dependencies (apps/server)
npm install hono @hono/node-server @hono/trpc-server @trpc/server better-auth drizzle-orm pg ai @ai-sdk/anthropic @ai-sdk/openai ollama-ai-provider-v2 zod pino

# Server dev dependencies
npm install -D drizzle-kit @types/pg typescript tsx

# Web dependencies (apps/web)
npm install next react react-dom @trpc/client @trpc/tanstack-react-query @tanstack/react-query tailwindcss

# Web dev dependencies
npm install -D typescript @types/react @types/react-dom
```

## Architecture Patterns

### Recommended Project Structure
```
mycoach/
├── apps/
│   ├── web/                        # Next.js 15 desktop web app
│   │   ├── src/
│   │   │   ├── app/                # App Router pages
│   │   │   ├── components/         # React components
│   │   │   ├── lib/
│   │   │   │   ├── auth-client.ts  # Better Auth client instance
│   │   │   │   └── trpc.ts         # tRPC client setup
│   │   │   └── providers/          # React context providers
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   └── server/                     # Hono API server
│       ├── src/
│       │   ├── index.ts            # Hono app entry point
│       │   ├── auth.ts             # Better Auth instance
│       │   ├── trpc/
│       │   │   ├── router.ts       # Root tRPC router
│       │   │   ├── context.ts      # tRPC context (user, session)
│       │   │   └── procedures/     # tRPC procedure groups
│       │   │       ├── auth.ts     # Auth-related procedures
│       │   │       ├── llm.ts      # LLM provider procedures
│       │   │       └── settings.ts # User settings procedures
│       │   ├── llm/
│       │   │   ├── registry.ts     # AI SDK provider registry
│       │   │   └── providers.ts    # Provider configuration
│       │   ├── db/
│       │   │   ├── index.ts        # Drizzle client
│       │   │   ├── schema.ts       # Drizzle schema definitions
│       │   │   └── migrate.ts      # Migration runner
│       │   └── middleware/
│       │       └── auth.ts         # Auth session middleware
│       ├── drizzle.config.ts
│       └── package.json
├── packages/
│   └── shared/                     # Shared types and schemas
│       ├── src/
│       │   ├── types/              # TypeScript type definitions
│       │   │   ├── auth.ts         # User, Session types
│       │   │   ├── llm.ts          # Provider, Model types
│       │   │   └── settings.ts     # User settings types
│       │   └── schemas/            # Zod validation schemas
│       │       ├── auth.ts         # Auth validation schemas
│       │       ├── llm.ts          # LLM config schemas
│       │       └── settings.ts     # Settings validation
│       └── package.json
├── turbo.json                      # Turborepo task config
├── package.json                    # Root workspace config
└── docker-compose.yml              # PostgreSQL for local dev
```

### Pattern 1: Better Auth + Hono Integration
**What:** Mount Better Auth handler on Hono, use session middleware to inject user identity into all requests.
**When to use:** Every authenticated endpoint.
**Example:**
```typescript
// Source: https://www.better-auth.com/docs/integrations/hono
// apps/server/src/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID as string,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET as string,
      tenantId: "common",
      prompt: "select_account",
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // refresh daily
  },
});

// apps/server/src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { auth } from "./auth";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// CORS must be registered before routes
app.use("/api/auth/*", cors({
  origin: process.env.WEB_URL || "http://localhost:3000",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["POST", "GET", "OPTIONS"],
  credentials: true,
}));

// Better Auth handler
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// Session middleware -- injects user into all subsequent routes
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});

serve({ fetch: app.fetch, port: 3001 });
```

### Pattern 2: tRPC on Hono with Auth Context
**What:** Mount tRPC as Hono middleware, pass authenticated user from Hono context into tRPC context.
**When to use:** All API procedures that need type safety and user identity.
**Example:**
```typescript
// Source: https://github.com/honojs/middleware/tree/main/packages/trpc-server
// apps/server/src/trpc/context.ts
import { auth } from "../auth";

export async function createContext(opts: any, c: any) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  return {
    user: session?.user ?? null,
    session: session?.session ?? null,
    db: c.get("db"), // if you store db in Hono context
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

// apps/server/src/trpc/router.ts
import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user, session: ctx.session! } });
});

export const appRouter = t.router({
  // procedures go here
});

export type AppRouter = typeof appRouter;

// apps/server/src/index.ts (addition)
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc/context";

app.use("/trpc/*", trpcServer({
  router: appRouter,
  createContext,
  endpoint: "/trpc",
}));
```

### Pattern 3: AI SDK Provider Registry
**What:** Create a centralized provider registry so all LLM calls reference models by string ID. Users select provider/model; the registry resolves it.
**When to use:** Every LLM interaction in the system.
**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-core/provider-management
// apps/server/src/llm/registry.ts
import { createProviderRegistry } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { createOllama } from "ollama-ai-provider-v2";

const ollama = createOllama({
  baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/api",
});

export const registry = createProviderRegistry({
  anthropic,
  openai,
  ollama,
});

// Usage anywhere in the codebase:
// registry.languageModel("anthropic:claude-sonnet-4-20250514")
// registry.languageModel("openai:gpt-4o")
// registry.languageModel("ollama:llama3.1")

// apps/server/src/llm/providers.ts
import { generateText, streamText } from "ai";
import { registry } from "./registry";

export async function chat(
  modelId: string, // e.g., "anthropic:claude-sonnet-4-20250514"
  messages: Array<{ role: "user" | "assistant"; content: string }>,
) {
  const result = await streamText({
    model: registry.languageModel(modelId),
    messages,
  });
  return result;
}
```

### Pattern 4: User Data Isolation via Application-Level Filtering
**What:** Every database query that returns user data includes a `WHERE userId = ?` clause. The `protectedProcedure` middleware guarantees a valid `ctx.user.id` exists.
**When to use:** Every data access operation.
**Example:**
```typescript
// apps/server/src/trpc/procedures/settings.ts
import { z } from "zod";
import { protectedProcedure } from "../router";
import { db } from "../../db";
import { userSettings } from "../../db/schema";
import { eq } from "drizzle-orm";

export const settingsRouter = t.router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const settings = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, ctx.user.id));
    return settings[0] ?? null;
  }),
  update: protectedProcedure
    .input(z.object({
      preferredModel: z.string().optional(),
      preferredProvider: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(userSettings)
        .set(input)
        .where(eq(userSettings.userId, ctx.user.id));
    }),
});
```

### Anti-Patterns to Avoid
- **Skipping `userId` in queries:** Every table with user data MUST have a `userId` column and every query MUST filter by it. No exceptions.
- **Importing provider SDKs directly:** Never `import { Anthropic } from "@anthropic-ai/sdk"` in application code. Always go through the AI SDK registry.
- **Putting auth logic in the frontend:** The frontend calls `authClient.signIn.*` and `authClient.useSession()`. All auth verification happens server-side via Better Auth middleware.
- **Hardcoding model names:** Store the user's preferred `modelId` string (e.g., `"anthropic:claude-sonnet-4-20250514"`) in the database. Never hardcode model selection.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email/password auth | Custom bcrypt + JWT + session table | Better Auth `emailAndPassword` | Handles hashing, session tokens, CSRF, rate limiting, account linking |
| OAuth flows | Custom OAuth redirect + token exchange | Better Auth `socialProviders` | OAuth state management, PKCE, token refresh, redirect URI validation are deceptively complex |
| Session persistence | Custom cookie management | Better Auth cookie cache | Handles signing, expiry, refresh, cross-tab sync |
| LLM provider switching | Custom adapter pattern per provider | AI SDK `createProviderRegistry` | Normalizes streaming, tool calling, structured output across providers |
| Type-safe API | Manual REST endpoints + types | tRPC | End-to-end type inference without code generation |
| Database migrations | Raw SQL scripts | Drizzle Kit | Schema diffing, migration generation, push for dev |
| Monorepo build | Custom scripts + symlinks | Turborepo | Task caching, dependency graph, parallel execution |

**Key insight:** Phase 1 is infrastructure. Every component has a well-tested library solution. The only custom code should be: database schema design, tRPC procedure definitions, LLM provider configuration, and the settings UI.

## Common Pitfalls

### Pitfall 1: CORS Misconfiguration Between Web and Server
**What goes wrong:** Frontend (Next.js on :3000) cannot reach backend (Hono on :3001). Auth cookies don't flow. OAuth redirects fail.
**Why it happens:** CORS middleware not registered before auth routes, or `credentials: true` missing, or origin doesn't match exactly.
**How to avoid:** Register CORS middleware FIRST in Hono, before auth routes. Set `credentials: true`. Match origin exactly (protocol + host + port). On the client, use `credentials: "include"` in fetch calls.
**Warning signs:** 401 errors despite valid session, "Blocked by CORS" in browser console, OAuth redirect loops.

### Pitfall 2: Better Auth baseURL Not Set
**What goes wrong:** OAuth callback URLs are wrong, redirects go to `localhost` in production, callback validation fails.
**Why it happens:** Better Auth uses `baseURL` to construct callback URLs for OAuth providers. If not set, it guesses from the request, which breaks behind proxies or in production.
**How to avoid:** Always set `baseURL` in Better Auth config from an environment variable. Set it to the server URL, not the frontend URL.
**Warning signs:** OAuth "redirect_uri_mismatch" errors, login works locally but not in production.

### Pitfall 3: Missing userId Isolation in Database Queries
**What goes wrong:** User A sees User B's data. Settings overwrite. Conversations leak.
**Why it happens:** Developer adds a new table or query and forgets the `WHERE userId = ?` clause.
**How to avoid:** Use the `protectedProcedure` pattern that guarantees `ctx.user.id` is always available. Write integration tests that create two users and verify cross-user queries return empty results. Consider a Drizzle helper function that auto-appends userId filtering.
**Warning signs:** Any `db.select().from(table)` without a `.where(eq(table.userId, ...))` clause.

### Pitfall 4: Hardcoding LLM Provider Configuration
**What goes wrong:** System works with Claude but breaks when switching to OpenAI or Ollama. Provider-specific prompt formatting leaks into application code.
**Why it happens:** Developer tests with one provider and writes code assuming that provider's behavior (system message handling, streaming format, token limits).
**How to avoid:** Use the AI SDK registry from day one. Test every LLM feature with at least two providers (Anthropic + Ollama). Keep prompts provider-agnostic. Store provider selection in user settings, not in code.
**Warning signs:** Import statements from `@anthropic-ai/sdk` or `openai` (instead of from `ai`), model names embedded in source code.

### Pitfall 5: Monorepo Import Path Confusion
**What goes wrong:** TypeScript cannot resolve imports from `@mycoach/shared`, build fails, circular dependencies.
**Why it happens:** Turborepo workspace package naming, `tsconfig.json` paths, and package.json `exports` not aligned.
**How to avoid:** Use consistent naming: package.json `name` field matches import path (e.g., `@mycoach/shared`). Configure TypeScript `paths` in tsconfig. Modern approach: export raw TypeScript from shared packages, let consuming apps transpile.
**Warning signs:** "Cannot find module" errors, different behavior between `tsc` and bundler, import paths that use relative `../../packages/shared` instead of `@mycoach/shared`.

### Pitfall 6: OAuth Credential Setup Confusion
**What goes wrong:** Google or Microsoft OAuth returns errors, callback URLs don't match, tenant configuration wrong.
**Why it happens:** OAuth credential setup requires specific redirect URI format, and Microsoft requires tenant configuration.
**How to avoid:** For Google: redirect URI must be `{BETTER_AUTH_URL}/api/auth/callback/google`. For Microsoft: set `tenantId: "common"` for multi-tenant (any Microsoft account), set specific tenant ID for single-org. Both require HTTPS in production.
**Warning signs:** "redirect_uri_mismatch" error, "Invalid tenant" error, OAuth popup shows error page.

## Code Examples

Verified patterns from official sources:

### Better Auth Client Setup (React)
```typescript
// Source: https://www.better-auth.com/docs/basic-usage
// apps/web/src/lib/auth-client.ts
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL, // Hono server URL
});

// Sign up with email/password
const { data, error } = await authClient.signUp.email({
  email: "user@example.com",
  password: "securepassword",
  name: "User Name",
});

// Sign in with email/password
const { data, error } = await authClient.signIn.email({
  email: "user@example.com",
  password: "securepassword",
});

// Sign in with Google OAuth
await authClient.signIn.social({
  provider: "google",
  callbackURL: "/dashboard",
});

// Sign in with Microsoft OAuth
await authClient.signIn.social({
  provider: "microsoft",
  callbackURL: "/dashboard",
});

// Check session (reactive, persists across refresh)
const { data: session, isPending } = authClient.useSession();
```

### Drizzle Schema for User Data Isolation
```typescript
// Source: https://orm.drizzle.team/docs/sql-schema-declaration
// apps/server/src/db/schema.ts
import { pgTable, text, timestamp, uuid, varchar, jsonb } from "drizzle-orm/pg-core";

// Better Auth manages these tables via its adapter, but we define
// additional user-scoped tables here:

export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // FK to Better Auth user table
  preferredProvider: varchar("preferred_provider", { length: 50 })
    .default("anthropic"),
  preferredModel: varchar("preferred_model", { length: 100 })
    .default("anthropic:claude-sonnet-4-20250514"),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // FK to Better Auth user table
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull(),
  userId: text("user_id").notNull(), // denormalized for direct filtering
  role: varchar("role", { length: 20 }).notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  modelId: varchar("model_id", { length: 100 }), // which model responded
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### tRPC Client Setup (Next.js)
```typescript
// apps/web/src/lib/trpc.ts
import { createTRPCReact } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@mycoach/server/trpc/router";

export const trpc = createTRPCReact<AppRouter>();
```

### Turborepo Configuration
```jsonc
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "type-check": {
      "dependsOn": ["^build"]
    }
  }
}
```

### Docker Compose for Local Development
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: mycoach
      POSTGRES_PASSWORD: mycoach
      POSTGRES_DB: mycoach
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth / Auth.js | Better Auth | 2024-2025 | Cleaner TypeScript API, framework-agnostic, no adapter complexity |
| Vercel AI SDK v4/v5 experimental_createProviderRegistry | AI SDK v6 `createProviderRegistry` (stable) | Oct 2025 | Provider registry is now a first-class stable API, not experimental |
| Express.js + passport | Hono + Better Auth | 2024-2025 | Web Standards-based, TypeScript-native, lighter weight |
| tRPC v10 | tRPC v11 | 2024 | Improved performance, better React Query integration |
| Drizzle ORM 0.3x | Drizzle ORM 0.45.x (with 1.0-beta available) | 2025-2026 | RLS support, improved PostgreSQL identity columns, joins optimization |
| Custom LLM adapter classes | AI SDK provider registry pattern | 2025-2026 | String-based model IDs, unified API across all providers |

**Deprecated/outdated:**
- Lucia Auth: Deprecated early 2025. Better Auth is the recommended successor.
- `experimental_createProviderRegistry`: Renamed to `createProviderRegistry` in AI SDK v6. Import from `ai` directly.
- Express.js for new projects: Still works but Hono offers better TypeScript DX and Web Standards alignment.
- Prisma as default ORM: Still viable but Drizzle is preferred for this project (no binary engine, lighter, closer to SQL).

## Open Questions

1. **Better Auth schema customization depth**
   - What we know: Better Auth auto-creates `user`, `session`, `account`, and `verification` tables via its Drizzle adapter. The CLI generates schema.
   - What's unclear: How much can these core tables be extended? Can we add custom columns to the user table, or do we need a separate `userProfile` table?
   - Recommendation: Run `npx @better-auth/cli generate` to see the generated schema. Plan for a separate `userSettings` table to keep auth and application data cleanly separated. Better Auth supports custom fields via plugins.

2. **Ollama provider stability with AI SDK v6**
   - What we know: `ollama-ai-provider-v2` v3.3.x was published very recently (Feb 2026) and claims AI SDK v6 compatibility. The original `ollama-ai-provider` v1.2.0 is a year old and likely only supports AI SDK v4/v5.
   - What's unclear: How thoroughly tested is `ollama-ai-provider-v2` with streaming and structured output? Is there an official Vercel-maintained Ollama provider?
   - Recommendation: Test `ollama-ai-provider-v2` early. If issues arise, Ollama exposes an OpenAI-compatible API endpoint, so `@ai-sdk/openai` pointed at Ollama's URL is a fallback.

3. **tRPC streaming support for LLM responses**
   - What we know: tRPC supports subscriptions and streaming. AI SDK provides `streamText` which returns a `ReadableStream`.
   - What's unclear: Best pattern for streaming LLM responses through tRPC to the React frontend. Options: tRPC subscriptions, separate SSE endpoint on Hono, or tRPC experimental streaming.
   - Recommendation: For Phase 1, a simple Hono SSE endpoint for LLM streaming may be simpler than tRPC streaming. Use tRPC for CRUD operations (settings, conversations) and a direct Hono route for LLM stream. Revisit when Phase 2 adds full chat.

4. **Next.js App Router + separate Hono backend**
   - What we know: Next.js has its own API routes. The project architecture specifies a separate Hono server.
   - What's unclear: Should the Next.js app proxy to Hono, or should the React client call Hono directly?
   - Recommendation: Client calls Hono directly (via tRPC client and auth client). Next.js is a pure frontend -- no API routes. This keeps the architecture clean and means the same Hono backend serves web and future mobile.

## Sources

### Primary (HIGH confidence)
- [Better Auth Official Docs](https://www.better-auth.com/docs/) - Introduction, Basic Usage, Google OAuth, Microsoft OAuth, Hono Integration, Drizzle Adapter, Session Management
- [Vercel AI SDK Official Docs](https://ai-sdk.dev/docs/) - Provider Management, Provider Registry, AI SDK 6 blog post
- [Hono Official Docs](https://hono.dev/) - Node.js setup, Better Auth example
- [Drizzle ORM Official Docs](https://orm.drizzle.team/) - PostgreSQL setup, RLS, Schema declaration
- [tRPC Official Docs](https://trpc.io/docs/) - Server setup, Client setup
- [@hono/trpc-server GitHub](https://github.com/honojs/middleware/tree/main/packages/trpc-server) - Complete integration guide
- npm registry version checks (ai@6.0.86, @ai-sdk/anthropic@3.0.43, @ai-sdk/openai@3.0.28, hono@4.11.9, @trpc/server@11.10.0, better-auth@1.4.18, drizzle-orm@0.45.1, turbo@2.8.7)

### Secondary (MEDIUM confidence)
- [Vercel AI SDK 6 Blog Post](https://vercel.com/blog/ai-sdk-6) - AI SDK 6 features and migration
- [ollama-ai-provider-v2 npm](https://www.npmjs.com/package/ollama-ai-provider-v2) - Ollama provider for AI SDK v6
- [Turborepo Docs](https://turborepo.dev/docs/) - Repository structuring, TypeScript configuration
- [Better Auth on Hacker News (YC X25)](https://news.ycombinator.com/item?id=44030492) - Community validation and discussion

### Tertiary (LOW confidence)
- ollama-ai-provider-v2 long-term stability and edge case behavior (newly released, limited production reports)
- tRPC streaming patterns for LLM responses (multiple approaches exist, no clear community consensus)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified via npm, all integration patterns verified via official docs
- Architecture: HIGH - Hono+Better Auth, Hono+tRPC, AI SDK registry patterns all documented in official sources with working code examples
- Pitfalls: MEDIUM-HIGH - Based on official docs (CORS, baseURL, userId isolation), cross-referenced with community reports. Some pitfalls from general experience.

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (30 days -- stack is stable, no major releases expected)
