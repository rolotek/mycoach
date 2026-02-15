# Phase 6: API Key Management & Usage Tracking - Research

**Researched:** 2026-02-15
**Domain:** Per-user API key management, token usage tracking, budget enforcement
**Confidence:** HIGH

## Summary

This phase transforms MyCoach from a centralized API key model (env vars) to per-user API key management with usage tracking and budget enforcement. The current system uses `process.env.COACH_CHAT_MODEL` and a global provider registry (`createProviderRegistry`) with env-var API keys. Users already have a `userSettings` table with `preferredProvider` and `preferredModel` columns, but these are **not actually used** in the chat route -- the model ID is hardcoded from env vars.

The core technical challenge is: (1) securely storing per-user API keys with AES-256-GCM encryption, (2) creating dynamic AI SDK provider instances per-request using `createAnthropic({ apiKey })` and `createOpenAI({ apiKey })` instead of the global registry, (3) capturing token usage from the AI SDK's `onFinish` callback and `totalUsage` property in `streamText`/`generateText`, and (4) building a budget enforcement layer that checks accumulated spend before allowing requests.

**Primary recommendation:** Use Node.js built-in `crypto` module for AES-256-GCM encryption of API keys at rest, create per-request provider instances via `createAnthropic`/`createOpenAI` with user-supplied keys, track tokens via AI SDK's `onFinish` callbacks (already in use in chat-route.ts), and store usage records per-conversation in a new `token_usage` table. Do NOT integrate provider billing APIs (Anthropic Usage/Cost API, OpenAI Usage API) -- they require Admin API keys which individual users will not have. Instead, calculate estimated costs from token counts and a pricing lookup table.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` (AI SDK) | 6.0.86 | Token usage via `onFinish` callback, `totalUsage` | Already in project; provides `inputTokens`, `outputTokens` per call |
| `@ai-sdk/anthropic` | 3.0.44 | `createAnthropic({ apiKey })` for per-user keys | Already in project; supports dynamic API key |
| `@ai-sdk/openai` | 3.0.29 | `createOpenAI({ apiKey })` for per-user keys | Already in project; supports dynamic API key |
| `node:crypto` | built-in | AES-256-GCM encryption for API keys at rest | No external dependency; Node.js standard |
| `drizzle-orm` | 0.41.0 | New tables for API keys, token usage | Already in project |
| `zod` | 3.23.8 | Input validation for API key forms | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `hono` | 4.6.14 | Middleware for key resolution | Already the HTTP framework |
| `@trpc/server` | 11.10.0 | New tRPC routes for key management | Already the API layer |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AES-256-GCM (node:crypto) | AWS KMS / Vault | Overkill for single-server; adds infrastructure dependency |
| Local token tracking | Provider billing APIs | Billing APIs need Admin API keys users don't have |
| Hardcoded pricing table | Real-time price API | No public pricing API exists; table is simpler and sufficient |

**Installation:**
No new packages needed. All required libraries are already in the project.

## Architecture Patterns

### Recommended Project Structure
```
apps/server/src/
  llm/
    providers.ts          # MODIFY: add getUserModel() that creates per-user provider instances
    registry.ts           # KEEP: fallback for system-level calls (fact extraction, embeddings)
    pricing.ts            # NEW: pricing lookup table for cost estimation
  db/
    schema.ts             # MODIFY: add userApiKeys, tokenUsage tables
  crypto/
    encryption.ts         # NEW: AES-256-GCM encrypt/decrypt for API keys
  trpc/
    router.ts             # MODIFY: add apiKey router
apps/web/src/
  app/(app)/settings/
    page.tsx              # MODIFY: add API key management section, usage dashboard
```

