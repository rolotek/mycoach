---
phase: 01-foundation
plan: "03"
subsystem: api
tags: ai-sdk, provider-registry, anthropic, openai, ollama

requires:
  - phase: 01-01
    provides: server, db
provides:
  - AI SDK provider registry (anthropic, openai, ollama)
  - getModel(modelId), chat(), chatStream(), getAvailableProviders()
affects: 01-04, Phase 2

tech-stack:
  added: ai, @ai-sdk/anthropic, @ai-sdk/openai
  patterns: createProviderRegistry, provider:modelId, only llm/ imports providers

key-files:
  created:
    - apps/server/src/llm/registry.ts
    - apps/server/src/llm/providers.ts
  modified: apps/server/package.json

key-decisions:
  - "Ollama via createOpenAI(baseURL) instead of ollama-ai-provider-v2 (zod 4 peer conflict)"

duration: ~15 min
completed: "2026-02-14"
---

# Phase 1 Plan 3: LLM registry — Summary

**AI SDK provider registry with Anthropic, OpenAI, and Ollama; chat, chatStream, and getAvailableProviders.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2
- **Files created/modified:** 3

## Accomplishments

- createProviderRegistry(anthropic, openai, ollama) with : separator
- Ollama via OpenAI-compatible endpoint (OLLAMA_BASE_URL)
- getModel(), chat(), chatStream(), getAvailableProviders() — all LLM usage through llm/

## Task Commits

1. **Task 1 + 2** — `5c99c62` (feat: registry + providers)

## Deviations from Plan

- ollama-ai-provider-v2 not used (zod ^4 peer); Ollama via createOpenAI(baseURL) per plan fallback.
- chatStream return type cast to avoid TS4058 (Output type from ai not named in declarations).

## Issues Encountered

None.

## Next Phase Readiness

- LLM layer ready for 01-04 (settings UI) and Phase 2 coaching.

---
*Phase: 01-foundation*
*Completed: 2026-02-14*
