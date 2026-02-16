import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useEditorStore } from "../stores/editorStore";
import { useToastStore } from "../stores/toastStore";
import { HistoryIcon, Pin, GitBranch, Trash, Pencil } from "./Icons";

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

interface Props {
  onPreview: (content: string, label: string) => void;
}

export function HistoryPanel({ onPreview }: Props) {
  const filePath = useEditorStore((s) => s.filePath);
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [gitCommits, setGitCommits] = useState<GitCommit[]>([]);
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
      onPreview(content, snap.name || relativeTime(snap.timestamp));
    } catch {
      useToastStore.getState().addToast("Failed to load snapshot", "error");
    }
  }, [filePath, onPreview]);

  const handlePreviewGit = useCallback(async (commit: GitCommit) => {
    if (!filePath) return;
    try {
      const content = await invoke<string>("read_git_version", { filePath, commitHash: commit.hash });
      onPreview(content, `${commit.short_hash} — ${commit.message}`);
    } catch {
      useToastStore.getState().addToast("Failed to load git version", "error");
    }
  }, [filePath, onPreview]);

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
                    className="group px-3 py-2 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                    onClick={() => handlePreviewSnapshot(snap)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {snap.pinned && <Pin size={11} className="text-[var(--accent)] shrink-0" />}
                        {renamingId === snap.id ? (
                          <form
                            onSubmit={(e) => { e.preventDefault(); handleRename(snap.id); }}
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
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
                          onClick={(e) => { e.stopPropagation(); handlePin(snap); }}
                          className={`p-1 rounded hover:bg-[var(--surface-active)] ${
                            snap.pinned ? "text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          }`}
                          title={snap.pinned ? "Unpin" : "Pin"}
                        >
                          <Pin size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setRenamingId(snap.id); setRenameValue(snap.name || ""); }}
                          className="p-1 rounded hover:bg-[var(--surface-active)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          title="Rename"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(snap.id); }}
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
