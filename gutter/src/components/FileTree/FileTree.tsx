import { useState, useCallback, useRef, useEffect } from "react";
import { useWorkspaceStore, type FileEntry } from "../../stores/workspaceStore";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { ContextMenu, type ContextMenuItem } from "../ContextMenu";

interface FileTreeProps {
  onFileOpen: (path: string) => void;
}

export function FileTree({ onFileOpen }: FileTreeProps) {
  const { fileTree, workspacePath, loadFileTree } = useWorkspaceStore();
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
      } catch (e) {
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
        console.error("Failed to rename:", e);
      }
    },
    [workspacePath, loadFileTree],
  );

  const rootContextItems: ContextMenuItem[] = workspacePath
    ? [
        {
          label: "New File",
          icon: "+",
          action: () => handleCreateFile(workspacePath),
        },
        {
          label: "New Folder",
          icon: "+",
          action: () => handleCreateFolder(workspacePath),
        },
      ]
    : [];

  return (
    <div
      className="h-full flex flex-col bg-[var(--sidebar-bg)] text-sm"
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
        <span className="font-semibold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
          Files
        </span>
        <div className="flex items-center gap-1">
          {workspacePath && (
            <>
              <button
                onClick={() => handleCreateFile(workspacePath)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-1"
                title="New File"
              >
                +
              </button>
              <button
                onClick={() => handleCreateFolder(workspacePath)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-1"
                title="New Folder"
              >
                +/
              </button>
            </>
          )}
          <button
            onClick={handleOpenFolder}
            className="text-xs text-[var(--accent)] hover:underline ml-1"
          >
            Open
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto py-1">
        {!workspacePath && (
          <div className="px-3 py-8 text-center text-gray-500 dark:text-gray-400 text-xs">
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
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const [renaming, setRenaming] = useState(false);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const isMd = entry.name.endsWith(".md") || entry.name.endsWith(".markdown");

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [];
    if (entry.is_dir) {
      items.push(
        {
          label: "New File",
          icon: "+",
          action: () => {
            setExpanded(true);
            setCreating("file");
          },
        },
        {
          label: "New Folder",
          icon: "+",
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
        icon: "✎",
        action: () => setRenaming(true),
      },
      {
        label: "Delete",
        icon: "✕",
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
          className="flex items-center px-2 py-0.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 select-none"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => setExpanded(!expanded)}
          onContextMenu={handleContextMenu}
        >
          <span className="mr-1 text-xs text-gray-400">
            {expanded ? "▼" : "▶"}
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
            <span className="text-gray-700 dark:text-gray-300">
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
      className={`flex items-center px-2 py-0.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 select-none ${
        isMd
          ? "text-gray-800 dark:text-gray-200"
          : "text-gray-500 dark:text-gray-500"
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
      onClick={() => !renaming && onFileOpen(entry.path)}
      onContextMenu={handleContextMenu}
    >
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
        <span>{entry.name}</span>
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
      className="flex items-center px-2 py-0.5"
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
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
