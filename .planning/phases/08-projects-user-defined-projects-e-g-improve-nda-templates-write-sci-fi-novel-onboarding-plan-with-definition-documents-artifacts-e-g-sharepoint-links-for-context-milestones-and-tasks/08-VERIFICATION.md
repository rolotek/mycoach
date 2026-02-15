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
| Milestones link to tasks: project_tasks.milestoneId, tasks shown under milestones; add/update task with optional milestone; per-task milestone selector; add task directly to a milestone via "Add task to this milestone" inline form | ✓ | Schema 08-01; router 08-02; UI 08-04 |

## Human verification (recommended)

- [ ] Create a project, add description, status, due date.
- [ ] Attach an existing document and add an external link.
- [ ] Add milestones and tasks.
- [ ] Click "Open chat for this project" and send a message; confirm coach response references project name/context (or run with logging to confirm project context in system prompt).
- [ ] Create a task thread from that chat and confirm task conversation has projectId (optional DB check).
- [ ] Add a milestone, then add a task with that milestone selected (or use "Add task to this milestone" under the milestone); confirm task appears under the milestone. Move a task to another milestone or "No milestone" via the per-task dropdown.

## Issues / gaps

None. Milestone–task linking (schema, API, UI) was added after initial plans and is now reflected in 08-01, 08-02, and 08-04 plan/summary updates.
