---
status: complete
phase: 06-api-key-management-usage-tracking
source: 06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md, 06-05-SUMMARY.md, 06-06-SUMMARY.md
started: 2026-02-15T00:00:00Z
updated: 2026-02-15T00:00:00Z
---

**E2E:** Run Playwright spec for Phase 6 (includes 06-06 per-message model display):
`npx playwright test e2e/06-api-key-usage.spec.ts`
Requires TEST_USER_EMAIL, TEST_USER_PASSWORD, dev servers, and a working coach LLM (e.g. Ollama or cloud API key) for test 10.

## Current Test

[testing complete]

## Tests

### 1. Settings shows API Keys, LLM Configuration, and Usage sections
expected: Settings page shows headings for API Keys, LLM Configuration, and Usage this month; the API Keys section includes text about adding your own API keys to use your accounts.
result: pass

### 2. API Keys section shows Anthropic, OpenAI, and Google (Gemini) with Save & Verify when no key
expected: API Keys section lists Anthropic, OpenAI, and Google (Gemini); each has a Save & Verify button when no key is stored (three Save & Verify buttons in total).
result: pass

### 3. Invalid API key shows error message
expected: Entering an invalid API key (e.g. sk-ant-invalid-key-for-e2e-test) and clicking Save & Verify shows an error message such as "Invalid API key" or "could not authenticate with provider".
result: pass

### 4. LLM Configuration has Provider, Model, Monthly budget and Save
expected: LLM Configuration has Provider and Model dropdowns, a Monthly budget input, a Save button, and helper text about setting a monthly spending limit in dollars.
result: pass

### 5. Usage this month shows total, cost by provider when present, or empty state
expected: Usage this month card shows either a total spend (e.g. $X.XX) or the empty state "No usage this period yet". When there is usage from cloud providers, cost by provider (e.g. Anthropic: $X.XX) is also shown.
result: pass

### 6. Agent detail shows Preferred model dropdown and Save
expected: On the Agents page, opening an agent (e.g. Contract Attorney → View History) shows a Preferred model label, helper text about overriding the default, a dropdown (combobox), and a Save button.
result: pass

### 7. Preferred model select opens and has Use Default option
expected: Opening the Preferred model dropdown on an agent detail page shows an option "Use Default" plus provider/model options.
result: pass

### 8. Saving agent preferred model persists after reload
expected: Selecting "Use Default" (or another option), clicking Save, waiting for save to complete, then reloading the page shows the same selection (e.g. combobox still shows "Use Default").
result: pass

### 9. Usage this month shows breakdown table (Model, Est. cost) or empty state
expected: In the Usage this month card, either the breakdown table is visible (with column headers such as Model and Est. cost) or the empty state "No usage this period yet" is shown.
result: pass

### 10. Chat shows Coach message with model name after reply (06-06)
expected: In chat, after sending a message and receiving a coach reply, the assistant message shows the model used (e.g. "Coach · Gemini 2.0 Flash" or "Coach · Llama 3.1 8B"). Run E2E: `npx playwright test e2e/06-api-key-usage.spec.ts --grep "10"`. Requires a working coach LLM (Ollama or cloud provider with API key in Settings).
result: [pending — run Playwright test 10]

## Summary

total: 10
passed: 9
issues: 0
pending: 1
skipped: 0

## Gaps

[none yet]
