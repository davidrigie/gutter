import { useState, useRef } from "react";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { X } from "./Icons";

interface TabBarProps {
  onSwitchTab: (path: string) => void;
  onCloseTab: (path: string) => void | Promise<void>;
}

export function TabBar({ onSwitchTab, onCloseTab }: TabBarProps) {
  const { openTabs, activeTabPath, reorderTabs, pinTab, unpinTab } =
    useWorkspaceStore();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);
  const dragIndex = useRef<number | null>(null);

  if (openTabs.length === 0) return null;

  const handleTabContextMenu = (e: React.MouseEvent, tabPath: string) => {
    e.preventDefault();
    const tab = openTabs.find((t) => t.path === tabPath);
    const items: ContextMenuItem[] = [
      {
        label: "Close",
        action: () => onCloseTab(tabPath),
      },
      {
        label: "Close Others",
        action: async () => {
          for (const t of openTabs) {
            if (t.path !== tabPath) await onCloseTab(t.path);
          }
        },
        disabled: openTabs.length <= 1,
      },
      {
        label: "Close All",
        action: async () => {
          for (const t of openTabs) {
            await onCloseTab(t.path);
          }
        },
      },
      { label: "", action: () => {}, separator: true },
      tab?.isPinned
        ? {
            label: "Unpin Tab",
            action: () => unpinTab(tabPath),
          }
        : {
            label: "Pin Tab",
            action: () => pinTab(tabPath),
          },
    ];
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = "0.5";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = "";
    dragIndex.current = null;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndex.current !== null && dragIndex.current !== index) {
      reorderTabs(dragIndex.current, index);
      dragIndex.current = index;
    }
  };

  return (
    <>
      <div
        className="flex items-center bg-[var(--surface-secondary)] overflow-x-auto shrink-0"
        style={{ height: 36, boxShadow: "inset 0 -1px 0 var(--editor-border)" }}
      >
        {openTabs.map((tab, index) => {
          const isActive = tab.path === activeTabPath;
          return (
            <div
              key={tab.path}
              className={`group relative flex items-center gap-1.5 h-full cursor-pointer select-none whitespace-nowrap transition-colors ${
                tab.isPinned ? "px-2" : "px-3"
              } ${
                isActive
                  ? "text-[var(--text-primary)] bg-[var(--editor-bg)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onClick={() => onSwitchTab(tab.path)}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  onCloseTab(tab.path);
                }
              }}
              onContextMenu={(e) => handleTabContextMenu(e, tab.path)}
            >
              {tab.isDirty && (
                <span
                  className="shrink-0 rounded-full bg-[var(--accent)]"
                  style={{ width: 5, height: 5 }}
                />
              )}
              {tab.isPinned && (
                <span className="text-[10px] text-[var(--text-muted)]" title="Pinned">
                  &#x1F4CC;
                </span>
              )}
              {!tab.isPinned && (
                <>
                  <span className="text-[12px]">{tab.name}</span>
                  <button
                    className="ml-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-active)] transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.path);
                    }}
                  >
                    <X size={12} className="text-[var(--text-muted)]" />
                  </button>
                </>
              )}
              {tab.isPinned && (
                <span className="text-[11px]" title={tab.name}>
                  {tab.name.length > 8 ? tab.name.slice(0, 8) + "..." : tab.name}
                </span>
              )}
              {isActive && (
                <div
                  className="absolute bottom-[2px] left-1/2 -translate-x-1/2 rounded-full bg-[var(--accent)]"
                  style={{ width: 20, height: 3 }}
                />
              )}
            </div>
          );
        })}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
