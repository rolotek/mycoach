# Feature Research

**Domain:** AI Executive Coach + Chief-of-Staff Agent Orchestration Platform
**Researched:** 2026-02-14
**Confidence:** MEDIUM (based on training data through May 2025; web verification unavailable)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Conversational chat interface | Every AI product has this; it's the primary interaction model | MEDIUM | Must feel snappy (<2s first token). Streaming responses essential. Markdown rendering for structured output. |
| Persistent conversation memory | Users expect the coach to remember past conversations, preferences, and context. Products like ChatGPT, Pi, and Replika all do this. | HIGH | Requires vector store + summarization pipeline. Key differentiator in quality but table stakes in existence. |
| User onboarding / intake | Coaching products (BetterUp, CoachHub, Rocky.ai) all start with assessment. Users expect the system to learn who they are. | MEDIUM | Structured intake questionnaire + freeform conversation hybrid. Must populate the user profile that drives personalization. |
| Conversation history & search | Users expect to find past conversations. Standard in ChatGPT, Gemini, Claude. | LOW | Simple list + full-text search. Low effort, high annoyance if missing. |
| Action items / task extraction | Coach conversations without follow-up feel hollow. BetterUp, CoachHub, and every productivity AI extract tasks. | MEDIUM | LLM-based extraction from conversation. Needs structured output parsing. |
| Multi-turn context within session | Users expect coherent multi-turn dialogue without repeating themselves. | LOW | Standard LLM behavior with proper context window management. |
| Authentication & isolated accounts | Multi-user requirement. Executive-level content demands strong isolation. | MEDIUM | Auth (OAuth2 / passkey), row-level security or tenant isolation in DB. |
| Basic document upload | Users expect to share documents for context (strategy docs, org charts, contracts). Competitor products (Notion AI, ChatGPT) all support this. | MEDIUM | PDF, DOCX, TXT parsing. Chunk + embed into vector store. Size limits needed. |
| Mobile-responsive or native access | Executives are mobile-heavy. Even desktop-first, responsive layout is expected. | LOW | CSS responsive design. Not a native app, but must not break on phone. |
| Data export | Executives and their EAs expect to extract value (summaries, notes, action items) into their existing workflows. | LOW | Export conversations, action items, summaries as PDF/markdown/email. |
| Secure data handling (encryption at rest + in transit) | Executive-level sensitive content. Non-negotiable for the target persona. | MEDIUM | TLS, encrypted DB, no plaintext secrets. Self-hosted helps here. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Dynamic agent creation from prompts** | No competitor offers user-created specialist agents from natural language. CrewAI/AutoGen require code. This is MyCoach's core innovation. | HIGH | Agent = system prompt + tool access + memory scope. Needs prompt engineering UI, agent testing, versioning. |
| **Agent gap detection** | System proactively proposes new agents when user needs fall outside existing coverage. No competitor does this. | HIGH | Requires intent classification across all agents, confidence scoring, and a "suggest new agent" workflow. Depends on: dynamic agent creation. |
| **Community agent templates library** | Marketplace-style sharing of agent configurations. Closest analog is GPT Store, but scoped to coaching/chief-of-staff domain. | MEDIUM | Template schema, publishing flow, rating/review, import/fork. Depends on: dynamic agent creation. |
| **Delegation cascade** | User tells coach "handle this" and coach routes to appropriate specialist agent(s), chains results, and reports back. This is the chief-of-staff pattern no pure coaching product offers. | HIGH | Requires agent registry, task decomposition, routing logic, result aggregation, human-in-the-loop checkpoints. |
| **Cross-domain coaching (work + personal)** | Most AI coaches focus on one domain (leadership OR wellness OR finance). Spanning all with coherent context is rare. BetterUp is work-only. Noom is health-only. | MEDIUM | Unified user profile with domain-tagged memory. Coach prompt must handle domain switching gracefully. |
| **Morning briefing / daily digest** | Proactive push of relevant info (calendar, pending decisions, action items, market news). Executive assistants do this; AI products rarely do. | MEDIUM | Requires calendar integration, task store, and scheduled generation. Push notification or email delivery. |
| **Decision frameworks as structured output** | Not just chat -- generates structured decision matrices, pro/con analyses, RACI charts, stakeholder maps. | MEDIUM | Structured output schemas (JSON) rendered as interactive components. LLM function calling or structured generation. |
| **Swappable LLM backends** | Avoid vendor lock-in. Use Claude for coaching, GPT-4 for code review agent, local Llama for privacy-sensitive content. No coaching product offers this. | HIGH | Abstraction layer over multiple LLM APIs. Per-agent backend configuration. Prompt format translation. |
| **Self-hosted deployment** | Privacy guarantee competitors cannot match. Executive content never leaves org infrastructure. | HIGH | Docker/K8s packaging, setup automation, upgrade path. Ongoing maintenance burden on user (or managed service tier later). |
| **Persistent memory with continuous learning** | Beyond simple RAG -- the system learns user preferences, communication style, organizational context over time. Evolves per-user. | HIGH | Layered memory: facts, preferences, relationships, patterns. Periodic consolidation. Conflict resolution when facts change. |
| **Weekly reflection / retrospective** | Structured end-of-week review with the coach. Common in human coaching (BetterUp does this with humans). Rare in AI coaching. | LOW | Scheduled prompt with context from the week's conversations and action items. Low complexity, high perceived value. |
| **Crisis mode** | Detect urgency signals and shift coaching style: faster responses, more directive, escalation options. No AI coach does this well. | MEDIUM | Sentiment/urgency classification on user input. Mode switch in system prompt. Optional notification escalation. |
| **Hard conversation prep** | Rehearsal mode for difficult conversations (firing, board presentations, conflict resolution). Simulate the other party. | MEDIUM | Role-play mode with persona switching. Feedback on communication style. Script generation. |
| **Per-user agent evolution** | Agents improve based on individual user feedback and usage patterns. Agent prompts drift per-user over time. | HIGH | Feedback collection, prompt mutation, A/B testing per user, rollback capability. Depends on: dynamic agent creation. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-time voice conversation** | "I want to talk to my coach like a person" | Massive complexity (STT + TTS + streaming + interruption handling), latency issues, cost per session, accessibility problems. Not core to the value prop which is structured output and delegation. | Text-first with optional voice input (transcription). Voice output as a v2+ feature once core is proven. |
| **Full calendar/email management** | "My chief of staff should manage my calendar" | Deep integration with Google/Microsoft APIs is brittle, permission-heavy, and creates massive liability. Calendar conflicts, double-bookings, embarrassing auto-replies. | Read-only calendar integration for context. Suggest scheduling actions but require human confirmation. Never auto-send emails. |
| **Autonomous agent execution (no human in loop)** | "Just handle it end to end" | Agents making unsupervised decisions with executive-level stakes is dangerous. One bad email, one wrong contract clause, one leaked strategy doc. | Human-in-the-loop by default. "Draft and present for approval" not "do and report." Graduated autonomy as trust builds. |
| **Real-time collaboration / multi-user sessions** | "My EA and I should both use this" | Adds enormous complexity (CRDT/OT, presence, permissions, conflict resolution). Two users rarely need to be in the same coaching session simultaneously. | Shared artifact library (docs, summaries, action items) with async handoff. EA gets a separate view of delegated tasks. |
| **Gamification (streaks, points, leaderboards)** | "Engagement metrics! Retention!" | Executives find gamification patronizing. It undermines the coaching relationship. BetterUp tried and pulled back. | Progress tracking through meaningful metrics: decisions made, goals progressed, delegation effectiveness. |
| **Social/community features (forums, groups)** | "Network effects! Community!" | Executives will never discuss sensitive coaching content in a shared forum. Privacy is the whole point. | Community agent templates (code, not conversations). Optional anonymized benchmarking ("leaders like you typically..."). |
| **Therapy / mental health diagnosis** | "Sometimes executives need therapy" | Massive regulatory risk (HIPAA, licensure requirements). Liability for misdiagnosis. Not a coaching product's place. | Detect distress signals and recommend professional resources. Clear disclaimers. Never diagnose, never prescribe. |
| **Native mobile app (day 1)** | "Everyone's on mobile" | Two codebases or React Native complexity. Desktop web is the primary use case for structured work. Mobile is for quick check-ins. | Progressive Web App (PWA) for mobile. Responsive desktop web. Native app only after product-market fit. |
| **Plugin/extension ecosystem** | "Let third parties build integrations" | Premature platform play. Security nightmare with executive data. Tiny user base = no developer ecosystem. | First-party integrations only. Agent template library covers the "extensibility" need without third-party code execution. |

