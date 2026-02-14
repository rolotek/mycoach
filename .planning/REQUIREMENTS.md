# Requirements: MyCoach

**Defined:** 2026-02-14
**Core Value:** A single AI that knows your world deeply enough to help you think through anything AND execute on your behalf

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can sign up with email and password
- [ ] **AUTH-02**: User session persists across browser refresh
- [ ] **AUTH-03**: User can log in with Google OAuth
- [ ] **AUTH-04**: User can log in with Microsoft OAuth
- [ ] **AUTH-05**: Each user has an isolated account with separate profile, memories, and agents

### Coaching Conversation

- [ ] **COACH-01**: User can have streaming chat conversations with the coach
- [ ] **COACH-02**: Coach references prior conversations and user context in responses
- [ ] **COACH-03**: Coach produces structured outputs (decision frameworks, action items, summaries) on request
- [ ] **COACH-04**: System auto-detects coaching mode vs task mode and adapts response style
- [ ] **COACH-05**: User can manually select or override conversation mode (coaching vs task)

### Memory & Knowledge

- [ ] **MEM-01**: User has persistent profile (goals, team members, relationships, preferences) stored across sessions
- [ ] **MEM-02**: User can upload documents (PDFs, DOCX, TXT) that become searchable context for conversations
- [ ] **MEM-03**: System auto-extracts facts from conversations into user's knowledge base
- [ ] **MEM-04**: User can inspect what the system knows about them and correct inaccuracies

### Agent System

- [ ] **AGENT-01**: User can create specialist agents by providing a natural language description and prompt
- [ ] **AGENT-02**: System includes starter agent templates (contract attorney, comms writer, meeting prep, research analyst)
- [ ] **AGENT-03**: When user makes a task request, chief of staff suggests which agent to route to and user confirms before dispatch
- [ ] **AGENT-04**: Agents execute tasks and return structured results through the coaching interface

### Agent Evolution

- [ ] **EVOL-01**: User can provide feedback on agent outputs (corrections, preferences, thumbs up/down)
- [ ] **EVOL-02**: Agent prompts evolve per-user based on accumulated feedback patterns
- [ ] **EVOL-03**: User can view, edit, version, and archive their agents

### LLM Infrastructure

- [ ] **LLM-01**: System supports multiple LLM providers (Claude, OpenAI, local models via Ollama)
- [ ] **LLM-02**: User can configure which provider and model to use

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Agent Intelligence

- **AGTI-01**: System detects when no existing agent fits a request and proposes creating a new one (gap detection)

### Community

- **COMM-01**: Users can browse a library of community-contributed agent templates
- **COMM-02**: Users can fork and customize community templates
- **COMM-03**: Template review pipeline ensures quality and safety

### Proactive Features

- **PROACT-01**: Morning briefing summarizing priorities, ongoing situations, and upcoming events
- **PROACT-02**: Weekly reflection surfacing patterns, dropped items, and recurring themes
- **PROACT-03**: Crisis mode with triage, blast radius assessment, and comms drafting

### Advanced Memory

- **AMEM-01**: Tiered memory system (working, short-term, long-term) with intelligent decay
- **AMEM-02**: Contradiction resolution when new information conflicts with stored facts

### Deployment & Security

- **DEPLOY-01**: Docker Compose self-hosted deployment package
- **DEPLOY-02**: Encryption at rest for all stored data
- **DEPLOY-03**: Data export (conversations, memory, agents)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Desktop-first; mobile deferred to future milestone |
| Voice interface | Deferred to after mobile |
| Calendar/email/Slack integrations | Standalone first; integrations add massive complexity |
| Real-time collaboration | Single-user sessions; multi-user = separate accounts |
| Role-based access within accounts | Single-user accounts for v1 |
| Autonomous agent execution | Always human-in-the-loop; agents never act without user confirmation |
| Real-time chat/messaging between users | Not a communication platform |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| COACH-01 | Phase 2 | Pending |
| COACH-02 | Phase 2 | Pending |
| COACH-03 | Phase 2 | Pending |
| COACH-04 | Phase 2 | Pending |
| COACH-05 | Phase 2 | Pending |
| MEM-01 | Phase 2 | Pending |
| MEM-02 | Phase 2 | Pending |
| MEM-03 | Phase 2 | Pending |
| MEM-04 | Phase 2 | Pending |
| AGENT-01 | Phase 3 | Pending |
| AGENT-02 | Phase 3 | Pending |
| AGENT-03 | Phase 3 | Pending |
| AGENT-04 | Phase 3 | Pending |
| EVOL-01 | Phase 4 | Pending |
| EVOL-02 | Phase 4 | Pending |
| EVOL-03 | Phase 4 | Pending |
| LLM-01 | Phase 1 | Pending |
| LLM-02 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-02-14*
*Last updated: 2026-02-14 after roadmap creation*
