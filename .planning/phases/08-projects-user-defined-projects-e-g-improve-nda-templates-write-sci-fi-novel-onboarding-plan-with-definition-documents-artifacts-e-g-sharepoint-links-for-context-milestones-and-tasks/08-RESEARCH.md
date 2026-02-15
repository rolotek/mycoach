# Phase 8: Projects — Research

**Researched:** 2026-02-15
**Domain:** User-defined projects with definition, context artifacts (documents/links), milestones, and tasks
**Confidence:** HIGH

## Summary

Phase 8 adds a **project** as a first-class container for goal-oriented work (e.g. "Improve NDA templates", "Write sci-fi novel", "Onboarding plan for Employee X"). Each project has a definition (name, description/goal), optional context (linked documents already in MyCoach + external links e.g. SharePoint), milestones (high-level checkpoints), and tasks. The coach and agents can reference the active project and its context when the user is in a conversation or dispatching work.

**Recommendation:** Introduce a `projects` table (userId, name, description, status, dueDate) and join tables for context: link existing `documents` and store external URLs (e.g. SharePoint) as project_links (url, label). Add `project_milestones` (title, dueDate, order, status) and `project_tasks` (title, status, optional conversationId to link to a task thread). Optionally scope conversations or agent executions to a project (projectId on conversations or agentExecutions) so "this chat is about project X" and task threads can be grouped under the project. Keep v1 scope: no external fetches of SharePoint/URLs (store link and label only; user or future phase can add unfurling). RAG and memory stay user-scoped; project context is "which documents/links the user said are relevant to this project" for prompt injection.

## Existing System Alignment

| Existing | Use in Projects |
|----------|------------------|
| `documents` (userId, filename, content, status) | User can attach existing uploaded documents to a project; chat/agents get "project documents" for context. |
| `conversations` (type: coaching \| task, parentId) | Task threads already exist; project_tasks can reference conversationId to link "Task: Draft NDA clause" to the conversation where the agent did the work. |
| `agentExecutions` (task, result, conversationId) | Executions can optionally store projectId to filter "all agent work for this project". |
| `userFacts` / `memories` | Remain user-scoped; project does not create separate memory namespaces. Project context is explicit (documents + links) injected into prompts. |
| RAG (documents + memories) | Today RAG is global to user. For project-scoped chat we can restrict retrieval to "documents attached to this project" + user memories, or keep global and add "project description + links" to system context. |

## Standard Stack

No new external libraries required. Use existing:

| Layer | Use |
|-------|-----|
| Drizzle + PostgreSQL | New tables: projects, project_documents (projectId, documentId), project_links (projectId, url, label), project_milestones, project_tasks. |
| tRPC | project.* procedures: list, get, create, update, delete; add/remove documents/links; list milestones/tasks, create/update/delete. |
| React + shadcn/ui | Projects list page, project detail (definition, artifacts, milestones, tasks), "Attach document" / "Add link" UI. |
| Chat route / chief-of-staff | Optional: accept projectId in request; inject project name, description, and artifact list (document filenames + link labels/URLs) into system prompt so coach/agents have project context. |

## Architecture Patterns

### Project as Container

- **projects**: id, userId, name, description (text), status (e.g. active | completed | archived), dueDate (optional), createdAt, updatedAt.
- **project_documents**: projectId, documentId (FK documents.id). Many-to-many: one document can be in multiple projects.
- **project_links**: projectId, url (text), label (text). External references; no fetch in v1.
- **project_milestones**: projectId, title, dueDate (optional), sortOrder (integer), status (optional), createdAt.
- **project_tasks**: projectId, title, description (optional), status (e.g. todo | in_progress | done), dueDate (optional), conversationId (optional FK to task thread), createdAt, updatedAt.

### Context for Chat/Agents

When user opens a conversation "in the context of" a project (e.g. from project detail "Open chat for this project" or by selecting active project in sidebar):

- Include in system/context: project name, project description, list of attached document names (and optionally a note that RAG can retrieve from those if we filter by documentId), and list of link labels + URLs so the model can say "see SharePoint link: ..." without fetching.
- Optional: store projectId on conversations so "this conversation is about project X"; then list conversations by project.

### Task Threads and Projects

- When creating a task from a project (e.g. "Draft NDA clause 3"), create or reuse a task conversation (existing pattern) and set project_tasks.conversationId to that conversation. Project detail page can show "Tasks" with links to those threads.
- agentExecutions can get an optional projectId (from the conversation's projectId or from request body) for "work done for this project" reporting.

## Don't Hand-Roll

- **Link unfurling / fetching SharePoint:** Do not implement in v1. Store URL + label only. Future phase can add OAuth + fetch for SharePoint/Notion if needed.
- **Project-specific RAG index:** v1 can pass project document IDs to existing RAG as a filter (if retrieval supports it) or simply list "Project documents: X, Y" in the prompt and rely on existing user-level RAG. Do not build a separate embedding space per project.
- **Real-time collaboration:** Projects are single-user (userId). No sharing or permissions in v1.

## Common Pitfalls

- **Scope creep:** Keep milestones and tasks as simple records (title, status, dates). No subtasks, no assignees, no custom fields in v1.
- **Conversation ownership:** Decide clearly: is "conversation for project X" a new conversation type or just a tag (projectId)? Recommending optional projectId on conversations so one coaching thread can reference multiple projects and task threads can be tied to a project task.
- **Documents vs links:** Existing documents are in `documents`; links are URLs we don't ingest. Don't try to "embed" external links in v1.

## Code / Schema Hints

- Reuse existing `documents` table; no duplicate storage. project_documents is a join table.
- Indexes: projects(userId), project_documents(projectId), project_links(projectId), project_milestones(projectId), project_tasks(projectId), project_tasks(conversationId).
- tRPC: project.list (userId), project.get(id), project.create({ name, description, ... }), project.update(id, { ... }), project.delete(id); project.addDocument(projectId, documentId), project.removeDocument(projectId, documentId); project.addLink(projectId, { url, label }), project.removeLink(projectId, linkId); project.listMilestones(projectId), project.createMilestone(...), project.updateMilestone(...), project.deleteMilestone(...); same for tasks.
- UI: Projects list (cards or table), project detail page with tabs or sections: Definition, Documents & links, Milestones, Tasks; "Open chat for this project" button that navigates to chat with projectId in state or URL.

## RESEARCH COMPLETE
