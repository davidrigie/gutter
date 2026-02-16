import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWorkspaceStore, type FileEntry } from "../stores/workspaceStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useTagStore, getAllTags } from "../stores/tagStore";
import { useEditorStore } from "../stores/editorStore";
import { fileName as pathFileName } from "../utils/path";
import { Search } from "./Icons";

interface Command {
  name: string;
  shortcut?: string;
  action: () => void;
}

interface UnifiedSearchProps {
  commands: Command[];
  onOpenFile: (path: string) => void;
  onClose: () => void;
  filterMode: "all" | "files" | "commands";
}

interface HeadingResult {
  type: "Heading";
  path: string;
  text: string;
  level: number;
  line: number;
}

interface ContentResult {
  type: "Content";
  path: string;
  line: number;
  snippet: string;
  match_offset: number;
}

type ServerResult = HeadingResult | ContentResult;

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

  if (qi < q.length) return -1;

  const fName = pathFileName(text) || text;
  if (fName.toLowerCase().includes(q)) {
    score += 10;
  }

  return score;
}

// Unified row type for keyboard navigation
type ResultRow =
  | { kind: "file"; name: string; path: string }
  | { kind: "heading"; result: HeadingResult }
  | { kind: "content"; result: ContentResult }
  | { kind: "command"; command: Command }
  | { kind: "tag"; tag: string; count: number };

