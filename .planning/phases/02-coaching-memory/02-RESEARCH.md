# Phase 2: Coaching & Memory - Research

**Researched:** 2026-02-14
**Domain:** Streaming chat, structured LLM output, RAG with pgvector, document parsing, memory extraction
**Confidence:** MEDIUM-HIGH

## Summary

Phase 2 transforms the existing LLM provider registry (Phase 1) into a full coaching conversation engine with persistent memory. The core technical stack centers on AI SDK v6 (already installed at v6.0.86) for streaming chat and structured output, pgvector for semantic search over conversations and documents, and background fact extraction from conversations.

The project already has Hono + tRPC on the server and Next.js on the client. AI SDK v6 provides `streamText` with `toUIMessageStreamResponse()` that produces SSE streams compatible with the `useChat` React hook from `@ai-sdk/react`. This is the standard pattern for Hono backends -- the chat endpoint bypasses tRPC (which is not designed for streaming SSE) and is a direct Hono route. tRPC continues to handle all non-streaming RPCs (CRUD for conversations, memories, documents, user facts).

For memory and RAG, pgvector integrates directly with Drizzle ORM (already used) via the built-in `vector` column type and distance functions (`cosineDistance`, `l2Distance`). Embeddings are generated using AI SDK's `embed`/`embedMany` with OpenAI `text-embedding-3-small` (1536 dimensions). Anthropic does not provide embedding models, so OpenAI is required regardless of the user's chosen chat provider.

**Primary recommendation:** Use AI SDK v6 `streamText` + `toUIMessageStreamResponse()` over a direct Hono POST route for chat, `useChat` from `@ai-sdk/react` on the client, pgvector with Drizzle for semantic search, and background (post-conversation) fact extraction via a secondary LLM call.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` (AI SDK) | ^6.0.86 | streamText, structured output, embeddings | Already installed; official Vercel SDK for LLM apps |
| `@ai-sdk/react` | ^3.0.x | `useChat` hook for streaming chat UI | Official React bindings for AI SDK; transport-based architecture |
| `pgvector` | 0.2.x (npm) + pg extension | Vector similarity search in PostgreSQL | Industry standard for Postgres-native vector search |
| `drizzle-orm` | ^0.41.0 | ORM with native `vector` column type | Already installed; has built-in pgvector support |
| `unpdf` | ^0.12.x | PDF text extraction | Modern, maintained replacement for pdf-parse; works in Node.js |
| `mammoth` | ^1.8.x | DOCX to text extraction | Standard for .docx text extraction in Node.js |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@ai-sdk/openai` | ^3.0.x | OpenAI embedding model access | Already installed; required for `text-embedding-3-small` embeddings |
| `zod` | ^3.23.8 | Schema validation for structured output | Already installed; used with AI SDK `Output.object()` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pgvector | Pinecone/Weaviate | External service adds complexity + cost; pgvector keeps everything in existing Postgres |
| unpdf | pdf-parse | pdf-parse is unmaintained; unpdf is actively maintained by UnJS |
| mammoth | docx | mammoth has simpler API for text extraction specifically |
| Background fact extraction | Real-time extraction | Background avoids latency in user-facing responses |

**Installation:**
```bash
# Server
cd apps/server
npm install @ai-sdk/react pgvector unpdf mammoth

# Web
cd apps/web
npm install @ai-sdk/react ai
```

Note: `ai` and `@ai-sdk/openai` are already in the server. The web app needs `@ai-sdk/react` and `ai` for `useChat` and `DefaultChatTransport`.

## Architecture Patterns

