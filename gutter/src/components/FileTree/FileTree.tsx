import { useState, useCallback, useRef, useEffect, memo, useMemo } from "react";
import { useWorkspaceStore, type FileEntry } from "../../stores/workspaceStore";
import { useTagStore, getFilesForTags } from "../../stores/tagStore";
import { useToastStore } from "../../stores/toastStore";
import { open, ask } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { ContextMenu, type ContextMenuItem } from "../ContextMenu";
import { fileName as pathFileName, joinPath, isImageFile } from "../../utils/path";
import { isMac } from "../../utils/platform";
import {
  ChevronRight,
  ChevronDown,
  FolderIcon,
  FolderOpen,
  FileTextIcon,
  FileIcon,
  FilePlus,
  FolderPlus,
  TagIcon,
  X,
} from "../Icons";

/** Flatten visible (expanded) file entries in display order — files only */
function flattenVisibleFiles(
  entries: FileEntry[],
  expandedPaths: Set<string>,
): string[] {
  const result: string[] = [];
  const walk = (items: FileEntry[]) => {
    for (const entry of items) {
      if (entry.is_dir) {
        if (expandedPaths.has(entry.path) && entry.children) {
          walk(entry.children);
        }
      } else {
        result.push(entry.path);
      }
    }
  };
  walk(entries);
  return result;
}

/** Check if a directory entry has any descendant file matching the filter set */
function hasMatchingDescendant(entry: FileEntry, matchingFiles: Set<string>): boolean {
  if (!entry.is_dir) return matchingFiles.has(entry.path);
  return entry.children?.some((child) => hasMatchingDescendant(child, matchingFiles)) ?? false;
}

interface DragState {
  sourcePath: string;
  sourceName: string;
  mouseY: number;
  started: boolean;
}

interface FileTreeProps {
  onFileOpen: (path: string) => void;
}