export function UnifiedSearch({ commands, onOpenFile, onClose, filterMode }: UnifiedSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [serverResults, setServerResults] = useState<ServerResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { fileTree, workspacePath } = useWorkspaceStore();
  const { recentFiles } = useSettingsStore();

  const allFiles = useMemo(() => flattenTree(fileTree), [fileTree]);

  // Client-side file results
  const fileResults = useMemo(() => {
    if (filterMode === "commands") return [];
    if (!query) {
      const recent = recentFiles
        .map((path) => allFiles.find((f) => f.path === path))
        .filter((f): f is { name: string; path: string } => f !== undefined);
      const rest = allFiles.filter((f) => !recentFiles.includes(f.path));
      return [...recent, ...rest].slice(0, 20);
    }
    return allFiles
      .map((f) => ({ ...f, score: fuzzyScore(query, f.name) }))
      .filter((f) => f.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [query, allFiles, recentFiles, filterMode]);

  // Client-side command results
  const commandResults = useMemo(() => {
    if (filterMode === "files") return [];
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) => c.name.toLowerCase().includes(q));
  }, [query, commands, filterMode]);

  // Tag results from tagStore
  const tagToFiles = useTagStore((s) => s.tagToFiles);
  const tagResults = useMemo(() => {
    if (filterMode === "commands" || filterMode === "files") return [];
    const allTags = getAllTags(tagToFiles);
    if (!query) return [];
    const q = query.startsWith("#") ? query.slice(1).toLowerCase() : query.toLowerCase();
    if (!q) return allTags.slice(0, 10);
    return allTags.filter((t) => t.tag.toLowerCase().includes(q)).slice(0, 10);
  }, [query, filterMode, tagToFiles]);

  // Split server results into headings and content
  const headingResults = useMemo(
    () => serverResults.filter((r): r is HeadingResult => r.type === "Heading"),
    [serverResults],
  );
  const contentResults = useMemo(
    () => serverResults.filter((r): r is ContentResult => r.type === "Content"),
    [serverResults],
  );

  // Debounced server search
  useEffect(() => {
    if (filterMode === "commands" || query.length < 2 || !workspacePath) {
      setServerResults([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await invoke<ServerResult[]>("search_workspace", {
          workspace: workspacePath,
          query,
        });
        setServerResults(results);
      } catch {
        setServerResults([]);
      }
    }, 150);

    return () => clearTimeout(debounceRef.current);
  }, [query, workspacePath, filterMode]);

  // Build flat list of all rows for keyboard navigation
  const allRows = useMemo((): ResultRow[] => {
    const rows: ResultRow[] = [];
    for (const f of fileResults) {
      rows.push({ kind: "file", name: f.name, path: f.path });
    }
    for (const h of headingResults) {
      rows.push({ kind: "heading", result: h });
    }
    for (const c of contentResults) {
      rows.push({ kind: "content", result: c });
    }
    for (const t of tagResults) {
      rows.push({ kind: "tag", tag: t.tag, count: t.count });
    }
    for (const cmd of commandResults) {
      rows.push({ kind: "command", command: cmd });
    }
    return rows;
  }, [fileResults, headingResults, contentResults, tagResults, commandResults]);

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const item = container.querySelector(`[data-idx="${selectedIndex}"]`) as HTMLElement | null;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const getRelativePath = useCallback(
    (fullPath: string) => {
      if (workspacePath && fullPath.startsWith(workspacePath)) {
        return fullPath.slice(workspacePath.length + 1);
      }
      return fullPath;
    },
    [workspacePath],
  );

  const executeRow = useCallback(
    (row: ResultRow) => {
      onClose();
      if (row.kind === "file") {
        onOpenFile(row.path);
      } else if (row.kind === "heading") {
        onOpenFile(row.result.path);
      } else if (row.kind === "content") {
        onOpenFile(row.result.path);
      } else if (row.kind === "tag") {
        useTagStore.getState().toggleTag(row.tag);
        // Ensure file tree and tags panel are visible
        const editorState = useEditorStore.getState();
        if (!editorState.showFileTree) editorState.toggleFileTree();
        if (!editorState.showTags) editorState.toggleTags();
      } else if (row.kind === "command") {
        row.command.action();
      }
    },
    [onClose, onOpenFile],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, allRows.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && allRows[selectedIndex]) {
        e.preventDefault();
        executeRow(allRows[selectedIndex]);
      }
    },
    [onClose, allRows, selectedIndex, executeRow],
  );

  const placeholder =
    filterMode === "files"
      ? "Search files..."
      : filterMode === "commands"
        ? "Search commands..."
        : "Search everything...";

  const renderRow = (row: ResultRow, idx: number) => {
    const isSelected = idx === selectedIndex;
    const baseClass = `flex items-center gap-3 px-4 py-2 text-[13px] cursor-pointer transition-colors ${
      isSelected
        ? "bg-[var(--surface-hover)] border-l-2 border-l-[var(--accent)]"
        : "border-l-2 border-l-transparent hover:bg-[var(--surface-hover)]"
    }`;

    if (row.kind === "file") {
      return (
        <div
          key={`file-${row.path}`}
          data-idx={idx}
          className={baseClass}
          onClick={() => executeRow(row)}
          onMouseEnter={() => setSelectedIndex(idx)}
        >
          <span className="text-[var(--text-muted)] shrink-0 text-[11px]">
            {row.name.endsWith(".md") ? "M" : "#"}
          </span>
          <div className="min-w-0 flex-1">
            <div className={`truncate ${isSelected ? "text-[var(--text-primary)] font-medium" : ""}`}>
              {row.name}
            </div>
            <div className="truncate text-[11px] text-[var(--text-muted)]">
              {getRelativePath(row.path)}
            </div>
          </div>
        </div>
      );
    }

    if (row.kind === "heading") {
      const r = row.result;
      const fName = pathFileName(r.path) || r.path;
      return (
        <div
          key={`heading-${r.path}-${r.line}`}
          data-idx={idx}
          className={baseClass}
          onClick={() => executeRow(row)}
          onMouseEnter={() => setSelectedIndex(idx)}
        >
          <span className="unified-search-badge shrink-0">H{r.level}</span>
          <div className="min-w-0 flex-1">
            <div className={`truncate ${isSelected ? "text-[var(--text-primary)] font-medium" : ""}`}>
              {r.text}
            </div>
            <div className="truncate text-[11px] text-[var(--text-muted)]">{fName}</div>
          </div>
        </div>
      );
    }

    if (row.kind === "content") {
      const r = row.result;
      const fName = pathFileName(r.path) || r.path;
      return (
        <div
          key={`content-${r.path}-${r.line}`}
          data-idx={idx}
          className={baseClass}
          onClick={() => executeRow(row)}
          onMouseEnter={() => setSelectedIndex(idx)}
        >
          <span className="unified-search-line-num shrink-0">{r.line}</span>
          <div className="min-w-0 flex-1">
            <div className={`truncate text-[12px] ${isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
              {r.snippet}
            </div>
            <div className="truncate text-[11px] text-[var(--text-muted)]">{fName}</div>
          </div>
        </div>
      );
    }

    if (row.kind === "tag") {
      return (
        <div
          key={`tag-${row.tag}`}
          data-idx={idx}
          className={baseClass}
          onClick={() => executeRow(row)}
          onMouseEnter={() => setSelectedIndex(idx)}
        >
          <span className="text-[var(--accent)] shrink-0 text-[12px] font-medium">#</span>
          <div className="min-w-0 flex-1">
            <span className={`truncate ${isSelected ? "text-[var(--text-primary)] font-medium" : ""}`}>
              {row.tag}
            </span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] bg-[var(--surface-active)] px-1.5 py-0.5 rounded-full">
            {row.count} file{row.count !== 1 ? "s" : ""}
          </span>
        </div>
      );
    }

    // command
    const cmd = row.command;
    return (
      <div
        key={`cmd-${cmd.name}`}
        data-idx={idx}
        className={`flex items-center justify-between px-4 py-2 text-[13px] cursor-pointer transition-colors ${
          isSelected
            ? "bg-[var(--surface-hover)] border-l-2 border-l-[var(--accent)]"
            : "border-l-2 border-l-transparent hover:bg-[var(--surface-hover)]"
        }`}
        onClick={() => executeRow(row)}
        onMouseEnter={() => setSelectedIndex(idx)}
      >
        <span className={isSelected ? "text-[var(--text-primary)] font-medium" : ""}>{cmd.name}</span>
        {cmd.shortcut && (
          <span className="text-[11px] text-[var(--text-muted)] font-mono bg-[var(--surface-active)] px-1.5 py-0.5 rounded">
            {cmd.shortcut}
          </span>
        )}
      </div>
    );
  };

  const renderSection = (label: string, rows: ResultRow[], startIdx: number) => {
    if (rows.length === 0) return null;
    return (
      <>
        <div className="unified-search-section">{label}</div>
        {rows.map((row, i) => renderRow(row, startIdx + i))}
      </>
    );
  };

  // Calculate section start indices
  const fileStart = 0;
  const headingStart = fileResults.length;
  const contentStart = headingStart + headingResults.length;
  const tagStart = contentStart + contentResults.length;
  const commandStart = tagStart + tagResults.length;
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-24 z-[200] animate-[fadeIn_120ms_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-[32rem] bg-[var(--glass-bg)] backdrop-blur-[20px] rounded-xl border border-[var(--glass-border)] overflow-hidden animate-[fadeInScale_150ms_ease-out]"
        style={{ boxShadow: "var(--shadow-xl)" }}
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
            placeholder={placeholder}
            className="w-full py-3 text-[15px] bg-transparent outline-none placeholder:text-[var(--text-muted)]"
          />
        </div>
        <div ref={listRef} className="max-h-80 overflow-auto py-1">
          {renderSection(
            "Files",
            allRows.filter((r) => r.kind === "file"),
            fileStart,
          )}
          {renderSection(
            "Headings",
            allRows.filter((r) => r.kind === "heading"),
            headingStart,
          )}
          {renderSection(
            "Content",
            allRows.filter((r) => r.kind === "content"),
            contentStart,
          )}
          {renderSection(
            "Tags",
            allRows.filter((r) => r.kind === "tag"),
            tagStart,
          )}
          {renderSection(
            "Commands",
            allRows.filter((r) => r.kind === "command"),
            commandStart,
          )}
          {allRows.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--text-muted)]">
              {filterMode === "commands"
                ? "No matching commands"
                : allFiles.length === 0
                  ? "Open a workspace folder first"
                  : "No results"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
