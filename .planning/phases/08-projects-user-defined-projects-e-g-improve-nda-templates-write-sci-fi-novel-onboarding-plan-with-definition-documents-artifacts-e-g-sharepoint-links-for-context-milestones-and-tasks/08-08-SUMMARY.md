---
phase: 08-projects
plan: 08
subsystem: ui
tags: [trpc, react, chat, sidebar]

requires:
  - phase: 08-07
provides:
  - ChatContextBadge in chat showing project/section and doc/link count
  - conversation.listProjectThreads (project-scoped threads with names)
  - Project threads section in app sidebar
affects: []

key-files:
  created: [apps/web/src/components/chat-context-badge.tsx]
  modified: [apps/server/src/trpc/router.ts, apps/web/src/app/[locale]/(app)/chat/[id]/page.tsx, apps/web/src/components/app-sidebar.tsx, apps/web/messages/en.json]

duration: 12min
completed: 2026-02-15
---

# Phase 08 Plan 08: Context badge and project threads in sidebar — Summary

**Chat shows a context badge (project/section + doc/link count); sidebar has a Project threads section with recent project-scoped conversations.**

## Accomplishments

- conversation.listProjectThreads: conversations with projectId not null, join projects and projectMilestones, return id, title, projectId, projectName, milestoneId, milestoneName, updatedAt; limit 10
- ChatContextBadge(projectId, milestoneId): project.get query, project name + optional section + doc/link counts, muted bar with FolderKanban
- Chat [id] page: render badge with projectId/milestoneId from searchParams or conv
- Sidebar: new SidebarGroup "Project threads", listProjectThreads query, each thread links to /chat/:id?projectId&milestoneId with FolderKanban and title + project/section subtitle; empty state "No project threads yet."

## Task Commits

1. **Task 1 + Task 2** - single commit

## Decisions Made

None - followed plan.

## Note

With **getOrCreateProjectThread** (post-08-07), project- and section-level chats are separate conversations. The sidebar "Project threads" list therefore shows distinct threads per project and per section (project name + optional section name), each opening its own conversation.

---
*Phase: 08-projects*
*Completed: 2026-02-15*
