import { useCallback, useRef } from "react";

interface ResizeHandleProps {
  side: "left" | "right";
  onResize: (width: number) => void;
  onDoubleClick: () => void;
  minWidth: number;
  maxWidth: number;
  currentWidth: number;
}

export function ResizeHandle({
  side,
  onResize,
  onDoubleClick,
  minWidth,
  maxWidth,
  currentWidth,
}: ResizeHandleProps) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = currentWidth;

      const handleMouseMove = (e: MouseEvent) => {
        if (!dragging.current) return;
        const delta = side === "left"
          ? e.clientX - startX.current
          : startX.current - e.clientX;
        const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta));
        onResize(newWidth);
      };

      const handleMouseUp = () => {
        dragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [side, onResize, minWidth, maxWidth, currentWidth],
  );

  return (
    <div
      className="resize-handle"
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
    />
  );
}
