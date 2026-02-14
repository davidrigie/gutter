import { useState, useRef } from "react";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { X, Circle } from "./Icons";

interface TabBarProps {
  onSwitchTab: (path: string) => void;
  onCloseTab: (path: string) => void;
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
        action: () => {
          openTabs.forEach((t) => {
            if (t.path !== tabPath) onCloseTab(t.path);
          });
        },
        disabled: openTabs.length <= 1,
      },
      {
        label: "Close All",
        action: () => {
          openTabs.forEach((t) => onCloseTab(t.path));
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
    // Make drag image slightly transparent
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
      <div className="flex items-center h-10 bg-[var(--surface-secondary)] border-b border-[var(--editor-border)] overflow-x-auto shrink-0">
        {openTabs.map((tab, index) => {
          const isActive = tab.path === activeTabPath;
          return (
            <div
              key={tab.path}
              className={`group relative flex items-center gap-1.5 h-full cursor-pointer select-none whitespace-nowrap transition-colors ${
                tab.isPinned ? "px-2" : "px-3"
              } ${
                isActive
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
                <Circle size={6} className="text-[var(--accent)] shrink-0" />
              )}
              {tab.isPinned && (
                <span className="text-[10px] text-[var(--text-muted)]" title="Pinned">
                  &#x1F4CC;
                </span>
              )}
              {!tab.isPinned && (
                <>
                  <span className="text-[13px]">{tab.name}</span>
                  <button
                    className="ml-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-active)] transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.path);
                    }}
                  >
                    <X size={14} className="text-[var(--text-muted)]" />
                  </button>
                </>
              )}
              {tab.isPinned && (
                <span className="text-[11px]" title={tab.name}>
                  {tab.name.length > 8 ? tab.name.slice(0, 8) + "..." : tab.name}
                </span>
              )}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]" />
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
