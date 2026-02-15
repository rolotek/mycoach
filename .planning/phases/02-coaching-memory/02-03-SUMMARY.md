---
phase: 02-coaching-memory
plan: "03"
subsystem: api
tags: [documents, upload, unpdf, mammoth, trpc, crud]

requires:
  - phase: 02-01
    provides: schema, embeddings, chunker
provides:
  - POST /api/documents/upload (PDF, DOCX, TXT up to 10MB)
  - Document parse → chunk → embed → memories with type document_chunk
  - tRPC conversation (list, get, create, delete, updateMode)
  - tRPC document (list, delete)
  - tRPC userFact (list, update, delete)
affects: 02-04 (UI will use these endpoints)

tech-stack:
  added: [unpdf, mammoth]
  patterns: [multipart upload, batch memory insert, cascade delete via separate queries]

key-files:
  created:
    - apps/server/src/documents/parser.ts
    - apps/server/src/documents/upload-route.ts
  modified:
    - apps/server/src/trpc/router.ts
    - apps/server/src/index.ts
    - apps/server/package.json

key-decisions: []

patterns-established:
  - "Document upload: create doc record first (processing), then parse/chunk/embed, then status ready/error"
  - "Memory chunks for documents: type document_chunk, metadata.documentId for cascade delete"

duration: ~15 min
completed: 2026-02-14
---

# Phase 2 Plan 03: Document upload + tRPC CRUD Summary

**Document upload pipeline (PDF/DOCX/TXT, 10MB) with parse, chunk, embed into memories; tRPC CRUD for conversations, documents, and user facts with userId isolation.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-02-14
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- parseDocument (unpdf for PDF, mammoth for DOCX, buffer for TXT), isSupportedType
- POST /api/documents/upload: multipart, 10MB limit, document record → parse → chunk → embedTexts → batch insert memories (document_chunk), status ready/error
- conversationRouter: list (no messages), get, create, delete (cascade memories by conversationId), updateMode
- documentRouter: list, delete (cascade memory chunks by metadata->>'documentId')
- userFactRouter: list, update (re-embed if fact changed), delete; all filtered by ctx.user.id

## Task Commits

1. **Task 1: Parser + upload route** - `cf1c7ca` (feat)
2. **Task 2: tRPC CRUD** - `6312c03` (feat)

## Files Created/Modified

- apps/server/src/documents/parser.ts, upload-route.ts
- apps/server/src/trpc/router.ts (conversation, document, userFact routers)
- apps/server/src/index.ts (mount documentsApp)
- apps/server/package.json (unpdf, mammoth)

## Decisions Made

None - followed plan.

## Deviations from Plan

- [Rule 3 - Blocking] unpdf API: use getDocumentProxy(buffer) then extractText(pdf, { mergePages: true }); handle text as string | string[] for type safety.

## Issues Encountered

None.

## Next Phase Readiness

Ready for 02-04 (Chat UI, memory page, documents page, verification).

---
*Phase: 02-coaching-memory*
*Completed: 2026-02-14*

## Self-Check: PASSED
