# Cool Steel Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refresh Gutter's visual identity to "Cool Steel" (slate/teal palette) and polish the file tree, comments panel, and menus/overlays.

**Architecture:** CSS variable swap in theme.css cascades the new palette everywhere. Then targeted component edits in FileTree.tsx, CommentsPanel.tsx, Thread.tsx, ReplyInput.tsx, UnifiedSearch.tsx, and editor.css refine the three priority areas. No structural or behavioral changes — purely visual.

**Tech Stack:** CSS custom properties, Tailwind utility classes, React/TSX

---

### Task 1: Update light mode palette in theme.css

**Files:**
- Modify: `gutter/src/styles/theme.css:5-108` (`:root` block)

**Step 1: Replace light mode color tokens**

In the `:root` block of `theme.css`, update these values:

```css
/* ─── Core palette ─── */
--editor-bg: #f8fafc;
--editor-text: #0f172a;
--editor-border: #e2e8f0;
--sidebar-bg: #f1f5f9;
--accent: #0d9488;

/* ─── Accent variants ─── */
--accent-hover: #0f766e;
--accent-subtle: rgba(13, 148, 136, 0.08);
--accent-muted: rgba(13, 148, 136, 0.5);

/* ─── Semantic text ─── */
--text-primary: #0f172a;
--text-secondary: #475569;
--text-tertiary: #64748b;
--text-muted: #94a3b8;

/* ─── Surfaces ─── */
--surface-primary: #f8fafc;
--surface-secondary: #f1f5f9;
--surface-hover: rgba(0, 0, 0, 0.04);
--surface-active: rgba(0, 0, 0, 0.06);
--surface-elevated: #ffffff;

/* ─── Glass / backdrop ─── */
--glass-bg: rgba(248, 250, 252, 0.85);
--glass-border: rgba(0, 0, 0, 0.08);

/* ─── Focus ring ─── */
--focus-shadow: 0 0 0 2px rgba(13, 148, 136, 0.15);

/* ─── Code block ─── */
--code-bg: rgba(0, 0, 0, 0.05);
--code-block-bg: #f1f5f9;
--code-block-header: #e2e8f0;

/* ─── Selection ─── */
--selection-bg: rgba(13, 148, 136, 0.08);

/* ─── Status ─── */
--status-info: #0d9488;

/* ─── Shadows (slate-tinted) ─── */
--shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.05);
--shadow-md: 0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.08);
--shadow-lg: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.12);
--shadow-xl: 0 4px 6px rgba(15, 23, 42, 0.05), 0 16px 48px rgba(15, 23, 42, 0.15);
```

Also update `::selection`:
```css
::selection {
  background: rgba(13, 148, 136, 0.2);
}
```

**Step 2: Verify type check passes**

Run: `cd gutter && npx tsc --noEmit`
Expected: No errors (CSS-only change)

**Step 3: Commit**

```bash
git add gutter/src/styles/theme.css
git commit -m "style: update light mode palette to Cool Steel (slate/teal)"
```

---

### Task 2: Update dark mode palette in theme.css

**Files:**
- Modify: `gutter/src/styles/theme.css:166-219` (`.dark` block)

**Step 1: Replace dark mode color tokens**

In the `.dark` block:

