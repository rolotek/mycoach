# Pitfalls Research

**Domain:** AI executive coaching + agent orchestration platform
**Researched:** 2026-02-14
**Confidence:** MEDIUM (training data through May 2025; no live web verification available)

## Critical Pitfalls

### Pitfall 1: Treating Coaching as Stateless Q&A

**What goes wrong:**
The system responds to each user message as an isolated query rather than maintaining a coherent, evolving model of the user. The coach gives contradictory advice across sessions, forgets stated goals, re-asks questions the user already answered, or fails to connect patterns across work and personal domains. Users lose trust within 2-3 sessions.

**Why it happens:**
LLM context windows are finite. Teams stuff recent chat history into the prompt and call it "memory." This works for demos but fails in production because: (a) important context from 3 weeks ago scrolls out of the window, (b) the user's evolving goals and circumstances aren't distilled into a persistent user model, and (c) no mechanism exists to surface the *right* historical context for the current conversation.

**How to avoid:**
- Build a structured user model (profile, goals, values, key relationships, recurring themes) that persists across sessions and is updated after every conversation
- Implement retrieval-augmented memory: embed conversation summaries and key facts, retrieve relevant context per-turn using semantic search
- Separate "what the user told me" (facts) from "what I inferred" (hypotheses) in the memory store — never present inferences as stated facts
- Design explicit onboarding to front-load the user model with high-signal information
- Test with multi-week simulated user journeys, not single-session demos

**Warning signs:**
- User says "I already told you that"
- Coach contradicts its own prior advice
- Advice feels generic rather than personalized after 3+ sessions
- No mechanism to query or display what the system "knows" about the user

**Phase to address:**
Phase 1 (Foundation) — The memory architecture must be designed before the coaching UX. Retrofitting memory onto a stateless chat system is a rewrite.

---

### Pitfall 2: Unbounded Agent Spawning Without Governance

**What goes wrong:**
The system creates specialist agents dynamically based on user needs, but without guardrails on agent proliferation, capability overlap, resource consumption, or quality. Users end up with dozens of near-duplicate agents. Agents hallucinate capabilities they don't have. The system becomes unpredictable and expensive.

**Why it happens:**
Dynamic agent creation is the product's differentiator, so teams optimize for making it easy to spawn agents without building the governance layer. Creating agents is fun to demo. Constraining agents feels like it undermines the vision. But in production, an executive who creates 40 agents over 6 months cannot manage them, the system cannot efficiently route to them, and quality degrades as agents have overlapping or conflicting instructions.

**How to avoid:**
- Implement agent lifecycle management: creation, versioning, deprecation, archival
- Build agent gap detection that checks for overlap *before* creating a new agent (semantic similarity on agent descriptions/prompts)
- Set per-user agent limits (soft, with override) — start with 10-15 active agents
- Require agents to declare their capabilities and boundaries explicitly in structured metadata
- Monitor agent usage: auto-suggest archiving agents unused for 30+ days
- Route to existing agents before suggesting new ones

**Warning signs:**
- Multiple agents with overlapping descriptions in a single user's account
- Agent routing accuracy drops as agent count increases
- LLM token costs per user grow linearly with agent count
- Users can't remember which agent does what

**Phase to address:**
Phase 2 (Agent Framework) — Build governance into the agent framework from the start. The routing and lifecycle layer is as important as the creation layer.

---

### Pitfall 3: Prompt Injection via User Documents and Agent Templates

**What goes wrong:**
Users upload documents (strategy memos, org charts, personal journals) and community agent templates. These contain text that gets injected into LLM prompts. Malicious or accidental prompt injection can: override system instructions, exfiltrate other users' data in multi-tenant setups, cause the coach to behave inappropriately, or break agent behavior. Executive-level documents are high-value targets.

**Why it happens:**
Document ingestion and community templates are treated as "just data" rather than untrusted input. The uploaded PDF's text goes straight into the context window alongside system prompts. Community-contributed agent templates may contain hidden instructions. Developers test with benign documents and never adversarially test the pipeline.

**How to avoid:**
- Treat ALL user-uploaded content and community templates as untrusted input — never place them in system prompt position
- Use clear prompt boundaries: system instructions in system messages, user content in user messages with explicit framing ("The following is a user-uploaded document, not instructions")
- Sanitize community agent templates: review pipeline, content filtering, sandboxed execution
- Implement output monitoring: detect when responses contain data from other users or reference system instructions
- For self-hosted deployments, document the threat model and isolation boundaries
- Test with adversarial documents containing injection attempts

