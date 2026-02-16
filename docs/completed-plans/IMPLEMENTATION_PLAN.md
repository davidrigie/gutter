# Gutter Roadmap — Full Implementation Plan

## Context

Gutter is a functional prototype markdown editor (Tauri v2 + React 19 + TipTap 3). The roadmap defines ~18 features across 4 tiers to bring it to parity with Bear/iA Writer/Obsidian. This plan implements all tiers in dependency order.

---

## Implementation Phases

### Phase 0: Settings Infrastructure (foundation for all features)

**Files:** New `src/stores/settingsStore.ts`, new Rust `src-tauri/src/commands/settings.rs`, modify `lib.rs`

- Create `settingsStore` (Zustand) with defaults: `{ theme, fontSize, fontFamily, autoSaveInterval, panelWidths: { fileTree: 224, comments: 288 }, recentFiles: [], spellCheckEnabled, focusModeEnabled, typewriterEnabled, defaultAuthor }`
- Rust commands: `read_settings(path)`, `write_settings(path, content)` — reads/writes `~/.gutter/config.json`
- Load settings on app startup, persist on change
- Migrate `theme` from editorStore to settingsStore

### Phase 1: Resizable Panels

**Files:** New `src/components/ResizeHandle.tsx`, modify `App.tsx`, modify `src/styles/editor.css`

- `ResizeHandle` component: vertical drag handle between panels, `onMouseDown` → track `mousemove` → update width
- Replace fixed `w-56`/`w-72` classes with inline `style={{ width }}` driven by settingsStore panelWidths
- Min widths: fileTree 160px, comments 220px, max 50% of viewport
- Double-click handle resets to default
- Persist widths to settingsStore → config.json
- CSS: cursor styles, drag handle hover/active states

### Phase 2: Find & Replace

**Files:** New `src/components/FindReplace.tsx`, modify `App.tsx`, modify `src/styles/editor.css`

- Inline bar at top of editor area (below tab bar, above editor content)
- Cmd+F opens find mode, Cmd+H opens replace mode
  - **Note:** Cmd+Shift+F is taken by zen mode. Use Cmd+H for replace.
- State: `searchTerm`, `replaceTerm`, `matchCase`, `wholeWord`, `useRegex`, `matches[]`, `currentMatchIndex`
- Use TipTap's `editor.state.doc.textBetween()` to search document text
- ProseMirror decorations plugin to highlight all matches (yellow bg), current match (orange bg)
- Enter/Shift+Enter cycle matches, scroll into view via `editor.commands.scrollIntoView()`
- Replace / Replace All buttons
- Match count display: "3 of 17"
- Escape closes find bar
- Add to command palette and keyboard handler

### Phase 3: Quick Open

**Files:** New `src/components/QuickOpen.tsx`, modify `App.tsx`

- Cmd+P opens fuzzy file finder (separate from command palette Cmd+Shift+P)
- Flatten workspace file tree into searchable list
- Fuzzy match: score by consecutive character matches, filename vs path, boost recent files
- Recent files list maintained in settingsStore (last 20 opened files)
- Arrow keys navigate, Enter opens file, Escape closes
- UI similar to CommandPalette but with file icons and path display
- Reuse `handleFileTreeOpen` for opening

### Phase 4: Clipboard Image Paste & Drag/Drop

**Files:** Modify `GutterEditor.tsx`, new Rust command in `file_io.rs`

- TipTap `editorProps.handlePaste`: detect `clipboardData.files` with image types
- TipTap `editorProps.handleDrop`: detect dropped image files
- New Rust command: `save_image(dir_path, filename, base64_data)` — saves to `./assets/` next to md file
- Generate filename: `image-{timestamp}.png`
- Insert `![](./assets/image-{timestamp}.png)` at cursor
- Create `assets/` directory if it doesn't exist (use existing `create_directory` command)

### Phase 5: File Watcher

**Files:** New `src-tauri/src/commands/watcher.rs`, modify `lib.rs`, modify `App.tsx`, modify `workspaceStore.ts`

- `notify` crate already in Cargo.toml
- Rust: `start_watcher(path)` and `stop_watcher()` commands using `notify::RecommendedWatcher`
- Emit Tauri events (`file-changed`, `tree-changed`) to frontend via `app.emit()`
- Frontend: `listen()` from `@tauri-apps/api/event` in App.tsx
- On `tree-changed`: debounce 500ms, then `loadFileTree()`
- On `file-changed` for current open file: show reload prompt bar (non-modal, dismissible)
- Filter out `.comments.json`/`.comments.md` change events
- Start watcher when workspace opens, stop on workspace change

### Phase 6: Undo/Redo Indicators

**Files:** Modify `StatusBar.tsx`, modify `GutterEditor.tsx`

