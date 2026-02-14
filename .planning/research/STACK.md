# Stack Research

**Domain:** AI executive coach + chief of staff with dynamic agent orchestration
**Researched:** 2026-02-14
**Confidence:** MEDIUM (versions from training data -- run `npm view <pkg> version` to verify all versions before installing)

> **Verification Note:** WebSearch, WebFetch, and Bash were unavailable during this research session. All version numbers are from training data (cutoff ~May 2025) and are marked accordingly. Before installing anything, verify current versions via npm or official docs.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **TypeScript** | ~5.7+ | Language across entire stack | Project constraint. Type safety across frontend, backend, and agent definitions is critical for a system where agents are dynamic and prompt-defined -- TypeScript interfaces enforce structure on agent inputs/outputs. | MEDIUM |
| **Node.js** | 22 LTS | Server runtime | Project constraint. Even-numbered LTS releases are production-grade. V8 engine performance is sufficient for orchestration workloads. Native `fetch`, `WebSocket`, and ES module support. | MEDIUM |
| **React** | 19.x | Web UI framework | Project constraint (React Native ecosystem). React 19 brings Server Components, Actions, and `use()` hook. Desktop web is primary interface. | MEDIUM |
| **React Native** | 0.76+ (New Architecture) | Future mobile client | Project constraint. New Architecture (Fabric renderer, TurboModules) is now default. Not needed for MVP (desktop web first) but constrains shared-code decisions. | LOW |
| **Expo** | ~52+ | React Native toolchain | Expo is the standard way to build React Native apps. Expo Router for navigation, EAS for builds. Even for desktop-web-first, Expo Web enables code sharing. | LOW |
| **Vercel AI SDK** | ~4.x (`ai` package) | LLM abstraction, streaming, tool calling | The best TypeScript-native LLM abstraction layer. Provider-agnostic (OpenAI, Anthropic, Google, Ollama, etc.), built-in streaming, structured output via Zod schemas, tool calling, and multi-step agent loops. Does NOT lock you to Vercel hosting -- it's a standalone npm package. This is the "swappable LLM backend" layer. | MEDIUM |
| **PostgreSQL** | 16+ | Primary database | Battle-tested relational DB. With pgvector extension, serves double duty as vector store for memory/RAG. Single database simplifies self-hosted deployment. JSONB columns handle flexible agent config and conversation metadata. | HIGH |
| **pgvector** | 0.7+ | Vector similarity search | Eliminates need for separate vector DB (Pinecone, Qdrant). Colocated with relational data = simpler ops, transactional consistency between metadata and embeddings. HNSW index support for fast approximate search. | MEDIUM |
| **Drizzle ORM** | ~0.36+ | Database ORM | TypeScript-first, SQL-like query builder. Generates migrations. Lighter than Prisma (no binary engine), closer to SQL (less magic), better for complex queries needed in memory/search features. | MEDIUM |

### Agent Orchestration Layer

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Custom orchestration on Vercel AI SDK** | — | Agent routing, dispatch, lifecycle | MyCoach's core IP is its orchestration: suggest-then-confirm routing, dynamic agent creation from prompts, per-user agent evolution. This is too product-specific for a generic framework. Build the orchestrator as a state machine on top of Vercel AI SDK's `generateText`/`streamText` + tool calling. Agents are prompt templates + tool sets, not framework classes. | HIGH |
| **Zod** | ~3.24+ | Schema validation for agent I/O | Define structured outputs (decision frameworks, action items, summaries) as Zod schemas. Vercel AI SDK uses Zod natively for `generateObject()`. Also validates agent template definitions, tool parameters, and API inputs. | MEDIUM |

**Why NOT LangChain/LangGraph:** LangChain adds a thick abstraction layer with its own concepts (chains, runnables, LCEL) between you and the LLM. For a product where orchestration IS the product, this abstraction is a liability -- it obscures control flow, makes debugging harder, and constrains your routing patterns to what LangChain supports. Vercel AI SDK gives you the LLM primitives (streaming, tool calling, structured output) without dictating your orchestration architecture.

