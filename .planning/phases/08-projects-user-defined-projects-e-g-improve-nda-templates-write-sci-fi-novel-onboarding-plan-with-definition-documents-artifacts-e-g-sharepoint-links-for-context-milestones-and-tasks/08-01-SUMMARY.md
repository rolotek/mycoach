---
phase: 08-projects
plan: 01
subsystem: database
tags: drizzle, postgres, schema, projects

requires: []
provides:
  - projects table (userId, name, description, status, dueDate)
  - project_documents join table (projectId, documentId)
  - project_links (projectId, url, label)
  - project_milestones (projectId, title, dueDate, sortOrder, status)
  - project_tasks (projectId, optional milestoneId, title, description, status, dueDate, conversationId)
  - optional projectId on conversations and agentExecutions
affects: phase 08 plans 02–04

tech-stack:
  added: []
  patterns: Drizzle relations for projects and nested entities

key-files:
  created: apps/server/drizzle/0000_outstanding_hellion.sql
  modified: apps/server/src/db/schema.ts

key-decisions: []
patterns-established:
  - "Project artifact tables use FK to projects.id with onDelete cascade; optional projectId on conversations/agentExecutions use set null"

duration: 8
completed: 2026-02-15
---

# Phase 08 Plan 01: DB schema for Projects — Summary

**Projects, project_documents, project_links, project_milestones, project_tasks tables and optional projectId on conversations and agentExecutions.**

## Performance

- **Duration:** ~8 min
- **Tasks:** 1
- **Files modified:** 2 (schema.ts, migration SQL)

## Accomplishments

- Added `projects` table with userId, name, description, status, dueDate, createdAt, updatedAt and index on userId.
- Added `project_documents` many-to-many (projectId, documentId) with unique constraint and index.
- Added `project_links` (projectId, url, label), `project_milestones` (projectId, title, dueDate, sortOrder, status), `project_tasks` (projectId, optional milestoneId FK to project_milestones, title, description, status, dueDate, optional conversationId) with indexes; Drizzle relations: milestones have tasks, tasks have milestone.
- Added optional `projectId` to `conversations` and `agentExecutions` with onDelete set null and indexes.
- Added Drizzle relations for projects (user, projectDocuments, projectLinks, projectMilestones, projectTasks, conversations, agentExecutions) and for all new tables; updated user, conversation, document, and agentExecution relations.

## Task Commits

1. **Task 1: Add projects and project artifact tables** — `bff0ef3` (feat)

**Plan metadata:** (docs commit after STATE/ROADMAP update)

## Files Created/Modified

- `apps/server/src/db/schema.ts` — New tables and relations; projectId on conversations and agentExecutions.
- `apps/server/drizzle/0000_outstanding_hellion.sql` — Generated migration snapshot.

## Decisions Made

None — followed plan as specified.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

Ready for 08-02 (tRPC project router). Schema builds; migration generated. Use `db:push` or apply migration for a fresh DB.

---
*Phase: 08-projects*
*Completed: 2026-02-15*
