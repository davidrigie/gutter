# Gutter

A local-first WYSIWYG markdown editor with first-class commenting. Built with Tauri v2, React 19, and TipTap 3.

## Get Started

```bash
cd gutter
npm install
npm run tauri dev
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
