import { useState, useEffect, useCallback } from "react";
import type { Editor } from "@tiptap/react";

interface HeadingItem {
  level: number;
  text: string;
  pos: number;
}

interface DocumentOutlineProps {
  editor: Editor | null;
}

export function DocumentOutline({ editor }: DocumentOutlineProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activePos, setActivePos] = useState<number | null>(null);

  const extractHeadings = useCallback(() => {
    if (!editor) return;
    const items: HeadingItem[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        items.push({
          level: node.attrs.level as number,
          text: node.textContent,
          pos,
        });
      }
    });
    setHeadings(items);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    extractHeadings();
    editor.on("update", extractHeadings);
    return () => {
      editor.off("update", extractHeadings);
    };
  }, [editor, extractHeadings]);

  // Track active heading based on cursor position
  useEffect(() => {
    if (!editor) return;
    const handleSelectionUpdate = () => {
      const { from } = editor.state.selection;
      let currentHeadingPos: number | null = null;
      for (const h of headings) {
        if (h.pos <= from) {
          currentHeadingPos = h.pos;
        } else {
          break;
        }
      }
      setActivePos(currentHeadingPos);
    };
    editor.on("selectionUpdate", handleSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, headings]);

  const scrollToHeading = useCallback(
    (pos: number) => {
      if (!editor) return;
      editor.chain().focus().setTextSelection(pos + 1).scrollIntoView().run();
    },
    [editor],
  );

  if (headings.length === 0) {
    return (
      <div className="p-4 text-[13px] text-[var(--text-muted)]">
        No headings found
      </div>
    );
  }

  return (
    <div className="py-2 overflow-auto h-full">
      <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        Outline
      </div>
      {headings.map((h, i) => (
        <button
          key={`${h.pos}-${i}`}
          className={`w-full text-left px-3 py-1.5 text-[13px] truncate transition-colors cursor-pointer hover:bg-[var(--surface-hover)] ${
            activePos === h.pos
              ? "text-[var(--accent)] font-medium border-l-2 border-l-[var(--accent)]"
              : "text-[var(--text-secondary)] border-l-2 border-l-transparent"
          }`}
          style={{ paddingLeft: `${(h.level - 1) * 12 + 12}px` }}
          onClick={() => scrollToHeading(h.pos)}
          title={h.text}
        >
          {h.text}
        </button>
      ))}
    </div>
  );
}
