import { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  action: () => void;
  icon?: string;
  separator?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let adjustedX = x;
      let adjustedY = y;
      if (rect.right > vw) {
        adjustedX = Math.max(4, vw - rect.width - 4);
      }
      if (rect.bottom > vh) {
        adjustedY = Math.max(4, y - rect.height);
      }
      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
      // If still overflows vertically, cap it
      const newRect = menuRef.current.getBoundingClientRect();
      if (newRect.bottom > vh) {
        menuRef.current.style.maxHeight = `${vh - newRect.top - 4}px`;
      }
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: x, top: y, maxHeight: "80vh", overflowY: "auto" }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="context-menu-separator" />
        ) : (
          <button
            key={i}
            className={`context-menu-item ${item.disabled ? "disabled" : ""}`}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                onClose();
              }
            }}
            disabled={item.disabled}
          >
            {item.icon && <span className="context-menu-icon">{item.icon}</span>}
            <span className="context-menu-label">{item.label}</span>
            {item.shortcut && (
              <span className="context-menu-shortcut">{item.shortcut}</span>
            )}
          </button>
        ),
      )}
    </div>
  );
}
