---
phase: 08-projects
plan: 02
subsystem: api
tags: trpc, projects, crud

requires:
  - phase: 08-01
    provides: projects, project_documents, project_links, project_milestones, project_tasks schema
provides:
  - project.list, project.get (with nested documents, links, milestones, tasks)
  - project.create, project.update, project.delete
  - project.addDocument, project.removeDocument, project.addLink, project.removeLink
  - project listMilestones/createMilestone/updateMilestone/deleteMilestone
  - project listTasks/createTask/updateTask/deleteTask
affects: 08-03, 08-04

tech-stack:
  added: []
  patterns: Auth-scoped project procedures with ownership checks

key-files:
  created: []
  modified: apps/server/src/trpc/router.ts

key-decisions: []
patterns-established:
  - "project.get returns project with documents (id, filename), links, milestones, tasks; addDocument verifies document belongs to user"

duration: 10
completed: 2026-02-15
---

# Phase 08 Plan 02: tRPC project router — Summary

**Full project tRPC router: CRUD for projects, attach/detach documents and links, CRUD for milestones and tasks; all procedures enforce userId from auth.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 1
- **Files modified:** 1 (router.ts)

## Accomplishments

- project.list: user's projects ordered by updatedAt desc.
- project.get(id): single project with nested documents (id, filename), links, milestones, tasks; ownership enforced.
- project.create/update/delete with name, description, status, dueDate.
- addDocument/removeDocument (verify project and document belong to user); addLink/removeLink.
- listMilestones, createMilestone, updateMilestone, deleteMilestone; listTasks, createTask (optional milestoneId, validated against project), updateTask (optional milestoneId), deleteTask (all scoped to project owner). project.get returns tasks with milestoneId for UI grouping.
- Project router mounted at appRouter.project.

## Task Commits

1. **Task 1: Add project tRPC router with CRUD and nested procedures** — `c1d7eab` (feat)

## Files Created/Modified

- `apps/server/src/trpc/router.ts` — projectRouter with all procedures; imports for project tables.

## Decisions Made

None — followed plan as specified.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

Ready for 08-03 (chat/agent project context) and 08-04 (Projects UI). project.get returns full detail shape for UI and for context injection.

---
*Phase: 08-projects*
*Completed: 2026-02-15*
