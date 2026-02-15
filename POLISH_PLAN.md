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

## Phase 3: Wiki-Link Autocomplete + Interactive Task Lists ✅

**COMPLETED** — Wiki-link autocomplete (`WikiLinkAutocomplete.ts`) shows workspace files when typing `[[` with fuzzy filtering and keyboard nav. Interactive task lists via `@tiptap/extension-task-list`/`task-item` with custom checkbox styling, parser/serializer support for `- [ ]`/`- [x]` round-trip, and "Task List" slash command.

## Phase 4: Elegant Table Editing

**Files: 3-4 new/modified**

- **New: `src/components/Editor/TableMenu.tsx`** — Floating toolbar that appears when cursor is in a table. Buttons: add row above/below, add column left/right, delete row, delete column, delete table, toggle header row. Positioned above/below the table.
- **Modify: `GutterEditor.tsx`** — Detect cursor in table node via `onSelectionUpdate`, show/hide TableMenu with coordinates.
- **Modify: `styles/editor.css`** — Table styles: cell borders using theme vars, header row styling, selected cell highlight, resize handle styling. Tab key navigates between cells.
- **Modify: `GutterEditor.tsx` editorProps** — Add `handleKeyDown` for Tab/Shift+Tab cell navigation (TipTap tables support `goToNextCell`/`goToPreviousCell`).

## Phase 5: Drag-to-Link + Comment UX Polish ✅

**COMPLETED** — Drag-to-link from file tree into editor inserts `[[WikiLink]]`. Comment panel scroll-to-thread with pulse animation. Scroll-to-comment from CommentsPanel to editor highlight position. Node-level comments on atom nodes (math, mermaid) via node attributes.

## Phase 6: Design Token Audit + Icon Refinement ✅

**COMPLETED** — Added 13 new design tokens (glass-bg/border, focus-shadow, code-bg/block-bg/block-header, find-match/current/shadow, selection-bg, surface-elevated, status-error). Replaced ~50 hardcoded rgba/hex colors in editor.css with CSS variable references. Replaced hardcoded colors in MathBlock, SlashCommands, FileTree, ReplyInput, Thread components. StatusBar pipe separators replaced with styled dividers, undo/redo HTML entities replaced with SVG icons, SidebarIcon/OutlineIcon moved to shared Icons.tsx.

## Phase 7: Quick Wins — Performance & Visual Polish

**Files: 6-8 modified** | Details: [`docs/QUICK_WINS.md`](docs/QUICK_WINS.md)

Small changes with outsized impact on perceived quality and responsiveness.

### Performance
- **Modify: `StatusBar.tsx`** — Switch from bulk `useEditorStore()` destructuring to individual Zustand selectors. Eliminates re-renders on every keystroke.
- **Modify: `FileTree.tsx`** — Wrap `FileTreeNode` with `React.memo` to prevent recursive re-renders when props haven't changed.
- **Modify: `CommentsPanel.tsx`** — Memoize `visibleThreads` filter with `useMemo`.
- **Modify: `GutterEditor.tsx`** — Add shallow equality check in `extractCommentTexts` to avoid unnecessary CommentsPanel re-renders.

### Visual Polish
- **Modify: `theme.css`** — Add `--status-success`, `--status-info`, `--status-warning` tokens. Add `text-rendering: optimizeLegibility` and `font-feature-settings: "kern"`.
- **Modify: `App.tsx`, `Thread.tsx`, `Toast.tsx`** — Replace remaining hardcoded Tailwind colors with CSS variable tokens.
- **Modify: `TabBar.tsx`, `FileTree.tsx`, `Thread.tsx`** — Add transitions to tab active indicator, file tree selection, and comment thread state changes.

## Phase 8: Unified Search (Cmd+K / Ctrl+K)

**Files: 4-5 new/modified**

- **New: `src-tauri/src/commands/search.rs`** — `search_workspace(query, path)` command: walks all .md files, returns matches grouped by type: file names (fuzzy), headings (extracted from `# ` lines), full-text content (with surrounding context lines). Cap 100 results, ranked by relevance (exact > starts-with > contains, file names > headings > content).
- **New: `src/components/UnifiedSearch.tsx`** — Raycast/Linear-style modal: single input, results grouped into sections (Files, Headings, Content, Commands). Arrow key navigation across sections, Enter opens/executes. Live results as you type with debounce. Shows file path + context for content matches, heading level indicator for headings.
- **Modify: `App.tsx`** — Bind `Cmd+K` to unified search. Retire separate Quick Open (Cmd+P) and Command Palette (Cmd+Shift+P), or keep them as aliases that pre-filter to the Files/Commands section.
- **Modify: `styles/editor.css`** — Search modal styles: frosted glass backdrop, section headers, highlighted match text, keyboard selection indicator.

