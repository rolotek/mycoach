---
status: testing
phase: 02-coaching-memory
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md]
started: 2026-02-15T00:00:00Z
updated: 2026-02-15T01:44:01.374Z
---

## Current Test

number: 4
name: Conversation persistence
expected: |
  Refresh the chat page. Previous messages are still visible; conversation loads from the server.
awaiting: user response


## Tests

### 1. New chat and streaming response
expected: Go to /chat, redirect to /chat/[id]. Send a message; coach response streams in. No full-page error.
result: pass

### 2. Mode detection (auto)
expected: Send "What are the pros and cons of hiring a new team member?" — response is structured (task style). Send "I've been feeling overwhelmed lately" — response is reflective (coaching style).
result: pass

### 3. Mode toggle (manual)
expected: Switch mode to Task, send any message — response is structured. Switch to Coaching, send — response is reflective.
result: pass

### 4. Conversation persistence
expected: Refresh the chat page. Previous messages are still visible; conversation loads from the server.
result: pass

### 5. Conversation sidebar
expected: Create 2–3 conversations (e.g. New Chat or new messages). Sidebar lists them. Click between them; the correct thread shows. Delete one; it disappears from the list (with confirm if applicable).
result: pass

### 6. Document upload
expected: Go to /documents. Upload a PDF or TXT (drag-drop or click). File appears in the list with a status (e.g. "ready" or "processing" then "ready"). No upload error.
result: pass

### 7. RAG (coach uses documents)
expected: After uploading a document, go to chat and ask a question that relates to the document content. The coach's response references or uses content from the document (may be optional if embeddings are not configured).
result: issue
reported: "Playwright: failed"
severity: major

### 8. Memory / facts
expected: After a few conversations, go to /memory. Facts extracted from conversations appear, grouped (e.g. by category). Edit a fact (change text, save) — change persists. Delete a fact — it disappears (with confirm if applicable).
result: issue
reported: "Playwright: failed"
severity: major

### 9. Dashboard navigation
expected: Go to /dashboard. Links to Start Coaching Session (chat), Memory & Knowledge, Documents, and Settings work (navigate to the correct pages).
result: pass

## Summary

total: 9
passed: 7
issues: 2
pending: 0
skipped: 0

## Gaps

[none yet]
