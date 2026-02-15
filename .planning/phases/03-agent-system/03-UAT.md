---
status: testing
phase: 03-agent-system
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md
started: 2026-02-15T00:00:00Z
updated: 2026-02-15T02:22:38.988Z
---

## Current Test

[testing complete - no pending tests]


## Tests

### 1. Agents page shows four starter templates
expected: Navigate to /agents; page shows four starter agents (Contract Attorney, Comms Writer, Meeting Prep, Research Analyst) with names, descriptions, and "Starter" badge.
result: pass

### 2. Create a new custom agent
expected: On /agents, use Create Agent; fill name, description, and system prompt; save. The new agent appears in the list.
result: pass

### 3. Edit an agent
expected: On /agents, click Edit on an agent, change name or description, save. Changes persist and are visible in the list.
result: pass

### 4. Delete an agent
expected: On /agents, click Delete on a custom agent, confirm. The agent disappears from the list.
result: pass

### 5. Dashboard links to Agents
expected: On dashboard, an "Agents" link is visible and goes to /agents.
result: pass

### 6. Chat — coaching question gets direct response
expected: In /chat, send "Help me think through whether to take this new job offer." The coach responds directly with advice; no approval card or agent suggestion appears.
result: pass

### 7. Chat — task request shows approval card
expected: In /chat, send "Draft an email to my team announcing our Q1 priorities." An approval card appears suggesting delegation to the Comms Writer agent, with Approve and Deny buttons.
result: pass

### 8. Chat — approve agent dispatch
expected: After the approval card from test 7, click Approve. The agent runs and a result card appears in the chat with the drafted email (or similar output from Comms Writer).
result: pass
severity: major

### 9. Chat — task suggests Contract Attorney
expected: In /chat, send "Review this contract clause: The vendor may terminate at any time with 30 days notice." An approval card suggests the Contract Attorney agent.
result: pass

### 10. Chat — deny agent dispatch
expected: After the approval card from test 9, click Deny. A "declined" or similar message appears, and the coach acknowledges the denial in the conversation.
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
