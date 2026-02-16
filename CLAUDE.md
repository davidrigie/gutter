# [CLAUDE.md](http://CLAUDE.md)

This file provides guidance to Claude Code (claude.ai/code) when <mark>working</mark><sup>[c1]</sup> with code in this repository.

## Maintaining This File

After completing significant work (new features, new files, architectural changes), update this file and `memory/MEMORY.md` to reflect the current state. Keeping these accurate saves time in future sessions — stale instructions lead to wrong assumptions, unnecessary exploration, and wasted context window. Key things to keep current: extension list, store fields, Rust command modules, keyboard shortcuts, and polish plan status.

## Project Overview

Gutter is a local-first WYSIWYG markdown editor with first-class commenting, built with Tauri v2 (Rust backend) + React 19 + TipTap 3 (ProseMirror). All code lives under `gutter/`.

## Planning

- **Active plan**: `POLISH_PLAN.md` — concise status overview. Phases 1–11 and 14 complete. Next up: Phase 12 (Templates).
- **Phase details**: Upcoming phases in `docs/plans/` (one file per phase). Completed phase details in `docs/completed-plans/polish-phases-1-11.md`.
- **Completed plans**: Sprint 1 build plan archived in `docs/completed-plans/`.

## Commands

All commands run from `gutter/`:

```bash
npm run tauri dev          # Full app: Vite dev server + Rust backend + native window
npm run dev                # Frontend only (Vite on localhost:1421)
npm run build              # Production build (tsc + vite)
npm test                   # Run all tests (vitest)
npm run test:watch         # Tests in watch mode
npx tsc --noEmit           # Type check without emitting
```

Rust backend compiles automatically via Tauri during `npm run tauri dev`. To rebuild Rust only: `cd src-tauri && cargo build`.

## Architecture

### Frontend ↔ Backend IPC

Frontend calls Rust functions via `invoke()` from `@tauri-apps/api/core`. All Rust commands are in `src-tauri/src/commands/` and registered in `src-tauri/src/lib.rs`. Command modules:

- **file_io.rs** — read/write/create/delete/rename files and directories, `open_url` for external links
- **comments.rs** — read/write/delete comment sidecar files (`.comments.json`, `.comments.md`)
- **workspace.rs** — recursive directory listing (filters hidden files and comment files, max depth 10)
- **watcher.rs** — file system watcher with `mark_write()` suppression to avoid false change notifications
- **export.rs** — export to HTML with inline CSS
- **settings.rs** — reads/writes `~/.gutter/config.json`
- **search.rs** — full-text workspace search (headings + content), case-insensitive, returns capped results
- **history.rs** — local snapshot CRUD (save/list/read/update/delete) with SHA-256 dedup + git history (log/show)

Additionally, `src-tauri/src/menu.rs` (not a command module) builds the native menu bar and emits `menu:*` events to the frontend.

### State Management (Zustand)

Stores in `src/stores/`:

- **editorStore** — UI state: file path, dirty flag, theme, panel visibility, source mode, active comment, `commentTexts` (maps commentId → quoted text), `canUndo`/`canRedo`, `showOutline`, `showHistory`
- **commentStore** — comment thread data, CRUD ops, ID generation (`c1`, `c2`...), JSON export/import
- **workspaceStore** — file tree structure, open tabs, active tab, tab dirty state
- **settingsStore** — user preferences (font size, font family, auto-save, spell check, panel widths, recent files, default author)
- **toastStore** — toast notification system with type, duration, auto-dismiss
- **backlinkStore** — scans workspace for backlinks to current file

### Comment System (Three-File Model)

This is the core differentiator. Understand this before touching comment-related code:

1. **Inline markers in **`**.md**`: `<mark>highlighted text</mark><sup>[c1]</sup>` — survive standard markdown renderers
2. `.comments.json` — structured thread data (source of truth), keyed by comment ID
3. `.comments.md` — auto-generated human-readable companion, never hand-edited

Flow: parser.ts extracts markers → CommentMark TipTap extension renders them → serializer.ts writes them back → useComments.ts handles persistence. The `buildCompanionMarkdown()` function in useComments.ts generates the companion file.

**Node-level comments**: Atom nodes (Mermaid, Math) can't use inline marks — they use a `commentId` node attribute instead. Detect via `selection instanceof NodeSelection && selection.node.type.spec.atom`. Node views expose `data-node-comment-id` for DOM queries.

