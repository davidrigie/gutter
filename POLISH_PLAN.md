# Gutter App-Store Polish Plan

## Context

Gutter has a solid feature set but needs polish to feel like a paid app.

## Phase 1: File Tree Fixes + Dirty Tab Protection + Toast Notifications ✅

**COMPLETED** — Toast system, open file from disk, drag-to-folder (mouse-based), dirty tab protection, toasts wired into error handlers. Also added: Typora-style line reveal (headings, bold, italic, strike, code, links, wiki links), floating link editor, source mode with syntax highlighting, markdown link auto-conversion.

## Phase 2: Cross-Platform Compatibility (Windows + Linux)

**Files: 10-15 modified**

This is the highest-priority phase — without it, the app is macOS-only despite Tauri being cross-platform.

### Keyboard Shortcuts & Platform Detection

- **New: **`**src/utils/platform.ts**` — Platform detection utility: `isMac()` helper (via `navigator.platform` or `@tauri-apps/api/os`), `modLabel()` returning "Cmd" or "Ctrl", `modKey(e)` returning `e.metaKey` on Mac / `e.ctrlKey` on Windows+Linux.
- **Modify: **`**App.tsx**` — Replace all `e.metaKey` checks with `modKey(e)`. Update command palette entries to use `modLabel()` instead of hardcoded "Cmd".
- **Modify: **`**GutterEditor.tsx**` — Same modifier key fix for any editor-level shortcuts.
- **Modify: **`**WelcomeScreen.tsx**`**, **`**StatusBar.tsx**`**, **`**CommentsPanel.tsx**` — Replace hardcoded "Cmd+" in UI text with `modLabel()`.

### Path Separator Handling