### Pattern 1: Per-Request Provider Instance Creation
**What:** Instead of using the global `registry.languageModel()`, create a fresh provider instance with the user's decrypted API key for each request.
**When to use:** Every chat request, agent execution, and any LLM call that should use the user's key.
**Example:**
```typescript
// Source: https://ai-sdk.dev/providers/ai-sdk-providers/anthropic
// Source: https://ai-sdk.dev/providers/ai-sdk-providers/openai
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

export function getUserModel(
  provider: string,
  modelId: string,
  apiKey: string
) {
  switch (provider) {
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(modelId); // e.g. "claude-sonnet-4-20250514"
    }
    case "openai": {
      const openai = createOpenAI({ apiKey });
      return openai(modelId); // e.g. "gpt-4o"
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
```

### Pattern 2: API Key Encryption at Rest
**What:** Encrypt user API keys with AES-256-GCM before storing in PostgreSQL. Decrypt on each request.
**When to use:** All API key storage and retrieval operations.
**Example:**
```typescript
// Source: Node.js crypto docs - https://nodejs.org/api/crypto.html
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ENCRYPTION_KEY = Buffer.from(process.env.API_KEY_ENCRYPTION_KEY!, "hex"); // 32 bytes

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag(); // 16 bytes
  // Format: iv:authTag:ciphertext (all hex-encoded)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(encoded: string): string {
  const [ivHex, authTagHex, cipherHex] = encoded.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(cipherHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}
```

### Pattern 3: Token Usage Tracking via onFinish
**What:** Capture token usage from AI SDK's `onFinish` callback and persist to database.
**When to use:** Every `streamText` and `generateText` call.
**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text
const result = streamText({
  model: getUserModel(provider, modelId, apiKey),
  system: systemPrompt,
  messages: modelMessages,
  onFinish: async ({ totalUsage }) => {
    // totalUsage: { inputTokens, outputTokens, totalTokens }
    await db.insert(tokenUsage).values({
      userId,
      conversationId,
      provider,
      model: modelId,
      inputTokens: totalUsage.inputTokens ?? 0,
      outputTokens: totalUsage.outputTokens ?? 0,
      estimatedCostCents: calculateCost(
        provider, modelId,
        totalUsage.inputTokens ?? 0,
        totalUsage.outputTokens ?? 0
      ),
    });
  },
});
```

### Pattern 4: Budget Enforcement Middleware
**What:** Check accumulated spend against user-set budget before processing request.
**When to use:** Before every LLM request in the chat route.
**Example:**
```typescript
async function checkBudget(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  if (!settings?.monthlyBudgetCents) return { allowed: true, remaining: Infinity };

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [result] = await db
    .select({ total: sql<number>`COALESCE(SUM(${tokenUsage.estimatedCostCents}), 0)` })
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
```

### Pattern 5: API Key Validation (Test Connection)
**What:** Validate user's API key by calling a lightweight read-only endpoint.
**When to use:** When user saves a new API key.
**Example:**
```typescript
// Anthropic: GET /v1/models (read-only, validates key)
// Source: https://platform.claude.com/docs/en/api/models-list
async function validateAnthropicKey(apiKey: string): Promise<boolean> {
  const res = await fetch("https://api.anthropic.com/v1/models?limit=1", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });
  return res.ok;
}

// OpenAI: GET /v1/models (read-only, validates key)
// Source: https://platform.openai.com/docs/api-reference/models/list
async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return res.ok;
}
```

### Anti-Patterns to Avoid
- **Storing API keys in plaintext:** Always encrypt at rest with AES-256-GCM. Never store raw keys in the database.
- **Using the global registry for user requests:** The global `registry` singleton uses env-var keys. User requests must create fresh provider instances with `createAnthropic`/`createOpenAI`.
- **Calling provider billing APIs with user keys:** The Anthropic Usage/Cost API requires Admin API keys (`sk-ant-admin...`), and the OpenAI Usage API requires Admin keys. Regular API keys cannot access these. Track usage locally instead.
- **Reusing encryption IVs:** Each encryption operation MUST generate a new random IV. Reusing IVs with AES-GCM destroys security.
- **Blocking on usage writes:** Token usage inserts should be fire-and-forget (`.catch()`) to avoid slowing chat responses.

## Database Schema Design

### New Tables

```typescript
// userApiKeys - encrypted API keys per provider per user
export const userApiKeys = pgTable(
  "user_api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(), // "anthropic" | "openai"
    encryptedKey: text("encrypted_key").notNull(), // AES-256-GCM encrypted
    isValid: boolean("is_valid").default(true),
    lastValidatedAt: timestamp("last_validated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_api_keys_userId_idx").on(table.userId),
    unique("user_api_keys_userId_provider_idx").on(table.userId, table.provider),
  ]
);

