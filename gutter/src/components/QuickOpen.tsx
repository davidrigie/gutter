import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useWorkspaceStore, type FileEntry } from "../stores/workspaceStore";
import { useSettingsStore } from "../stores/settingsStore";
import { fileName as pathFileName } from "../utils/path";
import { Search } from "./Icons";

interface QuickOpenProps {
  onOpenFile: (path: string) => void;
  onClose: () => void;
}

function flattenTree(entries: FileEntry[], result: { name: string; path: string }[] = []) {
  for (const entry of entries) {
    if (!entry.is_dir) {
      result.push({ name: entry.name, path: entry.path });
    }
    if (entry.children) {
      flattenTree(entry.children, result);
    }
  }
  return result;
}

function fuzzyScore(query: string, text: string): number {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let score = 0;
  let qi = 0;
  let consecutive = 0;

  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) {
      score += 1 + consecutive;
      consecutive++;
      qi++;
    } else {
      consecutive = 0;
    }
  }

  if (qi < q.length) return -1; // not all chars matched

  // Boost for filename match vs path match
  const fName = pathFileName(text) || text;
  if (fName.toLowerCase().includes(q)) {
    score += 10;
  }

  return score;
}

export function QuickOpen({ onOpenFile, onClose }: QuickOpenProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { fileTree, workspacePath } = useWorkspaceStore();
  const { recentFiles } = useSettingsStore();

  const allFiles = useMemo(() => flattenTree(fileTree), [fileTree]);

  const filtered = useMemo(() => {
    if (!query) {
      // Show recent files first, then all files
      const recent = recentFiles
        .map((path) => allFiles.find((f) => f.path === path))
        .filter((f): f is { name: string; path: string } => f !== undefined);
      const rest = allFiles.filter((f) => !recentFiles.includes(f.path));
      return [...recent, ...rest].slice(0, 50);
    }

    return allFiles
      .map((f) => ({ ...f, score: fuzzyScore(query, f.name) }))
      .filter((f) => f.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
  }, [query, allFiles, recentFiles]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (path: string) => {
      onClose();
      onOpenFile(path);
    },
    [onClose, onOpenFile],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        handleSelect(filtered[selectedIndex].path);
      }
    },
    [onClose, filtered, selectedIndex, handleSelect],
  );

  const getRelativePath = (fullPath: string) => {
    if (workspacePath && fullPath.startsWith(workspacePath)) {
      return fullPath.slice(workspacePath.length + 1);
    }
    return fullPath;
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-24 z-[200] animate-[fadeIn_120ms_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-[32rem] bg-[var(--surface-primary)] rounded-xl border border-[var(--editor-border)] overflow-hidden animate-[fadeInScale_150ms_ease-out]"
        style={{ boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-[var(--editor-border)]">
          <Search size={16} className="text-[var(--text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files by name..."
            className="w-full py-3 text-[15px] bg-transparent outline-none placeholder:text-[var(--text-muted)]"
          />
        </div>
        <div className="max-h-80 overflow-auto py-1">
          {filtered.map((file, i) => (
            <div
              key={file.path}
              className={`flex items-center gap-3 px-4 py-2 text-[13px] cursor-pointer transition-colors ${
                i === selectedIndex
                  ? "bg-[var(--surface-hover)] border-l-2 border-l-[var(--accent)]"
                  : "border-l-2 border-l-transparent hover:bg-[var(--surface-hover)]"
              }`}
              onClick={() => handleSelect(file.path)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="text-[var(--text-muted)] shrink-0">
                {file.name.endsWith(".md") ? "M" : "#"}
              </span>
              <div className="min-w-0 flex-1">
                <div className={`truncate ${i === selectedIndex ? "text-[var(--text-primary)] font-medium" : ""}`}>
                  {file.name}
                </div>
                <div className="truncate text-[11px] text-[var(--text-muted)]">
                  {getRelativePath(file.path)}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--text-muted)]">
              {allFiles.length === 0 ? "Open a workspace folder first" : "No matching files"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
