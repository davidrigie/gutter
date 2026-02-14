import { useState, useCallback, useRef, useEffect } from "react";
import { useWorkspaceStore, type FileEntry } from "../../stores/workspaceStore";
import { useToastStore } from "../../stores/toastStore";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { ContextMenu, type ContextMenuItem } from "../ContextMenu";
import {
  ChevronRight,
  ChevronDown,
  FolderIcon,
  FolderOpen,
  FileTextIcon,
  FileIcon,
  FilePlus,
  FolderPlus,
} from "../Icons";

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
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);

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
      const fullPath = `${creatingIn.parentPath}/${name.trim()}`;
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

  const handleRename = useCallback(
    async (oldPath: string, newName: string) => {
      if (!newName.trim()) return;
      const parts = oldPath.split("/");
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

    const handleMouseUp = async () => {
      const d = dragRef.current;
      if (d?.started && dropTarget) {
        const fileName = d.sourcePath.split("/").pop();
        if (fileName) {
          const newPath = `${dropTarget}/${fileName}`;
          try {
            await invoke("rename_path", { oldPath: d.sourcePath, newPath });
            const ws = useWorkspaceStore.getState();
            if (ws.workspacePath) await ws.loadFileTree(ws.workspacePath);
          } catch (err) {
            useToastStore.getState().addToast("Failed to move file", "error");
            console.error("Move failed:", err);
          }
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
      ]
    : [];

  return (
    <div
      className="h-full flex flex-col bg-[var(--surface-secondary)]"
      onContextMenu={(e) => {
        if (workspacePath) {
          e.preventDefault();
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
      <div className="flex-1 overflow-auto py-1">
        {!workspacePath && (
          <div className="px-3 py-8 text-center text-[var(--text-muted)] text-[13px]">
            No folder open
          </div>
        )}
        {fileTree.map((entry) => (
          <FileTreeNode
            key={entry.path}
            entry={entry}
            depth={0}
            onFileOpen={onFileOpen}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDelete={handleDeletePath}
            onRename={handleRename}
            setContextMenu={setContextMenu}
            onDragStart={startDrag}
            dragSourcePath={drag?.started ? drag.sourcePath : null}
            dropTarget={dropTarget}
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
          {drag.sourceName}
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

function FileTreeNode({
  entry,
  depth,
  onFileOpen,
  onCreateFile,
  onCreateFolder,
  onDelete,
  onRename,
  setContextMenu,
  onDragStart,
  dragSourcePath,
  dropTarget,
}: {
  entry: FileEntry;
  depth: number;
  onFileOpen: (path: string) => void;
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
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const [renaming, setRenaming] = useState(false);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const isMd = entry.name.endsWith(".md") || entry.name.endsWith(".markdown");
  const activeTabPath = useWorkspaceStore((s) => s.activeTabPath);
  const isSelected = entry.path === activeTabPath;
  const isDragSource = dragSourcePath === entry.path;
  const isDropTarget = dropTarget === entry.path && entry.is_dir;

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only left click, not during rename
    if (e.button !== 0 || renaming) return;
    onDragStart(entry.path, entry.name, e.clientY);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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
        action: () => {
          if (window.confirm(`Delete "${entry.name}"?`)) {
            onDelete(entry.path);
          }
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
              ? "bg-[rgba(59,130,246,0.15)]"
              : isDragSource
                ? "opacity-40"
                : "hover:bg-[var(--surface-hover)]"
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px`, paddingRight: 8 }}
          onMouseDown={handleMouseDown}
          onClick={() => {
            if (!dragSourcePath) setExpanded(!expanded);
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
            {entry.children?.map((child) => (
              <FileTreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                onFileOpen={onFileOpen}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
                onDelete={onDelete}
                onRename={onRename}
                setContextMenu={setContextMenu}
                onDragStart={onDragStart}
                dragSourcePath={dragSourcePath}
                dropTarget={dropTarget}
              />
            ))}
            {creating && (
              <InlineCreateInput
                type={creating}
                depth={depth + 1}
                onSubmit={async (name) => {
                  if (creating === "folder") {
                    onCreateFolder(entry.path);
                  } else {
                    onCreateFile(entry.path);
                  }
                  // Actually create via invoke
                  const fullPath = `${entry.path}/${name}`;
                  try {
                    const { invoke } = await import("@tauri-apps/api/core");
                    if (creating === "folder") {
                      await invoke("create_directory", { path: fullPath });
                    } else {
                      await invoke("create_file", { path: fullPath });
                    }
                    // Reload tree
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
          : isSelected
            ? "bg-[rgba(59,130,246,0.08)] dark:bg-[rgba(96,165,250,0.1)]"
            : "hover:bg-[var(--surface-hover)]"
      }`}
      style={{ paddingLeft: `${depth * 16 + 8}px`, paddingRight: 8 }}
      onMouseDown={handleMouseDown}
      onClick={() => !renaming && !dragSourcePath && onFileOpen(entry.path)}
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
}

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
