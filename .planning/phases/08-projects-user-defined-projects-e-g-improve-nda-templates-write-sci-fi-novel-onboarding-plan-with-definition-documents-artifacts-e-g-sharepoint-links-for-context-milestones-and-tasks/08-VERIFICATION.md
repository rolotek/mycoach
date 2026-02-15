# Phase 8: Projects — Verification

**Goal:** Users can create and manage projects (name, description, status, due date), attach existing documents and external links as context, define milestones and tasks, and open a chat scoped to a project so the coach and agents receive project context.

## status: passed

## Must-haves (from plans)

| Check | Status | Notes |
|-------|--------|-------|
| projects, project_documents, project_links, project_milestones, project_tasks tables; projectId on conversations and agentExecutions | ✓ | 08-01 schema + migration |
| project.list, project.get, project CRUD, document/link/milestone/task procedures | ✓ | 08-02 tRPC router |
| Chat accepts projectId; project context injected into prompts | ✓ | 08-03 chat-route, system-prompt, chief-of-staff |
| New conversations and agent executions set projectId when in project context | ✓ | 08-03 conversation insert, agent-executor |
| Web sends projectId in chat body; chat page reads projectId from URL | ✓ | 08-03 use-coaching-chat, chat pages |
| Projects list and detail UI; definition, documents, links, milestones, tasks | ✓ | 08-04 projects/page, projects/[id]/page |
| "Open chat for this project" navigates to chat with projectId | ✓ | 08-04 Link to /chat?projectId=xxx |

## Human verification (recommended)

- [ ] Create a project, add description, status, due date.
- [ ] Attach an existing document and add an external link.
- [ ] Add milestones and tasks.
- [ ] Click "Open chat for this project" and send a message; confirm coach response references project name/context (or run with logging to confirm project context in system prompt).
- [ ] Create a task thread from that chat and confirm task conversation has projectId (optional DB check).

## Issues / gaps

None identified. Phase 8 implementation matches plan.