### Recommended Project Structure
```
apps/server/src/
├── coaching/
│   ├── chat-route.ts          # Hono POST /api/chat (streaming, NOT tRPC)
│   ├── system-prompt.ts       # Coaching persona + mode instructions
│   ├── mode-detector.ts       # Auto-detect coaching vs task mode
│   └── structured-outputs.ts  # Zod schemas for decision frameworks, action items, summaries
├── memory/
│   ├── fact-extractor.ts      # Background LLM call to extract facts from conversations
│   ├── embeddings.ts          # embed/embedMany wrappers with chunking
│   └── retriever.ts           # Semantic search over memories + documents
├── documents/
│   ├── upload-route.ts        # Hono POST /api/documents/upload (multipart)
│   ├── parser.ts              # PDF/DOCX/TXT text extraction
│   └── chunker.ts             # Text chunking for embedding
├── db/
│   └── schema.ts              # Extended with conversations, messages, memories, documents, user_facts
├── trpc/
│   └── router.ts              # Extended with conversation, memory, document, userFact routers
└── llm/
    └── providers.ts           # Existing (unchanged)

apps/web/src/
├── app/(app)/
│   ├── chat/
│   │   ├── page.tsx           # Main chat interface
│   │   ├── [id]/page.tsx      # Specific conversation
│   │   └── components/        # ChatInput, MessageList, ModeToggle
│   ├── memory/
│   │   └── page.tsx           # View/edit/delete user facts
│   └── documents/
│       └── page.tsx           # Upload and manage documents
├── hooks/
│   └── use-coaching-chat.ts   # Wrapper around useChat with DefaultChatTransport
└── lib/
    └── trpc.ts                # Existing (unchanged)
```

### Pattern 1: Streaming Chat via Hono (NOT tRPC)
**What:** Chat endpoint is a direct Hono route returning SSE stream, not a tRPC procedure
**When to use:** All streaming LLM responses
**Why:** tRPC does not natively support the SSE UI Message Stream Protocol that `useChat` expects. The AI SDK `toUIMessageStreamResponse()` produces the correct format directly.

**Server (Hono route):**
```typescript
// Source: https://ai-sdk.dev/cookbook/api-servers/hono
import { streamText, convertToModelMessages, UIMessage } from "ai";
import { Hono } from "hono";
import { getModel } from "../llm/providers";

const chatApp = new Hono();

chatApp.post("/api/chat", async (c) => {
  // Auth check via middleware (already exists)
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const { messages, chatId } = await c.req.json<{
    messages: UIMessage[];
    chatId: string;
  }>();

  // Retrieve relevant context (memories + documents)
  const relevantContext = await retrieveContext(userId, messages);

  const result = streamText({
    model: getModel("anthropic:claude-sonnet-4-20250514"),
    system: buildSystemPrompt(relevantContext),
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    onFinish: async ({ messages: finalMessages }) => {
      // Persist conversation to database
      await saveMessages(chatId, userId, finalMessages);
      // Queue background fact extraction
      await extractFactsInBackground(chatId, userId, finalMessages);
    },
  });
});
```

**Client (useChat with DefaultChatTransport):**
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-ui/transport
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";

export function useCoachingChat(chatId: string) {
  return useChat({
    id: chatId,
    transport: new DefaultChatTransport({
      api: `${SERVER_URL}/api/chat`,
      credentials: "include", // Send auth cookies
      body: () => ({ chatId }),
    }),
  });
}
```

### Pattern 2: Structured Output with Output.object()
**What:** Coach produces decision frameworks, action items, summaries as structured JSON
**When to use:** When user requests structured output or system auto-detects task mode

```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
import { streamText, Output } from "ai";
import { z } from "zod";

const actionItemsSchema = z.object({
  items: z.array(z.object({
    title: z.string().describe("Short actionable title"),
    description: z.string().describe("Detailed description"),
    priority: z.enum(["high", "medium", "low"]),
    dueDate: z.string().optional().describe("Suggested due date if applicable"),
  })),
  summary: z.string().describe("Brief summary of the action plan"),
});

const result = streamText({
  model: getModel(modelId),
  system: "You are an executive coach. Extract action items from the conversation.",
  messages: convertToModelMessages(messages),
  output: Output.object({ schema: actionItemsSchema }),
});
```

### Pattern 3: Mode Auto-Detection via System Prompt
**What:** The system prompt instructs the LLM to detect whether the user wants coaching or task output
**When to use:** Every message, unless user has manually overridden mode

```typescript
// Intent classification via system prompt instruction
const SYSTEM_PROMPT_WITH_MODE_DETECTION = `
You are an executive coach and chief of staff.

## Mode Detection
Analyze the user's message to determine the appropriate mode:
- COACHING MODE: User is reflecting, exploring ideas, discussing feelings, seeking perspective
- TASK MODE: User explicitly asks for action items, summaries, frameworks, or structured output

If in TASK MODE, produce structured output. If in COACHING MODE, engage in reflective coaching dialogue.

The user's current mode override is: {{modeOverride ?? "auto-detect"}}
`;
```

### Pattern 4: RAG with pgvector for Context Retrieval
**What:** Embed conversation chunks and documents, retrieve relevant context before each LLM call
**When to use:** Every coaching response to provide personalized context

```typescript
// Source: https://orm.drizzle.team/docs/guides/vector-similarity-search
import { embed } from "ai";
import { cosineDistance, desc, gt, sql } from "drizzle-orm";

