import {
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useState,
  useRef,
} from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { CommentMark } from "./extensions/CommentMark";
import { SlashCommands } from "./extensions/SlashCommands";
import { MathBlock, MathBlockView, MathInline, MathInlineView } from "./extensions/MathBlock";
import { MermaidBlock, MermaidBlockView } from "./extensions/MermaidBlock";
import { CodeBlockView } from "./extensions/CodeBlockWithLang";
import { Extension } from "@tiptap/react";
import { parseMarkdown } from "./markdown/parser";
import { serializeMarkdown } from "./markdown/serializer";
import { invoke } from "@tauri-apps/api/core";
import { useEditorStore } from "../../stores/editorStore";
import { useCommentStore } from "../../stores/commentStore";
import { ContextMenu, type ContextMenuItem } from "../ContextMenu";
import { FocusMode } from "./extensions/FocusMode";
import { Frontmatter } from "./extensions/Frontmatter";
import { WikiLink } from "./extensions/WikiLink";
import { SpellCheck } from "./extensions/SpellCheck";
import { MarkdownLinkInput } from "./extensions/MarkdownLinkInput";
import { LinkReveal } from "./extensions/LinkReveal";
import { createFindReplacePlugin } from "../FindReplace";
import "../../styles/editor.css";

const FindReplaceExtension = Extension.create({
  name: "findReplace",
  addProseMirrorPlugins() {
    return [createFindReplacePlugin()];
  },
});

const lowlight = createLowlight(common);

interface GutterEditorProps {
  initialContent?: string;
  onUpdate?: (markdown: string) => void;
}

export interface GutterEditorHandle {
  createComment: () => void;
  navigateComment: (direction: "next" | "prev") => void;
  getMarkdown: () => string;
  getEditor: () => Editor | null;
}

