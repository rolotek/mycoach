---
status: complete
phase: 08-projects
source: 08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md, 08-04-SUMMARY.md
started: "2026-02-15T00:00:00Z"
updated: 2026-02-15T16:46:00.000Z
---

## Current Test

[testing complete]


## Tests

### 1. Sidebar shows Projects link
expected: Sidebar shows a "Projects" link; clicking it goes to the projects list.
result: pass

### 2. Projects list page shows heading, description, and New project button
expected: Projects page shows heading "Projects", description text about creating projects, and a "New project" button.
result: pass

### 3. Projects list shows empty state or project cards
expected: List shows either "No projects yet" (or similar) or cards/links to existing projects.
result: pass

### 4. New project dialog opens and has name and description fields
expected: Clicking "New project" opens a dialog with "New project" title, Name and Description fields, and Create and Cancel buttons.
result: pass

### 5. Create project redirects to project detail
expected: Filling name and clicking Create creates the project and redirects to its detail page; "Back to Projects" link is visible.
result: pass

### 6. Project detail shows Definition, Documents & links, Milestones, Tasks sections
expected: Project detail page shows section titles Definition, Documents & links, Milestones, and Tasks.
result: pass

### 7. Project detail has Open chat for this project button
expected: A link/button "Open chat for this project" is visible and its href includes projectId query param.
result: pass

### 8. Open chat for this project navigates to chat with projectId
expected: Clicking "Open chat for this project" navigates to chat URL with projectId in query; message input is visible.
result: pass

### 9. Add link to project
expected: Entering label and URL and clicking "Add link" adds the link; the new link appears in the list with label and external-link behavior.
result: pass

### 10. Add milestone to project
expected: Entering a milestone title and clicking Add adds the milestone; the milestone title appears in the Milestones list.
result: pass

### 11. Add task to project
expected: In the Tasks section, entering a task title and clicking "Add task" adds the task; the task title appears on the page.
result: pass

### 12. Add task directly to a milestone
expected: Under a milestone, clicking "Add task to this milestone" shows an inline form; entering title and clicking Add creates a task under that milestone; the task appears under the milestone.
result: pass

### 13. Definition section has status select and due date
expected: Definition section shows "Status" and "Due date" labels, a combobox (status), and a date input.
result: pass

### 14. Back to Projects returns to list
expected: Clicking "Back to Projects" from a project detail page returns to the projects list URL and the Projects heading is visible.
result: pass

## Summary

total: 14
passed: 14
issues: 0
pending: 0
skipped: 0

## Gaps
