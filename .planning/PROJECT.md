# MyCoach

## What This Is

An AI-powered executive and life coach paired with an AI chief of staff. MyCoach is a trusted, always-available thinking partner that knows your entire world — work and personal — and can act on your behalf by dispatching specialist agents to get things done. Built for leaders at any level who need a confidant, a sounding board, and an operator.

## Core Value

A single AI that knows your world deeply enough to help you think through anything AND execute on your behalf — the combination of thinking partner and operator is what makes it indispensable.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

- [ ] Conversational coach that spans work and personal life (decisions, strategy, feedback prep, personal finance, fitness, etc.)
- [ ] Chief of staff that understands intent and dispatches tasks to specialist agents
- [ ] Dynamic agent system — all agents created from prompts, not code; evolve per-user from feedback and usage
- [ ] Community agent templates — library of starting templates users can pull and customize
- [ ] Agent gap detection — system recognizes when no existing agent fits a request and proposes creating a new one
- [ ] Persistent memory — upload docs + onboarding conversation + continuous learning from sessions
- [ ] Structured outputs — decision frameworks, action items, summaries, one-pagers (not just conversation)
- [ ] Multi-user with isolated accounts — separate profiles, memories, and agent configurations per user
- [ ] Self-hosted deployment — all data stays under the user's control
- [ ] Swappable LLM backends — support multiple model providers, swap based on task or preference
- [ ] Desktop web application as primary interface
- [ ] Orchestrator engine is stable code; orchestrator behavior, personality, and knowledge are dynamic and personalized

### Out of Scope

- Mobile app — desktop-first; mobile deferred to later milestone
- Voice interface — deferred to after mobile
- Calendar/email/Slack integrations — standalone first, integrations later
- Real-time collaboration — single-user sessions (multi-user = separate accounts, not shared sessions)

## Context

**Initial users:** Two leaders with very different roles — a senior manager at Amazon (tech, team management, side projects, personal finance/fitness) and a CLO at a tech company (legal strategy, contracts, board dynamics). The product must serve both use cases from the same architecture.

**Use cases surfaced during questioning:**
- Morning briefing — what's on my plate, what's simmering, what needs attention
- Decision sounding board — talk through reorgs, legal strategy, investments with full context
- Delegation cascade — dump action items, chief of staff routes to right agents in parallel
- Hard conversation prep — role-play, talking points, follow-up email drafts
- Personal finance/fitness — same coach, different domain, same persistent knowledge
- Weekly reflection — patterns, dropped balls, recurring avoidance
- Crisis mode — triage, blast radius, immediate comms
- New hire onboarding plans — research + structured output
- Self-extending — "plan my trip to Italy" triggers agent gap detection and creation

**Agent model:**
- Pre-built templates available: contract attorney, comms writer, meeting prep, research analyst
- All agents are dynamic — templates are starting points, not fixed implementations
- Each agent evolves per-user through feedback and usage
- Chief of staff suggests routing, user confirms before dispatch

**Onboarding:**
- Upload key documents (org chart, goals, team roster, etc.)
- Onboarding conversation (coach interviews you about your world)
- Continuous learning from every session thereafter

## Constraints

- **Privacy**: Self-hosted, non-negotiable — executives discuss highly sensitive content (personnel, legal, financial)
- **Tech stack**: React Native + Node.js (TypeScript across the stack)
- **LLM flexibility**: Must not be locked to a single model provider
- **Platform priority**: Desktop web first → mobile → voice

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| All agents dynamic (no hard-coded agents) | Enables self-extending system, per-user evolution, and community templates from same architecture | — Pending |
| Suggest-then-confirm routing | Builds user trust in delegation; avoids silent failures or unwanted actions | — Pending |
| Desktop web first | Leaders do deep work at their desks; mobile adds complexity without core value | — Pending |
| Self-hosted deployment | Executive conversations are too sensitive for cloud; privacy is non-negotiable | — Pending |
| Swappable LLM backends | Avoids vendor lock-in; different tasks may benefit from different models | — Pending |
| React Native + Node.js | Shared TypeScript stack; React Native enables future mobile from same codebase | — Pending |
| Orchestrator engine stable, behavior dynamic | Core routing logic needs reliability; personality and knowledge should personalize per user | — Pending |

---
*Last updated: 2026-02-14 after initialization*
