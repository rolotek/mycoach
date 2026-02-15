---
phase: 07-friendlier-errors-and-i18n
plan: 01
subsystem: ui
tags: next-intl, i18n, locale, middleware

requires: []
provides:
  - next-intl with [locale] routing and middleware
  - Locale detection from system (Accept-Language); user override via NEXT_LOCALE cookie
  - LocaleToggle in sidebar (System + en, fr-FR, it, ja, zh-CN, en-GB)
  - messages/*.json for all six locales (minimal en; others stubbed for build)
affects: Phase 7 plans 02–04

tech-stack:
  added: next-intl
  patterns: [locale] segment, i18n/navigation (Link, useRouter, usePathname), NEXT_LOCALE cookie

key-files:
  created: apps/web/src/i18n/routing.ts, request.ts, navigation.ts, apps/web/middleware.ts, apps/web/src/app/[locale]/layout.tsx, apps/web/src/components/locale-toggle.tsx, apps/web/messages/en.json, fr-FR.json, it.json, ja.json, zh-CN.json, en-GB.json
  modified: apps/web/next.config.ts, apps/web/src/components/app-sidebar.tsx, apps/web/src/components/auth-guard.tsx

key-decisions:
  - "Locale prefix always (localePrefix: 'always'); all routes under [locale]"
  - "AuthGuard and all app navigation use @/i18n/navigation for locale-aware redirects and links"
  - "Minimal message files for all six locales in 07-01 so SSG build passes; 07-04 will add full translations"

patterns-established:
  - "Use Link, useRouter, usePathname from @/i18n/navigation for any locale-dependent navigation"
  - "useLocale from next-intl for reading current locale in client components"

duration: ~45min
completed: 2026-02-15
---

# Phase 07: Plan 01 Summary

**next-intl i18n foundation with [locale] routing, middleware, and LocaleToggle (system + user override via cookie).**

## Performance

- **Duration:** ~45 min
- **Tasks:** 4
- **Files modified/created:** 20+

## Accomplishments

- Installed next-intl; added i18n/routing.ts (locales: en, fr-FR, it, ja, zh-CN, en-GB), request.ts, navigation.ts.
- Wrapped app with next-intl plugin in next.config; added middleware for locale detection and redirect.
- Moved all routes under [locale]: (app), (auth), page.tsx; root layout unchanged; [locale] layout provides NextIntlClientProvider and getMessages().
- Created messages/en.json (minimal) and stub messages for fr-FR, it, ja, zh-CN, en-GB so generateStaticParams and build succeed.
- Added LocaleToggle (dropdown: System, English, Français, Italiano, 日本語, 简体中文, British English); sets/clears NEXT_LOCALE cookie and reloads; placed next to ThemeToggle in sidebar.
- Replaced all Link/useRouter/usePathname in app and auth-guard with @/i18n/navigation so links and redirects are locale-prefixed.

## Task Commits

1. Task 1: next-intl install + i18n config — (single phase commit)
2. Task 2: middleware + [locale] layout + route move — (single phase commit)
3. Task 3: messages/en.json + provider — (single phase commit)
4. Task 4: LocaleToggle + sidebar — (single phase commit)

## Decisions Made

- Stub locale message files created in 07-01 so SSG builds for all locales; 07-04 will replace with full translations.
- AuthGuard uses i18n useRouter so unauthenticated redirect goes to /[locale]/login.

## Deviations from Plan

None — plan executed as specified.

## Next Phase Readiness

- 07-02 can extract all UI strings to keys and expand en.json.
- 07-03 can add error key mapping using current chat/error display.
- 07-04 can fill fr-FR, it, ja, zh-CN, en-GB with full translations.

---
*Phase: 07-friendlier-errors-and-i18n*
*Completed: 2026-02-15*
