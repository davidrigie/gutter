---
title: Design System
tags: [project, design, ui]
---
# Design System

Gutter's visual design is built on CSS custom properties for full theme flexibility.

## Color Tokens

### Surfaces

| Token | Purpose |
| --- | --- |
| `--surface-primary` | Main editor background |
| `--surface-secondary` | Sidebar backgrounds |
| `--surface-hover` | Interactive hover states |
| `--surface-active` | Active/selected states |

### Text

| Token | Purpose |
| --- | --- |
| `--text-primary` | Main body text |
| `--text-secondary` | Secondary labels |
| `--text-tertiary` | Metadata, timestamps |
| `--text-muted` | Disabled, placeholders |

### Accent

| Token | Purpose |
| --- | --- |
| `--accent` | Primary brand color |
| `--accent-hover` | Hover variant |

## Typography

- **Editor body**: System font stack, 15px base
- **Code**: SF Mono, Menlo, Consolas
- **UI**: -apple-system, BlinkMacSystemFont

## Spacing

Using a 4px grid system:

```
py-0.5 = 2px
py-1   = 4px
py-2   = 8px
py-3   = 12px
py-4   = 16px
```

## Component Patterns

### Panels

All sidebar panels follow the same structure:

```
Header (border-b, px-3 py-2)
  └─ Title + Badge + Actions
Content (flex-1, overflow-auto)
  └─ Items or empty state
```

### Buttons

- **Primary**: `bg-[var(--accent)] text-white`
- **Ghost**: `text-[var(--text-muted)] hover:text-[var(--text-primary)]`
- **Danger**: `text-red-500 hover:bg-red-50`

See [[Gutter Roadmap]] for upcoming design improvements.
