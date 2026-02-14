# Project Research Summary

**Project:** MyCoach - AI Executive Coach + Chief-of-Staff Agent Orchestration Platform
**Domain:** AI-powered executive coaching with multi-agent task delegation
**Researched:** 2026-02-14
**Confidence:** MEDIUM

## Executive Summary

MyCoach is an AI executive coach + chief-of-staff platform that combines deep coaching relationships with practical task delegation through dynamic agent orchestration. The product's core innovation is suggest-then-confirm agent routing: the coach identifies when to delegate tasks to specialist agents (contract review, comms writing, research, etc.), suggests routing for user approval, then executes and synthesizes results back into the coaching conversation.

The recommended approach builds on a TypeScript full-stack (React/Next.js frontend, Hono backend, PostgreSQL + pgvector) with Vercel AI SDK as the LLM abstraction layer. Critically, the architecture treats agents as prompt-defined data (not hardcoded modules) and orchestration as a deterministic state machine (not autonomous agent loops). This "stable code, dynamic prompts" pattern enables the platform's differentiator — users can create new specialist agents from natural language — while maintaining debuggability and cost control.

The primary risk is treating coaching as stateless Q&A rather than building persistent, evolving memory from day one. Secondary risks include unbounded agent proliferation without governance, prompt injection via user documents, and over-engineering the orchestration layer into a fragile multi-step system. All critical risks can be mitigated through architectural decisions in Phase 1 (Foundation) before any coaching UX is built.

## Key Findings

### Recommended Stack

The stack prioritizes self-hosted deployment, TypeScript type safety across the entire system, and provider-agnostic LLM integration. The core insight is to avoid heavy agent frameworks (LangChain/LangGraph) that obscure control flow — instead, build custom orchestration on top of Vercel AI SDK's clean primitives for streaming, tool calling, and structured output.

**Core technologies:**
- **TypeScript + Node.js 22 LTS**: Type safety across frontend, backend, and dynamic agent definitions is critical when agents are prompt-defined — interfaces enforce structure on inputs/outputs
- **Vercel AI SDK**: Provider-agnostic LLM abstraction (OpenAI, Anthropic, Google, Ollama) with streaming, structured output via Zod, and tool calling — does NOT lock you to Vercel hosting
- **PostgreSQL + pgvector**: Battle-tested relational database with vector extension eliminates need for separate vector store (Pinecone/Qdrant), simplifies self-hosted deployment, enables transactional consistency between metadata and embeddings
- **Hono + tRPC**: Lightweight TypeScript-native backend framework with end-to-end type safety between React frontend and Node.js backend WITHOUT code generation
- **Next.js + Tailwind + shadcn/ui**: Standard React framework for desktop web, server-side rendering, with utility-first styling and accessible component primitives
- **BullMQ + Redis**: Job queue for async agent execution, parallel dispatch, scheduled briefings, and document processing

**Why NOT:**
- **LangChain/LangGraph**: Thick abstraction layer with its own concepts (chains, runnables) obscures control flow. For a product where orchestration IS the product, this is a liability.
- **Cloud vector DBs (Pinecone/Weaviate)**: Violates self-hosted privacy constraint. pgvector keeps everything in one database.
- **Cloud auth (Clerk/Auth0)**: Sends user session data to third parties. Use Better Auth (self-hosted).
- **Prisma ORM**: Binary engine complicates deployment; Drizzle is lighter and closer to SQL for complex memory queries.

### Expected Features

**Must have for launch (v1 table stakes):**
- Conversational chat interface with streaming responses
- Persistent conversation memory (vector store + fact extraction + user model)
- User onboarding/intake to seed the coaching relationship
- Authentication with isolated accounts (multi-user from day 1)
- Document upload (strategy docs, org charts, OKRs) with chunking and embedding
- Action items/task extraction from conversations
- Conversation history and search
- Cross-domain coaching (work + personal by design, not retrofitted)
- Dynamic agent creation (at minimum 3-4 pre-built templates with infra to add more from prompts)
- Delegation cascade (coach routes to specialist agents, synthesizes results)
- Structured outputs (decision frameworks: pro/con, decision matrix, stakeholder map)
- Self-hosted Docker deployment
- Encryption at rest and in transit

