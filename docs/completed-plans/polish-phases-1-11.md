# Completed Polish Phases (1–11)

Archived from `POLISH_PLAN.md`. All phases below are fully shipped.

## Phase 1: File Tree Fixes + Dirty Tab Protection + Toast Notifications

Toast system, open file from disk, drag-to-folder (mouse-based), dirty tab protection, toasts wired into error handlers. Also added: Typora-style line reveal (headings, bold, italic, strike, code, links, wiki links), floating link editor, source mode with syntax highlighting, markdown link auto-conversion.

## Phase 2: Cross-Platform Compatibility (Windows + Linux)

**Files: 10-15 modified**

### Keyboard Shortcuts & Platform Detection

- **New:** `src/utils/platform.ts` — Platform detection utility: `isMac()` helper, `modLabel()` returning "Cmd" or "Ctrl", `modKey(e)` returning `e.metaKey` on Mac / `e.ctrlKey` on Windows+Linux.
- **Modify:** `App.tsx` — Replace all `e.metaKey` checks with `modKey(e)`. Update command palette entries to use `modLabel()`.
- **Modify:** `GutterEditor.tsx` — Same modifier key fix for editor-level shortcuts.
- **Modify:** `WelcomeScreen.tsx`, `StatusBar.tsx`, `CommentsPanel.tsx` — Replace hardcoded "Cmd+" in UI text with `modLabel()`.

### Path Separator Handling

- **New:** `src/utils/path.ts` — Cross-platform path utilities: `splitPath(p)`, `fileName(p)`, `parentDir(p)`, `joinPath(...segments)`.
- **Modify:** `App.tsx` — Replace all `path.split("/")` and `${dir}/${name}` with path utilities.
- **Modify:** `FileTree.tsx` — Replace path splitting and concatenation with path utilities.
- **Modify:** `useComments.ts` — Fix sidecar path derivation to use path utilities.
- **Modify:** `editorStore.ts`, `QuickOpen.tsx`, `WelcomeScreen.tsx` — Replace hardcoded `/` path parsing.

### CSS Cross-Engine Fixes

- **Modify:** `styles/editor.css` — Add standard `backdrop-filter` alongside every `-webkit-backdrop-filter`.

### Rust Watcher Path Fix

- **Modify:** `src-tauri/src/commands/watcher.rs` — Use `std::path::MAIN_SEPARATOR` or `Path::components()` instead of string matching.

## Phase 3: Wiki-Link Autocomplete + Interactive Task Lists

Wiki-link autocomplete (`WikiLinkAutocomplete.ts`) shows workspace files when typing `[[` with fuzzy filtering and keyboard nav. Interactive task lists via `@tiptap/extension-task-list`/`task-item` with custom checkbox styling, parser/serializer support for `- [ ]`/`- [x]` round-trip, and "Task List" slash command.

## Phase 4: Elegant Table Editing

**Files: 3-4 new/modified**

- **New:** `src/components/Editor/TableMenu.tsx` — Floating toolbar when cursor is in a table. Buttons: add row/column, delete row/column/table, toggle header row.
- **Modify:** `GutterEditor.tsx` — Detect cursor in table node via `onSelectionUpdate`, show/hide TableMenu.
- **Modify:** `styles/editor.css` — Table styles: cell borders, header row, selected cell highlight, resize handles. Tab navigates cells.
- **Modify:** `GutterEditor.tsx` editorProps — `handleKeyDown` for Tab/Shift+Tab cell navigation.

## Phase 5: Drag-to-Link + Comment UX Polish

Drag-to-link from file tree into editor inserts `[[WikiLink]]`. Comment panel scroll-to-thread with pulse animation. Scroll-to-comment from CommentsPanel to editor highlight position. Node-level comments on atom nodes (math, mermaid) via node attributes.

## Phase 6: Design Token Audit + Icon Refinement

Added 13 new design tokens (glass-bg/border, focus-shadow, code-bg/block-bg/block-header, find-match/current/shadow, selection-bg, surface-elevated, status-error). Replaced ~50 hardcoded rgba/hex colors in editor.css with CSS variable references. Replaced hardcoded colors in MathBlock, SlashCommands, FileTree, ReplyInput, Thread components. StatusBar pipe separators replaced with styled dividers, undo/redo HTML entities replaced with SVG icons, SidebarIcon/OutlineIcon moved to shared Icons.tsx.

## Phase 7: Quick Wins — Performance & Visual Polish

**Files: 6-8 modified**