## Feature Dependencies

```
[Authentication & Accounts]
    └──requires──> [Conversational Chat Interface]
    └──requires──> [Persistent Conversation Memory]
                       └──requires──> [Document Upload] (feeds memory)
                       └──requires──> [User Onboarding/Intake] (seeds memory)

[Dynamic Agent Creation]
    └──requires──> [Persistent Memory] (agents need context)
    └──requires──> [Swappable LLM Backends] (agents may use different models)

[Agent Gap Detection]
    └──requires──> [Dynamic Agent Creation]
    └──requires──> [Delegation Cascade] (detects gaps during routing)

[Community Agent Templates]
    └──requires──> [Dynamic Agent Creation]

[Delegation Cascade]
    └──requires──> [Dynamic Agent Creation]
    └──requires──> [Action Items / Task Extraction]

[Morning Briefing]
    └──requires──> [Action Items / Task Extraction]
    └──requires──> [Persistent Memory]
    └──enhances──> [Calendar Integration (read-only)]

[Weekly Reflection]
    └──requires──> [Conversation History]
    └──requires──> [Action Items / Task Extraction]

[Decision Frameworks]
    └──requires──> [Conversational Chat Interface]
    └──enhances──> [Delegation Cascade] (framework output can trigger delegation)

[Crisis Mode]
    └──requires──> [Conversational Chat Interface]
    └──enhances──> [Morning Briefing] (crisis detection in briefing)

[Per-User Agent Evolution]
    └──requires──> [Dynamic Agent Creation]
    └──requires──> [Persistent Memory]

[Cross-Domain Coaching] ──conflicts──> [Single-Domain Focus]
    (must design memory and prompts for domain tagging from day 1)

[Self-Hosted Deployment] ──conflicts──> [Rapid Iteration Speed]
    (every deployment must work in customer infra, not just cloud)
```

