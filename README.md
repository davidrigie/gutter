# Gutter

A local-first WYSIWYG markdown editor with first-class inline commenting. Built with Tauri v2, React 19, and TipTap 3.

**[Download](https://davidrigie.github.io/gutter/)** | **[Releases](https://github.com/davidrigie/gutter/releases)**

![Gutter Editor](screenshot.png)

## Features

- **WYSIWYG Markdown** — headings, bold, italic, links, code blocks, tables, all rendered live
- **Inline Commenting** — highlight text and leave comments, stored as portable HTML markers in standard markdown
- **Wiki Links** — connect notes with `[[wiki links]]`, autocomplete, and backlinks
- **Math & Diagrams** — LaTeX equations (KaTeX) and Mermaid diagrams rendered inline
- **Unified Search** — Cmd+K to search files, headings, tags, and commands in one place
- **Version History** — automatic snapshots on every save with inline diffs, plus git history if tracked
- **Tags** — frontmatter tags with a tag browser panel (list and cloud views), file tree filtering, and search integration
- **Templates** — built-in templates (meeting notes, journal, project brief) and save-as-template for custom ones
- **Reading Mode** — book-typeset view with comments as margin annotations, no chrome
- **Local-First** — your files stay on your machine, plain markdown, no accounts or cloud
- **Fast & Native** — Rust backend, starts in under a second, minimal memory usage

## Download

Grab the latest build from the [releases page](https://github.com/davidrigie/gutter/releases) or the [website](https://davidrigie.github.io/gutter/):

- **macOS** — Apple Silicon (.dmg) and Intel (.dmg)
- **Windows** — Installer (.exe) and MSI
- **Linux** — AppImage and .deb

> **Note:** Builds are currently unsigned. Your OS may show a security warning on first launch — this is expected. On macOS, right-click the app and choose "Open" to bypass Gatekeeper.

## Development

```bash
cd gutter
npm install
npm run tauri dev
```

### Commands

```bash
npm run tauri dev          # Full app (Vite + Rust + native window)
npm run dev                # Frontend only (Vite on localhost:1421)
npm run build              # Production build
npm test                   # Run tests
npx tsc --noEmit           # Type check
```

## Stack

- **Frontend**: React 19 + TipTap 3 (ProseMirror) + Zustand + Tailwind
- **Backend**: Tauri v2 (Rust)
- **Extras**: KaTeX math, Mermaid diagrams, GFM support

## Comment System

Gutter's core differentiator — inline comment threads that live alongside your markdown:

- Highlighted text with comment markers survive standard markdown renderers
- Structured thread data in `.comments.json` sidecar files
- Auto-generated human-readable `.comments.md` companion

## Built With

> **100% AI-authored.** Every line of code, config, test, and this sentence was written by [Claude Code](https://claude.ai/code).

## License

MIT
