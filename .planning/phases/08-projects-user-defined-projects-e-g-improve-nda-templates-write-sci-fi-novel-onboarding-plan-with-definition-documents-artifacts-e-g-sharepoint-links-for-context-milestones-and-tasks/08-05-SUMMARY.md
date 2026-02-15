---
phase: 08-projects
plan: 05
subsystem: ui
tags: [trpc, drizzle, react, projects]

requires:
  - phase: 08-04
    provides: Projects list and detail UI
provides:
  - pinnedAt on projects; project.list showArchived filter and pinned-first sort; project.togglePin
  - Pin/unpin button on project cards; show completed & archived toggle
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created: [apps/server/drizzle/0001_add_projects_pinned_at.sql]
  modified: [apps/server/src/db/schema.ts, apps/server/src/trpc/router.ts, apps/web/src/app/[locale]/(app)/projects/page.tsx, apps/web/messages/en.json]

key-decisions: []
patterns-established: []

duration: 15min
completed: 2026-02-15
---

# Phase 08 Plan 05: Pinning, smart list sort, archived filter — Summary

**Project list shows pinned projects first with pin/unpin controls and optional show completed/archived toggle.**

## Performance

- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- `pinnedAt` column on projects table; migration generated
- `project.list` accepts optional `showArchived`; filters out completed/archived by default; orders by `pinnedAt DESC`, `updatedAt DESC`; returns `pinnedAt`
- `project.togglePin` procedure toggles pinned state
- Projects list UI: show-archived checkbox, pin/unpin icon per card (with stopPropagation), pinned badge

## Task Commits

1. **Task 1: Add pinnedAt column and update project.list + togglePin** - `e570647`
2. **Task 2: Pin/unpin button and show-archived toggle** - `cacd4c1`

## Files Created/Modified

- `apps/server/src/db/schema.ts` - Added pinnedAt to projects
- `apps/server/src/trpc/router.ts` - list input/showArchived/orderBy/togglePin
- `apps/server/drizzle/0001_add_projects_pinned_at.sql` - Migration
- `apps/web/src/app/[locale]/(app)/projects/page.tsx` - showArchived state, togglePin mutation, toggle UI, pin button and pinned badge
- `apps/web/messages/en.json` - pin, unpin, pinned, showArchived, hideArchived

## Decisions Made

None - followed plan as specified.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

None.

## Next Phase Readiness

08-06 can proceed (typed links and direct upload).

---
*Phase: 08-projects*
*Completed: 2026-02-15*