async function retrieveContext(userId: string, query: string) {
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: query,
  });

  const similarity = sql<number>`1 - (${cosineDistance(memories.embedding, embedding)})`;

  return db
    .select({ content: memories.content, similarity })
    .from(memories)
    .where(and(
      eq(memories.userId, userId),
      gt(similarity, 0.5)
    ))
    .orderBy(desc(similarity))
    .limit(10);
}
```

### Pattern 5: Background Fact Extraction
**What:** After a conversation turn, a secondary LLM call extracts facts about the user
**When to use:** Post-conversation (in onFinish callback), not during streaming

```typescript
async function extractFactsInBackground(
  chatId: string,
  userId: string,
  messages: UIMessage[]
) {
  const result = await generateText({
    model: getModel("anthropic:claude-haiku-3-20250414"), // Fast, cheap model
    system: `Extract key facts about the user from this conversation.
Return a JSON array of facts: [{ "category": "...", "fact": "...", "confidence": 0.0-1.0 }]
Categories: goal, preference, context, relationship, work, personal`,
    messages: convertToModelMessages(messages),
    output: Output.object({
      schema: z.object({
        facts: z.array(z.object({
          category: z.string(),
          fact: z.string(),
          confidence: z.number(),
        })),
      }),
    }),
  });
  // Store extracted facts with embeddings for later retrieval
}
```

### Pattern 6: Message Persistence with UIMessage Format
**What:** Store chat messages in UIMessage format for perfect restoration
**When to use:** Every conversation save/load

```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence
// UIMessage is the recommended persistence format
// It contains id, role, parts, createdAt — everything needed to restore UI state

// On the server, in toUIMessageStreamResponse onFinish:
onFinish: async ({ messages }) => {
  await db.update(conversations)
    .set({ messages: JSON.stringify(messages), updatedAt: new Date() })
    .where(eq(conversations.id, chatId));
}

