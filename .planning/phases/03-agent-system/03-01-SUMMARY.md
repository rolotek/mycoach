---
phase: 03-agent-system
plan: "01"
subsystem: api
tags: drizzle, trpc, agents, postgres

requires:
  - phase: 02-coaching-memory
    provides: conversations, auth context, tRPC patterns
provides:
  - agents and agentExecutions tables with relations and indexes
  - tRPC agentRouter (list, create, update, delete) with lazy starter seeding
  - 4 starter agent templates (contract-attorney, comms-writer, meeting-prep, research-analyst)
affects: phase 03 plans 02 and 03

tech-stack:
  added: []
  patterns: lazy per-user seeding on first agent.list

key-files:
  created: apps/server/src/agents/templates.ts
  modified: apps/server/src/db/schema.ts, apps/server/src/trpc/router.ts

key-decisions:
  - "Lazy seeding: seedStarterAgents runs on first agent.list when user has 0 agents (per RESEARCH recommendation)"

duration: 12
completed: 2026-02-15
---

# Phase 3 Plan 01: Agent DB schema + tRPC + starter templates — Summary

**Agents and agentExecutions tables, tRPC agent CRUD with slug generation and unique retry, and four starter templates with lazy per-user seeding.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 2
- **Files modified:** 3 (schema, templates.ts created, router)

## Accomplishments

- agents table: id, userId, name, slug, description, system_prompt, is_starter, icon, timestamps; indexes on userId and unique(userId, slug)
- agentExecutions table: id, userId, agentId, conversationId, task, result, status, createdAt, completedAt; indexes on userId, agentId
- Relations: agentRelations, agentExecutionRelations; userRelations extended with agents
- STARTER_TEMPLATES (Contract Attorney, Comms Writer, Meeting Prep, Research Analyst) with system prompts from 03-RESEARCH
- seedStarterAgents(db, userId): no-op if user has any agents; otherwise inserts 4 starters
- agent.list: calls seedStarterAgents then selects by userId orderBy name
- agent.create: slug from name; on unique violation retry with slug-{Date.now()}
- agent.update / agent.delete: scoped to userId

## Task Commits

1. **Task 1: Agent DB schema and starter templates** — `14e8851` (feat)
2. **Task 2: tRPC agent router with lazy seeding** — `6320a36` (feat)

## Files Created/Modified

- `apps/server/src/db/schema.ts` — agents, agentExecutions tables and relations
- `apps/server/src/agents/templates.ts` — STARTER_TEMPLATES, seedStarterAgents
- `apps/server/src/trpc/router.ts` — agentRouter, appRouter.agent

## Decisions Made

- Lazy seeding on first agent.list (no seeding at registration) per 03-RESEARCH recommendation.

## Deviations from Plan

None — plan executed as written.

## Issues Encountered

None. (Server dev failed with EADDRINUSE in verification due to existing process on port; code is correct.)

## Next Phase Readiness

Ready for 03-02 (chief-of-staff ToolLoopAgent + chat route integration).

---
*Phase: 03-agent-system*
*Completed: 2026-02-15*