- Expose `editor.can().undo()` / `editor.can().redo()` state from GutterEditor
- Add to editorStore: `canUndo`, `canRedo`, update on each editor transaction
- StatusBar: show undo/redo buttons (arrow icons) with disabled state
- Track "clean" editor state hash — when undo returns to saved state, clear isDirty

### Phase 7: Document Outline

**Files:** New `src/components/DocumentOutline.tsx`, modify `App.tsx`, modify `editorStore.ts`

- Parse editor JSON for heading nodes → build tree `{ level, text, pos }[]`
- Click heading → `editor.commands.scrollToPosition(pos)` (set selection + scrollIntoView)
- Highlight current heading based on scroll position (intersection observer or pos tracking)
- Collapsible hierarchy (H2 under H1, etc.)
- Add as tab alongside file tree in left sidebar, or toggle via command palette
- New editorStore state: `showOutline` boolean, toggle in StatusBar

### Phase 8: Typewriter / Focus Mode

**Files:** New `src/components/Editor/extensions/FocusMode.ts`, modify `src/styles/editor.css`

- TipTap extension using ProseMirror decorations
- On `selectionChange`: find the block node containing cursor
- Apply `.dimmed` class decoration to all other top-level nodes (opacity: 0.3, transition)
- Typewriter scroll: after each keystroke in the active block, scroll to keep it vertically centered
- Toggle via Cmd+Shift+T, settingsStore persistence
- Add to command palette

### Phase 9: Tab Improvements

**Files:** Modify `TabBar.tsx`, modify `workspaceStore.ts`

- Middle-click close: `onAuxClick` handler (button === 1)
- Drag reorder: `draggable` attribute, `onDragStart`/`onDragOver`/`onDrop` → reorder `openTabs` array
- Tab overflow: detect when tabs exceed container width, show scroll arrows or "..." dropdown
- Pin tabs: add `isPinned` to `OpenTab`, pinned tabs show icon-only, sort to front
- Add `reorderTabs`, `pinTab`, `unpinTab` actions to workspaceStore

### Phase 10: Drag & Drop in File Tree

**Files:** Modify `FileTree.tsx`, add Rust rename support (already exists as `rename_path`)

- `draggable` attribute on FileTreeNode
- `onDragStart`: store dragged path in dataTransfer
- `onDragOver` on folder nodes: highlight as drop target, auto-expand after 800ms hover
- `onDrop`: invoke `rename_path(oldPath, newDir/name)` to move file
- Visual: drop indicator line between items, highlight on folder
- Prevent dropping onto self or into own children (for folders)

### Phase 11: Better Welcome Screen

**Files:** New `src/components/WelcomeScreen.tsx`, modify `App.tsx`

- Show when no file is open (`filePath === null && openTabs.length === 0`)
- Recent files list from settingsStore (with "Open" action)
- "Open File" and "Open Folder" buttons
- Keyboard shortcut cheatsheet (grid of key combos)
- App name + version
- Clean, centered layout with subtle branding

### Phase 12: Export

**Files:** New `src/components/ExportDialog.tsx`, new Rust `src-tauri/src/commands/export.rs`

- Cmd+Shift+E opens export dialog
- **HTML export**: convert markdown to HTML (use remark-html already in deps), wrap in styled template
- **PDF export**: use Tauri's webview print-to-PDF or `window.__TAURI__.invoke` with a hidden webview
- **Copy as rich text**: render HTML, use `navigator.clipboard.write()` with `text/html` MIME
- Option: include/exclude comments
- Rust: `export_html(content, path)`, `export_pdf(html, path)` commands
- Save dialog for choosing output location

### Phase 13: Frontmatter Support

**Files:** Modify `parser.ts`, modify `serializer.ts`, new `src/components/Editor/extensions/Frontmatter.tsx`

- Detect `---\n...\n---` at document start in parser
- Parse YAML (simple key-value, no need for full YAML lib — or add `yaml` npm package)
- Custom TipTap node: `frontmatter` with attributes for parsed fields
- Render as clean metadata bar: title, tags (chips), date, custom fields
- Click to edit inline (contenteditable fields)
- Serializer: output back as YAML frontmatter block
- If `title` present in frontmatter, use as document title in tab/window

### Phase 14: Backlinks & Wiki Linking

**Files:** New `src/components/Editor/extensions/WikiLink.ts`, new `src/components/BacklinksPanel.tsx`, new `src/stores/backlinkStore.ts`, modify `parser.ts`, modify `serializer.ts`

- **WikiLink extension**: custom TipTap mark/node for `[[filename]]`
- **Input rule**: typing `[[` triggers autocomplete popup (search workspace files)
- **Parser**: detect `[[...]]` pattern, convert to wikiLink node
- **Serializer**: wikiLink node → `[[filename]]`
- **Click handler**: Ctrl+click on wiki link opens that file
- **Hover preview**: tooltip showing first ~200 chars of linked document
- **Backlinks panel**: scan all workspace .md files for `[[currentFile]]` references
- **backlinkStore**: cache of file→backlinks mapping, rebuild on file save/tree change