```css
.dark {
  --editor-bg: #0c1017;
  --editor-text: #e2e8f0;
  --editor-border: #1e293b;
  --sidebar-bg: #111827;
  --accent: #2dd4bf;

  --accent-hover: #5eead4;
  --accent-subtle: rgba(45, 212, 191, 0.1);
  --accent-muted: rgba(45, 212, 191, 0.5);

  --comment-highlight: rgba(245, 176, 65, 0.2);
  --comment-highlight-active: rgba(245, 176, 65, 0.4);
  --comment-highlight-resolved: rgba(156, 163, 175, 0.15);

  --annotation-border: rgba(255, 255, 255, 0.08);
  --annotation-bg: rgba(17, 24, 39, 0.7);

  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-tertiary: #64748b;
  --text-muted: #475569;

  --surface-primary: #0c1017;
  --surface-secondary: #111827;
  --surface-hover: rgba(255, 255, 255, 0.05);
  --surface-active: rgba(255, 255, 255, 0.08);
  --surface-elevated: #1a2332;

  --glass-bg: rgba(12, 16, 23, 0.90);
  --glass-border: rgba(255, 255, 255, 0.08);

  --focus-shadow: 0 0 0 2px rgba(45, 212, 191, 0.2);

  --code-bg: rgba(255, 255, 255, 0.08);
  --code-block-bg: #111827;
  --code-block-header: #1a2332;

  --find-match: rgba(255, 213, 0, 0.4);
  --find-match-current: rgba(255, 140, 0, 0.6);
  --find-match-shadow: 0 0 0 1px rgba(255, 140, 0, 0.8);

  --selection-bg: rgba(45, 212, 191, 0.1);

  --status-error: #f87171;
  --status-success: #4ade80;
  --status-warning: #fbbf24;
  --status-info: #2dd4bf;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 1px 2px rgba(0, 0, 0, 0.2), 0 8px 24px rgba(0, 0, 0, 0.35);
  --shadow-xl: 0 4px 6px rgba(0, 0, 0, 0.15), 0 16px 48px rgba(0, 0, 0, 0.4);
}
```

Also update `.dark ::selection`:
```css
.dark ::selection {
  background: rgba(45, 212, 191, 0.25);
}
```

**Step 2: Type check**

Run: `cd gutter && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add gutter/src/styles/theme.css
git commit -m "style: update dark mode palette to Cool Steel (slate/teal)"
```

---

### Task 3: Polish file tree items

**Files:**
- Modify: `gutter/src/components/FileTree/FileTree.tsx`
- Modify: `gutter/src/styles/editor.css` (add tree indent guide opacity refinement if needed)

**Step 1: Update folder row styling (line ~741)**

In the `FileTreeNode` directory render (the `is_dir` branch), update the root div:

Change the className from:
```
flex items-center gap-1 py-[3px] cursor-pointer select-none transition-colors text-[13px]
```
to:
```
flex items-center gap-1 py-[5px] cursor-pointer select-none transition-all duration-150 text-[13px]
```

Note: `py-[3px]` → `py-[5px]` for slightly more breathing room. `transition-colors` → `transition-all duration-150` for smooth left-border animation.

**Step 2: Update file row styling (line ~862)**

In the file render branch, update the className logic. Replace the current conditional class string:

```tsx
className={`relative flex items-center gap-1 py-[3px] cursor-pointer select-none transition-colors text-[13px] ${
  isDragSource
    ? "opacity-40"
    : isMultiSelected
      ? "bg-[var(--selection-bg)]"
      : isActiveTab
        ? "bg-[var(--selection-bg)] border-l-2 border-l-[var(--accent)]"
        : "hover:bg-[var(--surface-hover)]"
}`}
```

to:

```tsx
className={`relative flex items-center gap-1 py-[5px] cursor-pointer select-none transition-all duration-150 text-[13px] border-l-2 ${
  isDragSource
    ? "opacity-40 border-l-transparent"
    : isMultiSelected
      ? "bg-[var(--selection-bg)] border-l-[var(--accent)]"
      : isActiveTab
        ? "bg-[var(--accent-subtle)] border-l-[var(--accent)]"
        : "border-l-transparent hover:bg-[var(--surface-hover)] hover:border-l-[var(--editor-border)]"
}`}
```

Key changes:
- `py-[3px]` → `py-[5px]`
- `transition-colors` → `transition-all duration-150`
- Always render `border-l-2` (animate between transparent/accent/border)
- Active tab uses `accent-subtle` bg + accent border (was `selection-bg`)
- Hover state adds a subtle border hint

**Step 3: Update folder row to match border pattern**

Update folder div className similarly — add `border-l-2` with transparent default so folders also get the left-bar treatment when they're drop targets:

```tsx
className={`flex items-center gap-1 py-[5px] cursor-pointer select-none transition-all duration-150 text-[13px] border-l-2 ${
  isDropTarget
    ? "bg-[var(--selection-bg)] border-l-[var(--accent)]"
    : isDragSource
      ? "opacity-40 border-l-transparent"
      : "border-l-transparent hover:bg-[var(--surface-hover)]"
}`}
```

**Step 4: Make open folder icon slightly bolder**