## Phase 9: Style Optimization — World-Class Visual Polish

Pure styling + minor layout refinements to make Gutter look like a premium, designer-quality app (Linear, Raycast, iA Writer, Bear). No functionality changes, no parser/serializer/extension changes. Layout adjustments are in scope where they improve visual quality.

### 9a: Color Identity — The Whole Palette

Rethink the entire color story, not just the accent.

**Accent**: `#3b82f6` → `#6366f1` (indigo) — matches the icon and brand. Add `--accent-hover`, `--accent-subtle`, `--accent-muted` tokens.

**Surfaces**: Move from flat gray to subtle warmth.
- Light editor bg: `#ffffff` → `#fafafa` (slightly off-white, easier on eyes)
- Light sidebar: `#f9fafb` → `#f5f5f7` (Apple-style warm gray)
- Dark editor bg: `#111827` → `#0f1117` (richer, less gray-blue, more true dark)
- Dark sidebar: `#1f2937` → `#161920` (darker, more contrast with editor)
- Dark elevated: actually different from dark primary (`#1c1f2a`)

**Borders**: Softer. Light: `#e5e7eb` → `#ebebef`. Dark: `#374151` → `#262a36`.

**Text hierarchy**: Wider spread between levels for clearer hierarchy.

**Comment highlights**: Yellow → warm amber. `rgba(255,213,79,0.3)` → `rgba(245,176,65,0.25)`.

**Selection**: Indigo-tinted. Fix hardcoded `#3b82f6` in `WelcomeScreen.tsx` and `ExportDialog.tsx`.

**Files**: `theme.css`, `WelcomeScreen.tsx`, `ExportDialog.tsx`

### 9b: Typography Upgrade

**UI Font**: Add Inter loaded locally from `src/assets/fonts/` (local-first). Fall back to system stack.

**Editor Prose**:
- Body line-height: `1.7` → `1.75`
- H1: `2rem` → `2.25rem`, weight 800, letter-spacing `-0.03em`
- H2: `1.5rem` → `1.625rem`
- Paragraph spacing: `0.625rem` → `0.75rem`
- Blockquotes: `3px` left border, subtle bg tint, italic by default
- Horizontal rules: thinner, more delicate fade
- Inline code: slightly larger padding, rounder corners (`4px` → `5px`)
- Table cells: more padding, cleaner header styling

**UI Text**: Status bar → 11px. Panel headers → 10px. Badge counts → 10px.

**Files**: `theme.css`, `editor.css`, add font files to `src/assets/fonts/`

### 9c: Custom Scrollbars

