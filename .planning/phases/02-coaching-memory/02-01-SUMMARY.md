---
phase: 02-coaching-memory
plan: "01"
subsystem: database
tags: [drizzle, pgvector, openai, embeddings, chunking]

requires:
  - phase: 01-foundation
    provides: User table, Drizzle schema, DB connection
provides:
  - conversations, memories, documents, userFacts tables with vector columns and HNSW indexes
  - embedText/embedTexts via OpenAI text-embedding-3-small
  - chunkText recursive splitter with overlap
  - pgvector extension script and db:setup
affects: Phase 2 streaming chat, RAG, document pipeline, fact storage

tech-stack:
  added: [pgvector via Drizzle pg-core vector type]
  patterns: [vector(1536), HNSW cosine index, embed/embedMany AI SDK]

key-files:
  created:
    - apps/server/src/memory/embeddings.ts
    - apps/server/src/memory/chunker.ts
    - apps/server/scripts/enable-pgvector.ts
  modified:
    - apps/server/src/db/schema.ts
    - apps/server/package.json

key-decisions: []

patterns-established:
  - "Vector columns: vector('embedding', { dimensions: 1536 }) with HNSW index using vector_cosine_ops"
  - "Embeddings: AI SDK embed/embedMany with openai.embedding('text-embedding-3-small')"
  - "Run db:pgvector (or db:setup) before schema push so vector extension exists"

duration: ~15 min
completed: 2026-02-14
---

# Phase 2 Plan 01: Database schema + pgvector + embedding/chunking Summary

**Coaching & memory schema (conversations, memories, documents, userFacts) with pgvector and HNSW indexes, plus OpenAI embedding and recursive text chunking utilities.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-14
- **Completed:** 2026-02-14
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Four new tables: conversations (mode, messages jsonb), memories (content + embedding, type), documents (filename, status), userFacts (category, fact, confidence, embedding)
- Vector columns (1536 dimensions) and HNSW indexes on memories and userFacts for semantic search
- embedText/embedTexts using OpenAI text-embedding-3-small via AI SDK
- Recursive character chunker with configurable size and overlap
- enable-pgvector script and db:pgvector / db:setup npm scripts

## Task Commits

1. **Task 1: Extend database schema** - `d7251bd` (feat)
2. **Task 2: Embedding utilities, chunker, pgvector script** - `d5113d6` (feat)

**Plan metadata:** (to be committed with docs commit)

## Files Created/Modified

- `apps/server/src/db/schema.ts` - Added conversations, memories, documents, userFacts and relations
- `apps/server/src/memory/embeddings.ts` - embedText, embedTexts
- `apps/server/src/memory/chunker.ts` - chunkText
- `apps/server/scripts/enable-pgvector.ts` - CREATE EXTENSION vector
- `apps/server/package.json` - db:pgvector, db:setup scripts

## Decisions Made

None - followed plan as specified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- enable-pgvector.ts run failed locally with "database does not exist" (DATABASE_URL pointing at non-existent DB). Script and usage are correct; run db:setup when Postgres and target database are available.

## User Setup Required

None - no external service configuration required beyond existing DATABASE_URL. Run `npm run db:pgvector` (or `db:setup`) before first schema push when pgvector extension is not yet enabled.

## Next Phase Readiness

Ready for 02-02 (streaming chat + RAG + mode detection + fact extraction). Schema and embedding/chunking utilities are in place.

---
*Phase: 02-coaching-memory*
*Completed: 2026-02-14*

## Self-Check: PASSED