Change the folder icon span (line ~782-783) from:
```tsx
<span className="text-[var(--text-tertiary)] shrink-0">
  {expanded ? <FolderOpen size={14} /> : <FolderIcon size={14} />}
</span>
```
to:
```tsx
<span className={`shrink-0 ${expanded ? "text-[var(--text-secondary)]" : "text-[var(--text-tertiary)]"}`}>
  {expanded ? <FolderOpen size={14} /> : <FolderIcon size={14} />}
</span>
```

**Step 5: Add smooth chevron rotation**

Update the chevron span (line ~779-781) to add a rotation transition:

```tsx
<span className={`text-[var(--text-muted)] shrink-0 transition-transform duration-150 ${expanded ? "rotate-0" : "-rotate-90"}`}>
  <ChevronDown size={14} />
</span>
```

This always renders `ChevronDown` but rotates it -90deg when collapsed. Simpler than swapping icons and gives a smooth rotation.

**Step 6: Refine indent guide opacity**

In the file row indent guides (line ~888-899), the opacity is already `opacity-40`. Change to `opacity-30` for a more subtle effect:

```tsx
className="absolute top-0 bottom-0 border-l border-[var(--editor-border)] opacity-30"
```

Do the same for folder row indent guides (line ~766-777) — add `opacity-30`:

```tsx
className="absolute top-0 bottom-0 border-l border-[var(--editor-border)] opacity-30"
```

**Step 7: Type check and commit**

Run: `cd gutter && npx tsc --noEmit`

```bash
git add gutter/src/components/FileTree/FileTree.tsx
git commit -m "style: polish file tree — left-bar indicators, spacing, smooth transitions"
```

---

### Task 4: Polish comments panel, thread cards, and reply input

**Files:**
- Modify: `gutter/src/components/Comments/CommentsPanel.tsx`
- Modify: `gutter/src/components/Comments/Thread.tsx`
- Modify: `gutter/src/components/Comments/ReplyInput.tsx`

**Step 1: Polish Thread card styling**

In `Thread.tsx`, replace the root div className (line ~37-43):

From:
```tsx
className={`mx-2 mb-2 rounded-lg border-l-[3px] transition-all cursor-pointer ${
  isActive
    ? "border-l-[var(--accent)] bg-[var(--accent-subtle)]"
    : "border-l-transparent hover:border-l-[var(--editor-border)] hover:shadow-sm"
} ${thread.resolved ? "opacity-40" : ""}`}
```

To:
```tsx
className={`mx-2 mb-2 rounded-lg border-l-[3px] transition-all duration-200 cursor-pointer ${
  isActive
    ? "border-l-[var(--accent)] bg-[var(--accent-subtle)] shadow-sm"
    : "border-l-transparent hover:border-l-[var(--editor-border)]"
} ${thread.resolved ? "opacity-50" : ""}`}
```

And replace the inline style (line ~43):
```tsx
style={{ borderTop: '1px solid var(--editor-border)', borderRight: '1px solid var(--editor-border)', borderBottom: '1px solid var(--editor-border)' }}
```
with a cleaner approach — add to className:
```
border border-[var(--editor-border)] border-l-[3px]
```

So the full new className becomes:
```tsx
className={`mx-2 mb-2 rounded-lg border border-[var(--editor-border)] border-l-[3px] transition-all duration-200 cursor-pointer bg-[var(--surface-elevated)] ${
  isActive
    ? "border-l-[var(--accent)] bg-[var(--accent-subtle)] shadow-sm"
    : "border-l-transparent hover:border-l-[var(--editor-border)]"
} ${thread.resolved ? "opacity-50" : ""}`}
```

And remove the `style=` prop entirely.

**Step 2: Refine author + timestamp display**

In `Thread.tsx` message rendering (lines ~124-131), update the author/timestamp:

From:
```tsx
<div className="flex items-baseline gap-2">
  <span className="text-[12px] font-medium text-[var(--text-primary)]">
    {msg.author}
  </span>
  <span className="text-[11px] text-[var(--text-muted)]">
    {formatDate(msg.timestamp)}
  </span>
</div>
```

