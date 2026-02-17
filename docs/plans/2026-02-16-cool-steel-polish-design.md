# Cool Steel Polish — Design Doc

## Goal

Refresh Gutter's visual identity from warm stone/indigo to a cool, precise slate/teal system, then polish the three roughest component areas: file tree, comments panel, and menus/overlays. Inspired by Obsidian's density and cohesion + Bear/Craft's tactile native quality.

## Palette: "Cool Steel"

### Light Mode

| Token | Old | New | Source |
|-------|-----|-----|--------|
| `--editor-bg` | `#fafaf9` | `#f8fafc` | slate-50 |
| `--sidebar-bg` | `#f5f5f4` | `#f1f5f9` | slate-100 |
| `--editor-border` | `#e7e5e4` | `#e2e8f0` | slate-200 |
| `--accent` | `#6366f1` | `#0d9488` | teal-600 |
| `--accent-hover` | `#4f46e5` | `#0f766e` | teal-700 |
| `--accent-subtle` | `rgba(99,102,241,0.08)` | `rgba(13,148,136,0.08)` | teal-600 @ 8% |
| `--accent-muted` | `rgba(99,102,241,0.5)` | `rgba(13,148,136,0.5)` | teal-600 @ 50% |
| `--text-primary` | `#1a1a1a` | `#0f172a` | slate-900 |
| `--text-secondary` | `#44403c` | `#475569` | slate-600 |
| `--text-tertiary` | `#78716c` | `#64748b` | slate-500 |
| `--text-muted` | `#a8a29e` | `#94a3b8` | slate-400 |
| `--surface-primary` | `#fafaf9` | `#f8fafc` | slate-50 |
| `--surface-secondary` | `#f5f5f4` | `#f1f5f9` | slate-100 |
| `--surface-elevated` | `#ffffff` | `#ffffff` | unchanged |
| `--code-block-bg` | `#f5f5f4` | `#f1f5f9` | slate-100 |
| `--code-block-header` | `#ededec` | `#e2e8f0` | slate-200 |
| `--selection-bg` | `rgba(99,102,241,0.08)` | `rgba(13,148,136,0.08)` | teal @ 8% |
| `--status-info` | `#6366f1` | `#0d9488` | teal-600 |
| `--focus-shadow` | indigo-based | `0 0 0 2px rgba(13,148,136,0.15)` | teal glow |

### Dark Mode

| Token | Old | New | Notes |
|-------|-----|-----|-------|
| `--editor-bg` | `#0c0c0f` | `#0c1017` | near-black, cool cast |
| `--sidebar-bg` | `#141417` | `#111827` | gray-900 steel |
| `--editor-border` | `#27272a` | `#1e293b` | slate-800 |
| `--accent` | `#818cf8` | `#2dd4bf` | teal-400 |
| `--accent-hover` | `#a5b4fc` | `#5eead4` | teal-300 |
| `--accent-subtle` | `rgba(129,140,248,0.1)` | `rgba(45,212,191,0.1)` | teal-400 @ 10% |
| `--accent-muted` | `rgba(129,140,248,0.5)` | `rgba(45,212,191,0.5)` | teal-400 @ 50% |
| `--text-primary` | `#e7e5e4` | `#e2e8f0` | slate-200 |
| `--text-secondary` | `#a8a29e` | `#94a3b8` | slate-400 |
| `--text-tertiary` | `#78716c` | `#64748b` | slate-500 |
| `--text-muted` | `#57534e` | `#475569` | slate-600 |
| `--surface-primary` | `#0c0c0f` | `#0c1017` | matches editor-bg |
| `--surface-secondary` | `#141417` | `#111827` | matches sidebar-bg |
| `--surface-elevated` | `#1c1c20` | `#1a2332` | steel elevated |
| `--code-block-bg` | `#18181b` | `#111827` | matches sidebar |
| `--code-block-header` | `#222225` | `#1a2332` | matches elevated |
| `--glass-bg` | `rgba(20,20,23,0.88)` | `rgba(12,16,23,0.90)` | cool glass |
| `--focus-shadow` | indigo-based | `0 0 0 2px rgba(45,212,191,0.2)` | teal glow |
| `--selection-bg` | `rgba(129,140,248,0.1)` | `rgba(45,212,191,0.1)` | teal @ 10% |
| `--status-info` | `#818cf8` | `#2dd4bf` | teal-400 |

### Shadows (light mode)

Shift from pure black to slate-tinted for cooler feel:
- `--shadow-sm`: `0 1px 2px rgba(15, 23, 42, 0.05)`
- `--shadow-md`: `0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.08)`
- `--shadow-lg`: `0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.12)`
- `--shadow-xl`: `0 4px 6px rgba(15, 23, 42, 0.05), 0 16px 48px rgba(15, 23, 42, 0.15)`

### ::selection

- Light: `rgba(13, 148, 136, 0.2)` (teal)
- Dark: `rgba(45, 212, 191, 0.25)` (teal-400)

---

## Component Polish

### File Tree & Sidebar

- **Item hover**: Smooth `surface-hover` bg + 2px left border in `accent` that slides in via transition
- **Active file**: `accent-subtle` bg + 2px solid `accent` left border
- **Folder chevrons**: Smooth 90deg rotation transition on expand/collapse
- **Open folder icon**: Slightly bolder color (text-secondary → text-primary)
- **Indentation guides**: 1px vertical lines at each nesting level, `border` color at 30% opacity
- **Row spacing**: ~5px vertical padding per row (compact, breathable)
- **Section header**: More generous bottom margin for breathing room

### Comments Panel

- **Thread cards**: `surface-elevated` bg, 1px `border` border, `radius-md` corners, small gap between cards
- **Active thread**: 3px left teal bar + subtle elevated shadow
- **Author + timestamp**: Author in `text-primary` semi-bold `font-size-sm`. Timestamp in `text-muted` `font-size-xs`, separated by centered dot
- **Body text**: `text-secondary`, `font-size-sm`, `line-height: 1.5`
- **Reply input**: Rounded border, teal glow on focus. Send button appears as teal pill only when text present
- **Resolved threads**: 60% opacity, quoted text strikethrough, collapsible
- **Empty state**: Centered `MessageSquare` icon (32px, `text-muted`) + "No comments yet" + shortcut hint
- **Quoted text**: Left border in `accent` color, slightly more padding

### Menus & Overlays

- **Unified glass**: All overlays use `backdrop-filter: blur(20px)`, same border/shadow tokens
- **Item hover/selected**: Smooth bg transition + 2px left teal bar (consistent with file tree)
- **Keyboard shortcut badges**: `1px solid border-color` outline style instead of solid bg. `font-size-xs`, slightly rounded
- **Unified search sections**: Thin separator line above section headers. More vertical padding on result items
- **Preferences dialog**: Slightly more generous padding overall
- **Animation**: All menus keep `fadeInScale 120ms`. Add `will-change: transform, opacity` for GPU compositing
