---
phase: 08-projects
plan: 06
subsystem: ui
tags: [trpc, drizzle, react, projects, links]

requires:
  - phase: 08-04
    provides: Project detail UI with documents and links
provides:
  - linkType on project_links; addLink auto-detects type; getLinkIcon for UI
  - Upload & attach button on project detail; typed link icons in links list
affects: []

tech-stack:
  added: []
  patterns: []

key-files:
  created: [apps/web/src/lib/link-type-utils.ts, apps/server/drizzle/0002_add_project_links_link_type.sql]
  modified: [apps/server/src/db/schema.ts, apps/server/src/trpc/router.ts, apps/web/src/app/[locale]/(app)/projects/[id]/page.tsx, apps/web/messages/en.json]

key-decisions: []
patterns-established: []

duration: 12min
completed: 2026-02-15
---

# Phase 08 Plan 06: Typed links and direct document upload — Summary

**Project links show type-specific icons (SharePoint, Google Docs, GitHub, etc.) and project detail has Upload & attach for new documents.**

## Performance

- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- `linkType` column on project_links (default "generic"); migration 0002
- `detectLinkType(url)` in router for sharepoint, google-docs, notion, github, gitlab, figma, confluence, dropbox, generic
- `project.addLink` sets linkType from URL; project.get returns linkType
- `getLinkIcon(linkType)` in link-type-utils.ts; project detail uses it for each link
- Upload & attach button: file input, fetch to /api/documents/upload, then addDocument to attach to project

## Task Commits

1. **Task 1: linkType column and detectLinkType in addLink** - `2bd05a1`
2. **Task 2: Link type icons and upload-and-attach on project detail** - `270d031`

## Files Created/Modified

- `apps/server/src/db/schema.ts` - linkType on projectLinks
- `apps/server/src/trpc/router.ts` - detectLinkType, addLink includes linkType
- `apps/web/src/lib/link-type-utils.ts` - getLinkIcon mapping
- `apps/web/src/app/[locale]/(app)/projects/[id]/page.tsx` - getLinkIcon per link, upload button + handler
- `apps/web/messages/en.json` - uploadDocument, uploading

## Decisions Made

None - followed plan as specified.

## Deviations from Plan

None.

## Issues Encountered

None.

## Next Phase Readiness

08-07 (section-level context, per-milestone chat) can proceed.

---
*Phase: 08-projects*
*Completed: 2026-02-15*
