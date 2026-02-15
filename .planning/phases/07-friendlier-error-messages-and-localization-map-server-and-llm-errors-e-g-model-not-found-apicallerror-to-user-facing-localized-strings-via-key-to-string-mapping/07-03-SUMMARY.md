---
phase: 07-friendlier-errors-and-i18n
plan: 03
subsystem: server + web
tags: error-keys, localization, chat-route, errors namespace

requires: [07-01, 07-02]
provides:
  - Server classifies known errors and returns errorKey (errors.modelNotFound, errors.apiKeyMissing, etc.)
  - Stream and 400 responses send errorKey + message; client shows t(errorKey) when present
  - en.json errors.* keys for modelNotFound, apiKeyMissing, apiKeyInvalid, rateLimit, generic
affects: 07-04 (translations for errors.* in other locales)

tech-stack:
  patterns: getErrorPayload(error) -> { errorKey?, message }; JSON in errorText for stream; tErrors() on client

key-files:
  modified: apps/server/src/coaching/chat-route.ts, apps/web/src/app/[locale]/(app)/chat/[id]/page.tsx, apps/web/messages/en.json (errors already present from 07-02)

key-decisions:
  - "Stream error payload: JSON.stringify({ errorKey, message }) so client can parse and use t(errorKey)"
  - "400 for ApiKeyRequiredError returns { errorKey, error } for future client handling of non-stream failures"
  - "Fallback: no errorKey -> show message; client parse fails -> show raw message"

duration: ~25min
completed: 2026-02-15
---

# Phase 07: Plan 03 Summary

**Error key mapping: server classifies errors and returns stable keys; chat page shows localized messages via t(errorKey).**

## Accomplishments

- **Server (chat-route.ts):**
  - Added `ERROR_KEYS` and `getErrorPayload(error)` to classify ApiKeyRequiredError, API key invalid, model not found, rate limit; fallback uses `extractUserFacingErrorMessage`.
  - Stream path: `wrapStreamWithErrorChunk` and `toUIMessageStreamResponse` `onError` send `errorText` as JSON `{ errorKey, message }` when classified, else plain message.
  - Pre-stream 400 for `ApiKeyRequiredError` now returns `{ errorKey: "errors.apiKeyMissing", error }`.
- **Client (chat [id] page):**
  - Uses `useTranslations("errors")`; parses `chatError.message` as JSON; if `errorKey` present, shows `tErrors(errorKey)` (strip `errors.` prefix); else `error`/`message` or raw message.
- **Locales:** en.json already had errors.*; other locale JSONs synced from en.json for key coverage.

## Decisions Made

- Error keys are full namespace path (`errors.modelNotFound`) in payload; client strips `errors.` when calling `tErrors("modelNotFound")`.
- Registry/load-env TypeScript errors in server are pre-existing; chat-route stream type fixed with `ReadableStream<UIMessageChunk>` cast.

## Next

- 07-04: Add real translations for errors.* (and rest of messages) in fr-FR, it, ja, zh-CN, en-GB.
- Optional: Have client handle 400 response body (errorKey) if useChat/fetch exposes it.

---
*Phase: 07-friendlier-errors-and-i18n | Plan: 03*
*Completed: 2026-02-15*
