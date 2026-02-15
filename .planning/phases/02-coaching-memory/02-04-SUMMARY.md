---
phase: 02-coaching-memory
plan: "04"
type: execute
wave: 3
tags: [chat-ui, memory-ui, documents-ui, streaming, mode-toggle]

requires:
  - phase: 02-02
    provides: streaming chat, RAG, mode detection, fact extraction
  - phase: 02-03
    provides: document upload, tRPC CRUD
provides:
  - Chat UI with streaming messages, conversation sidebar, mode toggle
  - Memory page: view/edit/delete user facts (tRPC userFact)
  - Documents page: upload (POST /api/documents/upload), list, delete
  - Dashboard links to chat, memory, documents, settings
affects: Phase 2 goal verification

tech-stack:
  added: [@ai-sdk/react, ai DefaultChatTransport]
  patterns: [useChat + transport, tRPC list/get/mutation, fetch FormData upload]

key-files:
  created:
    - apps/web/src/hooks/use-coaching-chat.ts
    - apps/web/src/app/(app)/chat/page.tsx
    - apps/web/src/app/(app)/chat/[id]/page.tsx
    - apps/web/src/app/(app)/chat/components/message-list.tsx
    - apps/web/src/app/(app)/chat/components/chat-input.tsx
    - apps/web/src/app/(app)/chat/components/mode-toggle.tsx
    - apps/web/src/app/(app)/chat/components/conversation-sidebar.tsx
  modified:
    - apps/web/src/app/(app)/memory/page.tsx
    - apps/web/src/app/(app)/documents/page.tsx
    - apps/web/src/app/(app)/dashboard/page.tsx
    - apps/web/package.json

key-decisions: []

patterns-established:
  - "Chat: useCoachingChat(chatId, mode) with DefaultChatTransport to SERVER_URL/api/chat; initial messages from conversation.get, setMessages in useEffect"
  - "Documents upload: fetch POST to SERVER_URL/api/documents/upload with FormData, credentials include"

duration: ~25 min
completed: 2026-02-15
---

# Phase 2 Plan 04: Chat UI + Memory/Documents Pages Summary

**Chat interface with streaming messages, conversation sidebar, mode toggle; memory page (facts CRUD); documents page (upload/list/delete); dashboard links. Human verification checkpoint completed.**

## Accomplishments

- **use-coaching-chat.ts:** useChat + DefaultChatTransport to server /api/chat, body { chatId, mode }, credentials include.
- **Chat:** /chat creates conversation and redirects to /chat/[id]. [id] page loads conversation.get, useCoachingChat(chatId, mode), MessageList, ChatInput, ModeToggle, ConversationSidebar; initial messages set from conv.messages in useEffect.
- **ConversationSidebar:** trpc.conversation.list, New Chat, delete with confirm; activeChatId highlighting.
- **Memory page:** userFact.list grouped by category; inline edit (textarea + Save/Cancel via userFact.update), delete with confirm.
- **Documents page:** file drop/click, fetch POST to /api/documents/upload (FormData), document.list with filename/size/status/date, delete with confirm.
- **Dashboard:** Links to Start Coaching Session (/chat), Memory & Knowledge (/memory), Documents (/documents), Settings.

## Task 3: Human verification

Checklist (9 steps) presented; user continued with phase close-out. Verification report created in 02-VERIFICATION.md.

## Post-execution adjustments (same phase)

- Ollama as default for dev (COACH_CHAT_MODEL / COACH_FACT_MODEL / OLLAMA_MODEL from .env).
- Embeddings: when OPENAI_API_KEY unset, use Ollama /api/embed (nomic-embed-text), pad 768→1536 for schema.
- OLLAMA_BASE_URL normalized to /v1 for OpenAI-compatible chat/completions; load-env fixed for repo root .env.