### Performance

- **Modify:** `StatusBar.tsx` — Individual Zustand selectors instead of bulk destructuring.
- **Modify:** `FileTree.tsx` — `React.memo` on `FileTreeNode`.
- **Modify:** `CommentsPanel.tsx` — Memoize `visibleThreads` with `useMemo`.
- **Modify:** `GutterEditor.tsx` — Shallow equality check in `extractCommentTexts`.

### Visual Polish

- **Modify:** `theme.css` — `--status-success/info/warning` tokens. `text-rendering: optimizeLegibility`, `font-feature-settings: "kern"`.
- **Modify:** `App.tsx`, `Thread.tsx`, `Toast.tsx` — Replace hardcoded Tailwind colors with CSS variable tokens.
- **Modify:** `TabBar.tsx`, `FileTree.tsx`, `Thread.tsx` — Transitions on tab indicator, file tree selection, thread state changes.

## Phase 8: Unified Search (Cmd+K / Ctrl+K)

**Files: 4-5 new/modified**

- **New:** `src-tauri/src/commands/search.rs` — `search_workspace(query, path)`: walks .md files, returns matches grouped by type (file names, headings, content). Cap 100 results, ranked by relevance.
- **New:** `src/components/UnifiedSearch.tsx` — Raycast/Linear-style modal with grouped sections (Files, Headings, Content, Commands). Arrow key navigation, live results with debounce.
- **Modify:** `App.tsx` — Bind `Cmd+K` to unified search.
- **Modify:** `styles/editor.css` — Search modal styles: frosted glass, section headers, match highlighting.

## Phase 9: The Beautiful Editor

Space-efficient visual polish: indigo accent palette, warm paper surfaces, Source Serif 4 prose font, Inter UI font, glass overlays with blur, accent-subtle toggle states, colored toast borders, accent left-border indicators, mermaid transparent-border-on-hover, welcome screen centering with serif title.

### Design Vision

The name "Gutter" comes from typography — the margin of a page, the space where annotations live. The visual identity should feel like **a beautifully typeset page with thoughtful marginalia**.

**The feeling**: Opening Gutter should feel like opening a quality notebook. The writing surface is the hero — everything else recedes until needed.

**Reference points**: iA Writer (writing surface), Linear (chrome/interactions), Bear (warmth), Ulysses (sidebar relationship).

**Visual signature**: Indigo ink thread + editorial typography + generous negative space + glass chrome that disappears.

### Sub-phases

- **9a: Typography as Identity** — Source Serif 4 prose font, Inter UI font, editorial prose styling (line-height, spacing, blockquotes, links)
- **9b: Indigo Ink Color Identity** — Indigo accent system, warm paper-like surfaces, rich dark mode, amber comment highlights
- **9c: Chrome (Tabs, Status, Panels)** — Glass-like chrome, refined tab/status bar, panel headers, resize handles
- **9d: Glass Overlays** — Upgraded glass system for search, context menu, slash menu, toasts, export dialog
- **9e: Custom Scrollbars** — Thin, rounded, auto-hiding scrollbar thumbs
- **9f: Spring Motion Design** — Physics-based transitions, overlay entrance animations, panel transitions
- **9g: Welcome Screen** — Centered layout, serif title, fade-in animation
- **9h: Dark Mode as Its Own Design** — Near-black backgrounds, warm text, subtle borders, indigo glow

## Phase 10: Native Menu Bar

**Files: 3-4 new/modified**

- **New:** `src-tauri/src/menu.rs` — Native menu: File, Edit, View, Window. Platform-aware accelerators.
- **Modify:** `src-tauri/src/lib.rs` — Register menu, wire `on_menu_event` to emit events to frontend. Dynamic menu item state updates.
- **Modify:** `App.tsx` — Listen for menu events via `listen()`, dispatch same actions as keyboard shortcuts.

## Phase 11: Release Prep

**Files: 5-6 modified**

- [x] **App icon** — Custom icon in all formats (icns, ico, PNGs) in `src-tauri/icons/`
- [x] **Modify:** `FileTree.tsx` — Multi-select support (Shift+click range, Cmd/Ctrl+click toggle)
- [x] **Modify:** `Cargo.toml` — `[profile.release]` with LTO, strip, codegen-units=1, opt-level="s", panic="abort"
- [x] **Modify:** `tauri.conf.json` — CSP policy, `fileAssociations` for .md/.markdown
- [x] **Modify:** `lib.rs` — Handle file-open from OS launch arguments