To:
```tsx
<div className="flex items-baseline gap-1.5">
  <span className="text-[12px] font-semibold text-[var(--text-primary)]">
    {msg.author}
  </span>
  <span className="text-[10px] text-[var(--text-muted)]">·</span>
  <span className="text-[11px] text-[var(--text-muted)]">
    {formatDate(msg.timestamp)}
  </span>
</div>
```

Key: added centered dot separator, author now `font-semibold`.

**Step 3: Polish reply input**

In `ReplyInput.tsx`, update the input element (line ~43-45):

From:
```tsx
className="w-full text-[13px] px-2 py-1.5 rounded-md border border-[var(--editor-border)] bg-[var(--surface-primary)] outline-none transition-all focus:border-[var(--accent)] focus:[box-shadow:var(--focus-shadow)]"
```

To:
```tsx
className="w-full text-[13px] px-3 py-2 rounded-lg border border-[var(--editor-border)] bg-[var(--surface-primary)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:[box-shadow:var(--focus-shadow)] placeholder:text-[var(--text-muted)]"
```

Key: `px-2` → `px-3`, `py-1.5` → `py-2`, `rounded-md` → `rounded-lg`, added `duration-150` and explicit placeholder color.

**Step 4: Improve CommentsPanel empty state**

In `CommentsPanel.tsx`, the empty state (lines ~84-99) is already pretty good. Give it slightly more vertical space and refine the icon opacity:

Change `py-12` to `py-16` and `opacity-30` to `opacity-20`:

```tsx
<div className="px-4 py-16 text-center text-[var(--text-muted)]">
  <MessageSquare size={32} className="mx-auto mb-3 opacity-20" />
```

**Step 5: Polish CommentsPanel filter select**

In `CommentsPanel.tsx` (line ~63-66), update the select styling:

From:
```tsx
className="text-[11px] bg-transparent text-[var(--text-secondary)] border border-[var(--editor-border)] rounded px-1 py-0.5 outline-none"
```

To:
```tsx
className="text-[11px] bg-[var(--surface-primary)] text-[var(--text-secondary)] border border-[var(--editor-border)] rounded-md px-1.5 py-0.5 outline-none transition-colors focus:border-[var(--accent)]"
```

Key: explicit bg, `rounded` → `rounded-md`, slightly more padding, focus state.

**Step 6: Type check and commit**

Run: `cd gutter && npx tsc --noEmit`

```bash
git add gutter/src/components/Comments/CommentsPanel.tsx gutter/src/components/Comments/Thread.tsx gutter/src/components/Comments/ReplyInput.tsx
git commit -m "style: polish comments panel — card treatment, typography, reply input"
```

---

### Task 5: Polish menus and overlays

**Files:**
- Modify: `gutter/src/styles/editor.css`
- Modify: `gutter/src/components/UnifiedSearch.tsx`

**Step 1: Normalize glass blur to 20px across all overlays**

In `editor.css`, find all instances of `backdrop-filter: blur(16px)` and change to `blur(20px)`. Also update `-webkit-backdrop-filter` to match. These appear in:
- `.slash-menu` (line ~395)
- `.table-menu` (line ~199)
- `.block-action-bar` (line ~257)
- `.context-menu` (line ~813)
- `.comment-creation-bar` (line ~882)
- `.wiki-autocomplete` (line ~1119)
- `.math-block-editor` (line ~657)
- `.mermaid-block-editor` (line ~755)

**Step 2: Update keyboard shortcut badges to outline style**

In `editor.css`, update `.context-menu-shortcut` (line ~859-866):

From:
```css
.context-menu-shortcut {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-family: "SF Mono", Menlo, monospace;
  background: var(--surface-hover);
  padding: 1px 5px;
  border-radius: var(--radius-sm);
}
```

To:
```css
.context-menu-shortcut {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-family: "SF Mono", Menlo, monospace;
  background: transparent;
  border: 1px solid var(--editor-border);
  padding: 1px 5px;
  border-radius: var(--radius-sm);
}
```

**Step 3: Add will-change to animated menus**

Add `will-change: transform, opacity;` to menus that use `fadeInScale`:

In `editor.css`, add to `.slash-menu`, `.context-menu`, `.wiki-autocomplete`, `.code-block-lang-dropdown`:

```css
will-change: transform, opacity;
```

