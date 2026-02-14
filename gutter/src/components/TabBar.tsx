import { useState } from "react";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";

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
      <div className="flex items-center h-9 bg-[var(--sidebar-bg)] border-b border-[var(--editor-border)] overflow-x-auto shrink-0">
        {openTabs.map((tab) => (
          <div
            key={tab.path}
            className={`flex items-center gap-1 px-3 h-full text-xs cursor-pointer border-r border-[var(--editor-border)] select-none whitespace-nowrap ${
              tab.path === activeTabPath
                ? "bg-[var(--editor-bg)] text-[var(--editor-text)]"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            onClick={() => onSwitchTab(tab.path)}
            onContextMenu={(e) => handleTabContextMenu(e, tab.path)}
          >
            <span>
              {tab.isDirty ? "● " : ""}
              {tab.name}
            </span>
            <button
              className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.path);
              }}
            >
              ×
            </button>
          </div>
        ))}
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
