---
phase: 04-agent-evolution
plan: "02"
subsystem: api
tags: [trpc, agents, feedback, prompt-evolution, drizzle]

requires:
  - phase: 04-01
    provides: agentFeedback, agentVersions tables; archivedAt
provides:
  - Feedback API; prompt evolution pipeline; version/archive tRPC
affects: [04-03]

tech-stack:
  added: []
  patterns: [meta-prompting for evolution, fire-and-forget evolution on feedback create]

key-files:
  created: [apps/server/src/agents/prompt-evolver.ts]
  modified: [apps/server/src/trpc/router.ts]

key-decisions: []

patterns-established:
  - "saveAgentVersion before any prompt change (manual or evolution); 3+ feedback + actionable signal + 1h cooldown for evolution"

duration: 12min
completed: "2026-02-15"
---

# Phase 4: Agent Evolution — Plan 02 Summary

**Feedback tRPC, prompt-evolver pipeline (evolveAgentPrompt, checkAndEvolveAgent, saveAgentVersion), agent version/archive procedures**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-02-15
- **Tasks:** 2
- **Files modified:** 1 created, 1 modified

## Accomplishments

- `prompt-evolver.ts`: evolveAgentPrompt (generateText + Output.object), checkAndEvolveAgent (threshold 3+, actionable signal, 1h cooldown, enrichment from agentExecutions), saveAgentVersion (version increment + insert)
- agentFeedbackRouter: create (with fire-and-forget checkAndEvolveAgent), listByAgent
- agentVersionRouter: list (ownership check), revert (save current version then set prompt to target)
- agent.list excludes archived (isNull(archivedAt)); agent.listAll returns all; agent.archive / agent.unarchive; agent.update saves version before systemPrompt change

## Task Commits

1. **Task 1: Create prompt-evolver.ts** — `fe312a6` (feat)
2. **Task 2: Add feedback, version, archive tRPC** — `82b6668` (feat)

## Files Created/Modified

- `apps/server/src/agents/prompt-evolver.ts` — meta-prompting pipeline, saveAgentVersion
- `apps/server/src/trpc/router.ts` — agentFeedback, agentVersion routers; agent list/listAll/archive/unarchive; update saves version

## Decisions Made

None — followed plan as specified.

## Deviations from Plan

None.

## Issues Encountered

None.

## Next Phase Readiness

04-03 can use agentFeedback.create, agentVersion.list/revert, agent.listAll/archive/unarchive from the UI.

---
*Phase: 04-agent-evolution*
*Completed: 2026-02-15*
