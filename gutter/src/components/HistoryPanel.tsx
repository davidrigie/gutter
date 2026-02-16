import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useEditorStore } from "../stores/editorStore";
import { useToastStore } from "../stores/toastStore";
import { HistoryIcon, Pin, GitBranch, Trash, Pencil, Check, X } from "./Icons";

interface SnapshotMeta {
  id: string;
  timestamp: number;
  content_hash: string;
  name: string | null;
  description: string | null;
  pinned: boolean;
  size_bytes: number;
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  onPreview: (content: string, label: string) => void;
}

export function HistoryPanel({ onPreview }: Props) {
  const filePath = useEditorStore((s) => s.filePath);
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [gitCommits, setGitCommits] = useState<GitCommit[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
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
      await invoke("update_snapshot_metadata", { 
        filePath, 
        snapshotId: snap.id, 
        pinned: !snap.pinned 
      });
      await loadSnapshots();
    } catch {
      useToastStore.getState().addToast("Failed to toggle pin", "error");
    }
  }, [filePath, loadSnapshots]);

  const handleUpdateMeta = useCallback(async (snapId: string) => {
    if (!filePath) return;
    try {
      await invoke("update_snapshot_metadata", { 
        filePath, 
        snapshotId: snapId, 
        name: editName,
        description: editDesc
      });
      setEditingId(null);
      await loadSnapshots();
    } catch {
      useToastStore.getState().addToast("Failed to update snapshot", "error");
    }
  }, [filePath, editName, editDesc, loadSnapshots]);

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
                    className={`group px-3 py-2 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer ${editingId === snap.id ? 'bg-[var(--surface-active)]' : ''}`}
                    onClick={() => editingId !== snap.id && handlePreviewSnapshot(snap)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {snap.pinned && <Pin size={11} className="text-[var(--accent)] shrink-0" />}
                        {editingId === snap.id ? (
                          <div className="flex flex-col gap-2 w-full pr-2 py-1" onClick={e => e.stopPropagation()}>
                            <input
                              autoFocus
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="text-[12px] bg-[var(--editor-bg)] text-[var(--text-primary)] border border-[var(--editor-border)] rounded px-2 py-1 outline-none w-full"
                              placeholder="Name (optional)"
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleUpdateMeta(snap.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                            />
                            <textarea
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              className="text-[11px] bg-[var(--editor-bg)] text-[var(--text-secondary)] border border-[var(--editor-border)] rounded px-2 py-1 outline-none w-full min-h-[60px] resize-none"
                              placeholder="Description (optional)"
                              onKeyDown={e => {
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                            />
                            <div className="flex justify-end gap-1.5 mt-1">
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--text-muted)]"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                              <button
                                onClick={() => handleUpdateMeta(snap.id)}
                                className="p-1 rounded bg-[var(--accent)] text-white hover:opacity-90"
                                title="Save"
                              >
                                <Check size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col min-w-0">
                            <span className="text-[12px] text-[var(--text-secondary)] font-medium truncate">
                              {snap.name || relativeTime(snap.timestamp)}
                            </span>
                            {snap.description && (
                              <span className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5">
                                {snap.description}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {editingId !== snap.id && (
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
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setEditingId(snap.id); 
                              setEditName(snap.name || ""); 
                              setEditDesc(snap.description || "");
                            }}
                            className="p-1 rounded hover:bg-[var(--surface-active)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            title="Edit details"
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
                      )}
                    </div>
                    
                    {editingId !== snap.id && (
                      <div className="flex items-center justify-between mt-1 text-[10px] text-[var(--text-muted)] opacity-60 group-hover:opacity-100 transition-opacity">
                        <span title={fullDate(snap.timestamp)}>
                          {snap.name ? relativeTime(snap.timestamp) : fullDate(snap.timestamp)}
                        </span>
                        <span>{formatSize(snap.size_bytes)}</span>
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
