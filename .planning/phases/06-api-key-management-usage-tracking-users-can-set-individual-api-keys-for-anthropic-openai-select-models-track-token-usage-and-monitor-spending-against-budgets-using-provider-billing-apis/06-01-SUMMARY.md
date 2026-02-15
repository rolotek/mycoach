# 06-01 Summary

**Completed:** 2026-02-15

## What was built

- **Database:** `user_api_keys` and `token_usage` tables; `user_settings.monthly_budget_cents`; `agents.preferred_model`. Relations for userApiKeys and tokenUsage.
- **Encryption:** `apps/server/src/crypto/encryption.ts` — AES-256-GCM `encrypt`/`decrypt`, 32-byte hex key from `API_KEY_ENCRYPTION_KEY`.
- **Pricing:** `apps/server/src/llm/pricing.ts` — `MODEL_PRICING` lookup and `calculateCostCents(model, inputTokens, outputTokens)` (hundredths of a cent).
- **Shared schema:** `packages/shared/src/schemas/settings.ts` — `monthlyBudgetCents` added to `updateSettingsSchema`.
- **Env:** `.env.example` documents `API_KEY_ENCRYPTION_KEY`; local `.env` received a generated key.

## Verification

- `npx drizzle-kit push` (from apps/server) succeeded.
- Encrypt/decrypt round-trip and encrypted format (iv:authTag:ciphertext) verified.
- `calculateCostCents` returns > 0 for known model, 0 for unknown.
- `npm run type-check` still fails due to pre-existing errors in chat-route.ts, registry.ts, load-env.ts (unchanged by this plan).

## Key files

- `apps/server/src/db/schema.ts` — new tables and columns
- `apps/server/src/crypto/encryption.ts` — new
- `apps/server/src/llm/pricing.ts` — new
- `packages/shared/src/schemas/settings.ts` — updated
- `.env.example` — updated