**Why NOT Mastra:** Mastra is a newer AI agent framework (emerged late 2024/early 2025). While it has interesting agent primitives, it is still early-stage with a fast-moving API. For a product that needs stability and full control over orchestration behavior, building on the lower-level Vercel AI SDK is safer. Revisit Mastra if it matures and your orchestration patterns align with its opinions.

### Backend Framework

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Hono** | ~4.x | HTTP server framework | Ultralight, fast, TypeScript-native web framework. Works on Node.js, Bun, Deno, Cloudflare Workers (portability for self-hosted). Express-like DX but modern: middleware, routing groups, Zod validation via `@hono/zod-validator`. Much lighter than NestJS for an API that primarily proxies to LLM calls. | MEDIUM |
| **tRPC** | ~11.x | Type-safe API layer | End-to-end type safety between React frontend and Node.js backend WITHOUT code generation. Define API procedures once, get full IntelliSense on both sides. Critical for rapidly iterating on agent dispatch/response shapes. Works with Hono via adapter. | MEDIUM |

**Alternative considered: Express.js** -- Still works but aging. No native TypeScript, no built-in validation, middleware patterns feel dated. Hono is the modern successor with better DX.

**Alternative considered: NestJS** -- Too heavy for this use case. NestJS shines for large enterprise backends with dependency injection, decorators, modules. MyCoach's backend is primarily an orchestration proxy -- it routes requests to LLM calls and manages state. Hono + tRPC gives you type safety with less overhead.

### Frontend (Desktop Web)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Next.js** | ~15.x | Web application framework | Server-side rendering for initial load, App Router for layouts, API routes for BFF pattern. The standard React framework. Desktop web first = Next.js is the obvious choice. | MEDIUM |
| **Tailwind CSS** | ~4.x | Styling | Utility-first CSS. Fast iteration on UI. Huge ecosystem of components. v4 uses CSS-native cascade layers and Rust-based engine (Lightning CSS). | MEDIUM |
| **shadcn/ui** | latest | Component library | Copy-paste components (not a dependency). Built on Radix UI primitives. Fully customizable. Chat UIs, command palettes, data tables -- all patterns needed for a coaching interface. | MEDIUM |

**Note on Next.js + Hono:** Next.js API routes can handle simple endpoints, but the heavy LLM orchestration backend should be a separate Hono service. This separation enables: (1) independent scaling of web frontend vs. orchestration backend, (2) the same backend serves both web and future mobile clients, (3) long-running LLM streams don't tie up Next.js server resources.

### Authentication & Multi-User

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Better Auth** | ~1.x | Authentication library | Self-hosted auth (critical for privacy constraint). TypeScript-native, supports email/password, OAuth, sessions. More modern than NextAuth/Auth.js with cleaner API. No external auth service dependency. | LOW |
| **Alternative: Lucia Auth** | ~3.x | Authentication library | Another strong self-hosted option. Minimal, session-based. Lucia was deprecated in early 2025 but its patterns remain influential. Better Auth is the successor to recommend. | LOW |

**Why NOT Clerk/Auth0/Supabase Auth:** Cloud-hosted auth services send user session data to third parties. Violates the self-hosted privacy constraint. Executive login patterns should never leave the deployment.

### Memory & RAG

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **pgvector** (see above) | 0.7+ | Vector storage | Colocated with relational data. One database to manage. | MEDIUM |
| **LangChain text splitters** | via `@langchain/textsplitters` | Document chunking | Cherry-pick just the text splitting utilities from LangChain without buying into the full framework. Recursive character splitting, markdown splitting, token-aware splitting. | MEDIUM |
| **Vercel AI SDK embeddings** | via `ai` package | Embedding generation | `embed()` and `embedMany()` functions with provider-agnostic interface. Use OpenAI `text-embedding-3-small` or Anthropic/Cohere embeddings. Same provider-swap pattern as chat completions. | MEDIUM |

