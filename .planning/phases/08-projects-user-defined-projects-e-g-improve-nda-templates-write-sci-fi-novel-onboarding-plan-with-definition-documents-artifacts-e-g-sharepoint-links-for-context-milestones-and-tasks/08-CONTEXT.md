# Phase 8: Projects - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create and manage projects — flexible containers for focused work. A project might produce a document (NDA template, sci-fi book), pursue a goal (improve public speaking), drive a process (onboard new hires), or reach a decision (open a London office). Projects have attached context (documents, external links), internal structure (sections), and project-scoped chat threads so the coach and agents receive relevant context.

</domain>

<decisions>
## Implementation Decisions

### Project structure
- All projects are the same flexible container — no typed projects
- Internal structure (sections vs milestones vs tasks) is Claude's discretion, but must support the range of use cases (document chapters, goal milestones, process tasks)
- Optional due dates on both projects and their sections/items

### Project list & organization
- Pinned + recent: user can pin active projects to top, rest sorted by recent activity below
- Completed/archived projects hidden from default list, accessible via filter
- User explicitly marks projects as complete or archived

### Project card display
- Claude's discretion on what each project shows at a glance

### Project creation flow
- Claude's discretion on how project creation works

### Project detail page layout
- Claude's discretion on layout

### Context artifacts (docs & links)
- Users can attach existing uploaded documents OR upload new ones directly from the project page
- External links are typed — recognize link type (SharePoint, Google Docs, etc.) and show appropriate icon
- Context can be attached at both project level AND section level
- Display as compact list with icons (type icon, name, remove button)

### Project-scoped chat
- "Open chat" button on project page AND project threads visible in sidebar (tagged with project name)
- Each section can have its own separate chat thread, automatically scoped to that section's context
- Show context badge in chat (e.g. "Using: NDA Template > Section 3 + 2 docs") so user knows what's scoped in
- Agent dispatch from project chat passes project context — exact confirmation behavior is Claude's discretion

### Claude's Discretion
- Internal project structure (flat sections, milestones with tasks, or hybrid)
- Project card layout and information density
- Project creation flow (quick create vs guided)
- Detail page layout (overview + list, tabs, split view, etc.)
- Agent context confirmation behavior during dispatch

</decisions>

<specifics>
## Specific Ideas

- Projects are "containers for focused work" — not just document production. Must feel natural for a goal like "improve my public speaking" as well as a deliverable like "NDA template"
- Document-centric projects break into sections (NDA clauses, book chapters) which helps scope LLM context to relevant portions
- Section-level chat threads are key to the LLM context strategy — chatting about one chapter shouldn't load the entire book

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-projects*
*Context gathered: 2026-02-15*