// tokenUsage - per-request token usage records
export const tokenUsage = pgTable(
  "token_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id").references(
      () => conversations.id,
      { onDelete: "set null" }
    ),
    provider: varchar("provider", { length: 50 }).notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    estimatedCostCents: integer("estimated_cost_cents").notNull().default(0), // in hundredths of a cent for precision
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("token_usage_userId_idx").on(table.userId),
    index("token_usage_userId_createdAt_idx").on(table.userId, table.createdAt),
  ]
);
```

### Modified Tables

```typescript
// userSettings - add budget fields
export const userSettings = pgTable("user_settings", {
  // ... existing fields ...
  monthlyBudgetCents: integer("monthly_budget_cents"), // null = no limit
});
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Encryption | Custom crypto scheme | `node:crypto` AES-256-GCM | Crypto is notoriously hard; AES-GCM is AEAD (authenticated encryption) |
| Token counting | Manual tokenizer | AI SDK `onFinish` callback `totalUsage` | SDK already provides accurate counts from providers |
| Provider instance creation | Custom HTTP clients | `createAnthropic`/`createOpenAI` from AI SDK | Already handles auth, retries, streaming correctly |
| Key validation | Custom auth check | `GET /v1/models` with user key | Read-only, zero-cost validation endpoint |
| Cost estimation | Real-time price API | Static pricing lookup table | No public pricing API; models change infrequently |

**Key insight:** The AI SDK already does the hard work of extracting token usage from provider-specific response formats. The `onFinish` callback in `streamText` and `generateText` provides `totalUsage` with `inputTokens` and `outputTokens` already normalized across providers.

## Common Pitfalls

### Pitfall 1: Provider Billing APIs Require Admin Keys
**What goes wrong:** Attempting to call Anthropic's `/v1/organizations/usage_report/messages` or OpenAI's `/v1/organization/usage/completions` with a regular API key.
**Why it happens:** These endpoints require organization Admin API keys (`sk-ant-admin...` for Anthropic, Admin keys from OpenAI settings). Individual users will have regular API keys, not admin keys.
**How to avoid:** Do NOT try to use provider billing APIs. Track usage locally by capturing token counts from AI SDK's `onFinish` callback and computing estimated costs from a pricing table.
**Warning signs:** 401/403 errors from billing API endpoints.

### Pitfall 2: Model ID Format Mismatch
**What goes wrong:** Using `"anthropic:claude-sonnet-4-20250514"` (registry format) with `createAnthropic()` which expects just `"claude-sonnet-4-20250514"`.
**Why it happens:** The current codebase uses prefixed IDs like `"anthropic:claude-sonnet-4-20250514"` for the global registry. When switching to per-user provider instances, the prefix must be stripped.
**How to avoid:** Parse the model ID format: split on `:` to separate provider prefix from model name. The `userSettings.preferredModel` column currently stores the prefixed format.
**Warning signs:** "Model not found" errors from provider APIs.

### Pitfall 3: User Settings Not Connected to Chat Route
**What goes wrong:** Users change their preferred model in settings but the chat still uses the env var model.
**Why it happens:** The current `chat-route.ts` line 107 hardcodes `modelId` from `process.env.COACH_CHAT_MODEL`. The `userSettings` table exists but is never read in the chat flow.
**How to avoid:** The chat route must: (1) fetch user settings, (2) look up their API key for the selected provider, (3) decrypt it, (4) create a provider instance, (5) use that for the LLM call. Fallback to env var keys if user has no custom key set.
**Warning signs:** Changing settings has no effect on chat behavior.