### Background Jobs & Scheduling

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **BullMQ** | ~5.x | Job queue | Redis-backed job queue for async agent execution (parallel dispatch, scheduled briefings, document processing). Reliable, battle-tested, TypeScript support. | MEDIUM |
| **Redis** | 7.x | Queue backend + caching | Required by BullMQ. Also useful for caching LLM responses, rate limiting, session store. | HIGH |

**Alternative considered: pg-boss** -- PostgreSQL-backed job queue (no Redis needed). Simpler ops but less mature than BullMQ for complex patterns like priority queues, rate limiting, and parallel agent dispatch. If minimizing infrastructure is paramount, pg-boss is viable.

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| **uuid** or `crypto.randomUUID()` | native | ID generation | Use native `crypto.randomUUID()` (Node 19+). No library needed. | HIGH |
| **date-fns** | ~4.x | Date manipulation | Formatting dates for briefings, scheduling, conversation timestamps | MEDIUM |
| **zod** | ~3.24+ | Schema validation | Everywhere: API validation, agent I/O schemas, structured output definitions, config validation | MEDIUM |
| **pino** | ~9.x | Structured logging | Fast JSON logger. Essential for debugging agent orchestration chains in production. | MEDIUM |
| **nanoid** | ~5.x | Short ID generation | User-facing IDs, agent template IDs, conversation slugs | MEDIUM |
| **marked** or **react-markdown** | latest | Markdown rendering | LLM outputs are markdown. Render in chat UI. | MEDIUM |
| **socket.io** | ~4.x | WebSocket communication | Real-time streaming of agent responses to frontend. Alternative: Server-Sent Events (SSE) via native `ReadableStream` -- simpler if you only need server-to-client streaming. | MEDIUM |

### Development Tools

| Tool | Purpose | Notes | Confidence |
|------|---------|-------|------------|
| **Vitest** | Unit/integration testing | Fast, Vite-native, Jest-compatible API. Standard for TypeScript projects. | MEDIUM |
| **Playwright** | E2E testing | Browser automation for testing chat flows, agent dispatch UI. | MEDIUM |
| **ESLint** | Linting | v9 flat config. Use `@typescript-eslint/parser`. | MEDIUM |
| **Prettier** | Code formatting | Standard. Use with ESLint integration. | HIGH |
| **Docker + Docker Compose** | Local dev + deployment | Self-hosted deployment target. Compose for PostgreSQL + Redis + app services locally. | HIGH |
| **Turborepo** | Monorepo management | Manages shared packages between web frontend, mobile (future), backend, and shared types/schemas. Caching, parallel tasks. | MEDIUM |

---

## Monorepo Structure

```
mycoach/
  apps/
    web/          # Next.js desktop web app
    api/          # Hono backend + orchestration
  packages/
    shared/       # Shared types, Zod schemas, agent template types
    db/           # Drizzle schema, migrations, queries
    ai/           # Vercel AI SDK wrappers, provider config
    orchestrator/ # Agent routing, dispatch, lifecycle state machine
  tooling/
    eslint/       # Shared ESLint config
    typescript/   # Shared tsconfig
```

**Why monorepo:** Shared TypeScript types between frontend and backend are critical. Agent template schemas, structured output types, and API contracts must be defined once and used everywhere. Turborepo handles build orchestration.

---

## Installation

```bash
# Initialize monorepo
npx create-turbo@latest

# Core backend
npm install ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google hono @hono/node-server @trpc/server @trpc/client zod drizzle-orm postgres bullmq pino

# Vector / RAG
npm install @langchain/textsplitters

# Frontend
npm install next react react-dom tailwindcss @radix-ui/react-* socket.io-client react-markdown

# Auth
npm install better-auth

# Dev dependencies
npm install -D typescript @types/node vitest playwright eslint prettier drizzle-kit turbo @ai-sdk/provider-utils
```

