---
phase: 05-ui-polish-styling
plan: 07
subsystem: web
tags: chat, sidebar, coaching, task-thread, getOrCreateCoaching, reset

requires: [{ phase: "05-06", provides: "getOrCreateCoaching, reset, listTaskThreads" }]
provides: [Pinned coaching thread, task threads in sidebar, reset button, /chat redirect]
affects: [chat/page.tsx, conversation-sidebar.tsx, chat/[id]/page.tsx]

key-files: { modified: ["chat/page.tsx", "conversation-sidebar.tsx", "chat/[id]/page.tsx"] }
duration: ~20 min
completed: 2026-02-14
---

# Phase 5 Plan 7: Chat Routing + Sidebar Refactor Summary

**/chat uses getOrCreateCoaching and redirects to the single coaching thread. Sidebar shows pinned Coaching with reset button and Recent Tasks (listTaskThreads) below. Chat detail header shows "Coaching" or task title; ModeToggle and ChatInput hidden for task threads; "Back to coaching" link for task threads.**

## Changes
- **chat/page.tsx:** Replaced create mutation with getOrCreateCoaching; redirect to /chat/{id}.
- **conversation-sidebar.tsx:** Rewritten with getOrCreateCoaching on mount; pinned Coaching link + RotateCcw reset (with confirm); Separator; Recent Tasks via listTaskThreads with delete (Trash2); removed collapsed/New Chat; ScrollArea for task list; "No tasks yet" when empty.
- **chat/[id]/page.tsx:** Header title by conv.type (Coaching vs task title); isTaskThread hides ModeToggle and ChatInput; "Back to coaching" link when task thread.

## Next
Ready for 05-08 (inline summary cards) and 05-09 (integration + human verification).
