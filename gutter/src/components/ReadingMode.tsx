import { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { ImageBlockView } from "./Editor/extensions/ImageBlock";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { CommentMark } from "./Editor/extensions/CommentMark";
import { MathBlock, MathBlockView, MathInline, MathInlineView } from "./Editor/extensions/MathBlock";
import { MermaidBlock, MermaidBlockView } from "./Editor/extensions/MermaidBlock";
import { CodeBlockView } from "./Editor/extensions/CodeBlockWithLang";
import { Frontmatter } from "./Editor/extensions/Frontmatter";
import { WikiLink } from "./Editor/extensions/WikiLink";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { parseMarkdown } from "./Editor/markdown/parser";
import { useEditorStore } from "../stores/editorStore";
import { useCommentStore } from "../stores/commentStore";
import { parentDir } from "../utils/path";
import { modLabel } from "../utils/platform";
import "../styles/editor.css";

const lowlight = createLowlight(common);

interface ReadingModeProps {
  content: string;
}

interface AnnotationPosition {
  commentId: string;
  top: number;
}

export function ReadingMode({ content }: ReadingModeProps) {
  const { activeCommentId, setActiveCommentId, toggleReadingMode, commentTexts } = useEditorStore();
  const { threads } = useCommentStore();
  const [annotations, setAnnotations] = useState<AnnotationPosition[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      Image.extend({
        addNodeView() {
          return ReactNodeViewRenderer(ImageBlockView);
        },
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      CodeBlockLowlight.configure({ lowlight }).extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockView);
        },
      }),
      CommentMark,
      MathBlock.extend({
        addNodeView() {
          return ReactNodeViewRenderer(MathBlockView);
        },
      }),
      MathInline.extend({
        addNodeView() {
          return ReactNodeViewRenderer(MathInlineView);
        },
      }),
      MermaidBlock.extend({
        addNodeView() {
          return ReactNodeViewRenderer(MermaidBlockView);
        },
      }),
      Frontmatter,
      WikiLink,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: parseMarkdown(content, parentDir(useEditorStore.getState().filePath || "")),
  });

  // Update content when it changes
  useEffect(() => {
    if (editor && content) {
      const doc = parseMarkdown(content, parentDir(useEditorStore.getState().filePath || ""));
      editor.commands.setContent(doc);
    }
  }, [content, editor]);

  // Calculate annotation positions
  const calculatePositions = useCallback(() => {
    if (!contentRef.current || !editor) return;

    const commentIds: string[] = [];
    // Walk the doc to find all comment IDs (marks + node attrs)
    editor.state.doc.descendants((node) => {
      if (node.type.spec.atom && node.attrs.commentId) {
        const id = node.attrs.commentId;
        if (!commentIds.includes(id)) commentIds.push(id);
      }
      node.marks.forEach((mark) => {
        if (mark.type.name === "commentMark") {
          const id = mark.attrs.commentId;
          if (!commentIds.includes(id)) commentIds.push(id);
        }
      });
    });

    // Filter to only IDs that have actual threads
    const validIds = commentIds.filter((id) => threads[id]);
    if (validIds.length === 0) {
      setAnnotations([]);
      return;
    }

    const container = contentRef.current;
    const containerRect = container.getBoundingClientRect();

    const positions: AnnotationPosition[] = [];
    for (const id of validIds) {
      // Try mark-based comment first
      let el = container.querySelector(`mark[data-comment-id="${id}"]`) as HTMLElement | null;
      // Try node-level comment
      if (!el) {
        el = container.querySelector(`[data-node-comment-id="${id}"]`) as HTMLElement | null;
      }
      if (el) {
        const elRect = el.getBoundingClientRect();
        positions.push({
          commentId: id,
          top: elRect.top - containerRect.top,
        });
      }
    }

    // Collision avoidance: push overlapping annotations downward
    const CARD_HEIGHT = 80; // estimated min height of an annotation card
    const GAP = 8;
    positions.sort((a, b) => a.top - b.top);
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const minTop = prev.top + CARD_HEIGHT + GAP;
      if (positions[i].top < minTop) {
        positions[i].top = minTop;
      }
    }

    setAnnotations(positions);
  }, [editor, threads]);

  // Recalculate on content load and resize
  useEffect(() => {
    if (!editor) return;

    // Wait for editor to settle, then calculate
    const timer = setTimeout(calculatePositions, 100);

    const observer = new ResizeObserver(() => calculatePositions());
    if (contentRef.current) observer.observe(contentRef.current);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [editor, calculatePositions]);

  // Handle clicking anchor text in the document
  useEffect(() => {
    if (!contentRef.current) return;
    const container = contentRef.current;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const mark = target.closest("mark[data-comment-id]");
      if (mark) {
        const id = mark.getAttribute("data-comment-id");
        if (id) setActiveCommentId(id);
      }
      const nodeComment = target.closest("[data-node-comment-id]");
      if (nodeComment) {
        const id = nodeComment.getAttribute("data-node-comment-id");
        if (id) setActiveCommentId(id);
      }
    };
    container.addEventListener("click", handler);
    return () => container.removeEventListener("click", handler);
  }, [setActiveCommentId]);

  // Scroll active annotation into view
  useEffect(() => {
    if (!activeCommentId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-annotation-id="${activeCommentId}"]`) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeCommentId]);

  const mod = modLabel();

  return (
    <div className="reading-mode" ref={scrollRef}>
      <button
        className="reading-mode-exit"
        onClick={() => toggleReadingMode()}
        title={`Exit reading mode (${mod}+Shift+R or Escape)`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" />
        </svg>
        Exit
      </button>

      <div className="reading-mode-grid">
        <div className="reading-mode-spacer" />

        <div className="reading-mode-content" ref={contentRef}>
          <EditorContent editor={editor} />
        </div>

        <div className="reading-mode-margin">
          {annotations.map((ann) => {
            const thread = threads[ann.commentId];
            if (!thread) return null;
            const firstMsg = thread.thread[0];
            const replyCount = thread.thread.length - 1;
            const quotedText = commentTexts[ann.commentId] || "";

            return (
              <div
                key={ann.commentId}
                data-annotation-id={ann.commentId}
                className={`margin-annotation ${activeCommentId === ann.commentId ? "active" : ""}`}
                style={{ top: ann.top }}
                onClick={() => setActiveCommentId(ann.commentId)}
              >
                {quotedText && (
                  <div className="margin-annotation-quote">{quotedText}</div>
                )}
                <div className="margin-annotation-body">{firstMsg.body}</div>
                <div className="margin-annotation-author">{firstMsg.author}</div>
                {replyCount > 0 && (
                  <div className="margin-annotation-replies">
                    {replyCount} {replyCount === 1 ? "reply" : "replies"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