### Pitfall 4: Encryption Key Management
**What goes wrong:** Losing the encryption key makes all stored API keys unrecoverable.
**Why it happens:** The AES-256-GCM encryption key (`API_KEY_ENCRYPTION_KEY`) is a server-side secret. If lost during deployment, all encrypted keys become garbage.
**How to avoid:** Store the encryption key in `.env` with clear documentation. Treat it like `BETTER_AUTH_SECRET` -- required for the app to function. Add to `.env.example`.
**Warning signs:** Decryption failures after deployment changes.

### Pitfall 5: Blocking Chat on Usage Tracking
**What goes wrong:** Chat response latency increases because token usage DB writes are awaited.
**Why it happens:** Naively awaiting the usage insert inside `onFinish`.
**How to avoid:** Fire-and-forget the usage insert: `trackUsage(...).catch(console.error)`. The existing codebase already uses this pattern for `extractFacts`.
**Warning signs:** Increased P95 latency on chat responses.

### Pitfall 6: Ollama Keys
**What goes wrong:** Trying to manage API keys for Ollama (local) which doesn't use API keys.
**Why it happens:** Treating all providers uniformly.
**How to avoid:** Ollama is local-only, no API key needed. The key management UI should only show Anthropic and OpenAI. Ollama continues to use the existing global registry.
**Warning signs:** UI confusion when Ollama "Save Key" does nothing.

## Code Examples

Verified patterns from official sources:

### Creating Dynamic Provider with User API Key
```typescript
// Source: https://ai-sdk.dev/providers/ai-sdk-providers/anthropic
import { createAnthropic } from "@ai-sdk/anthropic";

// For Anthropic
const anthropic = createAnthropic({
  apiKey: decryptedUserKey,
  // baseURL defaults to "https://api.anthropic.com/v1"
});
const model = anthropic("claude-sonnet-4-20250514");

// Source: https://ai-sdk.dev/providers/ai-sdk-providers/openai
import { createOpenAI } from "@ai-sdk/openai";

// For OpenAI
const openai = createOpenAI({
  apiKey: decryptedUserKey,
  // baseURL defaults to "https://api.openai.com/v1"
});
const model = openai("gpt-4o");
```

### Token Usage from streamText onFinish
```typescript
// Source: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text
const result = streamText({
  model,
  messages,
  onFinish: async ({ totalUsage, finishReason }) => {
    // totalUsage.inputTokens: number | undefined
    // totalUsage.outputTokens: number | undefined
    // totalUsage.totalTokens: number | undefined
    console.log("Input tokens:", totalUsage.inputTokens);
    console.log("Output tokens:", totalUsage.outputTokens);
  },
});
```

### Token Usage from generateText
```typescript
// Source: https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text
const result = await generateText({
  model,
  prompt: "...",
});
// result.totalUsage.inputTokens
// result.totalUsage.outputTokens
```

### Validating Anthropic API Key via Models Endpoint
```typescript
// Source: https://platform.claude.com/docs/en/api/models-list
const response = await fetch("https://api.anthropic.com/v1/models?limit=1", {
  headers: {
    "x-api-key": userApiKey,
    "anthropic-version": "2023-06-01",
  },
});
// response.ok === true means key is valid
// Response includes: { data: [{ id, display_name, created_at, type }], has_more, first_id, last_id }
```