### Dependency Notes

- **Dynamic Agent Creation requires Persistent Memory:** Agents need user context to be useful. Without memory, each agent interaction starts cold.
- **Agent Gap Detection requires Delegation Cascade:** Gap detection happens when the routing system cannot find a confident match. The delegation system must exist first.
- **Community Agent Templates requires Dynamic Agent Creation:** Can't share what you can't create. Templates are serialized agent definitions.
- **Morning Briefing requires Action Items:** The briefing aggregates pending items, recent decisions, and upcoming events. Without task extraction, it's just a greeting.
- **Cross-Domain Coaching conflicts with Single-Domain Focus:** The memory schema must support domain tags from day 1. Retrofitting cross-domain into a single-domain memory model is a rewrite.
- **Self-Hosted conflicts with Rapid Iteration:** Every feature must work without cloud dependencies. This constrains architecture decisions (no managed vector DB, no hosted LLM unless customer provides keys).

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed to validate the concept with two power users.

- [ ] **Conversational chat interface** -- the core interaction; everything else is built on this
- [ ] **Authentication & isolated accounts** -- two users minimum, content must be isolated
- [ ] **User onboarding / intake** -- coach must know the user to be useful
- [ ] **Persistent conversation memory** -- the coach must remember across sessions; this is what makes it a coach vs a chatbot
- [ ] **Document upload** -- users need to share context docs (org chart, strategy docs, OKRs)
- [ ] **Action items / task extraction** -- conversations must produce concrete outputs
- [ ] **Conversation history & search** -- basic retrieval of past sessions
- [ ] **Cross-domain coaching prompts** -- the system prompt must handle work + personal from day 1
- [ ] **Dynamic agent creation (basic)** -- at least 3-4 pre-built agents (contract review, comms writer, meeting prep, research) with the infra to add more from prompts
- [ ] **Delegation cascade (basic)** -- coach can route to specialist agents and return results
- [ ] **Structured outputs (decision frameworks)** -- at least 2-3 framework templates (pro/con, decision matrix, stakeholder map)
- [ ] **Self-hosted deployment (Docker)** -- single docker-compose for the two initial users
- [ ] **Secure data handling** -- encryption at rest and in transit

