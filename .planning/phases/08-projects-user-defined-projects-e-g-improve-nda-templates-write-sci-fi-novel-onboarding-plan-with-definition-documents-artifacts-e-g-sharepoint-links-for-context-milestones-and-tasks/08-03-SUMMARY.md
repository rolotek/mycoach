---
phase: 08-projects
plan: 03
subsystem: api, coaching
tags: chat, agents, project context

requires:
  - phase: 08-02
    provides: project.get for loading project with documents/links
provides:
  - Chat API accepts optional projectId; project context (name, description, document names, links) injected into system/context
  - New conversations and task threads store projectId when in project context; agent executions store projectId
affects: 08-04 (Open chat button uses same projectId in URL)

tech-stack:
  added: []
  patterns: loadProjectContext helper; projectContext param on buildSystemPrompt and buildChiefOfStaff

key-files:
  created: []
  modified: apps/server/src/coaching/chat-route.ts, system-prompt.ts, chief-of-staff.ts, resolve-approved-dispatch.ts, agent-executor.ts; apps/web use-coaching-chat.ts, chat pages

key-decisions: []
patterns-established:
  - "conversationProjectId = conversation.projectId ?? validProjectId so body projectId is used for agent executions when conversation has none"

duration: 12
completed: 2026-02-15
---

# Phase 08 Plan 03: Chat/agent project integration — Summary

**Optional projectId in chat request; project context injected into coach and chief-of-staff prompts; projectId on new conversations and agent executions.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Chat route accepts optional projectId in body; loads project (name, description, document filenames, links) and builds project context string.
- loadProjectContext(projectId, userId) loads project and returns formatted string for system prompt.
- buildSystemPrompt and buildChiefOfStaff accept optional projectContext; "Current Project" section added when present.
- New conversation creation sets projectId when valid; conversation row used (with fallback to body projectId) for agent executions.
- resolveApprovedDispatchTools and executeSpecialistAgent accept projectId; agentExecutions insert and task-thread conversation insert set projectId.
- Web: useCoachingChat(chatId, mode, initialMessages?, projectId?); body includes projectId when provided; chat [id] page reads projectId from searchParams; /chat page preserves projectId in redirect to /chat/[id]?projectId=xxx.

## Task Commits

1. **Task 1: Chat route accepts projectId and injects project context** — `002c4cd` (feat)
2. **Task 2: Web app passes projectId when in project context** — same commit

## Files Created/Modified

- apps/server: chat-route.ts (body projectId, loadProjectContext, conversation projectId, pass projectContext and conversationProjectId), system-prompt.ts, chief-of-staff.ts, resolve-approved-dispatch.ts, agent-executor.ts
- apps/web: use-coaching-chat.ts, chat/page.tsx, chat/[id]/page.tsx

## Decisions Made

None — followed plan as specified.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

Ready for 08-04 (Projects UI). "Open chat for this project" will link to /chat?projectId=xxx; chat page already supports it.

---
*Phase: 08-projects*
*Completed: 2026-02-15*
