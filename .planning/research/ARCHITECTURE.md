# Architecture Research

**Domain:** AI executive coach + agent orchestration platform
**Researched:** 2026-02-14
**Confidence:** MEDIUM (training data only; WebSearch/WebFetch unavailable for verification)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Client Layer                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  Chat UI     │  │  Agent Mgmt  │  │  Memory/Doc  │               │
│  │  (React)     │  │  Console     │  │  Viewer      │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
├─────────┴──────────────────┴──────────────────┴──────────────────────┤
│                         API Gateway                                  │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Auth  │  Rate Limit  │  Session Mgmt  │  WebSocket/SSE     │    │
│  └──────────────────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────────────┤
│                      Orchestration Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  Coach       │  │  Router /    │  │  Agent       │               │
│  │  Engine      │  │  Dispatcher  │  │  Lifecycle   │               │
│  │              │  │              │  │  Manager     │               │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                  │                       │
│  ┌──────┴─────────────────┴──────────────────┴──────────────┐       │
│  │              Orchestrator Core (stable code)              │       │
│  │  intent parsing ─ routing logic ─ confirm/dispatch loop   │       │
│  └──────────────────────────┬────────────────────────────────┘       │
├─────────────────────────────┴────────────────────────────────────────┤
│                       Agent Execution Layer                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                │
│  │ Agent A │  │ Agent B │  │ Agent C │  │ Agent N │ (dynamic)      │
│  │ (prompt)│  │ (prompt)│  │ (prompt)│  │ (prompt)│                │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘                │
├───────┴─────────────┴───────────┴─────────────┴──────────────────────┤
│                       Services Layer                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  LLM     │  │  Memory  │  │  Doc     │  │  Template│            │
│  │  Gateway │  │  Service │  │  Ingestion│  │  Registry│            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
├──────────────────────────────────────────────────────────────────────┤
│                       Data Layer                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                           │
│  │  Postgres│  │  Vector  │  │  File    │                           │
│  │  (core)  │  │  Store   │  │  Storage │                           │
│  └──────────┘  └──────────┘  └──────────┘                           │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Chat UI | Conversation interface with streaming responses | React component with WebSocket/SSE for real-time token streaming |
| Agent Management Console | CRUD for agent templates, view per-user customizations, community library | React CRUD views + search/filter |
| Memory/Doc Viewer | Browse uploaded docs, view memory graph, inspect what the system "knows" | Read-only explorer with search |
| API Gateway | Authentication, rate limiting, session management, streaming transport | Express/Fastify middleware stack |
| Coach Engine | The core conversational AI — personality, empathy, structured output generation | System prompt + conversation context + memory retrieval piped to LLM |
| Router / Dispatcher | Classifies user intent, selects appropriate agent, proposes routing for confirmation | Intent classifier (LLM-based) + routing rules + confirm/dispatch state machine |
| Agent Lifecycle Manager | Creates, stores, versions, evolves, and retires agent definitions | CRUD on agent prompt definitions + per-user override storage |
| Orchestrator Core | Stable code that wires coach, router, and agents together — the execution engine | State machine / workflow engine in TypeScript (not LLM-generated) |
| Dynamic Agents | Specialist agents defined entirely by prompts; no hardcoded behavior | Prompt template + tool permissions + output schema, executed via LLM Gateway |
| LLM Gateway | Abstracts multiple LLM providers behind a single interface | Adapter pattern: Claude adapter, OpenAI adapter, local model adapter |
| Memory Service | Stores and retrieves user context — facts, preferences, history, relationships | Vector embeddings + structured fact storage + retrieval pipeline |
| Document Ingestion | Processes uploaded documents into searchable, retrievable chunks | Chunking + embedding + metadata extraction pipeline |
| Template Registry | Community agent templates library — browse, fork, customize | Template storage + versioning + sharing metadata |
| Postgres | Core relational data: users, sessions, conversations, agent definitions | PostgreSQL with per-user row-level security |
| Vector Store | Semantic search over memory and documents | pgvector extension (keeps infra simple) or dedicated vector DB |
| File Storage | Raw uploaded documents, generated artifacts | Local filesystem or S3-compatible object storage |

## Recommended Project Structure

