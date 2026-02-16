# Phase 13: Version History

**Files: 6-8 new/modified**

Built-in version history with two complementary layers: automatic local snapshots (safety net) and git commit history (if available). Both appear in a unified history panel, clearly labeled.

## Design

### Local Snapshots (always active)

- **On every save**, hash the file content (SHA-256). If it matches the most recent snapshot, skip. If the last snapshot was less than 30 seconds ago, skip (debounce rapid saves).
- **Unpinned snapshots** auto-delete after 24 hours. This is the "you never lose work" safety net between explicit saves/commits.
- **Pinned snapshots** are kept forever. Users can pin from the history panel and optionally add a name and description.
- **Storage location:** `.gutter/history/{filename-hash}/` within the workspace. Each snapshot is a timestamped copy of the file content plus a metadata JSON sidecar (hash, pinned, name, description). The `.gutter/` directory is gitignored so snapshots don't pollute the user's repo.

### Git History (opt-in, read-only)

- If the workspace contains a `.git` directory, the history panel also shows git commits that touched the current file.
- **Read-only** — we never auto-commit, never modify the user's repo. Just read the log and show it.
- Implementation via shell commands (`git log --follow <file>`, `git show <hash>:<file>`) — no `git2` crate dependency needed.
- Each git entry shows: commit message, author, timestamp, short hash.

### History Panel UX

The panel shows two clearly labeled sections for the current file:

- **Snapshots** — automatic, local, ephemeral. Shows relative timestamps ("2 hours ago"). Actions: preview, restore, pin/unpin, name/describe, delete.
- **Git Commits** — if available. Shows commit message + timestamp. Actions: preview, restore.

Both sections are sorted by time. The user picks the version they want from either layer.

## Rust Backend

- **New: **`**src-tauri/src/commands/history.rs**` — Snapshot commands: `save_snapshot(path, content)` (hash, dedup, store), `list_snapshots(path)` (returns metadata sorted by time), `read_snapshot(path, snapshot_id)` (returns content), `pin_snapshot(path, snapshot_id, pinned, name, description)`, `delete_snapshot(path, snapshot_id)`, `prune_snapshots(path)` (delete unpinned >24h — called on save). Git commands: `list_git_history(path)` (runs `git log --follow`, returns list of commits), `read_git_version(path, commit_hash)` (runs `git show`).
- **Modify: **`**src-tauri/src/lib.rs**` — Register history commands.

## Frontend

- **New: **`**src/components/HistoryPanel.tsx**` — Panel for the current file. Snapshots section + Git Commits section (if detected). Preview shows read-only content. Restore replaces current editor content and marks file dirty.
- **Modify:**`**src/stores/editorStore.ts**` — Add `showHistory: boolean` toggle.
- **Modify: **`**App.tsx**` — Keyboard shortcut to open history panel. Wire save flow to call `save_snapshot` after successful file write.

## Integration with Save Flow

- **Modify: **`**src/components/GutterEditor.tsx**` or wherever the save-to-disk call lives — after `invoke("write_file", ...)` succeeds, call `invoke("save_snapshot", ...)`. Fire-and-forget so it doesn't slow down saves.

## Gitignore

- On workspace open, if `.git` exists and `.gitignore` exists, ensure `.gutter/` is listed. If no `.gitignore`, create one with `.gutter/`. If the user has a different ignore setup, respect it — just warn via toast if `.gutter/history/` might be tracked.


