import { useState, useEffect, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useEditorStore } from "../stores/editorStore";
import { useToastStore } from "../stores/toastStore";
import { HistoryIcon, Pin, GitBranch, Trash, RotateCcw, Eye, Pencil, X } from "./Icons";

interface SnapshotMeta {
  id: string;
  timestamp: number;
  content_hash: string;
  name: string | null;
  pinned: boolean;
}

interface GitCommit {
  hash: string;
  short_hash: string;
  message: string;
  author: string;
  timestamp: number;
}

// --- Lightweight line diff ---

type DiffLine =
  | { type: "equal"; text: string }
  | { type: "add"; text: string }
  | { type: "remove"; text: string };

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  // Myers-style LCS via simple DP for lines (fine for files up to a few thousand lines)
  const m = oldLines.length;
  const n = newLines.length;

  // Optimize: if identical, short-circuit
  if (oldText === newText) {
    return oldLines.map((l) => ({ type: "equal" as const, text: l }));
  }

  // Build LCS table (space-optimized would be better but this is simple and correct)
  // For very large files, cap and fall back to simple before/after
  if (m * n > 2_000_000) {
    // Too large for DP — show simplified view
    return simpleDiff(oldLines, newLines);
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  const result: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({ type: "equal", text: oldLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: "add", text: newLines[j - 1] });
      j--;
    } else {
      result.push({ type: "remove", text: oldLines[i - 1] });
      i--;
    }
  }
  result.reverse();
  return result;
}

/** Fallback for very large files — just show removed/added blocks */
function simpleDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  // Find common prefix
  let prefix = 0;
  while (prefix < oldLines.length && prefix < newLines.length && oldLines[prefix] === newLines[prefix]) {
    result.push({ type: "equal", text: oldLines[prefix] });
    prefix++;
  }
  // Find common suffix
  let oldEnd = oldLines.length - 1;
  let newEnd = newLines.length - 1;
  const suffix: DiffLine[] = [];
  while (oldEnd > prefix && newEnd > prefix && oldLines[oldEnd] === newLines[newEnd]) {
    suffix.push({ type: "equal", text: oldLines[oldEnd] });
    oldEnd--; newEnd--;
  }
  // Middle is all changes
  for (let i = prefix; i <= oldEnd; i++) {
    result.push({ type: "remove", text: oldLines[i] });
  }
  for (let i = prefix; i <= newEnd; i++) {
    result.push({ type: "add", text: newLines[i] });
  }
  suffix.reverse();
  result.push(...suffix);
  return result;
}

/** Collapse long runs of equal lines into context hunks */
function collapseContext(lines: DiffLine[], contextSize = 3): (DiffLine | { type: "collapse"; count: number })[] {
  const result: (DiffLine | { type: "collapse"; count: number })[] = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].type !== "equal") {
      result.push(lines[i]);
      i++;
      continue;
    }

    // Count consecutive equal lines
    let eqStart = i;
    while (i < lines.length && lines[i].type === "equal") i++;
    const eqCount = i - eqStart;

    if (eqCount <= contextSize * 2 + 1) {
      // Short run — show all
      for (let k = eqStart; k < i; k++) result.push(lines[k]);
    } else {
      // Show leading context
      const isStart = eqStart === 0;
      const isEnd = i === lines.length;

      if (isStart) {
        // At file start: only show trailing context
        const collapsed = eqCount - contextSize;
        result.push({ type: "collapse", count: collapsed });
        for (let k = i - contextSize; k < i; k++) result.push(lines[k]);
      } else if (isEnd) {
        // At file end: only show leading context
        for (let k = eqStart; k < eqStart + contextSize; k++) result.push(lines[k]);
        const collapsed = eqCount - contextSize;
        result.push({ type: "collapse", count: collapsed });
      } else {
        for (let k = eqStart; k < eqStart + contextSize; k++) result.push(lines[k]);
        const collapsed = eqCount - contextSize * 2;
        result.push({ type: "collapse", count: collapsed });
        for (let k = i - contextSize; k < i; k++) result.push(lines[k]);
      }
    }
  }

  return result;
}

// --- Helpers ---