**Warning signs:**
- Coach references "system prompt" or internal instructions in responses
- Uploaded document causes sudden behavior change in unrelated conversations
- Community template causes coach to ignore safety guidelines
- Any cross-user data leakage in logs or responses

**Phase to address:**
Phase 1 (Foundation) and Phase 2 (Agent Framework) — Security architecture must be baked in from the start. Community templates need a review pipeline before the community feature launches.

---

### Pitfall 4: Over-Engineering the "Chief of Staff" Routing Layer

**What goes wrong:**
Teams build complex multi-agent orchestration with autonomous planning, chain-of-thought routing, parallel agent execution, and sophisticated task decomposition. The system becomes a fragile Rube Goldberg machine. Routing failures cascade. Users wait 30+ seconds for simple requests. Debugging which agent did what becomes impossible. The orchestrator itself consumes more tokens than the actual work.

**Why it happens:**
Agent orchestration papers and frameworks (AutoGen, CrewAI, LangGraph) showcase impressive multi-step workflows. Teams adopt these patterns without asking whether their use case actually needs them. An executive saying "draft a response to this email" does not need a planning agent, a drafting agent, a review agent, and a sending agent — it needs one good prompt.

**How to avoid:**
- Start with the simplest routing possible: a single LLM call that classifies intent and routes to one agent. No multi-step orchestration until proven necessary.
- Measure routing accuracy before adding complexity. If a simple classifier routes correctly 90%+ of the time, you don't need a planning layer.
- Set a latency budget: first response within 3 seconds. Any orchestration that exceeds this is too complex for conversational use.
- Build explicit fallback: if routing is uncertain, ask the user rather than guessing
- Log every routing decision with rationale — essential for debugging and improvement

**Warning signs:**
- Average response latency exceeds 5 seconds for routine requests
- More than 3 LLM calls needed to handle a single user message
- Debugging requires reading logs from 4+ agents to understand one response
- The orchestrator prompt is longer than the specialist agent prompts
- Users rephrase requests because the system misrouted the first attempt

**Phase to address:**
Phase 2 (Agent Framework) — Start simple. Add orchestration complexity only when measured routing accuracy demands it. Resist the temptation to build the "cool" architecture upfront.

---

### Pitfall 5: Memory That Grows Without Bounds or Curation

**What goes wrong:**
The system stores everything — every conversation turn, every uploaded document chunk, every extracted fact — into vector storage without curation, deduplication, or decay. After 6 months of daily use, retrieval quality degrades because relevant signals are buried in noise. The user model becomes self-contradictory (stores "user wants to leave their job" and "user loves their job" from different emotional states). Costs scale linearly with usage.

**Why it happens:**
"Store everything, retrieve what's relevant" is the naive approach to persistent memory. It avoids the hard problem: deciding what matters, resolving contradictions, and modeling how the user's situation evolves over time. RAG tutorials demonstrate embedding and retrieval but skip the curation layer.

**How to avoid:**
- Implement tiered memory: working memory (current session), short-term (recent sessions, high detail), long-term (distilled facts, goals, patterns)
- Build a contradiction resolution mechanism: when new information conflicts with stored facts, update the fact store rather than storing both
- Implement memory decay: reduce retrieval weight of older, un-reinforced memories
- Cap memory per user with intelligent eviction (least relevant, not just oldest)
- Periodically run a "memory consolidation" process that distills conversation history into updated user model facts
- Give users visibility into their stored memory and ability to correct it

**Warning signs:**
- Retrieval quality degrades after 3+ months of use
- System cites outdated facts that the user has since corrected
- Vector store size grows unboundedly per user
- Coach gives advice based on moods/statements from months ago that no longer apply

**Phase to address:**
Phase 1 (Foundation) — Design the tiered memory architecture before implementing any coaching features. Phase 3+ for memory consolidation and user-facing memory management.

---

### Pitfall 6: Building for Two Power Users Instead of a Product

**What goes wrong:**
With two initial power users (tech manager and legal executive), the system gets hyper-customized to their specific workflows, terminology, and needs. The architecture bakes in assumptions specific to these users. When user #3 arrives (different role, different needs), the system requires significant rework. The product becomes two bespoke tools rather than a platform.

**Why it happens:**
Tight feedback loops with real users is generally good practice. But with only 2 users, every feature request feels essential. The tech manager needs Jira integration; the legal executive needs document review workflows. Both get built as first-class features rather than through the extensible agent framework. The distinction between "platform capability" and "user-specific customization" blurs.