### Fetching Available Models (Dynamic)
```typescript
// Anthropic: GET /v1/models
// Source: https://platform.claude.com/docs/en/api/models-list
async function fetchAnthropicModels(apiKey: string) {
  const res = await fetch("https://api.anthropic.com/v1/models?limit=100", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });
  if (!res.ok) throw new Error("Failed to fetch models");
  const data = await res.json();
  return data.data.map((m: { id: string; display_name: string }) => ({
    id: m.id,
    name: m.display_name,
  }));
}

// OpenAI: GET /v1/models
// Source: https://platform.openai.com/docs/api-reference/models/list
async function fetchOpenAIModels(apiKey: string) {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error("Failed to fetch models");
  const data = await res.json();
  // Filter to chat models only (gpt-4*, gpt-3.5*, o1*, o3*)
  return data.data
    .filter((m: { id: string }) => /^(gpt-4|gpt-3\.5|o[13])/.test(m.id))
    .map((m: { id: string }) => ({ id: m.id, name: m.id }));
}
```

### AES-256-GCM Encryption
```typescript
// Source: https://nodejs.org/api/crypto.html
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Encryption key: 32 bytes (256 bits), hex-encoded in env var
// Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
const ENCRYPTION_KEY = Buffer.from(process.env.API_KEY_ENCRYPTION_KEY!, "hex");

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(encoded: string): string {
  const [ivHex, authTagHex, cipherHex] = encoded.split(":");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    ENCRYPTION_KEY,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(cipherHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
```

## Pricing Lookup Table

Estimated costs can be computed using a static pricing table. Prices are in cents per million tokens.

```typescript
// Source: https://platform.claude.com/docs/en/about-claude/pricing
// Source: https://platform.openai.com/docs/pricing
export const MODEL_PRICING: Record<string, { inputPerMTok: number; outputPerMTok: number }> = {
  // Anthropic (prices in cents)
  "claude-sonnet-4-20250514": { inputPerMTok: 300, outputPerMTok: 1500 },
  "claude-haiku-3-20250414": { inputPerMTok: 25, outputPerMTok: 125 },
  "claude-sonnet-4": { inputPerMTok: 300, outputPerMTok: 1500 },
  "claude-haiku-4.5": { inputPerMTok: 100, outputPerMTok: 500 },
  "claude-opus-4.6": { inputPerMTok: 500, outputPerMTok: 2500 },
  // OpenAI (prices in cents)
  "gpt-4o": { inputPerMTok: 250, outputPerMTok: 1000 },
  "gpt-4o-mini": { inputPerMTok: 15, outputPerMTok: 60 },
};

export function calculateCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0; // Unknown model, can't estimate
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMTok;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMTok;
  return Math.round((inputCost + outputCost) * 100); // hundredths of a cent
}
```

## Key Integration Points

### 1. Chat Route (chat-route.ts)
The main chat route must be modified to:
- Fetch user settings and API key for selected provider
- Decrypt the API key
- Create a per-request provider instance via `getUserModel()`
- Pass the user's preferred model ID (stripped of prefix)
- Track token usage in `onFinish`
- Check budget before processing

### 2. Agent Executor (agent-executor.ts)
Agent execution also calls `getModel()` and needs the same per-user key treatment.

### 3. Chief of Staff (chief-of-staff.ts)
The `buildChiefOfStaff` function creates a `ToolLoopAgent` with `getModel(params.modelId)`. This must accept a pre-created model instance instead.

### 4. Fact Extractor (fact-extractor.ts)
Uses `getModel()` for background fact extraction. Decision needed: use user's key (costs them tokens) or system key (free to user). Recommendation: use system key for background operations, user key only for interactive chat.

### 5. Prompt Evolver (prompt-evolver.ts)
Also uses `getModel()` for background agent evolution. Same decision as fact extractor. Recommendation: system key.

### 6. Settings Page (settings/page.tsx)
Must be expanded significantly to include:
- API key input per provider (masked, with show/hide)
- "Test Connection" button per key
- Model selection (dynamically fetched when key is valid)
- Monthly budget input
- Usage dashboard (current month spend, breakdown by model)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global env var API keys | Per-user keys with `createOpenAI`/`createAnthropic` | AI SDK v4+ | Users control their own billing |
| Manual token counting | AI SDK `onFinish` with `totalUsage` | AI SDK v3.1+ (2024) | Accurate, provider-normalized counts |
| `streamText().usage` (deprecated property name) | `streamText().totalUsage` and `onFinish({ totalUsage })` | AI SDK v6 | Multi-step aggregation |
| Anthropic `x-api-key` only | Both `apiKey` and `authToken` (bearer) supported | @ai-sdk/anthropic current | More auth flexibility |

