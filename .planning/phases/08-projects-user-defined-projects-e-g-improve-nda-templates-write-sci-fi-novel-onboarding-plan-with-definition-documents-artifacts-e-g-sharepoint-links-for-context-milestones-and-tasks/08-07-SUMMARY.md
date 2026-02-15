---
phase: 08-projects
plan: 07
subsystem: ui
tags: [trpc, drizzle, react, projects, chat]

requires:
  - phase: 08-05
  - phase: 08-06
provides:
  - milestoneId on project_documents, project_links, conversations
  - addDocument/addLink accept optional milestoneId; loadProjectContext(projectId, userId, milestoneId?) narrows to section
  - Per-milestone "Chat about this section", section docs/links UI
affects: []

key-files:
  created: [apps/server/drizzle/0003_add_milestone_id_to_docs_links_conversations.sql]
  modified: [apps/server/src/db/schema.ts, apps/server/src/trpc/router.ts, apps/server/src/coaching/chat-route.ts, apps/web/src/hooks/use-coaching-chat.ts, apps/web/src/app/[locale]/(app)/chat/page.tsx, apps/web/src/app/[locale]/(app)/chat/[id]/page.tsx, apps/web/src/app/[locale]/(app)/projects/[id]/page.tsx, apps/web/messages/en.json]

duration: 20min
completed: 2026-02-15
---

# Phase 08 Plan 07: Section-level context and per-milestone chat — Summary

**Documents and links can be attached at milestone level; each milestone has "Chat about this section" and section-scoped context in the chat route.**

## Accomplishments

- milestoneId on project_documents, project_links, conversations; migration 0003
- addDocument/addLink accept optional milestoneId with validation; project.get returns milestoneId on docs
- loadProjectContext(projectId, userId, milestoneId?) filters docs/links to section + project-level; "Section: {title}" in prompt when milestoneId set
- Chat body and conversation creation store milestoneId
- useCoachingChat(..., milestoneId); chat pages read milestoneId from searchParams and preserve in redirect
- Project detail: project-level docs/links only in Documents & Links card; per-milestone block with openChatForSection link, section docs (attach dropdown), section links (add form with getLinkIcon)

## Task Commits

1. **Task 1 (backend)** - in d16a11b (with 08-06-SUMMARY)
2. **Task 2 (frontend)** - 7ac2ca6

## Decisions Made

None - followed plan.

## Deviations / Issues

None.

## Post-completion update (separate conversations per project/section)

So that "Chat about this section" uses a **different conversation** (and message history) from the project-level chat and from other sections:

- **conversation.getOrCreateProjectThread** was added: input `{ projectId, milestoneId?: string | null }`. Finds an existing coaching conversation with that `userId`, `projectId`, and `milestoneId` (or creates one). Project-level thread has `milestoneId` null; section-level has `milestoneId` set.
- **Chat page (/chat)** now calls `getOrCreateProjectThread` when the URL has `projectId` (with or without `milestoneId`), and `getOrCreateCoaching` only when there is no `projectId`. Result: one thread per project (open chat for project), one thread per section (chat about this section), each with its own messages.

---
*Phase: 08-projects*
*Completed: 2026-02-15*
