import { useState } from "react";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { X, Circle } from "./Icons";

interface TabBarProps {
  onSwitchTab: (path: string) => void;
  onCloseTab: (path: string) => void;
}

export function TabBar({ onSwitchTab, onCloseTab }: TabBarProps) {
  const { openTabs, activeTabPath } = useWorkspaceStore();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  if (openTabs.length === 0) return null;

  const handleTabContextMenu = (e: React.MouseEvent, tabPath: string) => {
    e.preventDefault();
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
    ];
    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  return (
    <>
      <div className="flex items-center h-10 bg-[var(--surface-secondary)] border-b border-[var(--editor-border)] overflow-x-auto shrink-0">
        {openTabs.map((tab) => {
          const isActive = tab.path === activeTabPath;
          return (
            <div
              key={tab.path}
              className={`group relative flex items-center gap-1.5 px-3 h-full cursor-pointer select-none whitespace-nowrap transition-colors ${
                isActive
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
              onClick={() => onSwitchTab(tab.path)}
              onContextMenu={(e) => handleTabContextMenu(e, tab.path)}
            >
              {tab.isDirty && (
                <Circle size={6} className="text-[var(--accent)] shrink-0" />
              )}
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
              {/* Active indicator */}
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