**How to avoid:**
- Maintain a strict separation: platform capabilities (memory, routing, agent creation) vs. user-specific agent configurations (Jira agent, legal review agent)
- For every feature request from power users, ask: "Is this a platform capability or an agent template?" If it's the latter, it should be built using the agent framework, not hardcoded.
- Design for a hypothetical third user persona (e.g., startup founder, medical professional) and verify the architecture accommodates them without code changes
- Resist building domain-specific features (legal terminology, engineering workflows) into the core — these belong in agent templates

**Warning signs:**
- Core codebase contains role-specific logic (if user.role === "legal")
- Agent framework can't express what the power users need, so features get built outside it
- New user onboarding requires developer involvement to configure the system
- Power users' feature requests bypass the agent framework

**Phase to address:**
Phase 2 (Agent Framework) — The agent framework must be expressive enough that power user needs are met through agent configuration, not platform code changes.

---

### Pitfall 7: LLM Provider Lock-in Despite "Swappable Backends"

**What goes wrong:**
The system is designed with "swappable LLM backends" as a feature, but in practice deeply couples to one provider's specific behaviors: relying on OpenAI function calling format, depending on Claude's system prompt handling, using provider-specific token counting, building around one model's specific context window size. The "swap" requires months of rework.

**Why it happens:**
Every LLM provider has a different API shape, different strengths, different prompt formatting requirements, and different behavior quirks. Building a true abstraction layer requires: (a) normalizing the API interface, (b) testing with multiple providers continuously, and (c) avoiding reliance on provider-specific features. Teams claim swappability but only ever test with one provider.

**How to avoid:**
- Define an internal LLM interface that covers: chat completion, structured output, embedding, and streaming. All provider-specific code lives behind this interface.
- Test with at least 2 providers from day 1 (e.g., Claude + an open-source model via Ollama for self-hosted)
- Avoid provider-specific features in core logic (e.g., don't use OpenAI's Assistants API as your agent framework)
- Store prompts in provider-agnostic format; translate to provider-specific format at the adapter layer
- Build prompt regression tests that run against multiple providers

**Warning signs:**
- Codebase imports a specific provider's SDK directly (rather than through an abstraction)
- Prompts contain provider-specific formatting (e.g., XML tags that only Claude handles well)
- No CI test runs against alternative providers
- Context window sizes are hardcoded rather than configured per-provider