export const GutterEditor = forwardRef<GutterEditorHandle, GutterEditorProps>(
  function GutterEditor({ initialContent, onUpdate }, ref) {
    const {
      setWordCount,
      setCursorPosition,
      setDirty,
      setActiveCommentId,
      setUndoRedo,
    } = useEditorStore();

    const { addThread, getNextCommentId } = useCommentStore();

    const [contextMenu, setContextMenu] = useState<{
      x: number;
      y: number;
      items: ContextMenuItem[];
    } | null>(null);

    const [commentCreation, setCommentCreation] = useState<{
      commentId: string;
      selectedText: string;
      x: number;
      y: number;
    } | null>(null);

    const commentInputRef = useRef<HTMLTextAreaElement>(null);
    const editorRef = useRef<Editor | null>(null);

    const handleImageInsert = useCallback(async (file: File) => {
      const filePath = useEditorStore.getState().filePath;
      if (!filePath) return;
      const dirPath = filePath.substring(0, filePath.lastIndexOf("/"));
      const ext = file.name.split(".").pop() || "png";
      const filename = `image-${Date.now()}.${ext}`;
      const buffer = await file.arrayBuffer();
      const data = Array.from(new Uint8Array(buffer));
      try {
        const relativePath = await invoke<string>("save_image", {
          dirPath,
          filename,
          data,
        });
        editorRef.current?.chain().focus().setImage({ src: relativePath }).run();
      } catch (e) {
        console.error("Failed to save image:", e);
      }
    }, []);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          codeBlock: false,
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer" },
        }),
        Image,
        Table.configure({ resizable: true }),
        TableRow,
        TableCell,
        TableHeader,
        CodeBlockLowlight.configure({
          lowlight,
        }).extend({
          addNodeView() {
            return ReactNodeViewRenderer(CodeBlockView);
          },
        }),
        CommentMark,
        SlashCommands,
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
        FindReplaceExtension,
        FocusMode,
        Frontmatter,
        WikiLink,
        SpellCheck,
        MarkdownLinkInput,
        LinkReveal,
      ],
      content: initialContent
        ? parseMarkdown(initialContent)
        : {
            type: "doc",
            content: [
              {
                type: "heading",
                attrs: { level: 1 },
                content: [{ type: "text", text: "Welcome to Gutter" }],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "A local-first WYSIWYG markdown editor with ",
                  },
                  {
                    type: "text",
                    text: "first-class commenting",
                    marks: [{ type: "bold" }],
                  },
                  { type: "text", text: "." },
                ],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: 'Type "/" for commands, or open a file with Cmd+O.',
                  },
                ],
              },
            ],
          },
      onUpdate: ({ editor: e }) => {
        const json = e.getJSON();
        const md = serializeMarkdown(json);
        setDirty(true);
        onUpdate?.(md);

        const text = e.state.doc.textContent;
        const words = text.split(/\s+/).filter(Boolean).length;
        setWordCount(words);
        setUndoRedo(e.can().undo(), e.can().redo());
      },
      onSelectionUpdate: ({ editor: e }) => {
        const { from } = e.state.selection;
        const resolved = e.state.doc.resolve(from);
        let line = 1;
        e.state.doc.nodesBetween(0, from, (node, pos) => {
          if (node.isBlock && pos < from) {
            line++;
          }
        });
        const col = from - resolved.start() + 1;
        setCursorPosition(line, col);

        const marks = resolved.marks();
        const commentMark = marks.find((m) => m.type.name === "commentMark");
        if (commentMark) {
          setActiveCommentId(commentMark.attrs.commentId);
        }
      },
      editorProps: {
        handlePaste: (_view, event) => {
          const items = event.clipboardData?.items;
          if (!items) return false;
          for (const item of Array.from(items)) {
            if (item.type.startsWith("image/")) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) handleImageInsert(file);
              return true;
            }
          }
          return false;
        },
        handleDrop: (_view, event) => {
          const files = event.dataTransfer?.files;
          if (!files || files.length === 0) return false;
          for (const file of Array.from(files)) {
            if (file.type.startsWith("image/")) {
              event.preventDefault();
              handleImageInsert(file);
              return true;
            }
          }
          return false;
        },
        handleKeyDown: (_view, event) => {
          if (event.metaKey && event.key === "e") {
            event.preventDefault();
            editor?.chain().focus().toggleCode().run();
            return true;
          }
          if (event.metaKey && event.key === "k") {
            event.preventDefault();
            const url = window.prompt("Link URL:");
            if (url) {
              editor?.chain().focus().setLink({ href: url }).run();
            }
            return true;
          }
          return false;
        },
        handleClick: (_view, _pos, event) => {
          const target = event.target as HTMLElement;

          // Handle link clicks — Cmd/Ctrl+click opens, regular click places cursor (triggers LinkReveal)
          const link = target.closest("a[href]");
          if (link && (event.metaKey || event.ctrlKey)) {
            const href = link.getAttribute("href");
            if (href) {
              event.preventDefault();
              const isExternal = /^https?:\/\//.test(href);
              if (!isExternal && (href.endsWith(".md") || !href.includes("."))) {
                window.dispatchEvent(
                  new CustomEvent("internal-link-click", { detail: { href } }),
                );
              } else if (isExternal) {
                invoke("open_url", { url: href }).catch(() =>
                  window.open(href, "_blank"),
                );
              }
              return true;
            }
          }

          // Handle comment mark clicks
          const mark = target.closest("mark[data-comment-id]");
          if (mark) {
            const commentId = mark.getAttribute("data-comment-id");
            if (commentId) {
              setActiveCommentId(commentId);
            }
          }
          return false;
        },
      },
    });

    // Keep ref in sync
    useEffect(() => {
      editorRef.current = editor;
    }, [editor]);

    // Right-click context menu
    const handleContextMenu = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        if (!editor) return;

        const { from, to } = editor.state.selection;
        const hasSelection = from !== to;

        const items: ContextMenuItem[] = [];

        // Formatting options
        items.push(
          {
            label: "Bold",
            icon: "B",
            shortcut: "Cmd+B",
            action: () => editor.chain().focus().toggleBold().run(),
          },
          {
            label: "Italic",
            icon: "I",
            shortcut: "Cmd+I",
            action: () => editor.chain().focus().toggleItalic().run(),
          },
          {
            label: "Strikethrough",
            icon: "S",
            shortcut: "Cmd+Shift+X",
            action: () => editor.chain().focus().toggleStrike().run(),
          },
          {
            label: "Code",
            icon: "<>",
            shortcut: "Cmd+E",
            action: () => editor.chain().focus().toggleCode().run(),
          },
          { label: "", action: () => {}, separator: true },
        );

        // Link
        items.push({
          label: "Add Link",
          icon: "🔗",
          shortcut: "Cmd+K",
          action: () => {
            const url = window.prompt("Link URL:");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          },
        });

        // Comment (only if text selected)
        if (hasSelection) {
          items.push({
            label: "Add Comment",
            icon: "💬",
            shortcut: "Cmd+Shift+M",
            action: () => createComment(),
          });
        }

        items.push(
          { label: "", action: () => {}, separator: true },
          {
            label: "Heading 1",
            action: () =>
              editor.chain().focus().setHeading({ level: 1 }).run(),
          },
          {
            label: "Heading 2",
            action: () =>
              editor.chain().focus().setHeading({ level: 2 }).run(),
          },
          {
            label: "Heading 3",
            action: () =>
              editor.chain().focus().setHeading({ level: 3 }).run(),
          },
          { label: "", action: () => {}, separator: true },
          {
            label: "Bullet List",
            action: () => editor.chain().focus().toggleBulletList().run(),
          },
          {
            label: "Numbered List",
            action: () => editor.chain().focus().toggleOrderedList().run(),
          },
          {
            label: "Blockquote",
            action: () => editor.chain().focus().toggleBlockquote().run(),
          },
          {
            label: "Code Block",
            action: () => editor.chain().focus().toggleCodeBlock().run(),
          },
          {
            label: "Horizontal Rule",
            action: () => editor.chain().focus().setHorizontalRule().run(),
          },
        );

        setContextMenu({ x: e.clientX, y: e.clientY, items });
      },
      [editor],
    );

    // Create comment with floating UI
    const createComment = useCallback(() => {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      if (from === to) return;

      const commentId = getNextCommentId();
      const selectedText = editor.state.doc.textBetween(from, to);

      editor
        .chain()
        .focus()
        .setMark("commentMark", { commentId })
        .run();

      // Get cursor position for floating bar
      const coords = editor.view.coordsAtPos(to);
      setCommentCreation({
        commentId,
        selectedText,
        x: coords.left,
        y: coords.bottom + 8,
      });
    }, [editor, getNextCommentId]);

    // Handle comment submission
    const handleCommentSubmit = useCallback(
      (body: string) => {
        if (!commentCreation) return;
        if (body.trim()) {
          addThread(commentCreation.commentId, "User", body.trim());
          setActiveCommentId(commentCreation.commentId);
        } else {
          // Cancel — remove the mark
          if (editor) {
            editor.chain().focus().unsetMark("commentMark").run();
          }
        }
        setCommentCreation(null);
      },
      [commentCreation, addThread, setActiveCommentId, editor],
    );

    const handleCommentCancel = useCallback(() => {
      if (editor && commentCreation) {
        editor.chain().focus().unsetMark("commentMark").run();
      }
      setCommentCreation(null);
    }, [editor, commentCreation]);

    // Focus comment input when it appears
    useEffect(() => {
      if (commentCreation && commentInputRef.current) {
        commentInputRef.current.focus();
      }
    }, [commentCreation]);

    // Navigate comments
    const navigateComment = useCallback(
      (direction: "next" | "prev") => {
        if (!editor) return;
        const commentIds: string[] = [];
        editor.state.doc.descendants((node) => {
          node.marks.forEach((mark) => {
            if (
              mark.type.name === "commentMark" &&
              !commentIds.includes(mark.attrs.commentId)
            ) {
              commentIds.push(mark.attrs.commentId);
            }
          });
        });

        if (commentIds.length === 0) return;
        const activeId = useEditorStore.getState().activeCommentId;
        const currentIdx = activeId ? commentIds.indexOf(activeId) : -1;
        let nextIdx: number;
        if (direction === "next") {
          nextIdx = currentIdx < commentIds.length - 1 ? currentIdx + 1 : 0;
        } else {
          nextIdx = currentIdx > 0 ? currentIdx - 1 : commentIds.length - 1;
        }
        setActiveCommentId(commentIds[nextIdx]);
      },
      [editor, setActiveCommentId],
    );

    const getMarkdown = useCallback((): string => {
      if (!editor) return "";
      return serializeMarkdown(editor.getJSON());
    }, [editor]);

    const getEditor = useCallback(() => editor, [editor]);

    useImperativeHandle(
      ref,
      () => ({ createComment, navigateComment, getMarkdown, getEditor }),
      [createComment, navigateComment, getMarkdown, getEditor],
    );

    // Load content when initialContent changes
    useEffect(() => {
      if (initialContent !== undefined && editor) {
        const doc = parseMarkdown(initialContent);
        editor.commands.setContent(doc);
        setDirty(false);

        const text = editor.state.doc.textContent;
        const words = text.split(/\s+/).filter(Boolean).length;
        setWordCount(words);
      }
    }, [initialContent, editor, setDirty, setWordCount]);

    return (
      <div className="h-full overflow-auto" onContextMenu={handleContextMenu}>
        <EditorContent editor={editor} className="h-full" />

        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={contextMenu.items}
            onClose={() => setContextMenu(null)}
          />
        )}

        {commentCreation && (
          <div
            className="comment-creation-bar"
            style={{ left: commentCreation.x, top: commentCreation.y }}
          >
            <div className="quoted-text">
              "{commentCreation.selectedText.slice(0, 80)}
              {commentCreation.selectedText.length > 80 ? "..." : ""}"
            </div>
            <textarea
              ref={commentInputRef}
              rows={2}
              placeholder="Add a comment..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleCommentSubmit(
                    (e.target as HTMLTextAreaElement).value,
                  );
                }
                if (e.key === "Escape") {
                  handleCommentCancel();
                }
              }}
            />
            <div className="actions">
              <button className="btn btn-cancel" onClick={handleCommentCancel}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (commentInputRef.current) {
                    handleCommentSubmit(commentInputRef.current.value);
                  }
                }}
              >
                Comment
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
);