---

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| Agent orchestration | Custom on Vercel AI SDK | LangGraph (`@langchain/langgraph`) | If you want pre-built graph-based agent patterns and don't mind the LangChain ecosystem dependency |
| Agent framework | Custom on Vercel AI SDK | Mastra (`@mastra/core`) | If Mastra's agent/workflow primitives align with your patterns AND it has stabilized (check maturity) |
| Backend framework | Hono | Fastify | If you need a more mature ecosystem with wider plugin availability |
| Backend framework | Hono | Express | Only if team is deeply familiar and speed-to-first-endpoint matters more than DX |
| ORM | Drizzle | Prisma | If you prefer declarative schema (`.prisma` file) over TypeScript-defined schema, and don't mind the binary engine |
| Vector DB | pgvector | Qdrant (self-hosted) | If you need advanced vector search features (sparse vectors, payload filtering, sharding) beyond what pgvector provides |
| Vector DB | pgvector | ChromaDB | If you need a lightweight dev-friendly vector store and don't need relational data co-location |
| Job queue | BullMQ + Redis | pg-boss | If you want to minimize infrastructure (no Redis) and your job patterns are simple |
| Auth | Better Auth | Keycloak | If you need enterprise SSO (SAML, OIDC) for organization-wide deployment |
| Styling | Tailwind + shadcn/ui | Chakra UI | If you prefer component-prop API over utility classes |
| Web framework | Next.js | Remix | If you prefer nested routing patterns and progressive enhancement over RSC |
| Monorepo | Turborepo | Nx | If you need more opinionated project generation, dependency graph visualization, and remote caching |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **LangChain as full framework** | Thick abstraction layer obscures control flow. Agent orchestration IS your product -- you need full control over routing, not LCEL chains. Debugging LangChain's abstractions is painful. Unnecessary dependency surface area. | Vercel AI SDK for LLM primitives + custom orchestration |
| **Pinecone / Weaviate (cloud)** | Cloud vector DBs violate self-hosted constraint. Executive conversations must never leave the deployment. | pgvector (self-hosted, colocated with PostgreSQL) |
| **Clerk / Auth0 / Firebase Auth** | Cloud auth services send session data to third parties. Privacy violation. | Better Auth (self-hosted) |
| **MongoDB** | Document DB lacks relational integrity needed for user-agent-conversation-memory relationships. Schema-less is a liability for structured agent configs. | PostgreSQL with JSONB for flexible fields |
| **Supabase (hosted)** | Cloud-hosted PostgreSQL violates self-hosted constraint. Supabase's open-source self-hosted version is complex to operate. | Vanilla PostgreSQL + pgvector + Drizzle |
| **OpenAI Assistants API** | Locks you to OpenAI. Conversation state lives on OpenAI's servers (privacy violation). Black-box thread management conflicts with custom orchestration. | Vercel AI SDK + custom state management |
| **AutoGen / CrewAI** | Python-based multi-agent frameworks. Wrong language (TypeScript stack). Also too opinionated about agent interaction patterns for your custom routing. | Custom TypeScript orchestration |
| **Electron** | Desktop app packaging is overkill. A web app accessed via browser provides the same experience without the Electron overhead (memory, update mechanism, binary distribution). | Next.js web app accessed via browser |
| **GraphQL** | Over-engineering for this use case. The API surface is primarily conversation streaming + CRUD. tRPC gives type safety without the complexity of schema definition language, resolvers, and codegen. | tRPC for type-safe RPC |
| **Prisma** (soft avoid) | Binary engine adds deployment complexity for self-hosted. Query API is further from SQL than Drizzle. Generated client is large. Not a hard avoid -- it works -- but Drizzle is better for this project. | Drizzle ORM |

---

## Stack Patterns by Variant

**If adding voice interface later:**
- Add `@deepgram/sdk` for speech-to-text or `whisper.cpp` via Node.js bindings for self-hosted
- Audio streaming via WebSocket (Socket.IO already in stack)
- Voice adds latency constraints -- consider streaming TTS (ElevenLabs API or Piper TTS self-hosted)

