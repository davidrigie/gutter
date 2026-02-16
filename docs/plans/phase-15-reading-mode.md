# Phase 14: Reading Mode with Marginalia

**Files: 4-5 new/modified**

A dedicated read mode where the document renders with book-like typography and comments appear in the actual gutter. This is the screenshot for the landing page.

## Reading Mode Component

- **New: **`**src/components/ReadingMode.tsx**` — Non-editable, beautifully typeset view. Receives parsed doc + comments, renders static HTML with CSS grid layout (`1fr var(--margin-width)`). Comments render as margin annotations alongside their anchor text (not in a sidebar panel). Clean typography — no editor chrome, no cursor, no toolbars.
- **Modify: **`**src/stores/editorStore.ts**` — Add `readingMode: boolean` and `toggleReadingMode()` to editor state.

## Layout & Styling

- **Modify: **`**src/styles/editor.css**` — Reading mode styles: CSS grid with content column + margin column, annotations vertically aligned to anchor text via `offsetTop` measurements, collision resolution for overlapping annotations (stagger downward). Optional `@media print` styles for printing with proper page breaks.
- **Modify: **`**src/styles/theme.css**` — Add `--margin-width`, `--reading-mode-bg`, `--annotation-text`, `--annotation-border` design tokens.

## App Integration

- **Modify: **`**App.tsx**` — Bind `Cmd+Shift+R` to toggle reading mode. When active, swap editor for `ReadingMode.tsx`. Hide editor toolbars and status bar chrome.