### Add After Validation (v1.x)

Features to add once core coaching loop is validated with initial users.

- [ ] **Morning briefing** -- add when users have enough history and action items to make briefings valuable (after ~2 weeks of usage)
- [ ] **Weekly reflection** -- add after 2-3 weeks of conversation history exists
- [ ] **Hard conversation prep** -- add when users request role-play scenarios
- [ ] **Crisis mode** -- add when urgency patterns are observed in real usage
- [ ] **Agent gap detection** -- add after 10+ delegation attempts reveal coverage gaps
- [ ] **Swappable LLM backends** -- add when users want cost optimization or specific model capabilities per agent
- [ ] **Per-user agent evolution** -- add when enough feedback data exists per user
- [ ] **Data export** -- add when users start wanting to share outputs with their teams

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Community agent templates** -- needs a community (10+ users) to have value
- [ ] **Calendar integration (read-only)** -- useful for morning briefings but complex API integration; defer until briefing is proven valuable
- [ ] **Voice input (transcription)** -- nice-to-have, not core
- [ ] **PWA for mobile** -- defer until desktop experience is solid
- [ ] **Multi-tenant managed hosting** -- defer until self-hosted model is validated and more customers want it
- [ ] **Anonymized benchmarking** -- needs aggregate data across many users

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Conversational chat interface | HIGH | MEDIUM | P1 |
| Persistent conversation memory | HIGH | HIGH | P1 |
| User onboarding / intake | HIGH | MEDIUM | P1 |
| Authentication & isolated accounts | HIGH | MEDIUM | P1 |
| Document upload | HIGH | MEDIUM | P1 |
| Action items / task extraction | HIGH | MEDIUM | P1 |
| Conversation history & search | MEDIUM | LOW | P1 |
| Dynamic agent creation | HIGH | HIGH | P1 |
| Delegation cascade | HIGH | HIGH | P1 |
| Decision frameworks (structured output) | HIGH | MEDIUM | P1 |
| Self-hosted deployment (Docker) | HIGH | HIGH | P1 |
| Secure data handling | HIGH | MEDIUM | P1 |
| Cross-domain coaching | HIGH | LOW | P1 |
| Morning briefing | HIGH | MEDIUM | P2 |
| Weekly reflection | MEDIUM | LOW | P2 |
| Hard conversation prep | MEDIUM | MEDIUM | P2 |
| Crisis mode | MEDIUM | MEDIUM | P2 |
| Agent gap detection | HIGH | HIGH | P2 |
| Swappable LLM backends | MEDIUM | HIGH | P2 |
| Per-user agent evolution | HIGH | HIGH | P2 |
| Data export | MEDIUM | LOW | P2 |
| Community agent templates | MEDIUM | MEDIUM | P3 |
| Calendar integration (read-only) | MEDIUM | HIGH | P3 |
| Voice input | LOW | HIGH | P3 |
| PWA for mobile | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (validates core hypothesis)
- P2: Should have, add after initial validation with two power users
- P3: Nice to have, future consideration after product-market fit

## Competitor Feature Analysis

