---
phase: 04-agent-evolution
plan: "01"
subsystem: database
tags: [drizzle, postgres, schema, agents]

requires:
  - phase: 03-agent-system
    provides: agents, agentExecutions tables
provides:
  - agentFeedback and agentVersions tables; archivedAt on agents; archive-filtered dispatch
affects: [04-02, 04-03]

tech-stack:
  added: []
  patterns: [soft-delete via archivedAt, feedback/version schema]

key-files:
  created: []
  modified: [apps/server/src/db/schema.ts, apps/server/src/coaching/chat-route.ts]

key-decisions: []

patterns-established:
  - "Agent feedback/version tables with FKs to user, agent, execution; changeSource for evolution vs manual"
  - "Archive filter in chat route via isNull(archivedAt) so chief-of-staff only sees active agents"

duration: 8min
completed: "2026-02-15"
---

# Phase 4: Agent Evolution — Plan 01 Summary

**DB schema for feedback, versioning, and soft-delete archiving; chat route excludes archived agents from dispatch**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-15
- **Completed:** 2026-02-15
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `agentFeedback` table (userId, agentId, executionId, rating, correction) with indexes
- Added `agentVersions` table (agentId, version, systemPrompt, changeSource, changeSummary) with unique (agentId, version)
- Added nullable `archivedAt` to `agents` for soft-delete
- Defined relations for agentFeedback and agentVersions; extended agentRelations with feedback/versions
- Chat route now queries agents with `and(eq(agents.userId, user.id), isNull(agents.archivedAt))` so archived agents are excluded from chief-of-staff tools

## Task Commits

Each task was committed atomically:

1. **Task 1: Add agentFeedback, agentVersions tables and archivedAt column** — `a8298f2` (feat)
2. **Task 2: Filter archived agents from chief-of-staff dispatch** — `9462f1a` (feat)

## Files Created/Modified

- `apps/server/src/db/schema.ts` — agentFeedback, agentVersions tables; archivedAt on agents; relations
- `apps/server/src/coaching/chat-route.ts` — isNull(agents.archivedAt) in agent query

## Decisions Made

None — followed plan as specified.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Schema pushed successfully from `apps/server` with repo root `.env` loaded for DATABASE_URL.

## Next Phase Readiness

04-02 can use agentFeedback, agentVersions, and archivedAt for prompt evolution and tRPC procedures.

---
*Phase: 04-agent-evolution*
*Completed: 2026-02-15*
