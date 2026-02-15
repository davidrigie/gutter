# Quick Wins: Performance & Visual Polish

Low-hanging fruit identified from a codebase audit. These are small changes with outsized impact.

## Performance Fixes (~30 min)

### 1. StatusBar: Selective Zustand Subscriptions

**File:** `src/components/StatusBar.tsx`

StatusBar destructures ~16 fields from `useEditorStore()`, causing it to re-render on every editor state change (every keystroke). Switch to individual selectors:

```tsx
// Before (re-renders on ANY store change)
const { wordCount, cursorPosition, isDirty, ... } = useEditorStore();

// After (re-renders only when subscribed values change)
const wordCount = useEditorStore(s => s.wordCount);
const cursorPosition = useEditorStore(s => s.cursorPosition);
const isDirty = useEditorStore(s => s.isDirty);
// ...etc
```

### 2. FileTreeNode: React.memo

**File:** `src/components/FileTree/FileTree.tsx`

`FileTreeNode` is called recursively for every file/folder and re-renders whenever any parent state changes. Wrapping with `React.memo` prevents re-rendering when props haven't changed.

```tsx
const FileTreeNode = memo(function FileTreeNode({ ... }: FileTreeNodeProps) {
  // ...
});
```

### 3. CommentsPanel: Memoize visibleThreads

**File:** `src/components/Comments/CommentsPanel.tsx`

`visibleThreads` is recomputed on every render. Wrap in `useMemo`:

```tsx
const visibleThreads = useMemo(
  () => threadIds.filter((id) => {
    if (filter === "all") return true;
    if (filter === "open") return !threads[id]?.resolved;
    return threads[id]?.resolved;
  }),
  [threadIds, threads, filter]
);
```

### 4. extractCommentTexts: Shallow Equality Check

**File:** `src/components/Editor/GutterEditor.tsx`

`extractCommentTexts` creates a new object on every keystroke, triggering CommentsPanel re-renders even when comment text hasn't changed. Add shallow comparison before setting state.

## Visual Polish (~30 min)

### 5. Remaining Hardcoded Colors → CSS Variables

**Files:** `App.tsx`, `Thread.tsx`, `Toast.tsx`, `theme.css`

Phase 6 caught most hardcoded colors, but a few remain:

- App.tsx reload prompt: `bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200`
- Thread.tsx resolve button: `text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30`
- Toast.tsx icons: `text-green-500`, `text-red-500`

Define and use semantic tokens:

```css
--status-success: #10b981;
--status-info: #3b82f6;
--status-warning: #f59e0b;
```

### 6. Missing Transitions

**Files:** `TabBar.tsx`, `FileTree.tsx`, `Thread.tsx`

Several state changes happen instantly that should animate:

- Tab active indicator (bottom border) — add `transition-all duration-150`
- File tree selection highlight — add `transition-colors duration-150`
- Comment thread hover/resolve opacity — add `transition-all duration-200`

### 7. Font Rendering

**File:** `src/styles/theme.css`

Already has `-webkit-font-smoothing: antialiased`. Add for better cross-platform text quality:

```css
body {
  text-rendering: optimizeLegibility;
  font-feature-settings: "kern" 1;
}
```