**Phase to address:**
Phase 1 (Foundation) — The LLM abstraction layer is foundational. If you defer it, every subsequent feature couples to the initial provider.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing raw conversation history instead of structured memory | Fast to implement, no data modeling needed | Retrieval quality degrades, storage costs balloon, can't query user model programmatically | MVP only — must migrate to structured memory before beta users |
| Single global system prompt for coaching | Simple, easy to iterate on coaching behavior | Can't personalize coaching style per user, prompt becomes unwieldy as features grow | First 2 weeks of prototyping only |
| Hardcoding agent definitions instead of storing in DB | No need for agent CRUD UI, fast iteration | Can't support dynamic agents, community templates, or per-user customization | Never — this contradicts the core product vision |
| Skipping conversation summarization | Lower latency (no summarization step) | Context window fills quickly, old context lost, costs increase as full history is stuffed in | Acceptable for sessions under 20 messages; summarization needed for longer |
| Embedding entire documents as single chunks | Simple ingestion pipeline | Poor retrieval precision, lost document structure, chunk boundaries split sentences | Never for production — chunking strategy matters from day 1 |
| Using local file storage for user data | No database setup needed | Can't scale, no ACID guarantees, no backup/restore, no multi-instance deployment | Local development only |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| LLM API (OpenAI, Anthropic, etc.) | No retry logic or rate limiting — app crashes on 429/500 errors | Implement exponential backoff with jitter, request queuing, graceful degradation to cached responses when API is down |
| Vector database (Pinecone, Chroma, etc.) | Choosing embedding model without testing retrieval quality on domain-specific content (coaching conversations are nuanced, not keyword-heavy) | Benchmark 2-3 embedding models on actual coaching conversation snippets before committing. Test with executive jargon, emotional language, and ambiguous queries |
| Document parsing (PDFs, DOCX) | Assuming clean text extraction — executive documents have tables, charts, headers/footers, watermarks that produce garbage text | Use a robust parsing pipeline (e.g., unstructured.io or docling), validate output quality on real executive documents, implement quality checks on extracted text |
| Authentication/SSO | Building custom auth for "self-hosted simplicity" | Use a proven auth library (Passport.js, next-auth). Executive users expect SSO. Custom auth is a security liability. |
| Calendar/email integrations | Building deep integrations early because "chief of staff needs access" | Defer integrations until the agent framework is stable. Build them as agent capabilities, not platform features. Start with manual input. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading full conversation history into every LLM call | Response latency increases linearly with conversation length; costs spike for active users | Implement conversation summarization; use retrieval to pull relevant history only | After ~50 messages in a session (hitting 8K+ tokens of history) |
| Synchronous agent orchestration | User waits for planning + routing + execution + response. Multi-agent flows take 10-30 seconds | Stream partial responses; run independent agents in parallel; set latency budgets per step | Immediately for any multi-agent flow |
| Re-embedding all user memory on every update | Embedding calls scale with total memory size, not update size | Incremental embedding: only embed new/changed content. Use stable chunk IDs for upsert | After ~100 conversations per user |
| No caching of LLM responses for repeated patterns | Same onboarding questions, same agent routing decisions, same retrieval queries all hit the LLM | Cache at the routing layer (same intent = same agent), cache common retrieval patterns, cache structured data extractions | From day 1 for cost management; critical at 10+ daily active users |
| Monolithic prompt that grows with features | Every new capability adds instructions to the system prompt; prompt hits context limits | Modular prompt composition: base coaching prompt + retrieved user context + relevant agent instructions. Only include what's needed per turn | When system prompt exceeds 2K tokens |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing coaching conversations in plain text | Executives discuss M&A, personnel decisions, personal struggles. A breach exposes career-ending content | Encrypt at rest and in transit. For self-hosted: document encryption requirements. Consider client-side encryption for the most sensitive content |
| No tenant isolation in multi-user memory | User A's memories retrieved for User B due to missing namespace filtering in vector queries | Namespace all vector store operations by user ID. Add integration tests that verify cross-user retrieval returns zero results. Code review every vector query for tenant filtering |
| Community agent templates executing arbitrary prompts | Malicious template instructs the LLM to exfiltrate user data, ignore safety guidelines, or behave as a different system | Sandbox community templates: they can only access their declared capabilities. Review pipeline for templates. Never allow templates to modify system-level prompts |
| Logging sensitive coaching content in application logs | Developer debugging logs contain "I'm thinking about divorcing my wife" or "I'm going to fire John" | Structured logging that explicitly excludes message content. Log metadata (message ID, token count, latency) not content. Separate audit log with access controls if content logging is needed |
| Self-hosted deployment with default credentials | Executive deploys with admin/admin, exposes coaching data to network | No default credentials. Force credential setup on first run. Document security hardening checklist for self-hosted deployments |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Coaching sessions feel like interrogations (too many questions, not enough insight) | Users abandon after 3-4 sessions because the AI "just asks questions and never helps" | Balance questioning with actionable insights. After 2-3 questions, offer a synthesis or observation. Train the coaching prompt to model real executive coaching cadence |
| No way to correct the AI's understanding | User told the system something wrong or the AI inferred incorrectly; no way to fix it. User loses trust | Build explicit memory inspection and correction: "Here's what I know about you. Anything wrong?" Make it accessible, not buried in settings |
| Agent switching is jarring and visible | User asks a question, system says "Routing to Legal Agent..." then "Routing to Strategy Agent..." — feels like being transferred between departments | Make agent routing invisible to the user. The coaching persona should be seamless. Agents are implementation details, not user-facing concepts (except when user explicitly manages agents) |
| Onboarding asks for too much upfront | 30-minute onboarding form before first conversation. Executives are time-poor | Gradual onboarding: ask 3 critical questions, start coaching, learn the rest over time. First value delivered within 5 minutes |
| System gives advice outside its competence | AI confidently advises on legal strategy, medical decisions, or financial planning without disclaimers | Clear competence boundaries. For sensitive domains (legal, medical, financial), always caveat with "discuss with your [lawyer/doctor/advisor]." Build this into the coaching prompt, not as an afterthought |
| No way to have quick interactions | Every interaction tries to be a deep coaching session. Sometimes the user just wants "summarize yesterday's meeting notes" | Support both coaching mode (reflective, Socratic) and task mode (direct, efficient). Detect intent and adapt response style |

## "Looks Done But Isn't" Checklist

