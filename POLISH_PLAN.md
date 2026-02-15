# Gutter App-Store Polish Plan

## Context

Gutter has a solid feature set but needs polish to feel like a paid app.

## Phase 1: File Tree Fixes + Dirty Tab Protection + Toast Notifications ✅

**COMPLETED** — Toast system, open file from disk, drag-to-folder (mouse-based), dirty tab protection, toasts wired into error handlers. Also added: Typora-style line reveal (headings, bold, italic, strike, code, links, wiki links), floating link editor, source mode with syntax highlighting, markdown link auto-conversion.

## Phase 2: Cross-Platform Compatibility (Windows + Linux)

**Files: 10-15 modified**

This is the highest-priority phase — without it, the app is macOS-only despite Tauri being cross-platform.

### Keyboard Shortcuts & Platform Detection
- **New: `src/utils/platform.ts`** — Platform detection utility: `isMac()` helper (via `navigator.platform` or `@tauri-apps/api/os`), `modLabel()` returning "Cmd" or "Ctrl", `modKey(e)` returning `e.metaKey` on Mac / `e.ctrlKey` on Windows+Linux.
- **Modify: `App.tsx`** — Replace all `e.metaKey` checks with `modKey(e)`. Update command palette entries to use `modLabel()` instead of hardcoded "Cmd".
- **Modify: `GutterEditor.tsx`** — Same modifier key fix for any editor-level shortcuts.
- **Modify: `WelcomeScreen.tsx`, `StatusBar.tsx`, `CommentsPanel.tsx`** — Replace hardcoded "Cmd+" in UI text with `modLabel()`.

### Path Separator Handling
- **New: `src/utils/path.ts`** — Cross-platform path utilities: `splitPath(p)` splitting on both `/` and `\`, `fileName(p)` extracting the last segment, `parentDir(p)` extracting the parent, `joinPath(...segments)` joining with the OS separator.
- **Modify: `App.tsx`** — Replace all `path.split("/")` and `` `${dir}/${name}` `` with path utilities.
- **Modify: `FileTree.tsx`** — Replace path splitting and concatenation with path utilities.
- **Modify: `useComments.ts`** — Fix sidecar path derivation to use path utilities.
- **Modify: `editorStore.ts`, `QuickOpen.tsx`, `WelcomeScreen.tsx`** — Replace hardcoded `/` path parsing.

### CSS Cross-Engine Fixes
- **Modify: `styles/editor.css`** — Add standard `backdrop-filter` alongside every `-webkit-backdrop-filter` (5 instances). WebView2 on Windows uses Chromium/Edge which needs the unprefixed property.

### Rust Watcher Path Fix
- **Modify: `src-tauri/src/commands/watcher.rs`** — Use `std::path::MAIN_SEPARATOR` or `Path::components()` instead of string matching for `.gutter` directory filtering.

## Phase 3: Wiki-Link Autocomplete + Interactive Task Lists

**Files: 3-4 new/modified**

- **Modify: `src/components/Editor/extensions/WikiLink.ts`** — When user types `[[`, show a floating suggestion menu listing workspace files (fuzzy-filtered as they type). On selection, insert `[[File Name]]`. Reuse the slash command menu pattern (vanilla DOM popup positioned at cursor).
- **Modify: `GutterEditor.tsx` or new extension** — Make `[ ]` / `[x]` task list checkboxes interactive in WYSIWYG mode. Clicking a checkbox toggles its state and updates the underlying markdown. TipTap has `@tiptap/extension-task-list` and `@tiptap/extension-task-item` that can be configured for this.

## Phase 4: Elegant Table Editing

**Files: 3-4 new/modified**

- **New: `src/components/Editor/TableMenu.tsx`** — Floating toolbar that appears when cursor is in a table. Buttons: add row above/below, add column left/right, delete row, delete column, delete table, toggle header row. Positioned above/below the table.
- **Modify: `GutterEditor.tsx`** — Detect cursor in table node via `onSelectionUpdate`, show/hide TableMenu with coordinates.
- **Modify: `styles/editor.css`** — Table styles: cell borders using theme vars, header row styling, selected cell highlight, resize handle styling. Tab key navigates between cells.
- **Modify: `GutterEditor.tsx` editorProps** — Add `handleKeyDown` for Tab/Shift+Tab cell navigation (TipTap tables support `goToNextCell`/`goToPreviousCell`).

## Phase 5: Drag-to-Link + Comment UX Polish

**Files: 3-4 modified**

- **Modify: `GutterEditor.tsx`** — Handle drop events from the file tree: when a file is dragged from the tree into the editor, insert a `[[File Name]]` wiki link at the drop position instead of moving the file.
- **Modify: `src/components/Comments/CommentsPanel.tsx`** — Smooth scroll to focused comment thread with brief highlight pulse animation. Clicking quoted text at top of a thread scrolls the editor to the comment's highlight position.
- **Modify: `styles/editor.css`** — Add pulse animation for comment focus.

## Phase 6: Design Token Audit + Icon Refinement

**Files: 3-5 modified**

- **Modify: `styles/theme.css`** — Add missing semantic tokens (`--surface-elevated`, `--shadow-lg`). Audit and replace all hardcoded `rgba()` colors in CSS files with CSS variable references.
- **Modify: `styles/editor.css`** — Replace hardcoded colors with variables.
- **Modify: `src/components/StatusBar.tsx`** — Replace ASCII separators and text-only indicators with proper SVG icons. Ensure every icon button has a tooltip.
- **Modify: various components** — Standardize modal/dropdown shadows to unified variable.

## Phase 7: Unified Search (Cmd+K / Ctrl+K)

**Files: 4-5 new/modified**

- **New: `src-tauri/src/commands/search.rs`** — `search_workspace(query, path)` command: walks all .md files, returns matches grouped by type: file names (fuzzy), headings (extracted from `# ` lines), full-text content (with surrounding context lines). Cap 100 results, ranked by relevance (exact > starts-with > contains, file names > headings > content).
- **New: `src/components/UnifiedSearch.tsx`** — Raycast/Linear-style modal: single input, results grouped into sections (Files, Headings, Content, Commands). Arrow key navigation across sections, Enter opens/executes. Live results as you type with debounce. Shows file path + context for content matches, heading level indicator for headings.
- **Modify: `App.tsx`** — Bind `Cmd+K` to unified search. Retire separate Quick Open (Cmd+P) and Command Palette (Cmd+Shift+P), or keep them as aliases that pre-filter to the Files/Commands section.
- **Modify: `styles/editor.css`** — Search modal styles: frosted glass backdrop, section headers, highlighted match text, keyboard selection indicator.

## Phase 8: Release Prep

**Files: 3 modified**

- **Modify: `Cargo.toml`** — Add `[profile.release]` with LTO, strip, codegen-units=1, opt-level="s", panic="abort"
- **Modify: `tauri.conf.json`** — Add CSP policy, add `fileAssociations` for .md/.markdown
- **Modify: `lib.rs`** — Handle file-open from OS launch arguments

## Execution Order

2 → 3 → 4 → 5 → 6 → 7 → 8

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
- [ ] Phase 2: Cross-Platform Compatibility (Windows + Linux)
- [ ] Phase 3: Wiki-Link Autocomplete + Interactive Task Lists
- [ ] Phase 4: Elegant Table Editing
- [ ] Phase 5: Drag-to-Link + Comment UX Polish
- [ ] Phase 6: Design Token Audit + Icon Refinement
- [ ] Phase 7: Unified Search (Cmd+K / Ctrl+K)
- [ ] Phase 8: Release Prep