```
mycoach/
├── apps/
│   ├── web/                    # React web application
│   │   ├── src/
│   │   │   ├── components/     # UI components
│   │   │   ├── pages/          # Route pages
│   │   │   ├── hooks/          # Custom hooks (useChat, useAgent, etc.)
│   │   │   ├── stores/         # Client state management
│   │   │   └── services/       # API client layer
│   │   └── package.json
│   └── server/                 # Node.js API server
│       ├── src/
│       │   ├── api/            # Route handlers / controllers
│       │   ├── orchestrator/   # Core orchestration engine
│       │   │   ├── coach.ts        # Coach conversation engine
│       │   │   ├── router.ts       # Intent classification + routing
│       │   │   ├── dispatcher.ts   # Agent dispatch + confirm loop
│       │   │   └── pipeline.ts     # Orchestration state machine
│       │   ├── agents/         # Agent execution runtime
│       │   │   ├── executor.ts     # Runs a dynamic agent against LLM
│       │   │   ├── lifecycle.ts    # Agent CRUD + versioning
│       │   │   └── templates/      # Built-in starter templates
│       │   ├── memory/         # Memory subsystem
│       │   │   ├── store.ts        # Memory read/write
│       │   │   ├── retrieval.ts    # Context retrieval for conversations
│       │   │   └── ingestion.ts    # Document processing pipeline
│       │   ├── llm/            # LLM provider abstraction
│       │   │   ├── gateway.ts      # Unified LLM interface
│       │   │   ├── adapters/       # Provider-specific adapters
│       │   │   └── streaming.ts    # Streaming response handling
│       │   ├── auth/           # Authentication + user isolation
│       │   └── db/             # Database access layer
│       └── package.json
├── packages/
│   └── shared/                 # Shared types, schemas, utilities
│       ├── src/
│       │   ├── types/          # TypeScript type definitions
│       │   ├── schemas/        # Zod schemas for validation
│       │   └── utils/          # Shared utilities
│       └── package.json
├── docker-compose.yml          # Self-hosted deployment
└── package.json                # Monorepo root
```

### Structure Rationale

- **apps/web:** Standalone React app. Desktop-first, future React Native mobile app would be a sibling under apps/.
- **apps/server:** All server logic in one deployable unit. Monolith-first — microservices are premature here.
- **apps/server/src/orchestrator/:** The "stable code" heart of the system. This is the most critical boundary — orchestrator logic is hand-written, tested, deterministic code. It calls LLMs but is not generated by them.
- **apps/server/src/agents/:** Agent execution runtime separate from orchestration. Agents are data (prompt definitions) executed by a runtime, not standalone code modules.
- **apps/server/src/llm/:** Isolated LLM abstraction. Swapping providers should only touch adapter files, never orchestrator or agent code.
- **packages/shared/:** TypeScript types and validation schemas shared between client and server. Monorepo with shared package keeps types in sync.

## Architectural Patterns

### Pattern 1: Orchestrator as State Machine (not free-form agent loop)

**What:** The orchestrator runs a deterministic state machine for each user turn: classify intent, select handler (coach vs. agent dispatch), execute, return response. Each state transition is explicit in code.
**When to use:** Always for the core loop. This is the "stable code" principle from the project requirements.
**Trade-offs:** More upfront design effort than a ReAct loop, but far more debuggable, testable, and predictable. Prevents runaway agent loops. Enables the suggest-then-confirm pattern naturally (confirm is just a state).

**Example:**
```typescript
// Orchestrator state machine (simplified)
type OrchestratorState =
  | { phase: 'classify'; userMessage: string }
  | { phase: 'coach'; context: CoachContext }
  | { phase: 'route_suggest'; candidates: AgentCandidate[] }
  | { phase: 'awaiting_confirm'; selected: AgentCandidate }
  | { phase: 'dispatch'; agent: AgentDefinition; task: string }
  | { phase: 'synthesize'; agentResult: AgentOutput }
  | { phase: 'respond'; response: CoachResponse }

async function orchestrate(state: OrchestratorState): Promise<CoachResponse> {
  switch (state.phase) {
    case 'classify':
      const intent = await classifyIntent(state.userMessage);
      if (intent.type === 'coaching') return orchestrate({ phase: 'coach', context: intent.context });
      if (intent.type === 'task') return orchestrate({ phase: 'route_suggest', candidates: intent.candidates });
      // ...
    case 'route_suggest':
      return { type: 'confirm_prompt', candidates: state.candidates };
    case 'awaiting_confirm':
      return orchestrate({ phase: 'dispatch', agent: state.selected.definition, task: state.selected.task });
    // ...
  }
}
```