function relativeTime(ts: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

function fullDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

// --- Component ---

interface Props {
  onRestore: (content: string) => void;
  currentContent: string;
}

export function HistoryPanel({ onRestore, currentContent }: Props) {
  const filePath = useEditorStore((s) => s.filePath);
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [gitCommits, setGitCommits] = useState<GitCommit[]>([]);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLabel, setPreviewLabel] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [activeSection, setActiveSection] = useState<"local" | "git">("local");

  const loadSnapshots = useCallback(async () => {
    if (!filePath) return;
    try {
      const list = await invoke<SnapshotMeta[]>("list_snapshots", { filePath });
      setSnapshots(list);
    } catch (e) {
      console.error("Failed to load snapshots:", e);
    }
  }, [filePath]);

  const loadGitHistory = useCallback(async () => {
    if (!filePath) return;
    try {
      const list = await invoke<GitCommit[]>("list_git_history", { filePath });
      setGitCommits(list);
    } catch {
      setGitCommits([]);
    }
  }, [filePath]);

  useEffect(() => {
    loadSnapshots();
    loadGitHistory();
  }, [loadSnapshots, loadGitHistory]);

  const handlePreviewSnapshot = useCallback(async (snap: SnapshotMeta) => {
    if (!filePath) return;
    try {
      const content = await invoke<string>("read_snapshot", { filePath, snapshotId: snap.id });
      setPreviewContent(content);
      setPreviewLabel(snap.name || relativeTime(snap.timestamp));
    } catch {
      useToastStore.getState().addToast("Failed to load snapshot", "error");
    }
  }, [filePath]);

  const handlePreviewGit = useCallback(async (commit: GitCommit) => {
    if (!filePath) return;
    try {
      const content = await invoke<string>("read_git_version", { filePath, commitHash: commit.hash });
      setPreviewContent(content);
      setPreviewLabel(`${commit.short_hash} — ${commit.message}`);
    } catch {
      useToastStore.getState().addToast("Failed to load git version", "error");
    }
  }, [filePath]);

  const handleRestore = useCallback(() => {
    if (previewContent === null) return;
    onRestore(previewContent);
    setPreviewContent(null);
    useToastStore.getState().addToast("Version restored", "success", 2000);
  }, [previewContent, onRestore]);

  const handlePin = useCallback(async (snap: SnapshotMeta) => {
    if (!filePath) return;
    try {
      await invoke("pin_snapshot", { filePath, snapshotId: snap.id, pinned: !snap.pinned });
      await loadSnapshots();
    } catch {
      useToastStore.getState().addToast("Failed to toggle pin", "error");
    }
  }, [filePath, loadSnapshots]);

  const handleRename = useCallback(async (snapId: string) => {
    if (!filePath) return;
    try {
      await invoke("rename_snapshot", { filePath, snapshotId: snapId, name: renameValue });
      setRenamingId(null);
      setRenameValue("");
      await loadSnapshots();
    } catch {
      useToastStore.getState().addToast("Failed to rename snapshot", "error");
    }
  }, [filePath, renameValue, loadSnapshots]);

  const handleDelete = useCallback(async (snapId: string) => {
    if (!filePath) return;
    try {
      await invoke("delete_snapshot", { filePath, snapshotId: snapId });
      await loadSnapshots();
      useToastStore.getState().addToast("Snapshot deleted", "success", 2000);
    } catch {
      useToastStore.getState().addToast("Failed to delete snapshot", "error");
    }
  }, [filePath, loadSnapshots]);

  // Compute diff between snapshot and current content
  const diffLines = useMemo(() => {
    if (previewContent === null) return null;
    const raw = computeDiff(previewContent, currentContent);
    return collapseContext(raw);
  }, [previewContent, currentContent]);

  const diffStats = useMemo(() => {
    if (!diffLines) return null;
    let added = 0, removed = 0;
    for (const l of diffLines) {
      if (l.type === "add") added++;
      else if (l.type === "remove") removed++;
    }
    return { added, removed };
  }, [diffLines]);

  // Preview with diff view
  if (previewContent !== null && diffLines) {
    return (
      <div className="h-full flex flex-col bg-[var(--surface-secondary)]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--editor-border)]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-medium text-[var(--text-secondary)] truncate">
              {previewLabel}
            </span>
            {diffStats && (diffStats.added > 0 || diffStats.removed > 0) && (
              <span className="flex items-center gap-1.5 text-[10px] shrink-0">
                {diffStats.added > 0 && <span className="text-[var(--status-success)]">+{diffStats.added}</span>}
                {diffStats.removed > 0 && <span className="text-[var(--status-error)]">-{diffStats.removed}</span>}
              </span>
            )}
          </div>
          <button
            onClick={() => setPreviewContent(null)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {diffStats && diffStats.added === 0 && diffStats.removed === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] px-4">
            <span className="text-[12px] font-medium">No changes</span>
            <span className="text-[11px] mt-1 opacity-60">This version is identical to the current content</span>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="text-[12px] font-mono leading-[1.6]">
              {diffLines.map((line, i) => {
                if (line.type === "collapse") {
                  return (
                    <div
                      key={i}
                      className="px-3 py-0.5 text-[11px] text-[var(--text-muted)] bg-[var(--surface-active)] border-y border-[var(--editor-border)] select-none"
                    >
                      {line.count} unchanged {line.count === 1 ? "line" : "lines"}
                    </div>
                  );
                }
                const bg =
                  line.type === "add"
                    ? "bg-[color-mix(in_srgb,var(--status-success),transparent_88%)]"
                    : line.type === "remove"
                      ? "bg-[color-mix(in_srgb,var(--status-error),transparent_88%)]"
                      : "";
                const prefix =
                  line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";
                const textColor =
                  line.type === "add"
                    ? "text-[var(--status-success)]"
                    : line.type === "remove"
                      ? "text-[var(--status-error)]"
                      : "text-[var(--text-secondary)]";

                return (
                  <div key={i} className={`${bg} flex`}>
                    <span className={`w-5 shrink-0 text-right pr-1 select-none ${
                      line.type !== "equal" ? textColor : "text-[var(--text-muted)]"
                    } opacity-60`}>
                      {prefix}
                    </span>
                    <span className={`${textColor} whitespace-pre-wrap break-all px-1`}>
                      {line.text || "\u00A0"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="px-3 py-2 border-t border-[var(--editor-border)] flex gap-2">
          <button
            onClick={handleRestore}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[12px] font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
          >
            <RotateCcw size={12} />
            Restore this version
          </button>
          <button
            onClick={() => setPreviewContent(null)}
            className="px-3 py-1.5 rounded text-[12px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!filePath) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[var(--surface-secondary)] text-[var(--text-muted)]">
        <HistoryIcon size={32} className="mb-2 opacity-30" />
        <span className="text-[12px]">Save a file to see version history</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--surface-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--editor-border)]">
        <span className="font-semibold text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
          History
        </span>
        {snapshots.length > 0 && (
          <span className="text-[11px] bg-[var(--accent-subtle)] text-[var(--accent)] px-1.5 py-0.5 rounded-full font-medium min-w-[18px] text-center">
            {snapshots.length}
          </span>
        )}
      </div>

      {/* Section tabs */}
      {gitCommits.length > 0 && (
        <div className="flex border-b border-[var(--editor-border)]">
          <button
            onClick={() => setActiveSection("local")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium transition-colors ${
              activeSection === "local"
                ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <HistoryIcon size={12} />
            Local ({snapshots.length})
          </button>
          <button
            onClick={() => setActiveSection("git")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium transition-colors ${
              activeSection === "git"
                ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <GitBranch size={12} />
            Git ({gitCommits.length})
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeSection === "local" && (
          <>
            {snapshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                <HistoryIcon size={24} className="mb-2 opacity-30" />
                <span className="text-[12px]">No snapshots yet</span>
                <span className="text-[11px] mt-1 opacity-60">Snapshots are created on save</span>
              </div>
            ) : (
              <div className="py-1">
                {snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="group px-3 py-2 hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {snap.pinned && <Pin size={11} className="text-[var(--accent)] shrink-0" />}
                        {renamingId === snap.id ? (
                          <form
                            onSubmit={(e) => { e.preventDefault(); handleRename(snap.id); }}
                            className="flex items-center gap-1"
                          >
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={() => setRenamingId(null)}
                              onKeyDown={(e) => { if (e.key === "Escape") setRenamingId(null); }}
                              className="text-[12px] bg-[var(--surface-active)] text-[var(--text-primary)] border border-[var(--editor-border)] rounded px-1 py-0.5 outline-none w-28"
                              placeholder="Snapshot name"
                            />
                          </form>
                        ) : (
                          <span className="text-[12px] text-[var(--text-secondary)] truncate">
                            {snap.name || relativeTime(snap.timestamp)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => handlePreviewSnapshot(snap)}
                          className="p-1 rounded hover:bg-[var(--surface-active)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          title="Preview diff"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          onClick={() => handlePin(snap)}
                          className={`p-1 rounded hover:bg-[var(--surface-active)] ${
                            snap.pinned ? "text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          }`}
                          title={snap.pinned ? "Unpin" : "Pin"}
                        >
                          <Pin size={12} />
                        </button>
                        <button
                          onClick={() => { setRenamingId(snap.id); setRenameValue(snap.name || ""); }}
                          className="p-1 rounded hover:bg-[var(--surface-active)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          title="Rename"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(snap.id)}
                          className="p-1 rounded hover:bg-[var(--surface-active)] text-[var(--text-muted)] hover:text-[var(--status-error)]"
                          title="Delete"
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                    </div>
                    {snap.name && (
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5" title={fullDate(snap.timestamp)}>
                        {relativeTime(snap.timestamp)}
                      </div>
                    )}
                    {!snap.name && (
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" title={fullDate(snap.timestamp)}>
                        {fullDate(snap.timestamp)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeSection === "git" && (
          <>
            {gitCommits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                <GitBranch size={24} className="mb-2 opacity-30" />
                <span className="text-[12px]">No git history</span>
                <span className="text-[11px] mt-1 opacity-60">File is not in a git repo</span>
              </div>
            ) : (
              <div className="py-1">
                {gitCommits.map((commit) => (
                  <button
                    key={commit.hash}
                    onClick={() => handlePreviewGit(commit)}
                    className="w-full text-left px-3 py-2 hover:bg-[var(--surface-hover)] transition-colors group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-[var(--accent)] bg-[var(--accent-subtle)] px-1 py-0.5 rounded shrink-0">
                        {commit.short_hash}
                      </span>
                      <span className="text-[12px] text-[var(--text-secondary)] truncate">
                        {commit.message}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-muted)]">
                      <span>{commit.author}</span>
                      <span title={fullDate(commit.timestamp)}>{relativeTime(commit.timestamp)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
