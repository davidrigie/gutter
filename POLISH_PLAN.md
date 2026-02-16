# Gutter Polish Plan

## Status

- [x] Phase 1: File Tree Fixes + Dirty Tab Protection + Toasts + Line Reveal
- [x] Phase 2: Cross-Platform Compatibility (Windows + Linux)
- [x] Phase 3: Wiki-Link Autocomplete + Interactive Task Lists
- [x] Phase 4: Elegant Table Editing
- [x] Phase 5: Drag-to-Link + Comment UX Polish
- [x] Phase 6: Design Token Audit + Icon Refinement
- [x] Phase 7: Quick Wins — Performance & Visual Polish
- [x] Phase 8: Unified Search (Cmd+K / Ctrl+K)
- [x] Phase 9: Style Optimization — World-Class Visual Polish (9a–9h)
- [x] Phase 10: Native Menu Bar
- [x] Phase 11: Release Prep
- [ ] Phase 12: Templates
- [ ] Phase 13: Tag System
- [x] Phase 14: Version History
- [ ] Phase 15: Reading Mode with Marginalia

## Execution Order

12 → 13 → 14 → 15

## Upcoming Phases

### Phase 12: Templates

Built-in templates for common document types. Templates are just markdown files stored in `.gutter/templates/`. Ships with useful defaults (meeting notes, journal entry, project brief, etc.). "New from Template" in file tree context menu and unified search. "Save as Template" on any open document. Users can edit/delete custom templates.

**Details:** [`docs/plans/phase-12-templates.md`](docs/plans/phase-12-templates.md)

### Phase 13: Tag System

Frontmatter tags become a first-class organizational primitive — tag store, tag browser panel, tag autocomplete in frontmatter, tag search integration, cloud/list view.

**Details:** [`docs/plans/phase-13-tags.md`](docs/plans/phase-13-tags.md)

### Phase 14: Version History

Two-layer version history. **Snapshots** (always active): automatic on every save, SHA-256 dedup, 30s debounce, unpinned auto-delete after 24h, pin to keep forever with optional name/description. **Git history** (if workspace has `.git`): read-only view of commits that touched the file — we never auto-commit or modify the repo. Unified history panel shows both layers side by side.

**Details:** [`docs/plans/phase-14-version-history.md`](docs/plans/phase-14-version-history.md)

### Phase 15: Reading Mode with Marginalia

Non-editable, book-typeset view (`Cmd+Shift+R`). Comments render as margin annotations alongside anchor text — not in a sidebar. CSS grid layout with content + margin columns. No chrome, no cursor — the landing page screenshot.

**Details:** [`docs/plans/phase-15-reading-mode.md`](docs/plans/phase-15-reading-mode.md)

## Completed Phases (1–11)

Full details archived in [`docs/completed-plans/polish-phases-1-11.md`](docs/completed-plans/polish-phases-1-11.md).

## Already Completed (Sprint 1)

Full feature list from the initial build sprint:

- TipTap WYSIWYG editor, markdown parser/serializer with round-trip fidelity
- Three-file comment system (inline markers + JSON + companion MD)
- File tree, tab system, find & replace, quick open, clipboard image paste
- File watcher, undo/redo, document outline, typewriter/focus mode
- Welcome screen, export dialog, frontmatter, backlinks
- **NOT actually implemented (listed in error):** version history
- Spell check, slash commands, code blocks, math blocks, mermaid diagrams
- Theme system, source mode, zen mode, command palette, demo workspace
- Toast notifications, dirty tab protection, line reveal, floating link editor
- Markdown link auto-conversion, wiki-link autocomplete, interactive task lists
