---
phase: 07-friendlier-errors-and-i18n
plan: 04
subsystem: web (messages)
tags: translations, fr-FR, locales

requires: [07-02, 07-03]
provides:
  - Same key structure in all locale files (en, fr-FR, it, ja, zh-CN, en-GB)
  - French (fr-FR) translations for common, auth, sidebar, theme, errors
  - Fallback to en for any missing key (next-intl defaultLocale)
affects: Phase 7 complete

tech-stack:
  patterns: messages/{locale}.json; next-intl loads by locale; LocaleToggle (07-01) switches

key-files:
  modified: apps/web/messages/en.json (full keys from 07-02), fr-FR.json (French for common, auth, sidebar, theme, errors)
  synced: it.json, ja.json, zh-CN.json, en-GB.json (copy of en.json for key coverage)

key-decisions:
  - "fr-FR: Translated common, auth, sidebar, theme, errors; other namespaces fall back to English"
  - "it, ja, zh-CN, en-GB: Same keys as en; values currently English; can be filled with real translations later"
  - "Locale switcher already in place (07-01); switching to fr-FR shows French where translated"

duration: ~20min (07-04); 07-02 remainder ~60min
completed: 2026-02-15
---

# Phase 07: Plan 04 Summary

**Translations and locale message files. 07-02 remainder (settings, agents, documents, memory, projects) completed; 07-04 locale files and French (fr-FR) sample translations.**

## Accomplishments

### 07-02 (remainder)
- **en.json** expanded with full keys for: settings, agents, documents, memory, projects (including descriptionLabel, archive, unarchive, and all project detail strings).
- **Settings page:** All UI strings use `t()` / `tCommon()` from settings and common namespaces.
- **Agents page & [id]:** Titles, dialogs, buttons, VersionCard use agents and common; feedbackTotal uses interpolation.
- **Documents page:** Title, description, dropOrClick, uploading, yourDocuments, noDocumentsYet, deleteConfirm, uploadFailed.
- **Memory page:** Title, description, noFactsYet, removeFactConfirm; Save/Cancel from common.
- **Projects list & [id]:** Full projects namespace; task/milestone loops use `task` variable to avoid shadowing translation `t`.

### 07-04
- **fr-FR.json:** French (France) translations for: common, auth, sidebar, theme, errors. Other namespaces use English (fallback).
- **it, ja, zh-CN, en-GB:** Key set kept in sync with en.json (content English). Structure ready for Italian, Japanese, Simplified Chinese, and British English translations.
- **Verification:** Web build succeeds; all six locales generate static pages.

## Next Steps (optional)

- Add full French for chat, settings, dashboard, agents, documents, memory, projects in fr-FR.json.
- Add Italian (it), Japanese (ja), Simplified Chinese (zh-CN), and British English (en-GB) translations to the corresponding message files.
- Use professional translation or incremental copy-from-en-and-translate for each namespace.

---
*Phase: 07-friendlier-errors-and-i18n | Plan: 04*
*Completed: 2026-02-15*
