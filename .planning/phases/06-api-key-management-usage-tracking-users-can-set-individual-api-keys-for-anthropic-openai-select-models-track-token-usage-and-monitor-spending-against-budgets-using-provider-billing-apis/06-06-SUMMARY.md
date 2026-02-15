# Phase 6 enhancement: Chat per-message model display (06-06)

**Status:** Implemented (post–Phase 6 UX follow-on)  
**Date:** 2026-02-15

## Goal

Show which LLM/model was used for each Coach message in the chat UI (e.g. **Coach · Gemini 2.0 Flash**), and keep that label correct even when the user changes their preferred model in Settings mid-conversation.

## Behavior

- **Per message:** Each assistant (Coach) message can store a `modelId` (e.g. `google:gemini-2.0-flash`) when it is persisted. The UI resolves this to a display name via the provider list and shows **Coach · &lt;display name&gt;** for that message only.
- **No DB migration:** `conversations.messages` is already JSONB; we add an optional `modelId` property on assistant message objects when saving. Old messages have no `modelId`.
- **Old messages:** Messages saved before this change have no `modelId`. The UI shows **Coach** only (no model name) for those, so changing Settings does not change their label.
- **After sending:** The stream does not include `modelId`. When streaming finishes, the client invalidates the conversation query, refetches, and syncs the persisted messages (with `modelId`) into local state so the new reply shows the correct model label.

## Implementation summary

| Area | Change |
|------|--------|
| **Server** `chat-route.ts` | On persist (`onFinish`), tag the last assistant message with `modelId = \`${resolved.provider}:${resolved.modelName}\``. Helper `tagLastAssistantMessageWithModel(msgs, modelId)`. |
| **Web** `message-list.tsx` | `MessageListMessage` has optional `modelId`. Resolve `modelId` → display name via `providers`; show "Coach · {name}" when present, else "Coach". |
| **Web** `chat/[id]/page.tsx` | Pass `providers` and (legacy) `coachModelLabel` to `MessageList`. When status goes from streaming → ready, invalidate `conversation.get`; when conv refetches and message count matches, `setMessages(conv.messages)` so UI gets persisted `modelId`. |

## E2E (06-06)

- **Spec:** `e2e/06-api-key-usage.spec.ts` — test "10. Chat shows Coach message with model name after reply".
- **Steps:** Log in, go to chat, send a short message, wait for coach reply and refetch; assert that an assistant message shows "Coach" and optionally "·" and a model display name (e.g. "Coach · Gemini 2.0 Flash" or "Coach · Llama 3.1 8B").

## Related

- Phase 6 (API key & model selection) provides user-selectable provider/model; this enhancement surfaces which model was used per reply in the chat UI.
