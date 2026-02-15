# Roadmap: MyCoach

## Overview

MyCoach delivers an AI executive coach paired with a chief of staff that knows your world and acts on your behalf. The build progresses from infrastructure (auth, LLM abstraction) through the core coaching experience with persistent memory, into the agent delegation system, and finally agent evolution -- each phase delivering a complete, verifiable capability that the next phase builds upon.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Authentication, account isolation, and LLM provider abstraction
- [x] **Phase 2: Coaching & Memory** - Conversational coach with persistent memory and document knowledge
- [ ] **Phase 3: Agent System** - Dynamic agent creation, starter templates, and suggest-then-confirm delegation
- [ ] **Phase 4: Agent Evolution** - Feedback-driven agent improvement and agent lifecycle management

## Phase Details

### Phase 1: Foundation
**Goal**: Users can securely access isolated accounts backed by a provider-agnostic LLM layer
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, LLM-01, LLM-02
**Success Criteria** (what must be TRUE):
  1. User can create an account with email/password and log in with Google or Microsoft OAuth
  2. User session persists across browser refreshes without re-authentication
  3. Each user sees only their own data -- profiles, conversations, and settings are completely isolated between accounts
  4. System can make LLM calls through at least two different providers (e.g., Claude and Ollama) and user can select which provider to use
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Monorepo scaffold + PostgreSQL + Drizzle DB + Hono server skeleton
- [x] 01-02-PLAN.md — Better Auth (email/password + OAuth) + tRPC router with auth context
- [x] 01-03-PLAN.md — AI SDK LLM provider registry (Anthropic, OpenAI, Ollama)
- [x] 01-04-PLAN.md — Frontend auth pages + settings UI + end-to-end verification

### Phase 2: Coaching & Memory
**Goal**: Users have a persistent, context-aware coaching relationship that spans work and personal life
**Depends on**: Phase 1
**Requirements**: COACH-01, COACH-02, COACH-03, COACH-04, COACH-05, MEM-01, MEM-02, MEM-03, MEM-04
**Success Criteria** (what must be TRUE):
  1. User can have a streaming chat conversation with the coach and receive responses that reference prior conversations and uploaded documents
  2. User can upload documents (PDF, DOCX, TXT) and the coach draws on their content in subsequent conversations
  3. Coach produces structured outputs (decision frameworks, action items, summaries) when requested, and auto-detects whether to coach or produce structured output
  4. User can switch between coaching mode and task mode manually, overriding the system's auto-detection
  5. User can inspect what the system knows about them (extracted facts, profile, preferences) and correct inaccuracies
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Database schema (conversations, memories, documents, userFacts) + pgvector + embedding/chunking utilities
- [x] 02-02-PLAN.md — Streaming chat endpoint + RAG retrieval + mode detection + background fact extraction
- [x] 02-03-PLAN.md — Document upload/processing pipeline + tRPC CRUD for conversations, documents, and user facts
- [x] 02-04-PLAN.md — Chat UI + memory management page + documents page + end-to-end verification

### Phase 3: Agent System
**Goal**: Users can delegate tasks to specialist agents through a chief-of-staff that suggests routing and awaits confirmation
**Depends on**: Phase 2
**Requirements**: AGENT-01, AGENT-02, AGENT-03, AGENT-04
**Success Criteria** (what must be TRUE):
  1. User can create a new specialist agent by providing a natural language description and prompt
  2. System includes working starter agent templates (contract attorney, comms writer, meeting prep, research analyst) that produce useful outputs
  3. When user makes a task request, the chief of staff suggests which agent to route to and user confirms before dispatch
  4. Agent results appear as structured content within the coaching conversation interface
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Agent Evolution
**Goal**: Agents improve over time through user feedback and users have full control over their agent library
**Depends on**: Phase 3
**Requirements**: EVOL-01, EVOL-02, EVOL-03
**Success Criteria** (what must be TRUE):
  1. User can provide feedback on agent outputs (corrections, preferences, thumbs up/down) and the system records it
  2. Agent behavior visibly improves for a specific user after repeated feedback -- prompts evolve based on accumulated feedback patterns
  3. User can view, edit, version, and archive their agents through a management interface
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 --> 2 --> 3 --> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 4/4 | Verification | - |
| 2. Coaching & Memory | 4/4 | Complete | 2026-02-15 |
| 3. Agent System | 0/TBD | Not started | - |
| 4. Agent Evolution | 0/TBD | Not started | - |
