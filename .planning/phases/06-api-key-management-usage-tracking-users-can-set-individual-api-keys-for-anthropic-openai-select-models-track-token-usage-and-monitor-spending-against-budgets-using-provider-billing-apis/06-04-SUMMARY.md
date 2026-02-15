# 06-04 Summary

**Completed:** 2026-02-15

## What was built

- **usageRouter:** `usage.summary` protected procedure returns current-month breakdown by provider/model (totalInput, totalOutput, totalCost, requestCount), **byProvider** (cost per provider for UI), totalCostCents, monthlyBudgetCents, periodStart. Registered as `usage` on appRouter.
- **Settings page:** API Keys card (Anthropic/OpenAI/Google: input + Save & Verify, masked display + Delete, validation feedback); LLM Configuration card extended with monthly budget input (dollars, stored as cents) and note about per-agent models; Usage this month card (total spend in dollars, **estimated cost by provider** e.g. Anthropic: $X.XX · OpenAI: $X.XX, optional budget progress bar, breakdown table: model, requests, input/output tokens, est. cost). Uses trpc.apiKey.list/save/delete, trpc.usage.summary, and settings.update with monthlyBudgetCents.

## Verification

- Web app build (`apps/web`) succeeds. Monorepo full build still fails on pre-existing server TS errors (chat-route, registry, load-env).

## Key files

- `apps/server/src/trpc/router.ts` — usageRouter, usage in appRouter
- `apps/web/src/app/(app)/settings/page.tsx` — API keys, budget, usage dashboard
