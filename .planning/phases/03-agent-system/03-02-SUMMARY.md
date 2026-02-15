---
phase: 03-agent-system
plan: "02"
subsystem: api
tags: ai-sdk, ToolLoopAgent, createAgentUIStreamResponse, needsApproval

requires:
  - phase: 03-01
    provides: agents table, agentRouter, seedStarterAgents
provides:
  - Chief-of-staff as ToolLoopAgent with dynamic needsApproval dispatch tools
  - executeSpecialistAgent (generateText + agentExecutions recording)
  - Chat route branches: ToolLoopAgent when user has agents, streamText fallback when none
affects: phase 03 plan 03 (UI)

tech-stack:
  added: []
  patterns: ToolLoopAgent + needsApproval tools, createAgentUIStreamResponse

key-files:
  created: apps/server/src/agents/agent-executor.ts, agent-tools.ts, chief-of-staff.ts
  modified: apps/server/src/coaching/chat-route.ts

key-decisions:
  - "Agent path uses same onFinish (persistence + fact extraction) as streamText path"

duration: 15
completed: 2026-02-15
---

# Phase 3 Plan 02: Chief-of-staff ToolLoopAgent + chat integration — Summary

**ToolLoopAgent with dynamic needsApproval dispatch tools and chat route branching: agent path when user has agents, existing streamText when none.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- agent-executor.ts: executeSpecialistAgent inserts agentExecution (running), runs generateText, updates to completed/failed, returns { agentName, result, executionId }
- agent-tools.ts: buildAgentTools(agents, modelId, userId, conversationId) returns ToolSet of dispatch_<slug> tools with needsApproval: true
- chief-of-staff.ts: CHIEF_OF_STAFF_SYSTEM_PROMPT from RESEARCH; buildChiefOfStaff composes instructions with mode, user facts, RAG context; returns new ToolLoopAgent with stepCountIs(5)
- chat-route.ts: builds contextSection/factsSection; queries user agents; if userAgents.length > 0 returns createAgentUIStreamResponse with onFinish (conversation update + extractFacts); else existing streamText + toUIMessageStreamResponse

## Task Commits

1. **Task 1: Agent tools builder and specialist executor** — `dd20988` (feat)
2. **Task 2: Chief-of-staff ToolLoopAgent and chat route integration** — `ca2bc85` (feat)

## Files Created/Modified

- `apps/server/src/agents/agent-executor.ts` — executeSpecialistAgent, agentExecutions recording
- `apps/server/src/agents/agent-tools.ts` — buildAgentTools, ToolSet with needsApproval
- `apps/server/src/agents/chief-of-staff.ts` — buildChiefOfStaff, ToolLoopAgent
- `apps/server/src/coaching/chat-route.ts` — agent branch + createAgentUIStreamResponse

## Decisions Made

- Reused same onFinish logic (conversation update, extractFacts) for agent path as for streamText path.

## Deviations from Plan

- None. (ToolSet type assertion used for buildAgentTools return to satisfy ToolLoopAgent tools type.)

## Issues Encountered

None.

## Next Phase Readiness

Ready for 03-03 (Agent management UI + approval/result rendering in chat).

---
*Phase: 03-agent-system*
*Completed: 2026-02-15*
