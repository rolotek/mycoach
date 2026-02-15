---
phase: 05-ui-polish-styling
plan: 08
subsystem: web
tags: agent-result, summary-card, coaching-thread, task-thread

requires: [{ phase: "05-06", provides: "taskThreadId in dispatch output" }]
provides: [AgentSummaryCard in coaching thread, View result link to task thread]
affects: [agent-result.tsx, message-list.tsx]

key-files: { modified: ["agent-result.tsx", "message-list.tsx"] }
duration: ~10 min
completed: 2026-02-14
---

# Phase 5 Plan 8: Inline Agent Summary Cards Summary

**AgentSummaryCard added: compact card with agent name badge, truncated task, and "View result" link to /chat/{taskThreadId}. Message-list renders AgentSummaryCard when output.taskThreadId exists; otherwise falls back to full AgentResultCard (legacy).**

## Changes
- **agent-result.tsx:** New AgentSummaryCard (Badge, task line, Link with ExternalLink to task thread).
- **message-list.tsx:** Import AgentSummaryCard; output type and part cast include taskThreadId; when part.state === "output-available" and out.taskThreadId, render AgentSummaryCard; else render AgentResultCard.

## Next
Ready for 05-09 (integration fixes + human verification).