WebKit scrollbar styling (Tauri's engine):
- 8px width main areas, 6px sidebars
- Transparent track, rounded thumb with 2px transparent border (`background-clip: content-box`)
- Auto-hide: fades when not scrolling, appears on hover/scroll
- Theme-aware colors

**Files**: `theme.css`

### 9d: Tab Bar — Make It Distinctive

- Height: `40px` → `36px`
- Active tab: `bg-[var(--surface-primary)]` + inset rounded pill indicator at bottom
- Inactive: `hover:bg-[var(--surface-hover)]`
- Active text: `font-medium`
- Dirty dot: softer indicator (small diamond or subtle glow)
- Subtle bottom shadow instead of hard border

**Files**: `TabBar.tsx`, `editor.css`

### 9e: Status Bar — Quieter, Cleaner

- Height: `32px` → `28px`
- Font: `13px` → `11px`
- Text color: `--text-tertiary` → `--text-muted`
- Reduce dividers from ~7 to 3-4
- Active toggles: `--accent-subtle` bg instead of `--surface-active`
- Dirty indicator: smaller (5px)

**Files**: `StatusBar.tsx`

### 9f: Side Panels — Refined Chrome

**File Tree**: Remove indent guides (cleaner), softer active highlight with left accent border, more visible hover states (`0.05` → `0.07` opacity).

**Comments Panel**: Consolidate inline `style={}` borders to Tailwind. Active thread: `--accent-subtle` bg + accent left border. Badge: tinted pill (accent text on accent-subtle bg). Quoted text: `2px` border. Resolved: opacity `0.45`.

**Panel Headers**: Create `.panel-header` class (10px, 600 weight, uppercase, 0.06em tracking) to replace duplicated Tailwind across 4+ files.

**Document Outline**: Active heading uses accent color + left border instead of background fill.

**Files**: `FileTree.tsx`, `Thread.tsx`, `CommentsPanel.tsx`, `DocumentOutline.tsx`, `BacklinksPanel.tsx`, `theme.css`

### 9g: Overlays and Menus — Premium Glass

**Unified Search**: Darker scrim (`black/50`), stronger shadow (`--shadow-xl`), larger input (16px), `translateY(-8px)` entrance animation.

**Context/Slash/Autocomplete Menus**: Glass opacity `0.80`, blur `20px`, softer border (`0.05` opacity), consistent `--shadow-lg`, visible accent left border on selected items.

**Toasts**: Colored left border by type, rounder corners (`rounded-xl`), slide-up + fade entrance.

**Files**: `editor.css`, `theme.css`, `UnifiedSearch.tsx`, `Toast.tsx`

### 9h: Micro-Interactions — The Polish Layer

**Transitions**: `ease` → `ease-out`, `120ms` → `150ms`, `cubic-bezier(0.16, 1, 0.3, 1)` for overlay spring motion.

**Resize handles**: Full accent bar → centered pill indicator. Transparent → muted on hover → accent when dragging.

**Mermaid/Math blocks**: Always-visible border → transparent, appears on hover.

**Focus rings**: `4px` → `3px`, indigo tint.

**Utilities**: `.btn-ghost` class (transparent → surface-hover bg, muted → primary text) to DRY up 10+ repeated patterns.

**Code block headers**: Subtler, less prominent background.

**Files**: `theme.css`, `editor.css`

### 9i: Dark Mode — Make It Rich

Design dark theme as its own thing, not just an inversion.

- Background: near-black with subtle blue undertone
- Borders: lower opacity
- Code blocks: VS Code Dark+ / One Dark syntax colors
- Glass: slightly more transparent (more dramatic blur)
- Shadows: deeper, subtle indigo tint
- Text: warm-white (`#e5e7eb` → `#e4e4e8`)

**Files**: `theme.css`, `editor.css`

### Verification (after each sub-phase)

1. `npm run tauri dev` — visual check in light + dark
2. Check all panels, overlays, menus, editor content
3. `npx tsc --noEmit` after any .tsx changes

## Phase 10: Native Menu Bar

**Files: 3-4 new/modified**

- **New: `src-tauri/src/menu.rs`** — Build native menu using `tauri::menu`: File (New Tab, Open, Save, Save As, Close Tab), Edit (Undo, Redo, Cut, Copy, Paste, Select All, Find), View (Toggle Sidebar, Toggle Comments Panel, Toggle Zen Mode, Toggle Source Mode, Zoom In/Out, Cycle Theme), Window (Minimize, Zoom, Close). Use platform-aware accelerators (`Cmd` on macOS, `Ctrl` on Windows/Linux).
- **Modify: `src-tauri/src/lib.rs`** — Register menu builder, attach to window. Wire `on_menu_event` to emit events to the frontend (e.g., `menu://file/save`, `menu://view/toggle-sidebar`).
- **Modify: `App.tsx`** — Listen for menu events via `listen()` from `@tauri-apps/api/event` and dispatch the same actions that keyboard shortcuts already trigger. Deduplicate shortcut logic into shared handler functions if not already done.
- **Modify: `src-tauri/src/lib.rs`** — Dynamically update menu item state (e.g., checkmarks for toggleable items like Zen Mode, Source Mode) when frontend state changes, via `app.emit()` back to Rust or by using Tauri's menu item enabled/checked APIs.

## Phase 11: Release Prep

**Files: 5-6 modified**

- **Modify: `FileTree.tsx`** — Multi-select support: Shift+click for range select, Cmd/Ctrl+click for toggle select. Selected files get visual highlight. Context menu actions (Delete, Move) apply to all selected files. Clear selection on single-click without modifier.
- **Modify: `Cargo.toml`** — Add `[profile.release]` with LTO, strip, codegen-units=1, opt-level="s", panic="abort"
- **Modify: `tauri.conf.json`** — Add CSP policy, add `fileAssociations` for .md/.markdown
- **Modify: `lib.rs`** — Handle file-open from OS launch arguments

## Execution Order

9 → 10 → 11

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
- [x] Wiki-link autocomplete (type [[ → fuzzy file picker)
- [x] Interactive task lists (clickable checkboxes, - [ ]/- [x] round-trip)

## Polish Plan Status

- [x] Phase 1: File Tree Fixes + Dirty Tab Protection + Toasts + Line Reveal
- [x] Phase 2: Cross-Platform Compatibility (Windows + Linux)
- [x] Phase 3: Wiki-Link Autocomplete + Interactive Task Lists
- [x] Phase 4: Elegant Table Editing
- [x] Phase 5: Drag-to-Link + Comment UX Polish
- [x] Phase 6: Design Token Audit + Icon Refinement
- [x] Phase 7: Quick Wins — Performance & Visual Polish
- [x] Phase 8: Unified Search (Cmd+K / Ctrl+K)
- [ ] Phase 9: Style Optimization — World-Class Visual Polish (9a–9i)
- [x] Phase 10: Native Menu Bar
- [ ] Phase 11: Release Prep