### Phase 15: Version History

**Files:** New `src-tauri/src/commands/history.rs`, new `src/components/VersionHistory.tsx`, new `src/stores/historyStore.ts`

- Rust: `save_snapshot(md_path, content)` — saves to `.gutter/history/{filename}/{timestamp}.md`
- Rust: `list_snapshots(md_path)` — returns `[{ timestamp, size }]`
- Rust: `read_snapshot(snapshot_path)` — returns content
- Auto-snapshot on each save (in handleSave)
- Timeline UI: list of snapshots with timestamps
- Diff view: simple line-by-line diff (highlight additions/removals)
- Restore: load snapshot content into editor, mark dirty
- Access via command palette or toolbar button

### Phase 16: Spell Check

**Files:** New `src/components/Editor/extensions/SpellCheck.ts`, new Rust `src-tauri/src/commands/spellcheck.rs`

- Use the OS spellcheck API via Tauri, or use a JS dictionary (e.g., `nspell` + en_US dictionary)
- ProseMirror decoration plugin: scan text nodes, underline misspelled words (red wavy)
- Right-click context menu integration: show suggestions above existing menu items
- Personal dictionary: stored in `~/.gutter/dictionary.txt`, loaded on startup
- "Add to dictionary" action from context menu
- Toggle in settings, Cmd+Shift+; shortcut
- Debounce checking to avoid lag on rapid typing

### Phase 17: Comment Enhancements

**Files:** Modify `CommentsPanel.tsx`, modify `Thread.tsx`, modify `commentStore.ts`, modify `src/types/comments.ts`

- **Emoji reactions**: add `reactions: Record<string, string[]>` to CommentMessage, reaction picker UI
- **Filter comments**: dropdown in CommentsPanel header — All / Open / Resolved
- **Robust anchors**: store surrounding text context (±50 chars) in comment metadata, use for re-anchoring if marks are lost
- **Export comments**: "Export as markdown" button in CommentsPanel → generates standalone review doc

### Phase 18: Performance — Debounced File Tree Refresh

**Files:** Modify `workspaceStore.ts`, modify file watcher integration

- Debounce `loadFileTree` calls: collect change events, batch refresh every 500ms
- Avoid full tree rebuild on single file change when possible (targeted update)
- This is naturally handled by Phase 5 (File Watcher) debouncing

---

## Implementation Order Summary

| Phase | Feature | Complexity | New Files |
| --- | --- | --- | --- |
| 0 | Settings Infrastructure | Medium | settingsStore.ts, settings.rs |
| 1 | Resizable Panels | Medium | ResizeHandle.tsx |
| 2 | Find & Replace | Large | FindReplace.tsx |
| 3 | Quick Open | Medium | QuickOpen.tsx |
| 4 | Image Paste | Medium | — (modify existing) |
| 5 | File Watcher | Large | watcher.rs |
| 6 | Undo/Redo Indicators | Small | — |
| 7 | Document Outline | Medium | DocumentOutline.tsx |
| 8 | Focus Mode | Medium | FocusMode.ts |
| 9 | Tab Improvements | Medium | — |
| 10 | File Tree Drag & Drop | Medium | — |
| 11 | Welcome Screen | Small | WelcomeScreen.tsx |
| 12 | Export | Large | ExportDialog.tsx, export.rs |
| 13 | Frontmatter | Large | Frontmatter.tsx |
| 14 | Backlinks & Wiki Links | Large | WikiLink.ts, BacklinksPanel.tsx, backlinkStore.ts |
| 15 | Version History | Large | VersionHistory.tsx, history.rs, historyStore.ts |
| 16 | Spell Check | Large | SpellCheck.ts, spellcheck.rs |
| 17 | Comment Enhancements | Medium | — |
| 18 | Perf (debounce) | Small | — (part of Phase 5) |

## Dependencies

- Phase 0 (Settings) → needed by Phases 1, 3, 8, 11, 16
- Phase 1 (Resizable Panels) → improves UX for Phases 7, 14
- Phase 5 (File Watcher) → needed by Phase 18
- Phase 13 (Frontmatter) → enhances Phase 14 (backlinks can use frontmatter titles)

## Verification

After each phase:

1. `npx tsc --noEmit` — must pass with no errors
2. `npm test` — all existing tests must pass
3. `npm run tauri dev` — manual smoke test of the new feature
4. Write tests for new store logic (settings, backlinks, history)

## New Dependencies Needed

- `yaml` (npm) — for frontmatter parsing (Phase 13)
- `nspell` + dictionary (npm) — for spell check (Phase 16), OR use OS spellcheck via Tauri
- `diff` (npm) — for version history diff view (Phase 15)
- No new Rust crates needed (`notify` already present)