| Feature | BetterUp | CoachHub | Rocky.ai | Lindy.ai | ChatGPT (custom GPTs) | Our Approach |
|---------|----------|----------|----------|----------|----------------------|--------------|
| Conversational coaching | Human coaches + AI supplements | Human coaches + AI nudges | Pure AI, text-based | N/A (task agent) | General AI, user-prompted | Pure AI coach, deeply personalized with persistent memory |
| Work + personal scope | Work only (leadership) | Work only (leadership) | Work only (leadership) | Task only | Whatever user asks | Unified cross-domain by design |
| Agent delegation | None | None | None | Multi-agent tasks | Custom GPTs (manual switching) | Automatic routing from coach to specialist agents |
| Dynamic agent creation | None | None | None | Pre-built templates | GPT Builder (limited) | Natural language agent creation, per-user evolution |
| Persistent memory | Session-based + human coach notes | Session-based + coach notes | Limited session memory | Per-task context | Limited (memory feature basic) | Deep persistent memory: facts, preferences, relationships, patterns |
| Structured outputs | Coaching frameworks (human-delivered) | Assessment reports | Text suggestions | Task outputs (email, research) | Whatever user requests | Built-in decision frameworks, action items, delegation artifacts |
| Self-hosted | No (enterprise SaaS) | No (enterprise SaaS) | No (consumer SaaS) | No (cloud only) | No (cloud only) | Yes -- Docker deployment, data never leaves infra |
| Agent templates marketplace | N/A | N/A | N/A | Pre-built agent library | GPT Store | Community library scoped to coaching/CoS domain |
| Proactive features (briefings) | Human coach schedules | Human coach schedules | Push notifications (basic) | Triggered automations | None | AI-generated morning briefings, weekly reflections |
| Privacy posture | Enterprise SSO, SOC2 | Enterprise SSO, SOC2, GDPR | Standard cloud security | Standard cloud security | Standard cloud security | Self-hosted = maximum privacy. Data never leaves customer infra. |

### Competitive Positioning Summary

**BetterUp/CoachHub gap:** These are human-coach platforms with AI supplements. They cost $3,000-$5,000/person/year. MyCoach replaces the human coach with AI at a fraction of the cost, available 24/7, with perfect memory. The trade-off is empathy depth -- but for executives who want a sounding board + task execution, AI is often preferred (no judgment, always available, no scheduling).

**Rocky.ai gap:** Pure AI coach but shallow -- no persistent memory, no agent delegation, no structured outputs, no self-hosting. It's a chatbot with coaching prompts.

**Lindy.ai gap:** Multi-agent task execution but no coaching relationship. It dispatches tasks but doesn't know you, doesn't develop you, doesn't hold context across domains.

**ChatGPT/Claude gap:** Powerful general AI but no persistent coaching identity, no proactive features, no agent delegation, no self-hosting, no structured coaching frameworks. Users can approximate coaching but must rebuild context every session.

**MyCoach's unique position:** The only product combining deep coaching relationship (persistent memory, cross-domain) with chief-of-staff delegation (dynamic agents, structured outputs) in a self-hosted package. No competitor spans both coaching AND task execution.

## Sources

- BetterUp product features: training data knowledge of betterup.com product pages and enterprise documentation (MEDIUM confidence)
- CoachHub product features: training data knowledge of coachhub.com product pages (MEDIUM confidence)
- Rocky.ai product features: training data knowledge of rocky.ai product and app store listings (MEDIUM confidence)
- Lindy.ai product features: training data knowledge of lindy.ai product pages and documentation (MEDIUM confidence)
- ChatGPT Custom GPTs / GPT Store: training data knowledge of OpenAI product features (MEDIUM confidence)
- CrewAI / AutoGen agent frameworks: training data knowledge of open-source agent orchestration patterns (MEDIUM confidence)
- AI coaching industry analysis: training data from industry reports and product reviews (MEDIUM confidence)

**Note:** WebSearch and WebFetch were unavailable during this research session. All findings are based on training data through May 2025. The AI coaching and agent orchestration markets are evolving rapidly. Recommend re-verifying competitor features and new entrants before finalizing requirements. Key areas to verify:
- Whether any coaching product has added agent delegation since May 2025
- Whether Lindy.ai or similar has added coaching capabilities
- New entrants in the self-hosted AI coach space
- Current pricing for BetterUp / CoachHub enterprise plans

---
*Feature research for: AI Executive Coach + Chief-of-Staff Agent Orchestration Platform*
*Researched: 2026-02-14*
