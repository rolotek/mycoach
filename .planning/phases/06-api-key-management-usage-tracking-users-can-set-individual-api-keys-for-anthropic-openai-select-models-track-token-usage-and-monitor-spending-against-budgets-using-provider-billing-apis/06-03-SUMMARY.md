# 06-03 Summary

**Completed:** 2026-02-15

## What was built

- **chat-route.ts:** Budget check before processing (429 when monthly budget exceeded); `resolveUserModel(user.id)` instead of env modelId; `agentPreferredModels` from userAgents; `buildChiefOfStaff` receives `model: resolved.model` and `agentPreferredModels`; streamText uses `resolved.model` and `onFinish` calls `trackUsage` (fire-and-forget); `checkBudget` and `trackUsage` helpers added.
- **agent-executor.ts:** Signature now `(agent, task, context, userId, conversationId, agentPreferredModel?)`; uses `resolveUserModel(userId, agentPreferredModel)` and `resolved.model` for generateText; inserts into `tokenUsage` after each run (fire-and-forget) with `calculateCostCents`.
- **chief-of-staff.ts:** `buildChiefOfStaff` params: `model: LanguageModel`, `agentPreferredModels` (no modelId); `buildAgentTools(agents, userId, conversationId, agentPreferredModels)`; ToolLoopAgent uses `params.model`.
- **agent-tools.ts:** `AgentRow` includes `preferredModel?`; `buildAgentTools(agents, userId, conversationId, agentPreferredModels?)`; execute passes `agentPreferredModels?.[agent.id] ?? agent.preferredModel ?? null` to `executeSpecialistAgent`.
- **resolve-approved-dispatch.ts:** `resolveApprovedDispatchTools` no longer takes modelId; calls `executeSpecialistAgent(..., userId, conversationId, agent.preferredModel ?? null)`.
- **No env fallback:** For anthropic/openai/google, `resolveUserModel` requires the user to have a stored API key; if not, it throws `ApiKeyRequiredError` with a message like "Please add your Anthropic API key in Settings to use this model." Chat route catches it and returns 400 with that message; agent executor stores the message on failed execution.

## Verification

- No new linter errors. Budget check, token tracking, and per-user/per-agent model resolution are wired through chat and agent paths.

## Key files

- `apps/server/src/coaching/chat-route.ts`
- `apps/server/src/agents/agent-executor.ts`
- `apps/server/src/agents/chief-of-staff.ts`
- `apps/server/src/agents/agent-tools.ts`
- `apps/server/src/agents/resolve-approved-dispatch.ts`
