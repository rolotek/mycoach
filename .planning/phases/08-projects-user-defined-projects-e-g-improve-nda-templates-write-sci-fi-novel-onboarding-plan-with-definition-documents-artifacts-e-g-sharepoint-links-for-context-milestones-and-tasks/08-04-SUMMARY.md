---
phase: 08-projects
plan: 04
subsystem: ui
tags: projects, list, detail, shadcn

requires:
  - phase: 08-02
    provides: trpc.project.* procedures
  - phase: 08-03
    provides: /chat?projectId=xxx for Open chat
provides:
  - Projects list page; project detail with definition, documents, links, milestones, tasks; Open chat for this project
affects: []

tech-stack:
  added: []
  patterns: trpc.project.list/get, document list for attach selector

key-files:
  created: apps/web/src/app/(app)/projects/page.tsx, apps/web/src/app/(app)/projects/[id]/page.tsx
  modified: apps/web/src/components/app-sidebar.tsx

key-decisions: []
patterns-established:
  - "Project detail: definition card (name, description, status, due), Documents & links card, Milestones card, Tasks card, Open chat button in header"

duration: 15
completed: 2026-02-15
---

# Phase 08 Plan 04: Projects UI — Summary

**Projects list page and project detail page with definition, documents/links, milestones, tasks, and Open chat for this project.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 4
- **Files modified:** 3 (2 new pages, sidebar)

## Accomplishments

- Projects list page: trpc.project.list, cards with name, status, due date, link to /projects/[id]; New project dialog (name, description); Projects link in app sidebar.
- Project detail: trpc.project.get(id); Definition section (name, description, status, due date) with inline edit and Select for status; Documents section (list attached, attach from document list via Select, remove); Links section (list with external link, add form url+label, remove); Milestones (list, add by title, delete); Tasks (list with title, description, status, due, link to task thread if conversationId, add form, delete).
- "Open chat for this project" button in project detail header links to /chat?projectId=xxx so coach receives project context.

## Task Commits

1. **Task 1: Projects list page and navigation** — `13f5da8` (feat)
2. **Task 2–4: Project detail definition, artifacts, milestones, tasks, Open chat** — same commit

## Files Created/Modified

- apps/web/src/app/(app)/projects/page.tsx (list + new project dialog)
- apps/web/src/app/(app)/projects/[id]/page.tsx (detail with all sections)
- apps/web/src/components/app-sidebar.tsx (Projects nav item)

## Decisions Made

None — followed plan as specified.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

Phase 8 complete. User can create projects, attach documents and links, add milestones and tasks, and open chat with project context.

---
*Phase: 08-projects*
*Completed: 2026-02-15*
