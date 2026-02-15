# Verify-work extension: Playwright E2E

**Purpose:** Run Playwright E2E tests as part of verify-work and merge results into UAT. This file is referenced from the verify-work **command** only; the core workflow in get-shit-done stays unchanged.

**Do not add this logic into** `.cursor/get-shit-done/workflows/verify-work.md` — that file may be overwritten by GSD updates.

---

## When to run

Execute this extension **after** the workflow step `create_uat_file` (or when resuming from an existing UAT file) and **before** the first `present_test`. If the phase has no Playwright spec, skip and continue to `present_test`.

## Steps

### 1. Resolve UAT and spec

- From verify-work you have `phase_dir` (e.g. `.planning/phases/01-foundation`) and phase number (e.g. `01`).
- UAT file: `{phase_dir}/{phase}-UAT.md` (e.g. `01-UAT.md`).
- Playwright spec: `e2e/{phase}-*.spec.ts` (one spec file per phase; script finds by convention). Examples: `e2e/01-foundation.spec.ts`, `e2e/02-coaching-memory.spec.ts`.

### 2. Run Playwright and merge

From repo root:

```bash
node scripts/playwright-from-uat.js --uat ".planning/phases/01-foundation/01-UAT.md"
```

Or with phase number (script infers UAT path):

```bash
node scripts/playwright-from-uat.js --phase 01
```

- The script runs `npx playwright test e2e/01-foundation.spec.ts` (or the spec for that phase), parses the JSON reporter output, and updates the UAT file: for each test that has `result: [pending]` and a matching Playwright result, set `result: pass` or `result: issue` (with `reported: "Playwright: <error summary>"` and inferred severity).
- If the script fails (e.g. dev servers not running, or no spec for phase), log a brief message and continue to conversational UAT without failing the workflow.

### 3. Recompute summary and current test

- After merging, recompute the UAT Summary (passed, issues, pending, skipped).
- Set **Current Test** to the first test that still has `result: [pending]`.
- Proceed to `present_test` for that test (or to `complete_session` if none pending).

## Script contract

- `scripts/playwright-from-uat.js` accepts `--uat <path>` or `--phase <NN>`.
- It reads the UAT file, runs the phase’s Playwright spec, parses results (test title must match `N. Test name` for mapping), and writes back only tests that were `[pending]` and now have a Playwright outcome. It does not overwrite existing `pass` / `issue` / `skipped`.
- Specs live under `e2e/` and use titles like `1. Dev server starts` so the script can map by number.

## Phases with Playwright specs

| Phase | Spec | Notes |
|-------|------|--------|
| 01-foundation | `e2e/01-foundation.spec.ts` | Auth, settings, isolation, OAuth buttons |
| 02-coaching-memory | `e2e/02-coaching-memory.spec.ts` | Chat, streaming, mode toggle, sidebar, documents, memory, dashboard. Requires TEST_USER_EMAIL/PASSWORD; LLM (e.g. Ollama) for chat tests. |
| 03-agent-system | `e2e/03-agent-system.spec.ts` | Agents page CRUD, dashboard link, chat approval/deny and agent result cards. Requires TEST_USER_EMAIL/PASSWORD; LLM for chat routing and execution. |
| 05-ui-polish-styling | `e2e/05-ui-polish.spec.ts` | UI polish (login, sidebar, dashboard, theme, chat, agents, memory, documents, settings, dark mode) and conversation model (coaching redirect, sidebar Coaching/Recent Tasks, task thread read-only, reset confirm). Requires TEST_USER_EMAIL/PASSWORD. Tests 12–15 require coaching/task-thread backend (05-06–05-09). |

## Adding Playwright for a new phase

1. Add `e2e/{phase}-{name}.spec.ts` (e.g. `e2e/03-agent.spec.ts`) with test titles matching the UAT test list (`N. Test name`).
2. Ensure `playwright-from-uat.js` can resolve phase → spec (by convention `e2e/{phase}-*.spec.ts`).
3. Add a row to the **Phases with Playwright specs** table above.