**Active comment highlighting**: A ProseMirror plugin (`activeCommentPluginKey`) syncs the active comment from Zustand via transaction meta and adds decorations to highlight it.

**Scroll-to-comment**: `scroll-to-comment` CustomEvent from CommentsPanel → GutterEditor walks doc for both mark-based AND node-attribute-based comments.

**Critical invariant**: `serialize(parse(markdown)) ≈ markdown` — round-trip fidelity must be preserved. Comment markers are inline HTML that must survive exactly.

### Editor Extensions

Custom TipTap extensions in `src/components/Editor/extensions/`:

- **CommentMark.ts** — mark extension for comment highlights (text selections)
- **SlashCommands.tsx** — vanilla DOM slash command menu (no `@tiptap/suggestion` dependency)
- **CodeBlockWithLang.tsx** — code blocks with language selector dropdown
- **MathBlock.tsx** — KaTeX rendering, block (`$$`) and inline (`$`)
- **MermaidBlock.tsx** — Mermaid diagram rendering with edit mode
- **WikiLink.ts** — hides `[[`/`]]` brackets on non-active lines, styles wiki links
- **WikiLinkAutocomplete.ts** — fuzzy file picker triggered on `[[`
- **LinkReveal.ts** — Typora-style line reveal for headings, bold, italic, strike, code, links, wiki links
- **MarkdownLinkInput.ts** — auto-converts typed `[text](url)` to links
- **Frontmatter.tsx** — YAML frontmatter support with edit mode
- **SpellCheck.ts** — toggleable spell check

### Cross-Component Communication (CustomEvents)

Several features use `CustomEvent` dispatched on `document`:

- `wiki-link-click` — WikiLink extension → App (navigates to file)
- `internal-link-click` — regular markdown links → App
- `file-tree-drop-link` — FileTree drag → GutterEditor (inserts `[[WikiLink]]`)
- `scroll-to-comment` — CommentsPanel → GutterEditor (scrolls to highlight)

### Markdown Parser/Serializer

In `src/components/Editor/markdown/`:

- **parser.ts** — unified + remark-parse + remark-gfm → TipTap JSONContent. Pre-extracts math blocks before parsing, handles comment marker pattern matching.
- **serializer.ts** — TipTap JSONContent → markdown string. Comment marks serialize to `<mark>TEXT</mark><sup>[cID]</sup>`.

### Styling

- `**src/styles/theme.css**` — CSS custom properties (design tokens), light/dark themes, animations. Semantic colors (`--text-primary`, `--surface-hover`, `--glass-bg`, `--surface-elevated`, etc.) defined here.
- `**src/styles/editor.css**` — ProseMirror prose styles, context menu, slash menu, floating bars, code blocks, table menu, comment highlights, toast styles. Component-specific CSS lives here, not in component files.
- `**src/components/Icons.tsx**` — shared SVG icon components (SidebarIcon, OutlineIcon, etc.)
- Components use Tailwind utility classes referencing CSS variables: `text-[var(--text-primary)]`

### Key Keyboard Shortcuts

Defined in `App.tsx` `handleKeyDown`. Uses `modKey(e)` helper from `src/utils/platform.ts` for cross-platform support (Cmd on macOS, Ctrl on Windows/Linux):

Mod+K (unified search), Mod+O (open), Mod+S (save), Mod+P (quick open files), Mod+F (find), Mod+H (find & replace), Mod+/ (toggle source), Mod+\ (file tree), Mod+. (commands), Mod+Shift+C (comments), Mod+Shift+H (version history), Mod+Shift+R (reading mode), Mod+Shift+D (theme), Mod+Shift+P (commands alt), Mod+Shift+M (new comment), Mod+Shift+N (next comment), Mod+Shift+E (export).

### Utilities

- `**src/utils/platform.ts**` — `isMac()`, `modLabel()`, `modKey(e)` for cross-platform keyboard handling
- `**src/utils/path.ts**` — cross-platform path utilities: `splitPath()`, `fileName()`, `parentDir()`, `joinPath()`

## TypeScript Strictness

tsconfig has `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`. Always run `npx tsc --noEmit` after changes.

## Testing

Tests in `gutter/tests/`: parser, serializer, round-trip fidelity, comment store CRUD, companion file generation, smoke tests. Run a single test file: `npx vitest run tests/parser.test.ts`.
