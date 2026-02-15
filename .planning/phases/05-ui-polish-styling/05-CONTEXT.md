# Phase 5: UI Polish & Styling - Context

**Created:** 2026-02-14
**Source:** /gsd:discuss-phase equivalent (conversation with user)

## Decisions

### 1. Conversation Model: Hybrid coaching + task threads
**Decision:** Single pinned coaching thread + separate task threads for agent dispatches.
- **Coaching thread:** Always present, pinned at top of sidebar. This is the ongoing coaching relationship.
- **Task threads:** Created automatically when an agent dispatch is approved. Each task gets its own thread (e.g., "Contract Review - Feb 14"). These are archivable/deletable independently.
- **Reset button:** Clears coaching conversation messages but memory/userFacts persist. Fresh chat, same coach who knows you.

### 2. Agent dispatch results: Inline summary + task thread
**Decision:** When user approves an agent dispatch in the coaching chat:
- A compact summary card appears inline in the coaching thread: agent name, task description, "View result" link
- The full agent output lives in its own task thread
- The coach can reference the task result naturally in subsequent coaching messages
- This keeps the coaching conversation clean and conversational

### 3. Sidebar layout
**Decision:** Conversation sidebar structure:
```
Coaching (pinned)           [reset]
───────────────────────────
Recent Tasks
  Contract Review            Feb 14
  Meeting Prep               Feb 13
  Email Draft                Feb 12
```
- Coaching thread always pinned at top with reset button
- Task threads listed below by recency
- Task threads are archivable/deletable

## Claude's Discretion

- Visual styling choices (colors, spacing, component variants) -- use shadcn/ui Neutral palette as researched
- Font choice (Inter recommended)
- Dark mode implementation details
- Component placement in monorepo (apps/web/src/components/ui/)
- Loading/skeleton state patterns
- Mobile breakpoint specifics

## Deferred Ideas

- None
