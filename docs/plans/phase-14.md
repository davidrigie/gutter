# Phase 14: Version History — Implementation Plan

## Context

Gutter needs local version history so users can browse, preview, and restore previous versions of their files. Two layers: **local snapshots** (automatic, always available) and **git history** (read-only, when `.git` exists). Snapshots are saved on every save, deduplicated by content hash, with auto-pruning of old unpinned snapshots. Users can pin important snapshots and name them.

Global storage at `~/.gutter/history/{path-hash}/` — works in both workspace and single-file mode (same lesson as templates).

## Files to Create/Modify

| File | Action |
|------|--------|
| `gutter/src-tauri/src/commands/history.rs` | **New** — 8 Rust commands for snapshot CRUD + git history |
| `gutter/src-tauri/src/commands/mod.rs` | Modify — add `pub mod history` |
| `gutter/src-tauri/src/lib.rs` | Modify — register 8 history commands |
| `gutter/src-tauri/Cargo.toml` | Modify — add `sha2` crate |
| `gutter/src/components/HistoryPanel.tsx` | **New** — side panel showing snapshots + git commits |
| `gutter/src/stores/editorStore.ts` | Modify — add `showHistory` + `toggleHistory` |
| `gutter/src/App.tsx` | Modify — save flow integration, panel rendering, menu/keyboard |
| `gutter/src-tauri/src/menu.rs` | Modify — add "Version History" to View menu |
| `gutter/src/components/StatusBar.tsx` | Modify — add history toggle button |

## Step 1: Rust Backend — `commands/history.rs`

Storage layout per file:
```
~/.gutter/history/{sha256-of-absolute-path}/
  ├── meta.json          # Array of snapshot metadata entries
  └── snapshots/
      ├── {id}.md        # Snapshot content files
      └── ...
```

**`meta.json` schema:**
```json
[{
  "id": "1708123456789",
  "timestamp": 1708123456789,
  "content_hash": "abc123...",
  "pinned": false,
  "name": null,
  "size_bytes": 1234
}]
```

**8 commands:**

1. **`save_snapshot(file_path, content)`** — SHA-256 hash content, skip if identical to most recent snapshot. Write `{id}.md`, append to `meta.json`. Auto-prune unpinned snapshots older than 7 days (do this inline, no separate command needed).
2. **`list_snapshots(file_path)`** — Return `Vec<SnapshotMeta>` sorted newest-first.
3. **`read_snapshot(file_path, snapshot_id)`** — Return snapshot content string.
4. **`pin_snapshot(file_path, snapshot_id, pinned)`** — Update pinned flag in meta.
5. **`rename_snapshot(file_path, snapshot_id, name)`** — Update name field in meta.
6. **`delete_snapshot(file_path, snapshot_id)`** — Remove from meta + delete .md file.
7. **`list_git_history(file_path)`** — Run `git log --follow --format="%H|%at|%s|%an" -50 -- {file}`, parse output, return `Vec<GitCommit>`. Returns empty vec if not in a git repo.
8. **`read_git_version(file_path, commit_hash)`** — Run `git show {hash}:{relative-path}`, return content string.

Add `sha2` to Cargo.toml dependencies.

## Step 2: `editorStore.ts` — Panel State

Add to existing store:
```typescript
showHistory: boolean;        // default false
toggleHistory: () => void;   // toggle + close comments if opening
```

When `showHistory` opens, close `showComments` (they share the right sidebar space). Vice versa: when `showComments` opens, close `showHistory`.

## Step 3: `HistoryPanel.tsx` — Side Panel Component

Glass-style side panel matching CommentsPanel layout pattern. Two sections:

**Local Snapshots section:**
- List of snapshots with relative timestamps ("2 min ago", "Yesterday 3:42 PM")
- Pinned snapshots shown with a pin icon and optional name
- Each entry shows: timestamp, name (if set), size
- Hover actions: Preview, Restore, Pin/Unpin, Rename, Delete
- "Preview" opens a diff-like view or ReadingMode overlay showing that version
- "Restore" replaces current editor content with snapshot content (with confirmation toast showing Undo)

**Git History section** (only shown when git commits exist):
- Separator with "Git History" header
- List of commits: short hash, message, author, relative time
- Click to preview (read-only overlay)
- "Restore" to replace current content

**Preview flow:**
- Clicking "Preview" on any version opens a full-screen ReadingMode-style overlay
- Shows the snapshot content read-only
- Header bar with: version info, "Restore" button, "Close" button
- Does NOT replace editor state — purely visual overlay

**Empty state:** "No version history yet. Versions are saved automatically when you save."

**Props:** `{ onRestore: (content: string) => void, onClose: () => void }`

## Step 4: Save Flow Integration — `App.tsx`

After `saveFile(md)` succeeds in `handleSave`, fire-and-forget a snapshot:

```typescript
// After saveFile(md) succeeds and path is known:
if (path && !activeTab?.startsWith("untitled:")) {
  invoke("save_snapshot", { filePath: path, content: md }).catch(() => {});
}
```

No await — don't block save on snapshot creation. Snapshots only for real files (not untitled buffers).

Also add snapshot on auto-save (same pattern in `scheduleAutoSave` callback).

## Step 5: Panel Rendering — `App.tsx`

Render `HistoryPanel` in the right sidebar, same position as CommentsPanel but mutually exclusive:

```tsx
{showHistory && !isReadingMode && (
  <>
    <ResizeHandle side="right" ... />
    <aside style={{ width: panelWidths.comments }}>
      <HistoryPanel onRestore={handleRestore} onClose={toggleHistory} />
    </aside>
  </>
)}
```

**`handleRestore(content)`:** Sets editor content to the restored version, marks dirty, shows toast "Version restored".

## Step 6: Menu Bar + Keyboard Shortcut

**`menu.rs`:** Add "Version History" to View menu with `CmdOrCtrl+Shift+H`. Emit `menu:toggle-history`.

**`App.tsx`:**
- Listen for `menu:toggle-history` → call `toggleHistory()`
- Add `Mod+Shift+H` to `handleKeyDown`
- Add "Version History" to command palette commands array

## Step 7: StatusBar Button

Add a clock/history icon button to StatusBar, positioned near the comments toggle. Shows accent color when `showHistory` is active. Clicking toggles the history panel.

## Verification

1. `cargo check` in `src-tauri/` — compiles with sha2 dependency
2. `npx tsc --noEmit` — no type errors
3. `npm run tauri dev` — app launches
4. Open a file, make edits, save (Cmd+S) — snapshot created silently
5. Cmd+Shift+H — history panel opens on right side, shows the snapshot
6. Save a few more times with changes — multiple snapshots appear, deduped when content unchanged
7. Click "Preview" on a snapshot — read-only overlay shows that version
8. Click "Restore" — editor content replaced, file marked dirty
9. Pin a snapshot — persists across panel open/close
10. If in a git repo: git commits section appears below snapshots
11. Verify mutual exclusivity: opening history closes comments, opening comments closes history
