# Gutter App-Store Polish Plan

## Context

Gutter has a solid feature set but needs polish to feel like a paid app.

## Phase 1: File Tree Fixes + Dirty Tab Protection + Toast Notifications ✅

**COMPLETED** — Toast system, open file from disk, drag-to-folder (mouse-based), dirty tab protection, toasts wired into error handlers. Also added: Typora-style line reveal (headings, bold, italic, strike, code, links, wiki links), floating link editor, source mode with syntax highlighting, markdown link auto-conversion.

## Phase 2: Wiki-Link Autocomplete + Interactive Task Lists

**Files: 3-4 new/modified**

- **Modify: `src/components/Editor/extensions/WikiLink.ts`** — When user types `[[`, show a floating suggestion menu listing workspace files (fuzzy-filtered as they type). On selection, insert `[[File Name]]`. Reuse the slash command menu pattern (vanilla DOM popup positioned at cursor).
- **Modify: `GutterEditor.tsx` or new extension** — Make `[ ]` / `[x]` task list checkboxes interactive in WYSIWYG mode. Clicking a checkbox toggles its state and updates the underlying markdown. TipTap has `@tiptap/extension-task-list` and `@tiptap/extension-task-item` that can be configured for this.

## Phase 3: Drag-to-Link + Comment UX Polish

**Files: 3-4 modified**

- **Modify: `GutterEditor.tsx`** — Handle drop events from the file tree: when a file is dragged from the tree into the editor, insert a `[[File Name]]` wiki link at the drop position instead of moving the file.
- **Modify: `src/components/Comments/CommentsPanel.tsx`** — Smooth scroll to focused comment thread with brief highlight pulse animation. Clicking quoted text at top of a thread scrolls the editor to the comment's highlight position.
- **Modify: `styles/editor.css`** — Add pulse animation for comment focus.

## Phase 4: Design Token Audit + Icon Refinement

**Files: 3-5 modified**

- **Modify: `styles/theme.css`** — Add missing semantic tokens (`--surface-elevated`, `--shadow-lg`). Audit and replace all hardcoded `rgba()` colors in CSS files with CSS variable references.
- **Modify: `styles/editor.css`** — Replace hardcoded colors with variables.
- **Modify: `src/components/StatusBar.tsx`** — Replace ASCII separators and text-only indicators with proper SVG icons. Ensure every icon button has a tooltip.
- **Modify: various components** — Standardize modal/dropdown shadows to unified variable.

## Phase 5: Release Prep

**Files: 3 modified**

- **Modify: `Cargo.toml`** — Add `[profile.release]` with LTO, strip, codegen-units=1, opt-level="s", panic="abort"
- **Modify: `tauri.conf.json`** — Add CSP policy, add `fileAssociations` for .md/.markdown
- **Modify: `lib.rs`** — Handle file-open from OS launch arguments

## Execution Order

2 → 3 → 4 → 5

## Already Completed (Sprint 1)

These features are fully implemented and shipped:

- [x] TipTap WYSIWYG editor with rich text formatting
- [x] Markdown parser/serializer with round-trip fidelity
- [x] Three-file comment system (inline markers + JSON + companion MD)
- [x] Comment panel with thread CRUD, reply, resolve, delete
- [x] File tree with create/delete/rename, drag files between folders
- [x] Tab system with multi-tab support
- [x] Settings infrastructure (Zustand store + localStorage persistence)
- [x] Resizable sidebar panels (file tree + comments)
- [x] Find & Replace (in-document)
- [x] Quick Open (Cmd+P fuzzy file search)
- [x] Clipboard image paste & drag/drop
- [x] File watcher (detect external changes, reload prompt)
- [x] Undo/Redo indicators in status bar
- [x] Document outline panel
- [x] Typewriter / Focus mode (dim non-active paragraphs)
- [x] Tab context menu (Close Others, Close All)
- [x] Welcome screen with recent files
- [x] Export dialog (HTML, JSON)
- [x] Frontmatter support (YAML metadata)
- [x] Backlinks panel & wiki-link navigation
- [x] Version history (local snapshots with restore)
- [x] Spell check toggle
- [x] Slash command menu (/, headings, lists, code, math, mermaid, etc.)
- [x] Code blocks with language selector dropdown
- [x] Math blocks (KaTeX, block $$ and inline $)
- [x] Mermaid diagram blocks with edit mode
- [x] Theme system (light/dark/system, Cmd+Shift+D cycle)
- [x] Source mode toggle (raw markdown editing with syntax highlighting)
- [x] Zen mode (distraction-free)
- [x] Command palette (Cmd+. or Cmd+Shift+P)
- [x] Demo workspace with guides, projects, journal subfolders
- [x] Toast notification system
- [x] Dirty tab protection (close tab + quit confirmation)
- [x] Typora-style line reveal (headings, bold, italic, links, wiki links)
- [x] Floating link editor (edit URL, open, remove)
- [x] Markdown link auto-conversion (type [text](url) → link)

## Polish Plan Status

- [x] Phase 1: File Tree Fixes + Dirty Tab Protection + Toasts + Line Reveal
- [ ] Phase 2: Wiki-Link Autocomplete + Interactive Task Lists
- [ ] Phase 3: Drag-to-Link + Comment UX Polish
- [ ] Phase 4: Design Token Audit + Icon Refinement
- [ ] Phase 5: Release Prep
