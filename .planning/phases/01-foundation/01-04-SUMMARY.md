---
phase: 01-foundation
plan: "04"
subsystem: ui
tags: nextjs, better-auth, trpc, react-query

requires:
  - phase: 01-02
    provides: Better Auth, tRPC, settings procedures
  - phase: 01-03
    provides: LLM registry / listProviders
provides:
  - Auth client + tRPC client with credentials
  - Login, signup, dashboard, settings pages
  - AuthGuard-protected (app) routes
affects: Phase 2

tech-stack:
  added: better-auth (react), @trpc/react-query, @trpc/client, @tanstack/react-query
  patterns: NEXT_PUBLIC_SERVER_URL, credentials include, useSession + redirect

key-files:
  created:
    - apps/web/src/lib/auth-client.ts
    - apps/web/src/lib/trpc.ts
    - apps/web/src/providers/index.tsx
    - apps/web/src/components/auth-guard.tsx
    - apps/web/src/app/(auth)/login/page.tsx
    - apps/web/src/app/(auth)/signup/page.tsx
    - apps/web/src/app/(app)/layout.tsx
    - apps/web/src/app/(app)/dashboard/page.tsx
    - apps/web/src/app/(app)/settings/page.tsx
  modified:
    - apps/web/src/app/layout.tsx
    - apps/web/src/app/page.tsx
    - apps/web/src/app/globals.css
    - apps/server/package.json (exports ./trpc)

key-decisions:
  - "Use @trpc/react-query (createTRPCReact) instead of @trpc/tanstack-react-query for hooks API"
  - "Server exports ./trpc for AppRouter type to web"

duration: ~25 min
completed: "2026-02-14"
---

# Phase 1 Plan 4: Frontend auth + settings — Summary

**Login, signup, dashboard, and settings UI with Better Auth client and tRPC; session persists, settings per-user.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2 (Task 3 = human verify)
- **Files created/modified:** 14+

## Accomplishments

- Auth client (better-auth/react), tRPC client with credentials include, Providers + AuthGuard
- Login: email/password + Google/Microsoft OAuth; signup: name/email/password
- Dashboard: welcome, sign out, link to settings
- Settings: provider/model dropdowns, save via trpc.settings.update
- Root / redirects by session; (app) layout wraps routes in AuthGuard

## Task Commits

1. **Task 1: Auth client, tRPC, providers, auth guard** — `d97ce0a` (feat)
2. **Task 2: Login, signup, dashboard, settings pages** — `99ca3c6` (feat)

## Deviations from Plan

- Used @trpc/react-query (createTRPCReact) because @trpc/tanstack-react-query in v11 does not export createTRPCReact.

## Issues Encountered

None.

## Human verification (Task 3)

Run through the steps in 01-04-PLAN.md Task 3. Reply **approved** if all checks pass, or describe any issues.

## Next Phase Readiness

- Phase 1 Foundation complete pending your verification. Then Phase 2 (Coaching & Memory) can be planned.

---
*Phase: 01-foundation*
*Completed: 2026-02-14*
