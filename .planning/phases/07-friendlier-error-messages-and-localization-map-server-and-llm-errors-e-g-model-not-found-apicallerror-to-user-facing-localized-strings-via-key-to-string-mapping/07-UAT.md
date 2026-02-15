---
status: complete
phase: 07-friendlier-error-messages-and-localization
source: 07-01-SUMMARY.md, 07-03-SUMMARY.md, 07-04-SUMMARY.md
started: "2026-02-15T00:00:00Z"
updated: "2026-02-15T17:35:00Z"
---

## Current Test

[testing complete]


## Tests

### 1. Root and locale routing
expected: Visiting / redirects to /en (or browser locale). /en/dashboard and /en/login load. Unauthenticated redirect goes to /[locale]/login.
result: pass

### 2. Locale switcher in sidebar
expected: Sidebar shows a locale control (e.g. dropdown) with System, English, Français, Italiano, 日本語, 简体中文, British English. Selecting a language reloads the page and the URL reflects the new locale (e.g. /fr-FR).
result: pass

### 3. French locale displays translated UI
expected: After switching to Français (fr-FR), key UI appears in French: e.g. sidebar "Tableau de bord", "Paramètres", "Déconnexion"; login "Se connecter"; common buttons "Enregistrer", "Annuler". No blank or missing strings.
result: pass

### 4. Chat shows friendly error messages
expected: When a known error occurs in chat (e.g. no API key set), the chat UI shows a friendly message from the errors namespace (e.g. "No API key is set. Add one in Settings." or French equivalent in fr-FR), not a raw stack trace or provider message.
result: pass

### 5. Main pages use translation keys
expected: Dashboard, Settings, Agents, Documents, Memory, Projects (list and detail) show consistent text in the current locale (English for en, French for fr-FR where translated). No obvious hardcoded or missing strings.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
