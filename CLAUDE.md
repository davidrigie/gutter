# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when <mark>working</mark><sup>[c1]</sup> with code in this repository.

## Project Overview

Gutter is a local-first WYSIWYG markdown editor with first-class commenting, built with Tauri v2 (Rust backend) + React 19 + TipTap 3 (ProseMirror). All code lives under `gutter/`.

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

Frontend calls Rust functions via `invoke()` from `@tauri-apps/api/core`. All Rust commands are in `src-tauri/src/commands/` and registered in `src-tauri/src/lib.rs`. Three command modules:

- **file_io.rs** — read/write/create/delete/rename files and directories
- **comments.rs** — read/write/delete comment sidecar files (`.comments.json`, `.comments.md`)
- **workspace.rs** — recursive directory listing (filters hidden files and comment files, max depth 10)

### State Management (Zustand)

Three stores in `src/stores/`:

- **editorStore** — UI state: file path, dirty flag, theme, panel visibility, source mode, active comment
- **commentStore** — comment thread data, CRUD ops, ID generation (`c1`, `c2`...), JSON export/import
- **workspaceStore** — file tree structure, open tabs, active tab, tab dirty state

### Comment System (Three-File Model)

This is the core differentiator. Understand this before touching comment-related code:

1. **Inline markers in **`**.md**`: `<mark>highlighted text</mark><sup>[c1]</sup>` — survive standard markdown renderers
2. `**.comments.json**` — structured thread data (source of truth), keyed by comment ID
3. `**.comments.md**` — auto-generated human-readable companion, never hand-edited

Flow: parser.ts extracts markers → CommentMark TipTap extension renders them → serializer.ts writes them back → useComments.ts handles persistence. The `buildCompanionMarkdown()` function in useComments.ts generates the companion file.

**Critical invariant**: `serialize(parse(markdown)) ≈ markdown` — round-trip fidelity must be preserved. Comment markers are inline HTML that must survive exactly.

### Editor Extensions

Custom TipTap extensions in `src/components/Editor/extensions/`:

- **CommentMark.ts** — mark extension for comment highlights
- **SlashCommands.tsx** — vanilla DOM slash command menu (no `@tiptap/suggestion` dependency)
- **CodeBlockWithLang.tsx** — code blocks with language selector dropdown
- **MathBlock.tsx** — KaTeX rendering, block (`$$`) and inline (`$`)
- **MermaidBlock.tsx** — Mermaid diagram rendering with edit mode

### Markdown Parser/Serializer

In `src/components/Editor/markdown/`:

- **parser.ts** — unified + remark-parse + remark-gfm → TipTap JSONContent. Pre-extracts math blocks before parsing, handles comment marker pattern matching.
- **serializer.ts** — TipTap JSONContent → markdown string. Comment marks serialize to `<mark>TEXT</mark><sup>[cID]</sup>`.

### Styling

- `**src/styles/theme.css**` — CSS custom properties (design tokens), light/dark themes, animations. All semantic colors (`--text-primary`, `--surface-hover`, etc.) defined here.
- `**src/styles/editor.css**` — ProseMirror prose styles, context menu, slash menu, floating bars, code blocks. Component-specific CSS lives here, not in component files.
- Components use Tailwind utility classes referencing CSS variables: `text-[var(--text-primary)]`

### Key Keyboard Shortcuts

Defined in `App.tsx` `handleKeyDown`: Cmd+O (open), Cmd+S (save), Cmd+/ (toggle source), Cmd+\ (file tree), Cmd+Shift+C (comments), Cmd+Shift+F (zen mode), Cmd+Shift+D (theme), Cmd+Shift+P (command palette), Cmd+Shift+M (new comment), Cmd+Shift+N (next comment).

## TypeScript Strictness

tsconfig has `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`. Always run `npx tsc --noEmit` after changes.

## Testing

Tests in `gutter/tests/`: parser, serializer, round-trip fidelity, comment store CRUD, companion file generation. Run a single test file: `npx vitest run tests/parser.test.ts`.