**Deprecated/outdated:**
- `promptTokens`/`completionTokens` property names: Replaced by `inputTokens`/`outputTokens` in AI SDK v5+
- Provider billing APIs for per-user tracking: Require org-level Admin keys; not suitable for individual user key tracking

## Open Questions

1. **Background operations cost attribution**
   - What we know: Fact extraction and agent evolution happen asynchronously after each chat message. They call `getModel()` with env-var keys.
   - What's unclear: Should these background ops use the user's API key (costing them tokens) or the system's env-var key?
   - Recommendation: Use system key for background operations. Users should only be charged for interactive chat and agent execution. Document this clearly.

2. **Fallback when user has no key set**
   - What we know: Currently the system works entirely on env-var keys.
   - What's unclear: Should the system fall back to env-var keys when a user hasn't set their own key?
   - Recommendation: Yes, fall back to env-var keys. This preserves backward compatibility and lets users start chatting immediately. Budget tracking would still work with system keys.

3. **Encryption key rotation**
   - What we know: AES-256-GCM encryption uses a single key stored in env vars.
   - What's unclear: How to handle key rotation without re-encrypting all stored keys.
   - Recommendation: For v1, single key is fine. If rotation is needed later, store a key version identifier alongside the encrypted data and decrypt with the appropriate key.

4. **Cost precision**
   - What we know: Token counts from AI SDK are exact integers. Pricing is per million tokens with decimal rates.
   - What's unclear: What precision to use for cost storage.
   - Recommendation: Store costs as integer hundredths-of-a-cent in the database (e.g., $0.0015 = 15). This avoids floating-point issues while providing sufficient granularity.

## Sources

### Primary (HIGH confidence)
- AI SDK v6 official docs - streamText reference, token usage, provider creation
  - https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text
  - https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text
  - https://ai-sdk.dev/providers/ai-sdk-providers/anthropic
  - https://ai-sdk.dev/providers/ai-sdk-providers/openai
- Anthropic API docs - models list, pricing, usage API
  - https://platform.claude.com/docs/en/api/models-list
  - https://platform.claude.com/docs/en/about-claude/pricing
  - https://platform.claude.com/docs/en/api/usage-cost-api
- OpenAI API docs - models list, usage API
  - https://platform.openai.com/docs/api-reference/models/list
  - https://platform.openai.com/docs/api-reference/usage
  - https://developers.openai.com/cookbook/examples/completions_usage_api
- Node.js crypto docs - AES-GCM
  - https://nodejs.org/api/crypto.html

### Secondary (MEDIUM confidence)
- Anthropic model pricing table - verified against official docs (February 2026)
- OpenAI model pricing - verified against official pricing page (February 2026)
- AI SDK provider registry patterns - verified via official docs

### Tertiary (LOW confidence)
- OpenAI list models response format filtering (the filter regex for chat models may need adjustment as OpenAI adds new model families)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, verified via installed versions and official docs
- Architecture: HIGH - Patterns verified against AI SDK official docs; `createAnthropic`/`createOpenAI` accept `apiKey` param
- Encryption: HIGH - AES-256-GCM is standard; Node.js crypto is well-documented
- Token tracking: HIGH - AI SDK `onFinish` with `totalUsage` verified in official docs
- Pricing data: MEDIUM - Verified against official pricing pages Feb 2026, but prices change over time
- Provider billing APIs: HIGH - Confirmed they require Admin keys (not usable with regular user keys)
- Pitfalls: HIGH - Derived from actual codebase analysis (verified model ID format, env var usage, etc.)

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days -- pricing data may change sooner)