### Pattern 2: Agents as Data, Not Code

**What:** Every agent (coach personality, contract attorney, comms writer, etc.) is defined as a data record containing: system prompt, allowed tools, output schema, and evolution history. The agent execution runtime is shared code that takes these definitions and runs them against an LLM.
**When to use:** Always. This is the foundation of the dynamic agent model.
**Trade-offs:** Slightly less flexibility than code-based agents (can't add arbitrary runtime behavior), but massively simpler to create, share, fork, and evolve. Community templates become possible because agents are just JSON/prompt documents.

**Example:**
```typescript
interface AgentDefinition {
  id: string;
  name: string;
  baseTemplateId?: string;          // Community template it was forked from
  systemPrompt: string;             // The core definition — this IS the agent
  tools: ToolPermission[];          // What tools this agent can use
  outputSchema?: ZodSchema;         // Structured output format
  userOverrides: Record<string, {   // Per-user evolution
    promptAdditions: string;        // Learned preferences
    feedbackHistory: FeedbackEntry[];
  }>;
  version: number;
  metadata: { description: string; category: string; author: string };
}

// Execution is always the same runtime
async function executeAgent(
  definition: AgentDefinition,
  task: string,
  userContext: MemoryContext,
  llm: LLMGateway
): Promise<AgentOutput> {
  const prompt = buildAgentPrompt(definition, task, userContext);
  return llm.complete(prompt, { schema: definition.outputSchema });
}
```

### Pattern 3: LLM Gateway with Provider Adapters

**What:** A single `LLMGateway` interface that all orchestrator and agent code calls. Behind it, provider-specific adapters handle the differences between Claude, OpenAI, local models, etc.
**When to use:** From day one. Bake this in early — retrofitting provider abstraction is painful.
**Trade-offs:** Some lowest-common-denominator effect (can't use every provider-specific feature), but the project explicitly requires swappable backends. Provider-specific features can be accessed through adapter extensions when needed.

**Example:**
```typescript
interface LLMGateway {
  complete(messages: Message[], options: CompletionOptions): Promise<LLMResponse>;
  stream(messages: Message[], options: CompletionOptions): AsyncIterable<LLMChunk>;
  embed(texts: string[]): Promise<number[][]>;
}

interface CompletionOptions {
  model?: string;                    // Override default model
  schema?: ZodSchema;                // Structured output
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];          // Function calling
}

// Adapters implement the interface
class ClaudeAdapter implements LLMGateway { /* ... */ }
class OpenAIAdapter implements LLMGateway { /* ... */ }
class OllamaAdapter implements LLMGateway { /* ... */ }

// Config-driven selection
function createLLMGateway(config: LLMConfig): LLMGateway {
  switch (config.provider) {
    case 'anthropic': return new ClaudeAdapter(config);
    case 'openai': return new OpenAIAdapter(config);
    case 'ollama': return new OllamaAdapter(config);
  }
}
```

### Pattern 4: Memory as Retrieval Pipeline

**What:** Memory is not a monolithic store but a retrieval pipeline: user message comes in, pipeline pulls relevant context from multiple sources (conversation history, facts, documents, user profile), ranks by relevance, and injects into the LLM context window. This is the backbone of "knows your entire world."
**When to use:** For every LLM call — both coaching conversations and agent dispatches. The quality of memory retrieval directly determines the quality of coaching.
**Trade-offs:** Retrieval quality is the hardest part of the system to get right. Requires iterative tuning. Start simple (recent history + keyword search), add semantic search, then add re-ranking.

**Example:**
```typescript
interface MemoryRetrievalPipeline {
  retrieve(query: string, userId: string, options: RetrievalOptions): Promise<MemoryContext>;
}

interface MemoryContext {
  recentHistory: Message[];          // Last N conversation turns
  relevantFacts: Fact[];             // Extracted user facts (preferences, goals, team members)
  relevantDocuments: DocChunk[];     // Chunks from uploaded documents
  userProfile: UserProfile;          // Stable profile data
  activeGoals: Goal[];               // Current goals/action items
}

// Pipeline stages
async function retrieve(query: string, userId: string): Promise<MemoryContext> {
  const [history, facts, docs, profile, goals] = await Promise.all([
    getRecentHistory(userId, 20),
    searchFacts(query, userId),
    searchDocuments(query, userId),
    getUserProfile(userId),
    getActiveGoals(userId),
  ]);
  return { recentHistory: history, relevantFacts: facts, relevantDocuments: docs, userProfile: profile, activeGoals: goals };
}
```

## Data Flow

### Core Conversation Flow

```
User sends message
    |
    v
API Gateway (auth, session validation, rate limit)
    |
    v
Orchestrator: Classify Intent
    |--- coaching intent -------> Coach Engine
    |                                |
    |                                v
    |                          Memory Retrieval Pipeline
    |                          (history + facts + docs + profile)
    |                                |
    |                                v
    |                          LLM Gateway -> Claude/OpenAI/etc.
    |                                |
    |                                v
    |                          Stream response to client
    |                          Extract facts -> Memory Store (async)
    |
    |--- task/delegation ------> Router: Suggest Agent(s)
                                    |
                                    v
                                Client: Display suggestion
                                "I'd route this to [Contract Attorney]. Proceed?"
                                    |
                                    v
                                User confirms
                                    |
                                    v
                                Dispatcher: Execute Agent
                                    |
                                    v
                                Agent Executor:
                                  1. Load agent definition
                                  2. Retrieve relevant memory context
                                  3. Build prompt (system + task + context)
                                  4. Call LLM Gateway
                                  5. Parse structured output
                                    |
                                    v
                                Coach synthesizes agent result
                                (presents in coaching voice, adds advice)
                                    |
                                    v
                                Stream response to client
```

### Document Ingestion Flow

```
User uploads document
    |
    v
File Storage (raw document saved)
    |
    v
Ingestion Pipeline:
  1. Parse document (PDF, DOCX, TXT, etc.)
  2. Chunk into segments (overlap for context)
  3. Extract metadata (title, date, type)
  4. Generate embeddings via LLM Gateway
  5. Extract key facts (optional LLM pass)
    |
    v
Vector Store (chunks + embeddings)
    +
Postgres (metadata + extracted facts)
```

### Agent Evolution Flow

```
User gives feedback on agent output
("This was too formal" / thumbs down / explicit correction)
    |
    v
Agent Lifecycle Manager:
  1. Record feedback entry
  2. Analyze feedback patterns (periodic LLM pass)
  3. Generate prompt additions ("User prefers concise, direct tone")
  4. Store as user-specific override on agent definition
    |
    v
Next execution of that agent for this user
includes the evolved prompt additions
```

### Key Data Flows

1. **Message-to-response:** User message -> orchestrator classify -> coach or agent route -> memory retrieval -> LLM call -> streamed response. Every user turn follows this path. Memory retrieval happens on every LLM call.
2. **Suggest-then-confirm:** Router proposes agent dispatch -> client shows confirmation UI -> user confirms/rejects -> dispatcher executes or aborts. This is a two-turn interaction: the response to the first turn is a confirmation prompt, the second turn triggers execution.
3. **Memory accumulation:** After every coach response, a background process extracts facts and updates the user's memory store. This is async and non-blocking to the response stream.
4. **Agent gap detection:** When the router cannot find a suitable agent (low confidence on all candidates), it proposes creating a new one. This triggers the Agent Lifecycle Manager's creation flow, which uses the current conversation context to draft a new agent definition.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Claude API (Anthropic) | LLM Gateway adapter, HTTP REST + streaming | Primary LLM. Use Messages API with streaming. Handle rate limits with exponential backoff. |
| OpenAI API | LLM Gateway adapter, HTTP REST + streaming | Secondary LLM. Same adapter pattern. Responses API or Chat Completions. |
| Local models (Ollama) | LLM Gateway adapter, local HTTP | For privacy-sensitive tasks or offline use. Expect lower quality. |
| Embedding models | LLM Gateway embed method | Can use same provider as chat or dedicated embedding model. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Client <-> Server | REST + WebSocket/SSE | REST for CRUD operations. SSE for streaming LLM responses (simpler than WebSocket for unidirectional streaming). |
| Orchestrator <-> LLM Gateway | In-process function calls | Same Node.js process. No network hop. Gateway is a library, not a service. |
| Orchestrator <-> Memory Service | In-process function calls | Same process. Memory retrieval is latency-sensitive; keep it in-process. |
| Orchestrator <-> Agent Executor | In-process function calls | Agents execute in the same process. They are prompt definitions, not separate services. |
| Server <-> Postgres | Database driver (pg / Prisma) | Standard connection pool. Row-level security for user isolation. |
| Server <-> Vector Store | Database driver or HTTP | pgvector = same Postgres connection. Dedicated vector DB = separate client. |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 users | Monolith is correct. Single Node.js server, single Postgres instance. Deploy with Docker Compose. Focus on correctness, not performance. |
| 100-1k users | Add connection pooling (PgBouncer). Cache frequently accessed memory context. Consider read replicas for Postgres if queries are slow. Still a monolith. |
| 1k-10k users | Agent execution is the bottleneck (LLM API calls are slow and expensive). Add a job queue (BullMQ/Redis) for agent dispatch so long-running agent tasks don't block the server. Consider separating agent execution into worker processes. |
| 10k+ users | Split LLM Gateway into a separate service for independent scaling. Consider per-tenant database schemas if user isolation requirements tighten. This scale is unlikely for a self-hosted product — the user's own infrastructure is the limit. |

### Scaling Priorities

1. **First bottleneck: LLM API latency and cost.** Every user turn requires at least one LLM call (often two: classify + respond). Streaming helps perceived latency. Caching common classifications helps throughput. Cost management (model selection per task complexity) is essential.
2. **Second bottleneck: Memory retrieval latency.** As users accumulate more documents and conversation history, retrieval slows. Optimize with vector index tuning, fact summarization (condense old conversations into facts), and tiered retrieval (check fast caches before slow semantic search).

## Anti-Patterns

### Anti-Pattern 1: Free-Form Agent Loop (ReAct without bounds)

**What people do:** Let the LLM decide when to call tools, when to delegate to sub-agents, and when to stop — classic ReAct pattern with no hard limits.
**Why it's wrong:** Unbounded loops cause runaway costs, unpredictable latency, and hallucinated tool calls. For an executive coaching product, predictability and trust are paramount. Users cannot trust a system that sometimes takes 2 seconds and sometimes takes 2 minutes for similar requests.
**Do this instead:** Deterministic orchestrator state machine with explicit step limits. The LLM provides intelligence (intent classification, response generation), but the code controls the flow. Max 3 LLM calls per user turn for coaching, max 5 for agent dispatch.

### Anti-Pattern 2: Hardcoded Agent Implementations

**What people do:** Build each agent (contract attorney, comms writer, etc.) as a separate code module with its own logic, tools, and execution path.
**Why it's wrong:** Destroys the dynamic agent model. Can't create agents from prompts. Can't share via community templates. Can't evolve per-user. Every new agent requires a code deploy.
**Do this instead:** Agents as data (prompt definitions). Single execution runtime. Agent "behavior" lives in the prompt, not in code. The only code differences between agents are their tool permissions and output schemas, which are declarative configuration.

### Anti-Pattern 3: Monolithic Memory Blob

**What people do:** Stuff all user context (recent messages, profile, documents, facts, goals) into a single string appended to every LLM prompt.
**Why it's wrong:** Context windows are finite and expensive. As memory grows, costs explode and relevance drops. The LLM struggles to find the relevant needle in the context haystack.
**Do this instead:** Memory retrieval pipeline that selectively pulls relevant context per query. Always include: user profile (small, stable), recent history (last few turns). Selectively include: relevant facts, relevant document chunks. Use embedding similarity and keyword matching to select, not "include everything."

### Anti-Pattern 4: Coupling Orchestrator Logic to a Specific LLM Provider

**What people do:** Use Claude-specific features (tool use format, system prompt conventions, response parsing) directly in orchestrator code.
**Why it's wrong:** When you need to swap providers or use multiple providers for different tasks, the orchestrator has to be rewritten.
**Do this instead:** LLM Gateway abstraction from day one. Orchestrator code never imports from `@anthropic-ai/sdk` or `openai` directly. All provider-specific logic lives in adapter files behind the gateway interface.

### Anti-Pattern 5: Skipping the Confirm Step for Agent Dispatch

**What people do:** Auto-dispatch to agents based on intent classification, treating it as a transparent optimization.
**Why it's wrong:** Misrouted agent tasks waste time and erode trust. Executives need to feel in control. The suggest-then-confirm pattern is not a UX nicety — it's a core trust mechanism.
**Do this instead:** Always surface routing suggestions to the user. Make confirmation fast (one click/keystroke). Allow override ("Actually, handle this yourself" or "Route to X instead"). Log confirm/reject patterns to improve routing over time.

## Build Order (Dependency Chain)

Build order is dictated by which components depend on others. This directly informs phase structure in the roadmap.

### Layer 0: Foundation (no dependencies)
- **Postgres + schema** — everything stores data here
- **LLM Gateway + first adapter (Claude)** — everything calls LLMs
- **Auth + user isolation** — everything is per-user
- **Shared types/schemas** — everything uses these

### Layer 1: Core Services (depends on Layer 0)
- **Memory Service (basic)** — conversation history storage and retrieval; start with recent-history-only, add vector search later
- **Chat API + streaming** — basic request/response with SSE streaming

### Layer 2: Coaching Engine (depends on Layers 0-1)
- **Coach Engine** — system prompt + memory context + LLM call = conversational coach
- **Chat UI** — conversation interface connected to streaming API
- **This is the first usable product: a coaching chatbot with memory.**

### Layer 3: Orchestration (depends on Layers 0-2)
- **Intent classifier** — distinguish coaching vs. task/delegation requests
- **Router / suggest-then-confirm flow** — propose agent routing, handle confirmation
- **Orchestrator state machine** — wires everything together

### Layer 4: Agent System (depends on Layers 0-3)
- **Agent definition schema** — data model for dynamic agents
- **Agent executor** — runtime that executes agent definitions against LLM
- **Built-in starter templates** — contract attorney, comms writer, meeting prep, research analyst
- **Agent management UI** — view, edit, create agents

### Layer 5: Advanced Memory (depends on Layers 0-2, enhances all layers)
- **Document ingestion pipeline** — upload and chunk documents
- **Vector store + semantic search** — pgvector or similar
- **Fact extraction** — auto-extract facts from conversations
- **Memory/doc viewer UI**

### Layer 6: Agent Evolution + Community (depends on Layers 0-4)
- **Feedback collection** — thumbs up/down, corrections, explicit feedback on agent outputs
- **Per-user agent evolution** — prompt additions from feedback patterns
- **Agent gap detection** — recognize when no agent fits, propose creation
- **Community template registry** — browse, fork, share agent templates

### Build Order Rationale

1. **Layer 0 first** because literally everything depends on database, LLM access, and auth.
2. **Coach before agents** because the coaching conversation is the primary UX and tests the core LLM integration, memory, and streaming pipeline. A useful coach with no agents is still valuable. Agents with no coach are not.
3. **Orchestration before agents** because the dispatch flow (classify, suggest, confirm) must exist before agents can be dispatched. Building agents without orchestration means building manual agent selection UI that gets thrown away.
4. **Basic memory before advanced memory** because recent conversation history is sufficient for early coaching. Vector search and document ingestion are enhancements, not prerequisites.
5. **Agent evolution and community last** because they build on a working agent system. Feedback requires agents to exist. Gap detection requires routing to exist. Community templates require the agent definition schema to be stable.

## Sources

- Anthropic's "Building Effective Agents" guide (training data, MEDIUM confidence) — establishes patterns for orchestrator-driven vs. autonomous agent architectures, recommends deterministic workflows with LLM intelligence at decision points
- LangChain/LangGraph architecture patterns (training data, MEDIUM confidence) — multi-agent orchestration with state machines, tool-use patterns
- AutoGen multi-agent framework patterns (training data, MEDIUM confidence) — agent-as-role patterns, conversation-driven orchestration
- OpenAI function calling and structured output patterns (training data, MEDIUM confidence) — provider abstraction patterns, tool-use conventions
- General RAG (Retrieval-Augmented Generation) architecture patterns (training data, HIGH confidence) — well-established patterns for memory retrieval pipelines, document chunking, vector search
- General software architecture patterns for SaaS/self-hosted products (training data, HIGH confidence) — monolith-first, connection pooling, job queues, user isolation

**Note:** WebSearch and WebFetch were unavailable during this research session. All findings are derived from training data (cutoff: early-mid 2025). The patterns documented here are well-established in the AI/LLM application space, but specific library versions and newest framework features should be verified during implementation phases.

---
*Architecture research for: AI executive coach + agent orchestration platform*
*Researched: 2026-02-14*