**Should have after validation (v1.x differentiators):**
- Morning briefing (proactive digest of action items, calendar, pending decisions)
- Weekly reflection/retrospective with the coach
- Hard conversation prep (role-play for firings, board presentations, conflict resolution)
- Crisis mode (urgency detection with style shift to directive, faster responses)
- Agent gap detection (system proposes new agents when coverage gaps identified)
- Swappable LLM backends (per-agent model selection)
- Per-user agent evolution (agents improve based on individual feedback)

**Defer to v2+ (future consideration):**
- Community agent templates marketplace (needs 10+ users for value)
- Calendar integration (complex API work, defer until briefing proven valuable)
- Voice input/output (not core to structured output value prop)
- PWA for mobile (defer until desktop solid)
- Multi-tenant managed hosting (validate self-hosted model first)

**Anti-features (commonly requested but problematic):**
- Real-time voice conversation (massive complexity, latency issues, not core value)
- Full calendar/email management (liability, brittle integrations, dangerous autonomy)
- Autonomous agent execution without human-in-loop (one bad email, one leaked doc)
- Gamification (executives find it patronizing)
- Social/community forums (privacy violation for sensitive coaching content)
- Therapy/mental health diagnosis (regulatory risk, liability, not coaching's place)

### Architecture Approach

The architecture follows a layered pattern with strict separation between stable orchestration code and dynamic agent definitions. The orchestrator is a deterministic state machine (classify intent → route suggestion → user confirmation → dispatch → synthesize) not a free-form agent loop. Agents are prompt templates + tool permissions + output schemas stored as data, executed by a shared runtime.

**Major components:**

1. **Orchestrator Core (stable code)** — Hand-written state machine that wires coach, router, and agents together. Explicit state transitions prevent runaway loops. This is where suggest-then-confirm routing lives.

2. **Coach Engine** — Conversational AI personality with empathy, structured output generation, and cross-domain coaching. Retrieves memory context, calls LLM, streams response, triggers async fact extraction.

3. **Router/Dispatcher** — Classifies user intent (coaching vs task delegation), selects candidate agents via semantic matching, proposes routing for confirmation, dispatches on approval.

4. **Agent Execution Runtime** — Shared code that loads agent definitions (prompt + tools + schema), retrieves memory context, builds prompt, calls LLM gateway, validates structured output.

5. **LLM Gateway** — Provider abstraction layer with adapters for Claude, OpenAI, Ollama, etc. All orchestrator and agent code calls this interface, never provider SDKs directly.

6. **Memory Service** — Retrieval pipeline that pulls relevant context from conversation history, extracted facts, uploaded documents, user profile, and active goals. Tiered storage: working memory (current session), short-term (recent sessions), long-term (distilled facts).

7. **Agent Lifecycle Manager** — CRUD for agent templates, per-user customizations, versioning, usage tracking, gap detection, and community template registry.

**Critical architectural decisions:**

- **Monorepo structure**: Shared TypeScript types between frontend (`apps/web`), backend (`apps/server`), and shared packages (`packages/shared`, `packages/db`, `packages/orchestrator`). Agent template schemas defined once, used everywhere.

- **Agents as data, not code**: Every agent is a JSON/prompt document. Community templates are possible because agents are shareable data. Per-user evolution happens via prompt additions stored in database.

- **Deterministic orchestration**: The state machine has explicit step limits (max 3 LLM calls for coaching, max 5 for agent dispatch). Prevents runaway loops and cost explosions.

- **Memory as retrieval, not dump**: Don't stuff everything into context. Retrieve relevant facts/history per turn using semantic search + recency + keyword matching.

### Critical Pitfalls

1. **Treating coaching as stateless Q&A** — System forgets prior conversations, gives contradictory advice, re-asks answered questions. Users lose trust by session 3. **Avoidance**: Build structured user model (facts, goals, preferences, relationships) from day 1. Retrieval-augmented memory with separate "told me" vs "inferred" fact storage. Test with multi-week simulated journeys, not single-session demos. **Must address in Phase 1 (Foundation).**

2. **Unbounded agent spawning without governance** — Dynamic creation is the differentiator, but without lifecycle management, users accumulate dozens of near-duplicate agents. System becomes unpredictable and expensive. **Avoidance**: Agent overlap detection before creation, usage tracking, auto-archive unused agents after 30 days, per-user limits (start with 10-15 active). Route to existing agents before suggesting new ones. **Must address in Phase 2 (Agent Framework).**

3. **Prompt injection via user documents and community templates** — Executive documents and community-contributed agent templates are untrusted input. Malicious content can override system instructions, exfiltrate data in multi-tenant setups, or break coaching behavior. **Avoidance**: Clear prompt boundaries (system vs user content), sanitize community templates with review pipeline, output monitoring for cross-user leakage, adversarial testing with injection payloads. **Must address in Phase 1 (Foundation) and Phase 2 (Agent Framework).**

4. **Over-engineering the routing layer** — Complex multi-agent orchestration (planning agent → drafting agent → review agent) creates fragile, slow systems. 30+ second latency for simple requests. **Avoidance**: Start with single LLM call for intent classification and routing. 3-second latency budget for first response. Add orchestration complexity only when measured accuracy demands it. Explicit fallback: if uncertain, ask the user. **Must address in Phase 2 (Agent Framework).**

5. **Memory without curation or decay** — Storing everything forever (every turn, every chunk) degrades retrieval quality after 6 months. User model becomes self-contradictory ("wants to leave job" + "loves job" from different contexts). **Avoidance**: Tiered memory (working/short-term/long-term), contradiction resolution when facts update, memory decay for un-reinforced content, periodic consolidation (distill history into updated facts), cap per-user memory with intelligent eviction. **Must address in Phase 1 (Foundation).**

6. **Building for two power users instead of a product** — Hyper-customization to initial users (tech manager + legal executive) bakes role-specific assumptions into platform code. User #3 requires rework. **Avoidance**: Strict separation between platform capabilities (memory, routing, agent creation) and user-specific agents (Jira agent, legal review agent). Ask for every feature: "Platform or agent template?" Design for hypothetical third persona to verify architecture accommodates them without code changes. **Must address in Phase 2 (Agent Framework).**

7. **LLM provider lock-in despite "swappable backends"** — System couples to one provider's specific behaviors (function calling format, token counting, context window size). "Swap" requires months of rework. **Avoidance**: Define internal LLM interface covering chat completion, structured output, embedding, and streaming. Test with 2+ providers from day 1 (e.g., Claude + Ollama). Store prompts in provider-agnostic format. Avoid provider-specific features in core logic. **Must address in Phase 1 (Foundation).**

## Implications for Roadmap

Based on research findings, the roadmap should follow a dependency-driven layering approach. The architecture research reveals a clear build order: foundation (database, LLM gateway, auth) → core services (memory, streaming) → coaching engine → orchestration → agent system → advanced features.

### Phase 1: Foundation & Memory Architecture

**Rationale:** Everything depends on this layer. Persistent memory architecture cannot be retrofitted — it must be designed before any coaching UX is built. The research shows that stateless coaching (pitfall #1) is the fastest path to user abandonment. LLM provider lock-in (pitfall #7) is also foundational — adding abstraction later requires rewriting every LLM call.

**Delivers:**
- PostgreSQL database with schema design (users, conversations, messages, facts, agent definitions)
- pgvector extension for semantic search
- LLM Gateway abstraction with Claude adapter (primary) and Ollama adapter (self-hosted validation)
- Authentication with Better Auth (self-hosted, multi-user isolation)
- Memory Service with retrieval pipeline (recent history + semantic fact search)
- Basic user model (profile, goals, preferences)
- Shared TypeScript types and Zod schemas in monorepo packages

**Addresses features:**
- Authentication & isolated accounts (table stakes)
- Persistent conversation memory foundation (table stakes)
- Secure data handling (encryption at rest/transit)
- Swappable LLM backends (differentiator)

**Avoids pitfalls:**
- Pitfall #1 (stateless coaching) — memory architecture in place from day 1
- Pitfall #7 (LLM lock-in) — provider abstraction foundational
- Pitfall #3 (prompt injection) — security boundaries established early

**Research needs:** Standard patterns. PostgreSQL + pgvector is well-documented. Vercel AI SDK patterns are established. Skip `/gsd:research-phase`.

---

### Phase 2: Core Coaching Experience

**Rationale:** With foundation in place, build the primary user value: conversational coaching with persistent memory. This validates the coaching relationship before adding orchestration complexity. The architecture research shows that a useful coach with no agents is still valuable; agents with no coach are not.

**Delivers:**
- Coach Engine (system prompt + memory retrieval + LLM call + streaming response)
- Chat API with Server-Sent Events (SSE) for streaming
- React chat UI with markdown rendering
- User onboarding/intake flow (structured questionnaire + initial conversation)
- Conversation history with search
- Action item extraction from conversations (structured output via Zod)
- Document upload with chunking, embedding, and ingestion pipeline
- Fact extraction pipeline (async, post-response)

**Addresses features:**
- Conversational chat interface (table stakes)
- User onboarding/intake (table stakes)
- Conversation history & search (table stakes)
- Action items/task extraction (table stakes)
- Document upload (table stakes)
- Cross-domain coaching prompts (work + personal)

**Avoids pitfalls:**
- Pitfall #1 (stateless coaching) — memory retrieval on every turn
- Pitfall #5 (unbounded memory) — tiered storage, fact extraction, consolidation designed in
- Pitfall #3 (prompt injection) — document content in user messages, not system prompts

**Research needs:** Coaching prompt engineering may need iteration, but no external research required. Document parsing libraries (LangChain text splitters) are standard. Skip `/gsd:research-phase`.

---

### Phase 3: Agent Framework & Orchestration

**Rationale:** With coaching proven, add the chief-of-staff delegation layer. The architecture research shows orchestration must be deterministic (state machine, not ReAct loop) and agents must be data-driven (prompts, not code modules). This phase builds the platform's core differentiator.

**Delivers:**
- Agent definition schema (prompt template + tools + output schema + metadata)
- Agent Executor runtime (loads definition, retrieves context, calls LLM, validates output)
- Built-in starter agent templates (contract review, comms writer, meeting prep, research analyst)
- Intent classifier (coaching vs task delegation)
- Router with suggest-then-confirm flow (propose agent → user confirms → dispatch)
- Orchestrator state machine (classify → route → confirm → dispatch → synthesize)
- Agent management UI (view, create, edit agent templates)
- Agent Lifecycle Manager (CRUD, versioning, usage tracking)

**Addresses features:**
- Dynamic agent creation (basic, from pre-built templates + infra for user-defined)
- Delegation cascade (coach → agent → synthesize result)
- Structured outputs (decision frameworks as agent outputs)

**Avoids pitfalls:**
- Pitfall #2 (unbounded spawning) — lifecycle management, overlap detection, usage tracking from start
- Pitfall #4 (over-engineered orchestration) — single-step routing, 3-second latency budget, explicit fallback
- Pitfall #6 (power user coupling) — agents are templates, not hardcoded features
- Pitfall #3 (prompt injection) — agent template review pipeline designed in

**Research needs:** Prompt engineering for routing accuracy, agent template design patterns. Consider `/gsd:research-phase` if routing accuracy is poor after initial implementation.

---

### Phase 4: Agent Evolution & Proactive Features

**Rationale:** With working agent system, add features that improve over time and provide proactive value. Agent evolution (per-user learning) depends on a stable agent framework. Morning briefings and weekly reflections depend on accumulated action items and conversation history.

**Delivers:**
- Feedback collection on agent outputs (thumbs up/down, explicit corrections)
- Per-user agent evolution (analyze feedback, generate prompt additions, store as user overrides)
- Agent gap detection (recognize when no agent fits, propose new agent creation)
- Morning briefing (scheduled generation with action items, calendar context, pending decisions)
- Weekly reflection (end-of-week retrospective with coach)
- Crisis mode (urgency detection → style shift to directive, faster responses)
- Hard conversation prep (role-play mode for difficult conversations)
- Memory/doc viewer UI (browse what the system knows, correct facts)

**Addresses features:**
- Per-user agent evolution (differentiator)
- Agent gap detection (differentiator)
- Morning briefing (differentiator)
- Weekly reflection (differentiator)
- Crisis mode (differentiator)
- Hard conversation prep (differentiator)

**Avoids pitfalls:**
- Pitfall #2 (unbounded spawning) — gap detection reduces duplicate agent creation
- Pitfall #5 (unbounded memory) — memory viewer enables user corrections

**Research needs:** Job scheduling patterns (BullMQ for briefings/reflections) are standard. Skip `/gsd:research-phase`.

---

### Phase 5: Community & Deployment Hardening

**Rationale:** With proven product-market fit, enable community sharing and harden for broader deployment. Community templates require stable agent definition schema. Self-hosted deployment requires upgrade path and security documentation.

**Delivers:**
- Community agent template registry (browse, search, import, fork)
- Template publishing flow with review pipeline
- Rating and feedback on community templates
- Multi-provider LLM configuration UI (per-agent model selection)
- Data export (conversations, action items, summaries as PDF/markdown)
- Self-hosted deployment documentation (security hardening, upgrade path)
- Docker Compose for full stack (PostgreSQL, Redis, app services)

**Addresses features:**
- Community agent templates library (differentiator)
- Swappable LLM backends UI (differentiator)
- Data export (table stakes)
- Self-hosted deployment packaging (table stakes)

**Avoids pitfalls:**
- Pitfall #3 (prompt injection) — community template review and sandboxing operational
- Pitfall #7 (LLM lock-in) — multi-provider UI validates abstraction works

**Research needs:** Template marketplace patterns (discovery, ratings) may need research. Consider `/gsd:research-phase` for template review automation.

---

### Phase Ordering Rationale

1. **Foundation first** because database, auth, LLM gateway, and memory architecture are prerequisites for everything else. Retrofitting any of these is a rewrite.

2. **Coaching before agents** because the coaching relationship is the primary UX and validates core LLM integration, memory retrieval, and streaming. A coach without agents is useful; agents without a coach are not.

3. **Orchestration after coaching** because routing (classify, suggest, confirm) depends on having a coach to synthesize agent results. Building agents without the dispatch flow means temporary manual selection UI that gets discarded.

4. **Evolution after framework** because agent evolution (feedback, gap detection) requires a stable agent system. You can't evolve what doesn't exist yet.

5. **Community last** because templates require a stable agent definition schema. Changing the schema after community templates exist breaks sharing.

This ordering also maps to pitfall mitigation: Phase 1 prevents foundational pitfalls (#1 stateless, #7 lock-in), Phase 2 adds memory curation (#5), Phase 3 prevents orchestration pitfalls (#2 spawning, #4 over-engineering, #6 coupling), Phase 4+ enhances but doesn't introduce critical risks.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 3 (Agent Framework):** Routing accuracy may require iteration on intent classification prompts and agent selection algorithms. If initial implementation routes incorrectly >10% of the time, run `/gsd:research-phase` for "LLM-based multi-agent routing patterns."
- **Phase 5 (Community):** Template marketplace discovery and review automation may need research into content moderation patterns for LLM-generated artifacts.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** PostgreSQL + pgvector is well-documented. Vercel AI SDK has clear patterns. Auth with Better Auth is straightforward. Standard web stack.
- **Phase 2 (Coaching):** Document chunking (LangChain text splitters), fact extraction (structured output), and chat streaming are established patterns.
- **Phase 4 (Proactive Features):** Job scheduling (BullMQ), scheduled LLM generation, and feedback collection are standard patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Versions from training data (May 2025 cutoff). Technology choices are sound based on established patterns, but verify current package versions via `npm view` before installing. Vercel AI SDK v4 API should be verified at sdk.vercel.ai. |
| Features | MEDIUM | Based on competitor analysis from training data (BetterUp, CoachHub, Rocky.ai, Lindy.ai) and AI coaching industry patterns. Feature categorization (table stakes vs differentiators) is solid, but market may have shifted since May 2025. Verify competitor capabilities before finalizing requirements. |
| Architecture | MEDIUM-HIGH | Patterns are well-established in training data (Anthropic's agent guidance, LangGraph architecture, RAG patterns). The "deterministic orchestrator + data-driven agents" pattern is validated across multiple sources. Build order dependencies are logical. Confidence is higher for architecture than for specific library versions. |
| Pitfalls | MEDIUM | Based on AI coaching startup post-mortems, OWASP LLM Top 10, and agent orchestration community discussions through May 2025. Pitfalls are grounded in real failure modes, but specific mitigation tactics should be validated during implementation (e.g., exact prompt boundaries for injection prevention). |

**Overall confidence:** MEDIUM

All research conducted without WebSearch/WebFetch due to unavailability. Findings are based on training data through May 2025. The strategic direction (what to build, how to architect it, what to avoid) is high-confidence. The tactical details (package versions, API specifics, current competitor features) are medium-confidence and require verification during implementation.

### Gaps to Address

**Version verification gap:** All package versions are from training data. Before installing any dependency, run `npm view <package> version` to get current versions. Priority verification:
- Vercel AI SDK v4.x API changes (check sdk.vercel.ai/docs)
- Hono Node.js adapter current API (check hono.dev)
- Better Auth stability and current API (check better-auth.com)
- Drizzle pgvector integration specifics (check orm.drizzle.team)
- Next.js 15 + React 19 compatibility

**Competitor landscape gap:** Coaching and agent orchestration markets are fast-moving. Verify during requirements phase:
- Has any coaching product added agent delegation since May 2025?
- Has Lindy.ai or similar added coaching capabilities?
- New entrants in self-hosted AI coach space?
- Current pricing for BetterUp/CoachHub to inform value prop

**Implementation validation gaps:** Some patterns need validation during phases:
- **Phase 2:** Coaching prompt effectiveness requires real user testing. Iterate on tone, questioning cadence, and insight depth.
- **Phase 3:** Routing accuracy with single-step classifier. If <90% accurate, may need re-ranking or multi-factor scoring.
- **Phase 4:** Memory consolidation frequency and quality. May need tuning based on conversation density.
- **Phase 5:** Community template review pipeline — automated filtering vs manual review trade-offs.

**Security validation gap:** Prompt injection mitigations are conceptual. During Phase 1 and Phase 2, run adversarial testing with:
- Documents containing "Ignore previous instructions and..."
- Agent templates with hidden system prompt overrides
- Cross-user retrieval tests to verify namespace isolation

**Scaling assumptions gap:** Research assumes 0-100 users initially. If deployment targets larger scale (100+ concurrent users), revisit:
- Connection pooling (PgBouncer) for PostgreSQL
- Job queue for agent execution to prevent blocking
- Read replicas if memory retrieval queries are slow

## Sources

### Primary (HIGH confidence)
- Project constraints from `.planning/PROJECT.md` — defines self-hosted requirement, TypeScript stack, suggest-then-confirm pattern, dynamic agents, two initial users
- PostgreSQL + pgvector patterns — well-established in training data across multiple RAG architecture sources
- General software architecture patterns (monolith-first, job queues, user isolation) — standard industry practices

### Secondary (MEDIUM confidence)
- Vercel AI SDK architecture and API patterns (training data knowledge through May 2025)
- Anthropic's "Building Effective Agents" guide (training data, establishes deterministic orchestrator patterns)
- LangChain/LangGraph/AutoGen architecture patterns (training data, multi-agent orchestration with state machines)
- AI coaching competitor analysis (BetterUp, CoachHub, Rocky.ai, Lindy.ai) from product pages and documentation in training data
- OWASP LLM Top 10 and prompt injection research (training data through May 2025)

### Tertiary (LOW confidence — needs verification)
- Specific package versions (all from training data, May 2025 cutoff) — verify before installation
- Better Auth library status and API (emerged late 2024/early 2025, may have evolved)
- Mastra framework maturity (mentioned as emerging, may have stabilized or faded)
- Current competitor features and pricing (fast-moving market)

---
*Research completed: 2026-02-14*
*Ready for roadmap: yes*