- **New: **`**src/utils/path.ts**` — Cross-platform path utilities: `splitPath(p)` splitting on both `/` and `\`, `fileName(p)` extracting the last segment, `parentDir(p)` extracting the parent, `joinPath(...segments)` joining with the OS separator.
- **Modify: **`**App.tsx**` — Replace all `path.split("/")` and ``${dir}/${name}`` with path utilities.
- **Modify: **`**FileTree.tsx**` — Replace path splitting and concatenation with path utilities.
- **Modify: **`**useComments.ts**` — Fix sidecar path derivation to use path utilities.
- **Modify: **`**editorStore.ts**`**, **`**QuickOpen.tsx**`**, **`**WelcomeScreen.tsx**` — Replace hardcoded `/` path parsing.

### CSS Cross-Engine Fixes

- **Modify: **`**styles/editor.css**` — Add standard `backdrop-filter` alongside every `-webkit-backdrop-filter` (5 instances). WebView2 on Windows uses Chromium/Edge which needs the unprefixed property.

### Rust Watcher Path Fix

- **Modify: **`**src-tauri/src/commands/watcher.rs**` — Use `std::path::MAIN_SEPARATOR` or `Path::components()` instead of string matching for `.gutter` directory filtering.

## Phase 3: Wiki-Link Autocomplete + Interactive Task Lists ✅

**COMPLETED** — Wiki-link autocomplete (`WikiLinkAutocomplete.ts`) shows workspace files when typing `[[` with fuzzy filtering and keyboard nav. Interactive task lists via `@tiptap/extension-task-list`/`task-item` with custom checkbox styling, parser/serializer support for `- [ ]`/`- [x]` round-trip, and "Task List" slash command.

## Phase 4: Elegant Table Editing

**Files: 3-4 new/modified**

- **New: **`**src/components/Editor/TableMenu.tsx**` — Floating toolbar that appears when cursor is in a table. Buttons: add row above/below, add column left/right, delete row, delete column, delete table, toggle header row. Positioned above/below the table.
- **Modify: **`**GutterEditor.tsx**` — Detect cursor in table node via `onSelectionUpdate`, show/hide TableMenu with coordinates.
- **Modify: **`**styles/editor.css**` — Table styles: cell borders using theme vars, header row styling, selected cell highlight, resize handle styling. Tab key navigates between cells.
- **Modify: **`**GutterEditor.tsx**`** editorProps** — Add `handleKeyDown` for Tab/Shift+Tab cell navigation (TipTap tables support `goToNextCell`/`goToPreviousCell`).

## Phase 5: Drag-to-Link + Comment UX Polish ✅

**COMPLETED** — Drag-to-link from file tree into editor inserts `[[WikiLink]]`. Comment panel scroll-to-thread with pulse animation. Scroll-to-comment from CommentsPanel to editor highlight position. Node-level comments on atom nodes (math, mermaid) via node attributes.

## Phase 6: Design Token Audit + Icon Refinement ✅

**COMPLETED** — Added 13 new design tokens (glass-bg/border, focus-shadow, code-bg/block-bg/block-header, find-match/current/shadow, selection-bg, surface-elevated, status-error). Replaced ~50 hardcoded rgba/hex colors in editor.css with CSS variable references. Replaced hardcoded colors in MathBlock, SlashCommands, FileTree, ReplyInput, Thread components. StatusBar pipe separators replaced with styled dividers, undo/redo HTML entities replaced with SVG icons, SidebarIcon/OutlineIcon moved to shared Icons.tsx.

## Phase 7: Quick Wins — Performance & Visual Polish

**Files: 6-8 modified** | Details: `[docs/QUICK_WINS.md](docs/QUICK_WINS.md)`

Small changes with outsized impact on perceived quality and responsiveness.

### Performance

- **Modify: **`**StatusBar.tsx**` — Switch from bulk `useEditorStore()` destructuring to individual Zustand selectors. Eliminates re-renders on every keystroke.
- **Modify: **`**FileTree.tsx**` — Wrap `FileTreeNode` with `React.memo` to prevent recursive re-renders when props haven't changed.
- **Modify: **`**CommentsPanel.tsx**` — Memoize `visibleThreads` filter with `useMemo`.
- **Modify: **`**GutterEditor.tsx**` — Add shallow equality check in `extractCommentTexts` to avoid unnecessary CommentsPanel re-renders.

### Visual Polish

- **Modify: **`**theme.css**` — Add `--status-success`, `--status-info`, `--status-warning` tokens. Add `text-rendering: optimizeLegibility` and `font-feature-settings: "kern"`.
- **Modify: **`**App.tsx**`**, **`**Thread.tsx**`**, **`**Toast.tsx**` — Replace remaining hardcoded Tailwind colors with CSS variable tokens.
- **Modify: **`**TabBar.tsx**`**, **`**FileTree.tsx**`**, **`**Thread.tsx**` — Add transitions to tab active indicator, file tree selection, and comment thread state changes.

## Phase 8: Unified Search (Cmd+K / Ctrl+K)

**Files: 4-5 new/modified**

- **New: **`**src-tauri/src/commands/search.rs**` — `search_workspace(query, path)` command: walks all .md files, returns matches grouped by type: file names (fuzzy), headings (extracted from `# ` lines), full-text content (with surrounding context lines). Cap 100 results, ranked by relevance (exact > starts-with > contains, file names > headings > content).
- **New: **`**src/components/UnifiedSearch.tsx**` — Raycast/Linear-style modal: single input, results grouped into sections (Files, Headings, Content, Commands). Arrow key navigation across sections, Enter opens/executes. Live results as you type with debounce. Shows file path + context for content matches, heading level indicator for headings.
- **Modify: **`**App.tsx**` — Bind `Cmd+K` to unified search. Retire separate Quick Open (Cmd+P) and Command Palette (Cmd+Shift+P), or keep them as aliases that pre-filter to the Files/Commands section.
- **Modify: **`**styles/editor.css**` — Search modal styles: frosted glass backdrop, section headers, highlighted match text, keyboard selection indicator.

## Phase 9: The Beautiful Editor ✅

**COMPLETED** — Indigo ink palette (accent #6366f1 light / #818cf8 dark), Inter UI font + Source Serif 4 editorial serif for prose, warm paper surfaces (#fafaf9 light / #0c0c0f dark), warm amber comment highlights, glass chrome with blur(20px), spring animations, custom scrollbars, redesigned tabs (36px, bottom pill indicator), minimal status bar (26px), file tree accent left border, accent-subtle active states, glass overlays with shadow-xl, slide-up toasts with colored left borders, centered serif welcome screen. All hardcoded #3b82f6 replaced with var(--accent). New CSS tokens: accent-hover, accent-subtle, accent-muted, shadow-xl, transition-spring, transition-micro, font-sans, font-serif.

### Design Vision

The name "Gutter" comes from typography — the margin of a page, the space where annotations live. The visual identity should feel like **a beautifully typeset page with thoughtful marginalia**. Not a code editor. Not a Notion clone. A place where writing feels like a craft.

**The feeling**: Opening Gutter should feel like opening a quality notebook. The writing surface is the hero — everything else (chrome, panels, toolbars) recedes until needed. When panels appear, they feel like the margins of a book where notes and comments naturally belong.

**Reference points**: iA Writer (the writing surface), Linear (the chrome and interactions), Bear (the warmth), Ulysses (the sidebar relationship to content).

**Visual signature**: Indigo ink thread + editorial typography + generous negative space + glass chrome that disappears.

---

### 9a: The Writing Surface — Typography as Identity

This is the single most important change. A writing app lives or dies by how text looks on screen.

**Editor font**: Add a proper editorial serif for prose rendering. Source Serif 4 (Adobe's open-source serif, designed for screens, excellent weight range). Load locally from `src/assets/fonts/`. The serif immediately signals "this is for writing" and separates Gutter from every Electron/Tauri editor using system sans-serif.

**UI font**: Inter for all chrome (sidebar, tabs, status bar, menus). Clean contrast between editorial content and functional UI. Load locally.

**Prose styling — make it feel like a printed page**:

- Line-height: `1.7` → `1.8` (generous, literary)
- H1: `2rem` → `2.5rem`, weight 700, letter-spacing `-0.03em`, add `0.5rem` bottom padding (breathing room below titles)
- H2: `1.5rem` → `1.75rem`, weight 600
- H3: `1.25rem` → `1.375rem`
- Paragraph spacing: `0.625rem` → `0.875rem` (paragraphs should breathe)
- Paragraph max-width: keep `48rem` but add more horizontal padding (`2rem` → `3rem`) — text shouldn't touch the edges
- Blockquotes: `3px` indigo left border, `rgba(var(--accent-rgb), 0.04)` background tint, italic text, slightly larger left padding (`1rem` → `1.25rem`)
- Horizontal rules: thinner (`1px` → hairline via `0.5px`), wider fade (more transparent at edges)
- Inline code: slightly rounder (`4px` → `5px`), warmer bg tint, font-size `0.875em` → `0.85em` (a touch smaller to sit better in prose)
- Table cells: `0.25rem 0.5rem` → `0.5rem 0.75rem` padding, remove zebra striping (cleaner), header row with subtle bottom border instead of bg fill
- Links: indigo instead of blue, no underline by default, underline on hover (more editorial)

**Files**: `theme.css`, `editor.css`, new `src/assets/fonts/` directory with Inter + Source Serif 4 variable font files

### 9b: Color Identity — Indigo Ink

Not just swapping accent colors — building a coherent palette around the idea of ink on paper.

**Accent system** (indigo family):

- `--accent`: `#6366f1` (indigo-500 — the primary ink color)
- `--accent-hover`: `#5457e5` (slightly darker on hover)
- `--accent-subtle`: `rgba(99, 102, 241, 0.08)` (tinted backgrounds for active states)
- `--accent-muted`: `rgba(99, 102, 241, 0.5)` (deemphasized accent text)
- Dark mode accent: `#818cf8` (indigo-400, brighter to pop on dark)

**Light mode surfaces** — warm, paper-like:

- Editor bg: `#ffffff` → `#fafaf9` (stone-50, faintly warm — paper, not screen)
- Sidebar bg: `#f9fafb` → `#f5f5f4` (stone-100, warm gray)
- Elevated surfaces: `#ffffff` (true white lifts above the warm bg)
- Borders: `#e5e7eb` → `#e7e5e4` (stone-300, warm not cool)

**Dark mode surfaces** — rich, not gray:

- Editor bg: `#111827` → `#0c0c0f` (near-black with faint blue undertone)
- Sidebar bg: `#1f2937` → `#141417` (dark, clear hierarchy from editor)
- Elevated: `#1a1a1f` (menus, dropdowns — visible lift from bg)
- Borders: `#374151` → `#232329` (subtle, don't compete with content)
- Text: `#e5e7eb` → `#e8e6e3` (warm white, less blue cast)

**Comment highlights**: Yellow → warm amber/gold. `rgba(245, 176, 65, 0.2)` light, `rgba(245, 176, 65, 0.15)` dark. More "highlighted in a book" than "marked with a highlighter pen."

**Selection**: Indigo-tinted. `rgba(99, 102, 241, 0.15)` light, `rgba(129, 140, 248, 0.2)` dark.

**Fix hardcoded blues**: Replace all `#3b82f6` fallbacks in `WelcomeScreen.tsx` and `ExportDialog.tsx` with `var(--accent)`.

**Files**: `theme.css`, `WelcomeScreen.tsx`, `ExportDialog.tsx`

### 9c: The Chrome — Tabs, Status, Panels

Everything that isn't the writing surface should feel like it's made of glass and whispers.

**Tab Bar**:

- Height: `40px` → `36px`
- Background: match sidebar bg (not a separate band of color)
- Active tab: `font-medium` text + subtle bottom pill indicator (rounded, inset `left-2 right-2`, 2px height, accent color)
- Active tab gets `bg-[var(--surface-primary)]` (editor bg color — visually "connects" to the editor below)
- Inactive tabs: muted text, `hover:bg-[var(--surface-hover)]`
- Dirty indicator: tiny (5px) accent-colored dot, not the current large circle
- Bottom separation: subtle `box-shadow: 0 1px 0 var(--editor-border)` instead of hard border (softer)
- Close button on hover only, smaller (12px icon)

**Status Bar**:

- Height: `32px` → `26px` (minimal, it should barely be there)
- Font: `13px` → `11px`, color `--text-muted` (whisper, not talk)
- Remove most dividers — use spacing (gap) instead of visible separators. Keep at most 1-2 for major section breaks
- Active toggle buttons: indigo text + `--accent-subtle` bg (not gray `--surface-active`)
- Save indicator: just text "Saved" / "Edited" in muted color, no colored dot (less visual noise)
- Move undo/redo buttons to be less prominent or remove from status bar entirely (they're accessible via shortcuts and menus)

**Side Panels**:

- Panel headers: create `.panel-header` utility — `10px`, weight 600, uppercase, `0.06em` tracking, `--text-muted` color, `px-3 py-2`. Replace duplicated Tailwind in DocumentOutline, BacklinksPanel, CommentsPanel, FileTree
- File tree: remove indent guide lines entirely (rely on indentation). Active file: subtle left accent border (`2px`) instead of full-row bg fill. Hover: slightly more visible (`0.07` opacity)
- Comments panel: active thread gets `--accent-subtle` bg + `2px` accent left border. Resolved threads: `opacity-0.4` (more faded). Comment badges: indigo text on `--accent-subtle` bg (Linear-style tinted pill, not solid accent pill)
- Document outline: active heading gets accent-colored text + `2px` left border, not bg fill
- Backlinks: consistent with outline styling

**Resize handles**: Current full-width accent bar is too aggressive. Replace with a small centered pill indicator (12px tall, 3px wide, centered vertically). Colors: transparent by default → `--text-muted` on hover → `--accent` while dragging.

**Files**: `TabBar.tsx`, `StatusBar.tsx`, `FileTree.tsx`, `Thread.tsx`, `CommentsPanel.tsx`, `DocumentOutline.tsx`, `BacklinksPanel.tsx`, `editor.css`, `theme.css`

### 9d: Overlays — Glass That Feels Magical

Menus, search, and dialogs are the moments people notice. They should feel like they float.

**Glass system upgrade**:

- Light: `rgba(255, 255, 255, 0.78)` bg, `blur(20px)`, border `rgba(0, 0, 0, 0.06)`
- Dark: `rgba(20, 20, 23, 0.80)` bg, `blur(20px)`, border `rgba(255, 255, 255, 0.06)`
- Shadow: add new `--shadow-xl`: `0 2px 4px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.16)` (light) / deeper in dark

**Unified Search**:

- Scrim: `black/40` → `black/50` (darker for more drama and contrast)
- Modal: use `--shadow-xl`, larger input (`16px` font, `14px 18px` padding)
- Entrance: `translateY(-8px)` + `scale(0.98)` → `translateY(0)` + `scale(1)` with spring easing
- Selected result: accent left border + `--accent-subtle` bg

**Context Menu / Slash Menu / Autocomplete**:

- Use updated glass system (more translucent, stronger blur)
- Selected item: visible `2px` accent left border
- Entrance animation: `fadeInScale` with spring easing (`cubic-bezier(0.16, 1, 0.3, 1)`)

**Toasts**:

- Add `3px` left border colored by type (green success, red error, amber warning, indigo info)
- Rounder corners (`--radius-lg`)
- Entrance: slide up from bottom (`translateY(8px)` → `0`) + fade, spring easing
- Exit: fade + slight downward drift

**Export Dialog**: Update to match glass system. Buttons use indigo accent, not blue.

**Files**: `theme.css`, `editor.css`, `UnifiedSearch.tsx`, `Toast.tsx`, `ExportDialog.tsx`

### 9e: Custom Scrollbars

The biggest "this is a web app" tell.

- Main content areas: `8px` width
- Sidebars: `6px` width
- Track: fully transparent (no gutter line)
- Thumb: rounded, with `2px` transparent border creating an inset effect (`background-clip: content-box; border: 2px solid transparent`)
- Light mode thumb: `rgba(0, 0, 0, 0.15)`, hover: `rgba(0, 0, 0, 0.3)`
- Dark mode thumb: `rgba(255, 255, 255, 0.12)`, hover: `rgba(255, 255, 255, 0.25)`
- Auto-hide behavior: thumb at 0 opacity normally, appears on container hover and during scroll

**Files**: `theme.css`

### 9f: Motion Design — Spring Physics

Motion should feel physical, not mechanical. Elements should settle into place, not just appear.

**Global transition update**:

- `--transition-fast`: `120ms ease` → `150ms ease-out`
- `--transition-normal`: `200ms ease` → `250ms ease-out`
- New `--transition-spring`: `350ms cubic-bezier(0.16, 1, 0.3, 1)` (for overlays, panels)
- New `--transition-micro`: `100ms ease-out` (for hover states on small elements like buttons)

**Overlay entrance** (`@keyframes fadeInScale` update):

```css
from { opacity: 0; transform: translateY(-6px) scale(0.97); }
to   { opacity: 1; transform: translateY(0) scale(1); }
```

Duration: `250ms cubic-bezier(0.16, 1, 0.3, 1)` — drops in with weight, overshoots slightly, settles.

**Panel open/close**: Sidebar panels should have a smooth width transition (`--transition-spring`), not instant snap.

**Mermaid/Math blocks**: Remove always-visible border. `border: 1px solid transparent` → appears as `var(--editor-border)` on hover, `var(--accent)` on select. Transition the border color.

**Focus rings**: `0 0 0 4px` → `0 0 0 3px`, use `rgba(99, 102, 241, 0.2)` (indigo tint instead of blue).

**Button hover states**: Create `.btn-ghost` utility class to standardize the pattern used 10+ times: `bg: transparent → var(--surface-hover)`, `color: var(--text-muted) → var(--text-primary)`, `transition: var(--transition-micro)`.

**Code block headers**: Subtler background (`--code-block-header` closer to `--code-block-bg`), less visual weight.

**Files**: `theme.css`, `editor.css`

### 9g: Welcome Screen — The First Impression

The first thing someone sees. Should make them want to start writing.

- Center the content vertically AND horizontally (true center, not just horizontal)
- Reduce visual density: just the app name (large, serif, editorial weight), a one-line subtitle, and the CTA
- Recent files section: cleaner cards with just filename + relative date, no path clutter
- Keyboard shortcuts: keep but make them smaller, more muted — they're reference, not the hero
- The CTA button should use indigo accent with subtle glow/shadow on hover
- Add a subtle fade-in animation on mount (the screen should breathe into existence, not pop)

**Files**: `WelcomeScreen.tsx`

### 9h: Dark Mode as Its Own Design

Don't invert — design it.

- Backgrounds: near-black (`#0c0c0f`) with faint blue warmth, not Tailwind gray-900
- Text: warm off-white (`#e8e6e3`), not cool gray
- Borders: barely visible (`#232329`), rely on elevation/shadow for separation
- Code blocks: richer dark bg (`#131316`), slightly different from editor bg so they're visible but not jarring
- Syntax highlighting: keep VS Code Dark+ colors (they're already good)
- Glass effects: more transparent in dark (`0.75` opacity), more dramatic blur creates premium depth
- Shadows: deeper, with faint indigo ambient tint: `0 8px 24px rgba(99, 102, 241, 0.06)` — subtle colored light bleed
- The accent (indigo) should pop more in dark mode — it's the color of light in a dark room

**Files**: `theme.css`, `editor.css`

### Verification (after each sub-phase)

1. `npm run tauri dev` — visual check in both light and dark
2. Write a full document (headings, paragraphs, lists, code, blockquotes, links, math) and read it — does it feel good to look at?
3. Open all panels, resize them, toggle them — does the chrome feel quiet?
4. Open overlays (search, context menu, slash commands) — do they feel like they float?
5. `npx tsc --noEmit` after any .tsx changes
6. Existing tests should still pass (`npm test`)

## Phase 10: Native Menu Bar

**Files: 3-4 new/modified**

- **New: **`**src-tauri/src/menu.rs**` — Build native menu using `tauri::menu`: File (New Tab, Open, Save, Save As, Close Tab), Edit (Undo, Redo, Cut, Copy, Paste, Select All, Find), View (Toggle Sidebar, Toggle Comments Panel, Toggle Zen Mode, Toggle Source Mode, Zoom In/Out, Cycle Theme), Window (Minimize, Zoom, Close). Use platform-aware accelerators (`Cmd` on macOS, `Ctrl` on Windows/Linux).
- **Modify: **`**src-tauri/src/lib.rs**` — Register menu builder, attach to window. Wire `on_menu_event` to emit events to the frontend (e.g., `menu://file/save`, `menu://view/toggle-sidebar`).
- **Modify: **`**App.tsx**` — Listen for menu events via `listen()` from `@tauri-apps/api/event` and dispatch the same actions that keyboard shortcuts already trigger. Deduplicate shortcut logic into shared handler functions if not already done.
- **Modify: **`**src-tauri/src/lib.rs**` — Dynamically update menu item state (e.g., checkmarks for toggleable items like Zen Mode, Source Mode) when frontend state changes, via `app.emit()` back to Rust or by using Tauri's menu item enabled/checked APIs.

## Phase 11: Release Prep

**Files: 5-6 modified**

- [x] **App icon** — Custom icon in all formats (icns, ico, PNGs) already in `src-tauri/icons/`
- **Modify: **`**FileTree.tsx**` — Multi-select support: Shift+click for range select, Cmd/Ctrl+click for toggle select. Selected files get visual highlight. Context menu actions (Delete, Move) apply to all selected files. Clear selection on single-click without modifier.
- **Modify: **`**Cargo.toml**` — Add `[profile.release]` with LTO, strip, codegen-units=1, opt-level="s", panic="abort"
- **Modify: **`**tauri.conf.json**` — Add CSP policy, add `fileAssociations` for .md/.markdown
- **Modify: **`**lib.rs**` — Handle file-open from OS launch arguments

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
- [x] Phase 9: Style Optimization — World-Class Visual Polish (9a–9i)
- [x] Phase 10: Native Menu Bar
- [ ] Phase 11: Release Prep


