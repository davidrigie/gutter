# Gutter App-Store Polish Plan

## Context

Gutter has a solid feature set but needs polish to feel like a paid app. The audit found: no dirty-tab save warnings (data loss risk), no error feedback (silent failures), font settings stored but never applied, no formatting toolbar, no settings UI, no native menu bar, no workspace search, no window persistence, no PDF export, default scrollbars, and no loading indicators.

## Phase 1: Dirty Tab Protection + Toast Notifications

**Files: 4 new/modified**

- **New: **`**src/stores/toastStore.ts**` — Zustand store: `{ id, message, type, duration }[]`, auto-dismiss after 4s
- **New: **`**src/components/Toast.tsx**` — Fixed bottom-right toast container, uses existing `fadeInScale` animation and CSS variable system
- **Modify: **`**App.tsx**` — Mount `<ToastContainer>`, change `handleCloseTab` to check `isDirty` and show Tauri `ask()` dialog (Save/Don't Save/Cancel), add `tauri://close-requested` listener for app quit with dirty tabs
- **Modify: **`**TabBar.tsx**` — Make close handlers async, pass through dirty check for Close Others/Close All
- Wire toasts into all `catch` blocks replacing `console.error`

## Phase 2: Settings Dialog + Font Settings Applied

**Files: 4 new/modified**

- **New: **`**src/components/SettingsDialog.tsx**` — Modal (pattern from ExportDialog): theme selector, font size input (12-24), font family dropdown (Default/Serif/Mono), auto-save toggle + interval, spell check toggle, default author input. All wired to existing `settingsStore` setters
- **Modify: **`**GutterEditor.tsx**` — Subscribe to `settingsStore.fontSize`/`fontFamily`, apply as inline styles on editor container
- **Modify: **`**App.tsx**` — Add `Cmd+,` shortcut, settings dialog state, command palette entry
- **Modify: **`**StatusBar.tsx**` — Add gear icon button to open settings

## Phase 3: Formatting Toolbar (Bubble Menu)

**Files: 3 new/modified**

- **New: **`**src/components/Editor/BubbleToolbar.tsx**` — Uses TipTap's `<BubbleMenu>` (already installed via `@tiptap/react`). Buttons: Bold, Italic, Strikethrough, Code, Link, Comment. Active state via `editor.isActive()`. Frosted glass style matching slash/context menus
- **Modify: **`**GutterEditor.tsx**` — Mount `<BubbleToolbar editor={editor} />`
- **Modify: **`**styles/editor.css**` — Bubble toolbar styles

## Phase 4: Native macOS Menu Bar

**Files: 2-3 modified**

- **Modify: **`**src-tauri/src/lib.rs**` — Build menu with `tauri::menu`: App (About, Preferences, Quit), File (New, Open, Save, Save As, Export, Close Tab), Edit (Undo, Redo, Cut, Copy, Paste, Select All, Find, Replace), View (File Tree, Comments, Outline, Zen, Source, Theme)
- **Modify: **`**App.tsx**` — Listen for menu events via `listen('menu://...')` and dispatch to existing handlers
- **Modify: **`**Cargo.toml**` — Add menu feature if needed

## Phase 5: Scrollbars + Loading Spinners

**Files: 3 new/modified**

- **Modify: **`**styles/theme.css**` — WebKit scrollbar styles: thin (8px), thumb `var(--surface-active)`, track transparent, light+dark variants
- **New: **`**src/components/Spinner.tsx**` — Small SVG spinner with size/color props
- Replace "Loading..." text in VersionHistory, BacklinksPanel, FileTree with `<Spinner />`

## Phase 6: Window State Persistence

**Files: 2 modified**

- **Modify: **`**Cargo.toml**` — Add `tauri-plugin-window-state`
- **Modify: **`**lib.rs**` — Register `.plugin(tauri_plugin_window_state::Builder::default().build())`
- Zero frontend code needed — plugin auto-saves/restores position, size, maximized state

## Phase 7: Workspace Search

**Files: 5 new/modified**

- **New: **`**src-tauri/src/commands/search.rs**` — `search_workspace(query, path, case_sensitive, regex)` walks workspace, searches .md files, returns `Vec<{file_path, file_name, line_number, line_content}>`, cap 200 results
- **New: **`**src/components/WorkspaceSearch.tsx**` — Modal overlay (like QuickOpen): search input with case/regex toggles, results grouped by file, click to open
- **Modify: **`**mod.rs**`**, **`**lib.rs**` — Register search command
- **Modify: **`**App.tsx**` — Remap Cmd+Shift+F from Zen Mode to Workspace Search (Zen → Cmd+Shift+Z), add state + command palette entry

## Phase 8: Drag-from-Finder + PDF Export

**Files: 3 modified**

- **Modify: **`**App.tsx**` — Listen for `tauri://drag-drop` event, filter for .md files, call `handleFileTreeOpen` for each
- **Modify: **`**ExportDialog.tsx**` — Add "Print / Save as PDF" button calling `window.print()`
- **Modify: **`**styles/editor.css**` — Add `@media print` to hide sidebars, status bar, tab bar

## Phase 9: Release Prep

**Files: 3 modified**

- **Modify: **`**Cargo.toml**` — Add `[profile.release]` with LTO, strip, codegen-units=1, opt-level="s", panic="abort"
- **Modify: **`**tauri.conf.json**` — Add CSP policy, add `fileAssociations` for .md/.markdown
- **Modify: **`**lib.rs**` — Handle file-open from OS launch arguments

## Execution Order

1 → 2 → 3 → 5 → 4 → 6 → 7 → 8 → 9

Phases 1-2 first (infrastructure). 3+5 are quick visual wins. 4+6 are Rust-side. 7 is the biggest remaining feature. 8+9 are release prep.

## Status

- Phase 1: Dirty Tab Protection + Toast Notifications
- Phase 2: Settings Dialog + Font Settings Applied
- Phase 3: Formatting Toolbar (Bubble Menu)
- Phase 4: Native macOS Menu Bar
- Phase 5: Scrollbars + Loading Spinners
- Phase 6: Window State Persistence
- Phase 7: Workspace Search
- Phase 8: Drag-from-Finder + PDF Export
- Phase 9: Release Prep


