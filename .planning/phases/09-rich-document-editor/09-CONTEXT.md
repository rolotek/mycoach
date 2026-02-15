# Phase 9: Rich Document Editor - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

AI-assisted document authoring within project sections. Users can create blank documents or open uploaded DOCX files in a rich editor, collaborate with the AI coach to draft/rewrite/expand content, track version history, and export finished documents (DOCX, Markdown). Project sections evolve from chat-only contexts into editable workspaces. Architecture must support a path to full suite (comments, redlining/track changes) in future phases.

</domain>

<decisions>
## Implementation Decisions

### Editor experience
- Google Docs-like editing — traditional rich text with fixed toolbar at top, continuous flowing document
- Content types for v1: headings, paragraphs, bold/italic/underline, lists (bullet + numbered), links, blockquotes, tables, code blocks with syntax highlighting, horizontal rules
- Architecture must support extending to full suite later: images, callout boxes, checklists, comments, redlining/track changes
- Dedicated document page at /documents/[id]/edit — full page editor linked from project sections, not embedded inline
- Fixed formatting toolbar at top of editor (like Google Docs)

### AI collaboration model
- Two modes of invocation: selection-based quick actions AND an AI chat panel for longer/custom instructions
- Selection-based: select text, click AI button — options like Rewrite, Expand, Summarize, etc. (specific actions are Claude's discretion)
- AI chat panel: mini-chat within the editor for longer instructions (e.g., "rewrite this section to be more formal and add a liability clause")
- AI suggestions appear as inline diffs — highlighted additions/deletions in-place. User accepts or rejects per suggestion.
- AI has access to project context (project description, attached docs/links, section info) when helping with the document — Claude's discretion on exact scope
- Inline diff system is the architectural foundation for future track changes/redlining

### Version history & drafts
- Auto-save continuously (like Google Docs) — no manual save button
- Version history approach: Claude's discretion (e.g., periodic snapshots)
- AI edits are tagged separately from manual edits in version history — useful for audit trails
- Documents have draft/final toggle — start as draft, user marks "Final" when done, final docs are read-only unless reopened

### Export & output
- Export formats for v1: DOCX and Markdown (no PDF yet)
- DOCX export must be format-preserving — if user imported a DOCX, the exported file retains original styling (fonts, headers/footers, styles)
- Blank documents use a clean default style on export

### Document sources
- Users can create blank documents from scratch (clean default style)
- Users can open existing uploaded documents (from Phase 2 system) in the editor
- Users can upload a new DOCX directly into the editor
- DOCX import must preserve formatting for round-trip editing

### Claude's Discretion
- Editor library choice (Tiptap, ProseMirror, Plate, etc.)
- Specific AI quick action menu items
- AI context scope details (how much project context to include)
- Version history implementation (snapshot frequency, storage approach)
- Detail page layout and toolbar design

</decisions>

<specifics>
## Specific Ideas

- The round-trip DOCX fidelity is critical — users will upload professional documents (NDAs, contracts) and expect the formatting to survive editing and re-export
- Inline diff for AI suggestions doubles as the foundation for future redlining/track changes (comments, multi-user review)
- Editor should feel like Google Docs — familiar, not a new paradigm to learn

</specifics>

<deferred>
## Deferred Ideas

- Comments and redlining/track changes — future phase extending the inline diff foundation
- Full suite content types (images, callout boxes, checklists, embedded content) — future phase
- Split view with chat panel alongside editor — future enhancement
- PDF export — future phase
- Collaborative editing (multi-user) — future phase

</deferred>

---

*Phase: 09-rich-document-editor*
*Context gathered: 2026-02-15*