**If deploying for a team/org (not just single user):**
- Add Keycloak for SSO/OIDC alongside Better Auth
- Add role-based access control (admin, user) in auth layer
- Consider tenant isolation at database level (schema-per-tenant or row-level security)

**If needing real-time integrations later (calendar, email, Slack):**
- Add dedicated `packages/integrations/` to monorepo
- Use BullMQ for polling/webhook processing
- OAuth token storage in encrypted columns (PostgreSQL `pgcrypto`)

**If running on low-resource self-hosted hardware:**
- Consider Ollama for local LLM inference (Vercel AI SDK has `@ai-sdk/ollama` or use OpenAI-compatible endpoint)
- Use `text-embedding-3-small` (1536 dims) or smaller local embedding models to reduce pgvector storage
- pg-boss instead of BullMQ (eliminates Redis)

---

## Version Compatibility

| Package A | Compatible With | Notes | Confidence |
|-----------|-----------------|-------|------------|
| `ai@4.x` | `@ai-sdk/openai@1.x`, `@ai-sdk/anthropic@1.x` | Provider packages must match major version of core SDK | LOW |
| `next@15.x` | `react@19.x` | Next.js 15 requires React 19 | MEDIUM |
| `drizzle-orm@0.36+` | `drizzle-kit@0.28+` | ORM and migration tool versions must be compatible -- check Drizzle docs | LOW |
| `bullmq@5.x` | `redis@7.x`, `ioredis@5.x` | BullMQ 5 uses ioredis under the hood | MEDIUM |
| `hono@4.x` | `@hono/node-server@1.x`, `@trpc/server@11.x` | Hono adapters for Node.js and tRPC must be version-matched | LOW |
| `typescript@5.7+` | All above packages | Ensure `strict: true` in tsconfig for full type safety | MEDIUM |

---

## LLM Provider Strategy

The project requires swappable LLM backends. Vercel AI SDK's provider pattern makes this straightforward:

```typescript
// Provider config -- swap models per task or user preference
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { ollama } from 'ollama-ai-provider'; // self-hosted

const providers = {
  coaching: anthropic('claude-sonnet-4-20250514'),     // nuanced conversation
  structured: openai('gpt-4o'),                         // structured output
  research: google('gemini-2.0-flash'),                 // long context, fast
  local: ollama('llama3.1'),                             // fully self-hosted fallback
};
```

**Model selection strategy:**
- **Coaching conversations:** Anthropic Claude (nuanced, empathetic, good at long context)
- **Structured output generation:** OpenAI GPT-4o (reliable JSON mode, function calling)
- **Research/summarization agents:** Google Gemini (large context window, cost-effective)
- **Fully self-hosted fallback:** Ollama with Llama 3.1 or Mistral (no data leaves server)

This is configurable per-user and per-agent, stored in PostgreSQL agent config.

---

## Sources

- Training data knowledge (May 2025 cutoff) -- **LOW-MEDIUM confidence on versions**
- Vercel AI SDK architecture is well-established in training data -- **MEDIUM confidence on API patterns**
- PostgreSQL + pgvector is a standard pattern confirmed across multiple training data sources -- **MEDIUM-HIGH confidence**
- Project constraints from `.planning/PROJECT.md` -- **HIGH confidence** (first-party)

**Action required before implementation:**
1. Run `npm view <package> version` for every package listed to get current versions
2. Check Vercel AI SDK docs at https://sdk.vercel.ai for v4.x API changes
3. Check Hono docs at https://hono.dev for current Node.js adapter API
4. Check Better Auth docs at https://www.better-auth.com for current status and API
5. Verify Drizzle pgvector integration at https://orm.drizzle.team

---
*Stack research for: AI executive coach + chief of staff with dynamic agent orchestration*
*Researched: 2026-02-14*
*Training data cutoff: May 2025 -- verify all versions before use*
