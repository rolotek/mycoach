---
phase: 05-ui-polish-styling
plan: 06
subsystem: backend
tags: conversations, coaching, task-thread, getOrCreateCoaching, reset

requires: []
provides: [Conversation type/parentId, getOrCreateCoaching, reset, listTaskThreads, task thread creation on agent execution]
affects: [schema, trpc router, agent-executor, resolve-approved-dispatch]

key-files: { modified: ["schema.ts", "router.ts", "agent-executor.ts", "resolve-approved-dispatch.ts"] }
duration: ~25 min
completed: 2026-02-14
---

# Phase 5 Plan 6: Conversation Model Backend Summary

**Added `type` (coaching | task) and `parentId` to conversations; getOrCreateCoaching, reset, listTaskThreads tRPC procedures; agent executor creates task thread conversation and returns taskThreadId.**

## Changes
- **schema.ts:** `type` text default "coaching", `parentId` uuid FK to conversations.id (self-reference via AnyPgColumn for TS), index on parentId; conversationRelations parent/children.
- **router.ts:** list returns type/parentId; create accepts optional type/parentId; getOrCreateCoaching mutation; reset mutation (clears messages, deletes conversation memories); listTaskThreads query.
- **agent-executor.ts:** After successful generateText, insert task thread conversation with task + result messages; return taskThreadId.
- **resolve-approved-dispatch.ts:** ExecutedDispatchResult.output includes taskThreadId.

## Deviations
- Schema self-reference uses `AnyPgColumn` in .references() to avoid TS circular type inference.
- Drizzle config loads repo root .env via `resolve(dirname(__dirname), "../.env")`.

## Next
Ready for 05-07 (chat routing + sidebar) and 05-08 (inline summary cards).
