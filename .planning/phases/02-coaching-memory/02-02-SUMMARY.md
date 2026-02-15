---
phase: 02-coaching-memory
plan: "02"
subsystem: api
tags: [streaming, rag, pgvector, mode-detection, fact-extraction, ai-sdk]

requires:
  - phase: 02-01
    provides: schema, embeddings, chunker, retriever dependency on memories
provides:
  - POST /api/chat streaming SSE compatible with useChat
  - RAG context from memories, user facts in system prompt
  - Auto and manual mode (coaching vs task), structured output tools in task mode
  - Conversation persistence and background fact extraction to userFacts
affects: 02-04 (chat UI consumes this endpoint)

tech-stack:
  added: []
  patterns: [streamText + toUIMessageStreamResponse, convertToModelMessages, tool() with inputSchema, Output.object]

key-files:
  created:
    - apps/server/src/coaching/chat-route.ts
    - apps/server/src/coaching/system-prompt.ts
    - apps/server/src/coaching/mode-detector.ts
    - apps/server/src/coaching/structured-outputs.ts
    - apps/server/src/memory/retriever.ts
    - apps/server/src/memory/fact-extractor.ts
  modified:
    - apps/server/src/index.ts

key-decisions: []

patterns-established:
  - "Chat: Hono POST /api/chat, streamText, toUIMessageStreamResponse, onFinish for persistence and extractFacts"
  - "RAG: retrieveContext(userId, query) with cosine distance, minSimilarity 0.3"
  - "Facts: extractFacts in onFinish with Haiku/Sonnet, Output.object(schema), embed and insert userFacts"

duration: ~25 min
completed: 2026-02-14
---

# Phase 2 Plan 02: Streaming chat + RAG + mode + fact extraction Summary

**Streaming chat endpoint with RAG retrieval, coaching/task mode detection, structured output tools, conversation persistence, and background fact extraction.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-02-14
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- POST /api/chat returns SSE stream via toUIMessageStreamResponse for useChat
- System prompt includes coaching persona, mode instructions, RAG context, user facts
- detectMode: auto/coaching/task with task-signal regexes; manual override honored
- Task mode: createActionItems, createDecisionFramework, createSummary as AI SDK tools (inputSchema)
- retrieveContext: embed query, cosine distance on memories, userId filter, empty on error
- extractFacts: last 4 messages, Haiku/Sonnet, Output.object(factSchema), dedupe, embed and insert
- Conversation messages persisted in onFinish; X-Chat-Id header returned

## Task Commits

1. **Task 1: Chat route, system prompt, mode, structured outputs** - `915886b` (feat)
2. **Task 2: Retriever and fact extractor** - `a573717` (feat)

## Files Created/Modified

- apps/server/src/coaching/* (chat-route, system-prompt, mode-detector, structured-outputs)
- apps/server/src/memory/retriever.ts, fact-extractor.ts
- apps/server/src/index.ts (CORS, mount chatApp)

## Decisions Made

None - followed plan. UIMessage uses `parts` (not `content`); used convertToModelMessages async and result.output for generateText object output.

## Deviations from Plan

- [Rule 3 - Blocking] Plan referenced `response` in onFinish; AI SDK toUIMessageStreamResponse onFinish passes `{ messages }`. Used `messages` for persistence and extractFacts.
- [Rule 3 - Blocking] Plan used `parameters` for tool(); SDK expects `inputSchema`. Used inputSchema with Zod schemas.
- [Rule 3 - Blocking] generateText result uses `output` not `object` for structured output. Used result.output.

## Issues Encountered

None.

## Next Phase Readiness

Ready for 02-03 (document upload pipeline and tRPC CRUD for conversations, documents, userFacts).

---
*Phase: 02-coaching-memory*
*Completed: 2026-02-14*

## Self-Check: PASSED