**Step 4: Add section separators to unified search**

In `editor.css`, update `.unified-search-section` (lines ~1453-1461):

From:
```css
.unified-search-section {
  padding: 6px 16px 2px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  user-select: none;
}
```

To:
```css
.unified-search-section {
  padding: 8px 16px 4px;
  margin-top: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  user-select: none;
  border-top: 1px solid var(--editor-border);
}
.unified-search-section:first-child {
  border-top: none;
  margin-top: 0;
}
```

**Step 5: Update UnifiedSearch shortcut badges to outline style**

In `UnifiedSearch.tsx`, update the command row shortcut badge (line ~379-381):

From:
```tsx
<span className="text-[11px] text-[var(--text-muted)] font-mono bg-[var(--surface-active)] px-1.5 py-0.5 rounded">
  {cmd.shortcut}
</span>
```

To:
```tsx
<span className="text-[11px] text-[var(--text-muted)] font-mono border border-[var(--editor-border)] px-1.5 py-0.5 rounded">
  {cmd.shortcut}
</span>
```

**Step 6: Type check and commit**

Run: `cd gutter && npx tsc --noEmit`

```bash
git add gutter/src/styles/editor.css gutter/src/components/UnifiedSearch.tsx
git commit -m "style: polish menus and overlays — unified glass blur, outline badges, section separators"
```

---

### Task 6: Update WelcomeScreen shortcut badges to match

**Files:**
- Modify: `gutter/src/components/WelcomeScreen.tsx`

**Step 1: Update shortcut badge styling**

In `WelcomeScreen.tsx`, update the featured shortcuts badge (line ~128-129):

From:
```tsx
<span className="text-[var(--text-muted)] font-mono text-[11px] bg-[var(--surface-active)] px-1.5 py-0.5 rounded">
```

To:
```tsx
<span className="text-[var(--text-muted)] font-mono text-[11px] border border-[var(--editor-border)] px-1.5 py-0.5 rounded">
```

Also update the all-shortcuts modal badge (line ~179):

From:
```tsx
<span className="text-[var(--text-muted)] font-mono text-[11px] bg-[var(--surface-active)] px-1.5 py-0.5 rounded shrink-0 ml-4">
```

To:
```tsx
<span className="text-[var(--text-muted)] font-mono text-[11px] border border-[var(--editor-border)] px-1.5 py-0.5 rounded shrink-0 ml-4">
```

**Step 2: Type check and commit**

Run: `cd gutter && npx tsc --noEmit`

```bash
git add gutter/src/components/WelcomeScreen.tsx
git commit -m "style: update WelcomeScreen shortcut badges to outline style"
```

---

### Task 7: Final visual verification

**Step 1: Run type check**

Run: `cd gutter && npx tsc --noEmit`
Expected: No errors

**Step 2: Run tests**

Run: `cd gutter && npm test`
Expected: All tests pass (no behavioral changes)

**Step 3: Visual verification checklist**

Launch: `cd gutter && npm run tauri dev`

Verify in light mode:
- [ ] Editor bg is cool slate-50 (not warm stone)
- [ ] Accent color is teal throughout (buttons, links, active indicators)
- [ ] File tree: active file has teal left bar + teal-tinted bg
- [ ] File tree: hover shows subtle border hint
- [ ] File tree: folder chevrons rotate smoothly on expand/collapse
- [ ] File tree: indent guides are subtle (30% opacity)
- [ ] Comments: thread cards have border + elevated bg
- [ ] Comments: active thread has teal left bar + shadow
- [ ] Comments: author name is semibold with dot separator before timestamp
- [ ] Comments: reply input is rounded-lg with teal focus glow
- [ ] Comments: empty state has centered icon and helpful text
- [ ] Menus: context menu, slash menu use consistent blur
- [ ] Menus: keyboard shortcut badges use outline style (not filled bg)
- [ ] Unified search: section headers have separator lines
- [ ] Selection color is teal-tinted

Switch to dark mode and verify:
- [ ] Editor bg is cool near-black (not neutral)
- [ ] Accent is bright teal-400
- [ ] All the same component patterns work in dark mode
- [ ] Glass overlays have cool steel tint

**Step 4: Commit any fixes**

If visual issues are found, fix and commit.
