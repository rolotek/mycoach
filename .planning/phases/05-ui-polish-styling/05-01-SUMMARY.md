---
phase: 05-ui-polish-styling
plan: 01
subsystem: ui
tags: shadcn, tailwind, next-themes, react-markdown, design-tokens

# Dependency graph
requires: []
provides:
  - Design system (OKLCH tokens, @theme inline, light/dark)
  - shadcn/ui components in @/components/ui
  - App shell with collapsible sidebar navigation
  - ThemeProvider, ThemeToggle, ChatMarkdown, PageHeader
affects: 05-02, 05-03, 05-04, 05-05

# Tech tracking
tech-stack:
  added: shadcn/ui, next-themes, react-markdown, remark-gfm, tw-animate-css, lucide-react, clsx, tailwind-merge, radix-ui
  patterns: CSS-first design tokens in globals.css, SidebarProvider + SidebarInset app shell, cn() for class composition

key-files:
  created: postcss.config.mjs, components.json, src/lib/utils.ts, src/components/ui/*, theme-provider.tsx, theme-toggle.tsx, app-sidebar.tsx, page-header.tsx, chat-markdown.tsx
  modified: globals.css, layout.tsx, (app)/layout.tsx, providers (via layout), auth-guard.tsx, package.json

key-decisions: []

patterns-established:
  - "Design tokens: OKLCH CSS variables in :root/.dark with @theme inline for Tailwind"
  - "App shell: SidebarProvider > AppSidebar + SidebarInset (header + main); main is flex-1 flex-col, pages add padding"
  - "Shared markdown: ChatMarkdown with react-markdown + remark-gfm for chat and agent output"

# Metrics
duration: ~15 min
completed: 2026-02-14
---

# Phase 5 Plan 1: Design System Foundation Summary

**shadcn/ui design system with OKLCH tokens, dark mode, Inter font, app shell (collapsible sidebar), and shared ChatMarkdown/PageHeader components**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-14
- **Completed:** 2026-02-14
- **Tasks:** 2
- **Files modified:** 23 created/updated

## Accomplishments
- PostCSS config and shadcn init with 17 UI components (button, card, input, textarea, label, badge, dialog, dropdown-menu, separator, skeleton, scroll-area, sheet, sidebar, tabs, tooltip, avatar)
- Full design token setup in globals.css (light/dark, @theme inline, base layer)
- ThemeProvider + ThemeToggle (light/dark/system); Inter via next/font; TooltipProvider in root layout
- AppSidebar with nav (Dashboard, Chat, Agents, Memory, Documents, Settings), theme toggle and sign-out in footer
- (app) layout: SidebarProvider, AppSidebar, SidebarInset with header (SidebarTrigger) and flex main
- PageHeader, ChatMarkdown (react-markdown + remark-gfm) for shared use; AuthGuard loading uses Skeleton

## Task Commits

1. **Task 1: Install dependencies, init shadcn/ui, install components** - `3a73b79` (feat)
2. **Task 2: Create app shell and wire into layouts** - `edd819c` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `apps/web/postcss.config.mjs` - PostCSS for Tailwind v4
- `apps/web/components.json` - shadcn/ui config
- `apps/web/src/lib/utils.ts` - cn() utility
- `apps/web/src/app/globals.css` - OKLCH design tokens, @theme inline, base layer
- `apps/web/src/components/ui/*` - 17 shadcn components
- `apps/web/src/components/theme-provider.tsx` - next-themes wrapper
- `apps/web/src/components/theme-toggle.tsx` - light/dark/system dropdown
- `apps/web/src/components/app-sidebar.tsx` - Nav sidebar with links and footer
- `apps/web/src/components/page-header.tsx` - Reusable page title/description/actions
- `apps/web/src/components/chat-markdown.tsx` - react-markdown + remark-gfm
- `apps/web/src/app/layout.tsx` - Inter, ThemeProvider, TooltipProvider
- `apps/web/src/app/(app)/layout.tsx` - SidebarProvider, AppSidebar, SidebarInset
- `apps/web/src/components/auth-guard.tsx` - Skeleton loading state

## Decisions Made
None - followed plan as specified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
Design system and app shell are in place. Ready for 05-02 (auth/dashboard/settings restyle), 05-03 (chat restyle), 05-04 (agents/memory/documents restyle). All pages still render inside the new shell; Plans 02–04 will restyle them.

---
*Phase: 05-ui-polish-styling*
*Completed: 2026-02-14*