- [ ] **Conversation memory:** Often missing contradiction resolution — verify that updating a fact (e.g., "I changed jobs") doesn't leave stale facts retrievable
- [ ] **Agent routing:** Often missing graceful failure — verify what happens when no agent matches (should fall back to coach, not error)
- [ ] **Document upload:** Often missing format validation — verify behavior with corrupted PDFs, password-protected files, 500-page documents, and non-English text
- [ ] **Multi-user isolation:** Often missing vector store namespacing — verify with a test that queries User A's namespace and confirms zero results from User B
- [ ] **Onboarding flow:** Often missing resumability — verify that a user who quits mid-onboarding can resume, not restart
- [ ] **Agent templates:** Often missing versioning — verify that updating a template doesn't break existing users' customized versions
- [ ] **Structured output:** Often missing validation — verify that LLM-generated structured output is validated against schema before use (LLMs produce invalid JSON/schemas regularly)
- [ ] **Streaming responses:** Often missing error handling — verify behavior when the LLM stream disconnects mid-response
- [ ] **Self-hosted deployment:** Often missing upgrade path — verify that users can upgrade to new versions without losing their data
- [ ] **Swappable LLM backend:** Often missing prompt adaptation — verify that switching providers doesn't degrade coaching quality (different models respond differently to same prompts)

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stateless coaching (no persistent memory) | HIGH | Requires building memory architecture, migrating existing conversations into structured memory, re-onboarding users. 2-4 week effort. |
| Unbounded agent spawning | MEDIUM | Add governance layer, run deduplication on existing agents, notify users of cleanup. 1-2 week effort. |
| Prompt injection vulnerability | HIGH | Audit all injection surfaces, restructure prompt composition, add monitoring. Potential data breach remediation. 2-3 week effort + incident response if exploited. |
| Over-engineered orchestration | MEDIUM | Simplify routing to single-step classifier, remove unused orchestration layers, benchmark latency improvement. 1-2 week effort. |
| Unbounded memory growth | MEDIUM | Build consolidation pipeline, run one-time cleanup, implement tiered storage. 2-3 week effort. Users may notice changed behavior. |
| Power user coupling | HIGH | Refactor hardcoded features into agent templates, extract platform abstractions. 3-4 week effort depending on coupling depth. |
| LLM provider lock-in | HIGH | Build abstraction layer, port all prompts, test with new provider, fix regressions. 3-6 week effort depending on coupling. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Stateless coaching | Phase 1 (Foundation) | After Phase 1: multi-session test shows coach correctly references user facts from prior sessions |
| Unbounded agent spawning | Phase 2 (Agent Framework) | After Phase 2: agent creation checks for overlap, enforces limits, tracks usage |
| Prompt injection | Phase 1 (Foundation) + Phase 2 (Agent Framework) | After each phase: adversarial testing with injection payloads in documents and templates |
| Over-engineered orchestration | Phase 2 (Agent Framework) | After Phase 2: average response latency under 3 seconds for single-agent tasks |
| Unbounded memory growth | Phase 1 (Foundation) | After Phase 1: memory consolidation runs after every session; tiered storage in place |
| Power user coupling | Phase 2 (Agent Framework) | After Phase 2: third persona test — hypothetical user can be configured without code changes |
| LLM provider lock-in | Phase 1 (Foundation) | After Phase 1: integration tests pass against 2 providers (e.g., Claude + Ollama) |
| Coaching UX (interrogation mode) | Phase 3 (Coaching UX) | After Phase 3: user testing with real executives shows value delivered in first session |
| Data security gaps | Phase 1 (Foundation) | After Phase 1: encryption at rest verified, tenant isolation integration tested, logging audited |
| Community template risks | Phase 4+ (Community) | Before launch: template review pipeline operational, sandbox testing complete |

## Sources

- Training data knowledge (Anthropic's "Building Effective Agents" publication, 2024)
- Training data knowledge (LangChain, LangGraph, CrewAI, AutoGen documentation and community discussions through May 2025)
- Training data knowledge (AI coaching startup post-mortems and product teardowns through May 2025)
- Training data knowledge (OWASP LLM Top 10, prompt injection research through May 2025)
- Training data knowledge (Executive coaching domain practices and digital coaching platform patterns)

**Note:** WebSearch and WebFetch were unavailable during this research session. All findings are based on training data through May 2025. Confidence is MEDIUM overall. Recommend validating specific technical claims (especially around library capabilities and API behaviors) against current documentation before implementation.

---
*Pitfalls research for: AI executive coaching + agent orchestration platform*
*Researched: 2026-02-14*