// On load, the client fetches messages via tRPC and passes to useChat
const previousMessages = await trpc.conversation.getMessages.query({ chatId });
// useChat accepts initial messages
```

### Anti-Patterns to Avoid
- **Don't use tRPC for streaming chat:** tRPC SSE subscriptions don't produce the UI Message Stream Protocol format. Use a direct Hono route with `toUIMessageStreamResponse()`.
- **Don't extract facts synchronously:** Fact extraction during a streaming response adds latency. Do it in `onFinish` or a background job.
- **Don't store messages in ModelMessage format:** ModelMessage is lossy. UIMessage preserves all UI state (tool invocations, parts, metadata).
- **Don't embed entire conversations as single vectors:** Chunk conversations into meaningful segments (per-message or per-exchange) for better retrieval precision.
- **Don't use Anthropic for embeddings:** Anthropic does not provide embedding models. Use OpenAI `text-embedding-3-small` regardless of chat provider.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE streaming protocol | Custom SSE formatter | `toUIMessageStreamResponse()` | Complex protocol with message parts, tool calls, error handling |
| Chat state management | Custom React state + fetch | `useChat` from `@ai-sdk/react` | Handles streaming, tool calls, reconnection, status tracking |
| Vector similarity search | Custom cosine similarity in JS | pgvector `cosineDistance` in SQL | Database-level vector ops are orders of magnitude faster |
| PDF text extraction | Custom PDF parser | `unpdf` | PDF format is enormously complex; edge cases everywhere |
| DOCX text extraction | Custom XML parser | `mammoth` | OOXML format is deeply nested; mammoth handles all variants |
| Embedding generation | Custom API calls to OpenAI | AI SDK `embed`/`embedMany` | Unified API, automatic retries, token usage tracking |
| Structured output validation | JSON.parse + manual validation | AI SDK `Output.object()` with Zod | Automatic schema validation, retry on malformed output, type safety |
| Text chunking | Simple string split | Recursive character splitter with overlap | Naive splitting breaks sentences mid-thought, ruins retrieval quality |

**Key insight:** The AI SDK v6 already provides the streaming protocol, structured output, embeddings, and tool calling needed for this phase. The main integration work is wiring these together with pgvector for RAG and designing the database schema.

## Common Pitfalls

### Pitfall 1: Using tRPC for Streaming Chat
**What goes wrong:** Developer tries to use tRPC subscriptions or streaming RPCs for the chat endpoint, but `useChat` expects the UI Message Stream Protocol (SSE with specific message types).
**Why it happens:** The project already uses tRPC for everything, so it seems natural to add chat there too.
**How to avoid:** Create a separate Hono route at `/api/chat` that returns `result.toUIMessageStreamResponse()`. Keep tRPC for all non-streaming operations.
**Warning signs:** `useChat` not receiving messages, stream format errors in console.

### Pitfall 2: Missing CORS for Chat Endpoint
**What goes wrong:** The new `/api/chat` route doesn't get CORS headers, causing browser requests from the Next.js frontend to fail.
**Why it happens:** CORS is already configured for `/api/auth/*` and `/trpc/*` but not for `/api/chat`.
**How to avoid:** Add `app.use("/api/chat", cors(corsOptions))` and `app.use("/api/documents/*", cors(corsOptions))` alongside existing CORS config.
**Warning signs:** Browser console shows CORS policy errors on POST to chat endpoint.

### Pitfall 3: pgvector Extension Not Created
**What goes wrong:** Vector column migrations fail because the `vector` extension isn't enabled in PostgreSQL.
**Why it happens:** Drizzle ORM does not automatically create the pgvector extension.
**How to avoid:** Run `CREATE EXTENSION IF NOT EXISTS vector;` before any migration that adds vector columns. Add this to a migration script or the db push script.
**Warning signs:** Drizzle push/migrate fails with "type vector does not exist".

### Pitfall 4: Embedding Dimension Mismatch
**What goes wrong:** Vectors stored with one dimension (e.g., 1536) cannot be compared with vectors of a different dimension.
**Why it happens:** Switching embedding models or using different dimension settings without re-embedding existing data.
**How to avoid:** Standardize on `text-embedding-3-small` with 1536 dimensions from the start. Define the column as `vector('embedding', { dimensions: 1536 })`.
**Warning signs:** SQL errors about incompatible vector dimensions during similarity queries.

### Pitfall 5: Unbounded Context Window
**What goes wrong:** Long conversations exceed the model's context window, causing errors or truncation.
**Why it happens:** Sending the entire conversation history plus RAG context plus system prompt without checking total token count.
**How to avoid:** Implement a sliding window: send the last N messages plus summarize older messages. Use `prepareSendMessagesRequest` on the client to limit messages sent, or truncate server-side.
**Warning signs:** API errors about max tokens exceeded, or the model ignoring early conversation context.

### Pitfall 6: Synchronous Fact Extraction
**What goes wrong:** User experiences noticeable latency because the system extracts facts before responding.
**Why it happens:** Running fact extraction in the request pipeline instead of as a post-processing step.
**How to avoid:** Use the `onFinish` callback of `toUIMessageStreamResponse()` to trigger fact extraction after the response stream completes. Consider using `consumeStream()` to ensure completion even if the client disconnects.
**Warning signs:** Slow initial response times, especially on longer conversations.

### Pitfall 7: Not Handling File Upload Size Limits
**What goes wrong:** Large document uploads crash the server or timeout.
**Why it happens:** No file size limits on the upload endpoint.
**How to avoid:** Set max file size (e.g., 10MB) on the Hono route. Validate file type server-side. Process documents asynchronously if they're large.
**Warning signs:** Out-of-memory errors, request timeouts on document upload.

## Code Examples

### Database Schema Extensions
```typescript
// Source: Drizzle ORM docs + pgvector docs
import { pgTable, text, timestamp, uuid, jsonb, integer, vector, index } from "drizzle-orm/pg-core";

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title"),
  mode: text("mode").default("auto"), // "auto" | "coaching" | "task"
  messages: jsonb("messages").default([]), // UIMessage[] stored as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("conversations_userId_idx").on(table.userId),
]);

export const memories = pgTable("memories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
  type: text("type").notNull(), // "conversation_chunk" | "document_chunk" | "summary"
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("memories_userId_idx").on(table.userId),
  index("memories_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
]);

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  content: text("content"), // Extracted text
  size: integer("size").notNull(),
  status: text("status").default("processing"), // "processing" | "ready" | "error"
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("documents_userId_idx").on(table.userId),
]);

export const userFacts = pgTable("user_facts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // "goal" | "preference" | "context" | "relationship" | "work" | "personal"
  fact: text("fact").notNull(),
  confidence: real("confidence").default(0.8),
  source: text("source"), // "conversation" | "document" | "manual"
  sourceId: uuid("source_id"), // conversation or document ID
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("userFacts_userId_idx").on(table.userId),
  index("userFacts_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
]);
```

### Text Chunking
```typescript
// Simple recursive character splitter with overlap
function chunkText(
  text: string,
  maxChunkSize: number = 500,  // ~500 chars ≈ 125 tokens
  overlap: number = 50
): string[] {
  const chunks: string[] = [];
  const separators = ["\n\n", "\n", ". ", " "];

  function splitRecursive(text: string, separatorIndex: number): string[] {
    if (text.length <= maxChunkSize) return [text];
    const sep = separators[separatorIndex] || "";
    const parts = text.split(sep);
    const result: string[] = [];
    let current = "";

    for (const part of parts) {
      if ((current + sep + part).length > maxChunkSize && current) {
        result.push(current.trim());
        // Overlap: keep last N chars
        current = current.slice(-overlap) + sep + part;
      } else {
        current = current ? current + sep + part : part;
      }
    }
    if (current.trim()) result.push(current.trim());
    return result;
  }

  return splitRecursive(text, 0);
}
```

### Document Parsing
```typescript
import { extractText } from "unpdf";
import mammoth from "mammoth";

async function parseDocument(buffer: Buffer, mimeType: string): Promise<string> {
  switch (mimeType) {
    case "application/pdf": {
      const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
      return text as string;
    }
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      const { value } = await mammoth.extractRawText({ buffer });
      return value;
    }
    case "text/plain":
      return buffer.toString("utf-8");
    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}
```

### Embedding Generation
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-core/embeddings
import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

const embeddingModel = openai.embedding("text-embedding-3-small");

async function embedSingle(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: embeddingModel, value: text });
  return embedding;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({ model: embeddingModel, values: texts });
  return embeddings;
}
```

### File Upload Route (Hono)
```typescript
// Source: https://hono.dev/examples/file-upload
const docsApp = new Hono();

docsApp.post("/api/documents/upload", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.parseBody();
  const file = body["file"] as File;

  if (!file) return c.json({ error: "No file provided" }, 400);
  if (file.size > 10 * 1024 * 1024) return c.json({ error: "File too large (max 10MB)" }, 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await parseDocument(buffer, file.type);

  // Store document, chunk text, generate embeddings (can be async)
  const doc = await createDocument(userId, file.name, file.type, file.size, text);
  await processDocumentChunks(doc.id, userId, text); // chunks + embeddings

  return c.json({ id: doc.id, filename: file.name, status: "ready" });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `generateObject`/`streamObject` | `streamText` with `output` property | AI SDK v6 (2025) | Unified API; generateObject is deprecated |
| `useChat` with managed input state | `useChat` with transport + external state | AI SDK v5/v6 (2025) | Must manage input state manually; transport-based |
| `ai/react` import | `@ai-sdk/react` import | AI SDK v5 (2025) | Old import removed; use dedicated package |
| pdf-parse for PDF extraction | unpdf for PDF extraction | 2024-2025 | pdf-parse unmaintained; unpdf is modern alternative |
| Custom SSE protocol | UI Message Stream Protocol v1 | AI SDK v5/v6 (2025) | Standard format with `x-vercel-ai-ui-message-stream: v1` header |
| Store messages as `{role, content}` | Store as UIMessage with parts | AI SDK v5/v6 (2025) | Parts-based format is the future; tool invocations format deprecated |

**Deprecated/outdated:**
- `generateObject` / `streamObject`: Deprecated in AI SDK v6. Use `streamText` with `output` property instead.
- `ai/react`: Removed. Use `@ai-sdk/react` instead.
- `toolInvocations` on messages: Being phased out in favor of parts-based format.
- pdf-parse: Unmaintained. Use unpdf instead.

## Open Questions

1. **Conversation message storage: JSON column vs normalized table?**
   - What we know: AI SDK recommends storing UIMessage[] as JSON for perfect restoration. A normalized messages table would be better for querying individual messages.
   - What's unclear: Whether the planner should use a JSON column on conversations (simpler) or a separate messages table (more queryable).
   - Recommendation: Start with JSON column on conversations table for simplicity. It aligns with AI SDK's recommendation. If querying individual messages becomes necessary later, add a normalized table then.

2. **Embedding model portability**
   - What we know: OpenAI `text-embedding-3-small` is the current standard (1536 dims). Anthropic has no embedding model.
   - What's unclear: Whether users without an OpenAI API key can use the system. Ollama can run local embedding models but with different dimensions.
   - Recommendation: Default to OpenAI embeddings. If the user has no OpenAI key, the system should gracefully degrade (no RAG context, but chat still works). Flag this for future Ollama embedding support.

3. **Fact extraction frequency**
   - What we know: Background extraction (post-conversation) is recommended to avoid latency.
   - What's unclear: Extract after every message exchange? After conversation ends? On a schedule?
   - Recommendation: Extract after each assistant response in the `onFinish` callback. Use a cheap/fast model (Claude Haiku or GPT-4o-mini). Deduplicate facts against existing ones before storing.

4. **Context window management strategy**
   - What we know: Long conversations will exceed context limits. RAG context + system prompt + messages must fit.
   - What's unclear: Exact token budget allocation across system prompt, RAG context, and conversation history.
   - Recommendation: Reserve ~1000 tokens for system prompt, ~2000 for RAG context, rest for conversation. Implement sliding window for messages (last 20 messages + summary of older ones). This is a tuning question that can be adjusted after initial implementation.

## Sources

### Primary (HIGH confidence)
- [AI SDK v6 Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) - Output.object(), Output.array(), Output.choice() with streamText
- [AI SDK streamText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text) - Full API for streaming text generation
- [AI SDK useChat Reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) - Transport-based architecture, DefaultChatTransport
- [AI SDK Hono Cookbook](https://ai-sdk.dev/cookbook/api-servers/hono) - toUIMessageStreamResponse with Hono server
- [AI SDK Transport Docs](https://ai-sdk.dev/docs/ai-sdk-ui/transport) - DefaultChatTransport configuration
- [AI SDK Embeddings](https://ai-sdk.dev/docs/ai-sdk-core/embeddings) - embed, embedMany, provider support
- [AI SDK Message Persistence](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence) - UIMessage storage pattern, onFinish callback
- [AI SDK Stream Protocol](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol) - UI Message Stream Protocol v1 specification
- [AI SDK Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) - Tool definition, multi-step with stopWhen
- [Drizzle ORM pgvector Guide](https://orm.drizzle.team/docs/guides/vector-similarity-search) - Vector column type, cosineDistance, HNSW index
- [pgvector-node Drizzle Tests](https://github.com/pgvector/pgvector-node/blob/master/tests/drizzle-orm.test.mjs) - Working examples of pgvector with Drizzle
- [Hono File Upload](https://hono.dev/examples/file-upload) - parseBody for multipart form data

### Secondary (MEDIUM confidence)
- [pgvector GitHub](https://github.com/pgvector/pgvector) - Extension capabilities, index types, dimension limits
- [mammoth npm](https://www.npmjs.com/package/mammoth) - DOCX extraction: extractRawText API
- [unpdf GitHub](https://github.com/unjs/unpdf) - PDF extraction: extractText API
- [LangMem Conceptual Guide](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/) - Memory architecture: semantic, episodic, procedural
- [RAG Chunking Strategies 2025](https://www.firecrawl.dev/blog/best-chunking-strategies-rag-2025) - Chunk sizes, overlap, recursive splitting
- [tRPC + AI SDK Discussion](https://github.com/vercel/ai/discussions/3236) - Confirms tRPC not compatible with useChat streaming

### Tertiary (LOW confidence)
- [Mem0 Blog on Chat History](https://mem0.ai/blog/llm-chat-history-summarization-guide-2025) - Background fact extraction pattern
- [Vellum LLM Chatbot Memory](https://www.vellum.ai/blog/how-should-i-manage-memory-for-my-llm-chatbot) - Hierarchical memory architecture

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official docs; AI SDK already installed in project
- Architecture: HIGH - Patterns verified with AI SDK official docs and Hono cookbook; chat-via-Hono is documented
- Pitfalls: MEDIUM-HIGH - tRPC streaming limitation confirmed by GitHub discussions and official docs; pgvector setup confirmed by Drizzle docs
- Memory extraction: MEDIUM - Pattern is well-established in literature but specific implementation details vary; no single canonical approach

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (30 days - stack is stable)