export function FileTree({ onFileOpen }: FileTreeProps) {
  const { fileTree, workspacePath, loadFileTree } = useWorkspaceStore();
  const selectedTags = useTagStore((s) => s.selectedTags);
  const filterMode = useTagStore((s) => s.filterMode);
  const tagToFiles = useTagStore((s) => s.tagToFiles);
  const clearTagSelection = useTagStore((s) => s.clearSelection);
  const isTagFiltering = selectedTags.size > 0;
  const tagFilterFiles = useMemo(
    () => isTagFiltering ? getFilesForTags(selectedTags, filterMode, tagToFiles) : null,
    [selectedTags, filterMode, tagToFiles, isTagFiltering],
  );
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // Multi-select state
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const selectedPathsRef = useRef<Set<string>>(new Set());
  const lastClickedPath = useRef<string | null>(null);
  const expandedPathsRef = useRef<Set<string>>(new Set());

  // Keep ref in sync
  useEffect(() => {
    selectedPathsRef.current = selectedPaths;
  }, [selectedPaths]);

  // Clear selection when file tree changes (workspace switch, etc.)
  useEffect(() => {
    setSelectedPaths(new Set());
    lastClickedPath.current = null;
  }, [workspacePath]);

  const handleOpenFile = useCallback(async () => {
    const selected = await open({
      filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
      multiple: false,
    });
    if (selected) {
      const path =
        typeof selected === "string"
          ? selected
          : (selected as { path: string }).path;
      onFileOpen(path);
    }
  }, [onFileOpen]);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);
  const [creatingIn, setCreatingIn] = useState<{
    parentPath: string;
    type: "file" | "folder";
  } | null>(null);

  const handleOpenFolder = useCallback(async () => {
    const selected = await open({ directory: true });
    if (selected) {
      const path =
        typeof selected === "string"
          ? selected
          : (selected as { path: string }).path;
      await loadFileTree(path);
    }
  }, [loadFileTree]);

  const handleCreateFile = useCallback(
    (parentPath: string) => {
      setCreatingIn({ parentPath, type: "file" });
    },
    [],
  );

  const handleCreateFolder = useCallback(
    (parentPath: string) => {
      setCreatingIn({ parentPath, type: "folder" });
    },
    [],
  );

  const handleCreateSubmit = useCallback(
    async (name: string) => {
      if (!creatingIn || !name.trim()) {
        setCreatingIn(null);
        return;
      }
      const fullPath = joinPath(creatingIn.parentPath, name.trim());
      try {
        if (creatingIn.type === "folder") {
          await invoke("create_directory", { path: fullPath });
        } else {
          await invoke("create_file", { path: fullPath });
        }
        if (workspacePath) {
          await loadFileTree(workspacePath);
        }
        if (creatingIn.type === "file") {
          onFileOpen(fullPath);
        }
        useToastStore.getState().addToast(
          creatingIn.type === "folder" ? "Folder created" : "File created",
          "success",
        );
      } catch (e) {
        useToastStore.getState().addToast("Failed to create file", "error");
        console.error("Failed to create:", e);
      }
      setCreatingIn(null);
    },
    [creatingIn, workspacePath, loadFileTree, onFileOpen],
  );

  const handleDeletePath = useCallback(
    async (path: string) => {
      try {
        await invoke("delete_path", { path });
        if (workspacePath) {
          await loadFileTree(workspacePath);
        }
      } catch (e) {
        useToastStore.getState().addToast("Failed to delete", "error");
        console.error("Failed to delete:", e);
      }
    },
    [workspacePath, loadFileTree],
  );

  const handleFileClick = useCallback(
    (path: string, e: React.MouseEvent | MouseEvent) => {
      const isModKey = isMac() ? e.metaKey : e.ctrlKey;
      let nextSelection: Set<string>;

      if (isModKey) {
        // Toggle selection
        const next = new Set(selectedPathsRef.current);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
        nextSelection = next;
        lastClickedPath.current = path;
      } else if (e.shiftKey && lastClickedPath.current) {
        // Range select
        const flat = flattenVisibleFiles(fileTree, expandedPathsRef.current);
        const startIdx = flat.indexOf(lastClickedPath.current);
        const endIdx = flat.indexOf(path);
        if (startIdx !== -1 && endIdx !== -1) {
          const lo = Math.min(startIdx, endIdx);
          const hi = Math.max(startIdx, endIdx);
          const rangePaths = flat.slice(lo, hi + 1);
          nextSelection = new Set(rangePaths);
        } else {
          nextSelection = new Set([path]);
          lastClickedPath.current = path;
        }
      } else {
        // Plain click — open file and set single selection
        nextSelection = new Set([path]);
        lastClickedPath.current = path;
        // Only open if it's a real React event (not a mousedown-triggered simulated click)
        if ("nativeEvent" in e) {
          onFileOpen(path);
        }
      }

      setSelectedPaths(nextSelection);
      selectedPathsRef.current = nextSelection;
    },
    [fileTree, onFileOpen],
  );

  const handleBulkDelete = useCallback(
    async (paths: Set<string>) => {
      const count = paths.size;
      if (count === 0) return;
      const confirmed = await ask(`Delete ${count} item${count > 1 ? "s" : ""}?`, { title: "Confirm Delete", kind: "warning" });
      if (!confirmed) return;
      for (const p of paths) {
        try {
          await invoke("delete_path", { path: p });
        } catch (e) {
          useToastStore.getState().addToast(`Failed to delete ${pathFileName(p)}`, "error");
          console.error("Failed to delete:", e);
        }
      }
      setSelectedPaths(new Set());
      if (workspacePath) {
        await loadFileTree(workspacePath);
      }
    },
    [workspacePath, loadFileTree],
  );

  const handleRename = useCallback(
    async (oldPath: string, newName: string) => {
      if (!newName.trim()) return;
      const parts = oldPath.split(/[/\\]/);
      parts[parts.length - 1] = newName.trim();
      const newPath = parts.join("/");
      try {
        await invoke("rename_path", { oldPath, newPath });
        if (workspacePath) {
          await loadFileTree(workspacePath);
        }
      } catch (e) {
        useToastStore.getState().addToast("Failed to rename", "error");
        console.error("Failed to rename:", e);
      }
    },
    [workspacePath, loadFileTree],
  );

  // Mouse-based drag: track mouse movement globally
  useEffect(() => {
    if (!drag) return;

    const handleMouseMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      // Start drag after 5px of movement
      if (!d.started && Math.abs(e.clientY - d.mouseY) > 5) {
        d.started = true;
        setDrag({ ...d, started: true });
      }
      if (!d.started) return;

      // Find which tree node we're over
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const node = el?.closest("[data-tree-path]") as HTMLElement | null;
      if (node) {
        const path = node.dataset.treePath || null;
        const isDir = node.dataset.treeDir === "true";
        // Only allow dropping on directories (not on self or own children)
        if (path && isDir && path !== d.sourcePath && !path.startsWith(d.sourcePath + "/")) {
          setDropTarget(path);
        } else {
          setDropTarget(null);
        }
      } else {
        setDropTarget(null);
      }
    };

    const handleMouseUp = async (e: MouseEvent) => {
      const d = dragRef.current;
      if (d?.started) {
        // Check if dropped over the editor
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (el?.closest(".ProseMirror")) {
          const eventName = isImageFile(d.sourceName)
            ? "file-tree-drop-image"
            : "file-tree-drop-link";
          window.dispatchEvent(
            new CustomEvent(eventName, {
              detail: {
                path: d.sourcePath,
                name: d.sourceName,
                clientX: e.clientX,
                clientY: e.clientY,
              },
            }),
          );
          dragRef.current = null;
          setDrag(null);
          setDropTarget(null);
          return;
        }

        if (dropTarget) {
          const currentSelected = selectedPathsRef.current;
          if (currentSelected.has(d.sourcePath) && currentSelected.size > 1) {
            // Bulk move
            for (const path of currentSelected) {
              // Safety: don't move a folder into itself or its children
              if (dropTarget === path || dropTarget.startsWith(path + "/")) {
                continue;
              }
              const fName = pathFileName(path);
              if (fName) {
                const newPath = joinPath(dropTarget, fName);
                try {
                  await invoke("rename_path", { oldPath: path, newPath: newPath });
                } catch (err) {
                  console.error("Bulk move failed for:", path, err);
                }
              }
            }
            setSelectedPaths(new Set());
          } else {
            // Single move
            // Safety: don't move a folder into itself or its children
            if (dropTarget === d.sourcePath || dropTarget.startsWith(d.sourcePath + "/")) {
              dragRef.current = null;
              setDrag(null);
              setDropTarget(null);
              return;
            }
            const fName = pathFileName(d.sourcePath);
            if (fName) {
              const newPath = joinPath(dropTarget, fName);
              try {
                await invoke("rename_path", { oldPath: d.sourcePath, newPath: newPath });
              } catch (err) {
                useToastStore.getState().addToast("Failed to move file", "error");
                console.error("Move failed:", err);
              }
            }
          }
          const ws = useWorkspaceStore.getState();
          if (ws.workspacePath) await ws.loadFileTree(ws.workspacePath);
        }
      }
      dragRef.current = null;
      setDrag(null);
      setDropTarget(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [drag, dropTarget]);

  const startDrag = useCallback((path: string, name: string, mouseY: number) => {
    const d: DragState = { sourcePath: path, sourceName: name, mouseY, started: false };
    dragRef.current = d;
    setDrag(d);
  }, []);

  const rootContextItems: ContextMenuItem[] = workspacePath
    ? [
        {
          label: "New File",
          action: () => handleCreateFile(workspacePath),
        },
        {
          label: "New Folder",
          action: () => handleCreateFolder(workspacePath),
        },
        { label: "", action: () => {}, separator: true },
        {
          label: "New from Template",
          action: () => {
            window.dispatchEvent(
              new CustomEvent("template-new-from", { detail: { folder: workspacePath } }),
            );
          },
        },
      ]
    : [];

  // Keyboard handler for file tree container
  const handleTreeKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const isModKey = isMac() ? e.metaKey : e.ctrlKey;
      if (e.key === "Escape") {
        setSelectedPaths(new Set());
      } else if ((e.key === "Backspace" || e.key === "Delete") && selectedPaths.size > 0) {
        e.preventDefault();
        handleBulkDelete(selectedPaths);
      } else if (isModKey && e.key === "a") {
        e.preventDefault();
        const allFiles = flattenVisibleFiles(fileTree, expandedPathsRef.current);
        setSelectedPaths(new Set(allFiles));
      }
    },
    [selectedPaths, handleBulkDelete, fileTree],
  );

  return (
    <div
      className="h-full flex flex-col bg-[var(--surface-secondary)]"
      tabIndex={0}
      onKeyDown={handleTreeKeyDown}
      onContextMenu={(e) => {
        if (workspacePath) {
          e.preventDefault();
          setSelectedPaths(new Set());
          setContextMenu({
            x: e.clientX,
            y: e.clientY,
            items: rootContextItems,
          });
        }
      }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--editor-border)]">
        <span className="font-semibold text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
          Files
        </span>
        <div className="flex items-center gap-0.5">
          {workspacePath && (
            <>
              <button
                onClick={() => handleCreateFile(workspacePath)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                title="New File"
              >
                <FilePlus size={14} />
              </button>
              <button
                onClick={() => handleCreateFolder(workspacePath)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                title="New Folder"
              >
                <FolderPlus size={14} />
              </button>
            </>
          )}
          <button
            onClick={handleOpenFile}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            title="Open File"
          >
            <FileTextIcon size={14} />
          </button>
          <button
            onClick={handleOpenFolder}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            title="Open Folder"
          >
            <FolderOpen size={14} />
          </button>
        </div>
      </div>
      {isTagFiltering && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--editor-border)] bg-[var(--accent-subtle)] text-[11px]">
          <span className="flex items-center gap-1.5 text-[var(--accent)]">
            <TagIcon size={11} />
            Filtered by {selectedTags.size} tag{selectedTags.size > 1 ? "s" : ""}
          </span>
          <button
            onClick={clearTagSelection}
            className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            title="Clear tag filter"
          >
            <X size={11} />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-auto py-1">
        {!workspacePath && (
          <div className="px-3 py-8 text-center text-[var(--text-muted)] text-[13px]">
            No folder open
          </div>
        )}
        {fileTree.filter((entry) => !tagFilterFiles || hasMatchingDescendant(entry, tagFilterFiles)).map((entry) => (
          <FileTreeNode
            key={entry.path}
            entry={entry}
            depth={0}
            onFileOpen={onFileOpen}
            onFileClick={handleFileClick}
            selectedPaths={selectedPaths}
            onBulkDelete={handleBulkDelete}
            onFolderClick={() => {
              const next = new Set<string>();
              setSelectedPaths(next);
              selectedPathsRef.current = next;
            }}
            expandedPathsRef={expandedPathsRef}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDelete={handleDeletePath}
            onRename={handleRename}
            setContextMenu={setContextMenu}
            onDragStart={startDrag}
            dragSourcePath={drag?.started ? drag.sourcePath : null}
            dropTarget={dropTarget}
            tagFilterFiles={isTagFiltering ? tagFilterFiles : null}
          />
        ))}

        {/* Inline create input at root level */}
        {creatingIn && creatingIn.parentPath === workspacePath && (
          <InlineCreateInput
            type={creatingIn.type}
            depth={0}
            onSubmit={handleCreateSubmit}
            onCancel={() => setCreatingIn(null)}
          />
        )}
      </div>

      {/* Drag label floating near cursor */}
      {drag?.started && (
        <div className="fixed pointer-events-none z-[200] px-2 py-1 rounded bg-[var(--surface-primary)] border border-[var(--editor-border)] shadow-md text-[12px] text-[var(--text-primary)] opacity-80"
          style={{ left: 80, top: drag.mouseY }}
          ref={(el) => {
            if (!el) return;
            const update = (e: MouseEvent) => {
              el.style.left = `${e.clientX + 12}px`;
              el.style.top = `${e.clientY - 10}px`;
            };
            window.addEventListener("mousemove", update);
            // Clean up when element unmounts
            const obs = new MutationObserver(() => {
              if (!el.isConnected) {
                window.removeEventListener("mousemove", update);
                obs.disconnect();
              }
            });
            obs.observe(el.parentNode!, { childList: true });
          }}
        >
          {selectedPaths.size > 1 && selectedPaths.has(drag.sourcePath)
            ? `${selectedPaths.size} items`
            : drag.sourceName}
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

const FileTreeNode = memo(function FileTreeNode({
  entry,
  depth,
  onFileOpen,
  onFileClick,
  selectedPaths,
  onBulkDelete,
  onFolderClick,
  expandedPathsRef,
  onCreateFile,
  onCreateFolder,
  onDelete,
  onRename,
  setContextMenu,
  onDragStart,
  dragSourcePath,
  dropTarget,
  tagFilterFiles,
}: {
  entry: FileEntry;
  depth: number;
  onFileOpen: (path: string) => void;
  onFileClick: (path: string, e: React.MouseEvent) => void;
  selectedPaths: Set<string>;
  onBulkDelete: (paths: Set<string>) => void;
  onFolderClick: () => void;
  expandedPathsRef: React.MutableRefObject<Set<string>>;
  onCreateFile: (parentPath: string) => void;
  onCreateFolder: (parentPath: string) => void;
  onDelete: (path: string) => void;
  onRename: (path: string, newName: string) => void;
  setContextMenu: (
    menu: { x: number; y: number; items: ContextMenuItem[] } | null,
  ) => void;
  onDragStart: (path: string, name: string, mouseY: number) => void;
  dragSourcePath: string | null;
  dropTarget: string | null;
  tagFilterFiles: Set<string> | null;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const [renaming, setRenaming] = useState(false);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const isMd = entry.name.endsWith(".md") || entry.name.endsWith(".markdown");
  const activeTabPath = useWorkspaceStore((s) => s.activeTabPath);
  const isActiveTab = entry.path === activeTabPath;
  const isMultiSelected = selectedPaths.has(entry.path);
  const isDragSource = dragSourcePath === entry.path;
  const isDropTarget = dropTarget === entry.path && entry.is_dir;

  // Track expanded state for flattenVisibleFiles
  useEffect(() => {
    if (entry.is_dir) {
      if (expanded) {
        expandedPathsRef.current.add(entry.path);
      } else {
        expandedPathsRef.current.delete(entry.path);
      }
    }
  }, [expanded, entry.is_dir, entry.path, expandedPathsRef]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only left click, not during rename
    if (e.button !== 0 || renaming) return;

    const isModKey = isMac() ? e.metaKey : e.ctrlKey;
    const isShift = e.shiftKey;

    // If not already selected, or if using modifiers, update selection immediately.
    // This ensures the drag label and context are correct for new selections.
    // If ALREADY selected and no modifiers, we delay the "select only this" logic until onClick
    // so that a drag can move the entire existing selection.
    if (!isMultiSelected || isModKey || isShift) {
      if (!entry.is_dir) {
        onFileClick(entry.path, e);
      } else {
        onFolderClick();
      }
    }

    onDragStart(entry.path, entry.name, e.clientY);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If right-clicking on a multi-selected item, show bulk menu
    if (!entry.is_dir && isMultiSelected && selectedPaths.size > 1) {
      const count = selectedPaths.size;
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items: [
          {
            label: `Delete ${count} items`,
            action: () => onBulkDelete(selectedPaths),
          },
        ],
      });
      return;
    }

    const items: ContextMenuItem[] = [];
    if (entry.is_dir) {
      items.push(
        {
          label: "New File",
          action: () => {
            setExpanded(true);
            setCreating("file");
          },
        },
        {
          label: "New Folder",
          action: () => {
            setExpanded(true);
            setCreating("folder");
          },
        },
        {
          label: "New from Template",
          action: () => {
            window.dispatchEvent(
              new CustomEvent("template-new-from", { detail: { folder: entry.path } }),
            );
          },
        },
        { label: "", action: () => {}, separator: true },
      );
    }
    items.push(
      {
        label: "Rename",
        action: () => setRenaming(true),
      },
      {
        label: "Delete",
        action: async () => {
          const confirmed = await ask(`Delete "${entry.name}"?`, { title: "Confirm Delete", kind: "warning" });
          if (confirmed) onDelete(entry.path);
        },
      },
    );

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  if (entry.is_dir) {
    return (
      <div>
        <div
          data-tree-path={entry.path}
          data-tree-dir="true"
          className={`flex items-center gap-1 py-[3px] cursor-pointer select-none transition-colors text-[13px] ${
            isDropTarget
              ? "bg-[var(--selection-bg)]"
              : isDragSource
                ? "opacity-40"
                : "hover:bg-[var(--surface-hover)]"
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px`, paddingRight: 8 }}
          onMouseDown={handleMouseDown}
          onClick={(e) => {
            if (!dragSourcePath) {
              const isModKey = isMac() ? e.metaKey : e.ctrlKey;
              const isShift = e.shiftKey;
              // If we clicked an already-selected folder without modifiers, 
              // we should clear other selections now.
              if (!isModKey && !isShift) {
                onFolderClick();
              }
              setExpanded(!expanded);
            }
          }}
          onContextMenu={handleContextMenu}
        >
          {/* Tree indent guides */}
          {depth > 0 && (
            <div
              className="absolute left-0 top-0 bottom-0"
              style={{ width: depth * 16 + 8 }}
            >
              {Array.from({ length: depth }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-[var(--editor-border)]"
                  style={{ left: `${(i + 1) * 16 + 4}px` }}
                />
              ))}
            </div>
          )}
          <span className="text-[var(--text-muted)] shrink-0">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <span className="text-[var(--text-tertiary)] shrink-0">
            {expanded ? <FolderOpen size={14} /> : <FolderIcon size={14} />}
          </span>
          {renaming ? (
            <RenameInput
              initialName={entry.name}
              onSubmit={(newName) => {
                onRename(entry.path, newName);
                setRenaming(false);
              }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <span className="font-medium text-[var(--text-primary)] truncate">
              {entry.name}
            </span>
          )}
        </div>
        {expanded && (
          <>
            {entry.children?.filter((child) => !tagFilterFiles || hasMatchingDescendant(child, tagFilterFiles)).map((child) => (
              <FileTreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                onFileOpen={onFileOpen}
                onFileClick={onFileClick}
                selectedPaths={selectedPaths}
                onBulkDelete={onBulkDelete}
                onFolderClick={onFolderClick}
                expandedPathsRef={expandedPathsRef}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
                onDelete={onDelete}
                onRename={onRename}
                setContextMenu={setContextMenu}
                onDragStart={onDragStart}
                dragSourcePath={dragSourcePath}
                dropTarget={dropTarget}
                tagFilterFiles={tagFilterFiles}
              />
            ))}
            {creating && (
              <InlineCreateInput
                type={creating}
                depth={depth + 1}
                onSubmit={async (name) => {
                  const fullPath = joinPath(entry.path, name);
                  try {
                    if (creating === "folder") {
                      await invoke("create_directory", { path: fullPath });
                    } else {
                      await invoke("create_file", { path: fullPath });
                    }
                    const ws = useWorkspaceStore.getState();
                    if (ws.workspacePath) {
                      await ws.loadFileTree(ws.workspacePath);
                    }
                    if (creating === "file") {
                      onFileOpen(fullPath);
                    }
                  } catch (e) {
                    useToastStore.getState().addToast("Failed to create", "error");
                    console.error("Create failed:", e);
                  }
                  setCreating(null);
                }}
                onCancel={() => setCreating(null)}
              />
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div
      data-tree-path={entry.path}
      data-tree-dir="false"
      className={`relative flex items-center gap-1 py-[3px] cursor-pointer select-none transition-colors text-[13px] ${
        isDragSource
          ? "opacity-40"
          : isMultiSelected
            ? "bg-[var(--selection-bg)]"
            : isActiveTab
              ? "bg-[var(--selection-bg)] border-l-2 border-l-[var(--accent)]"
              : "hover:bg-[var(--surface-hover)]"
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px`, paddingRight: 8 }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        if (!dragSourcePath && !renaming) {
          const isModKey = isMac() ? e.metaKey : e.ctrlKey;
          const isShift = e.shiftKey;
          // If we clicked an already-selected file without modifiers,
          // clear others and open it.
          if (!isModKey && !isShift) {
            onFileClick(entry.path, e);
          }
        }
      }}
      onContextMenu={handleContextMenu}
    >
      {/* Tree indent guides */}
      {depth > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0"
          style={{ width: depth * 16 + 8 }}
        >
          {Array.from({ length: depth }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-[var(--editor-border)] opacity-40"
              style={{ left: `${(i + 1) * 16 + 4}px` }}
            />
          ))}
        </div>
      )}
      <span className="text-[var(--text-muted)] shrink-0 ml-[18px]">
        {isMd ? <FileTextIcon size={14} /> : <FileIcon size={14} />}
      </span>
      {renaming ? (
        <RenameInput
          initialName={entry.name}
          onSubmit={(newName) => {
            onRename(entry.path, newName);
            setRenaming(false);
          }}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <span
          className={
            isMd
              ? "text-[var(--text-primary)] truncate"
              : "text-[var(--text-tertiary)] truncate"
          }
        >
          {entry.name}
        </span>
      )}
    </div>
  );
});

function RenameInput({
  initialName,
  onSubmit,
  onCancel,
}: {
  initialName: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      // Select name without extension
      const dotIndex = initialName.lastIndexOf(".");
      inputRef.current.setSelectionRange(0, dotIndex > 0 ? dotIndex : initialName.length);
    }
  }, [initialName]);

  return (
    <input
      ref={inputRef}
      className="file-tree-input"
      defaultValue={initialName}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          onSubmit((e.target as HTMLInputElement).value);
        }
        if (e.key === "Escape") {
          onCancel();
        }
      }}
      onBlur={(e) => onSubmit(e.target.value)}
    />
  );
}

function InlineCreateInput({
  type,
  depth,
  onSubmit,
  onCancel,
}: {
  type: "file" | "folder";
  depth: number;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      className="flex items-center gap-1 px-2 py-[3px]"
      style={{ paddingLeft: `${depth * 16 + 28}px` }}
    >
      <span className="text-[var(--text-muted)] shrink-0">
        {type === "folder" ? <FolderPlus size={14} /> : <FilePlus size={14} />}
      </span>
      <input
        ref={inputRef}
        className="file-tree-input"
        placeholder={type === "folder" ? "folder name" : "file name"}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const val = (e.target as HTMLInputElement).value.trim();
            if (val) onSubmit(val);
            else onCancel();
          }
          if (e.key === "Escape") {
            onCancel();
          }
        }}
        onBlur={(e) => {
          const val = e.target.value.trim();
          if (val) onSubmit(val);
          else onCancel();
        }}
      />
    </div>
  );
}
