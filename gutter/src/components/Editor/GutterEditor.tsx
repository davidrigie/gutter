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
import { ImageBlockView } from "./extensions/ImageBlock";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { CommentMark, activeCommentPluginKey } from "./extensions/CommentMark";
import { SlashCommands } from "./extensions/SlashCommands";
import { MathBlock, MathBlockView, MathInline, MathInlineView } from "./extensions/MathBlock";
import { MermaidBlock, MermaidBlockView } from "./extensions/MermaidBlock";
import { CodeBlockView } from "./extensions/CodeBlockWithLang";
import { Extension } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { parseMarkdown } from "./markdown/parser";
import { serializeMarkdown } from "./markdown/serializer";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { useEditorStore } from "../../stores/editorStore";
import { useCommentStore } from "../../stores/commentStore";
import { ContextMenu, type ContextMenuItem } from "../ContextMenu";
import { FocusMode } from "./extensions/FocusMode";
import { Frontmatter } from "./extensions/Frontmatter";
import { WikiLink } from "./extensions/WikiLink";
import { SpellCheck } from "./extensions/SpellCheck";
import { MarkdownLinkInput } from "./extensions/MarkdownLinkInput";
import { LinkReveal } from "./extensions/LinkReveal";
import { WikiLinkAutocomplete } from "./extensions/WikiLinkAutocomplete";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { createFindReplacePlugin } from "../FindReplace";
import { modKey, modLabel } from "../../utils/platform";
import { parentDir, joinPath } from "../../utils/path";
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
      activeCommentId,
      setWordCount,
      setCursorPosition,
      setDirty,
      setActiveCommentId,
      setUndoRedo,
      setCommentTexts,
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

    const extractCommentTexts = useCallback((e: Editor) => {
      const texts: Record<string, string> = {};
      e.state.doc.descendants((node, pos) => {
        // Node-level comments (atom nodes like mermaid, math)
        if (node.type.spec.atom && node.attrs.commentId) {
          const id = node.attrs.commentId;
          if (!texts[id]) {
            if (node.type.name === "mermaidBlock") {
              texts[id] = "[Mermaid diagram]";
            } else if (node.type.name === "mathBlock" || node.type.name === "mathInline") {
              texts[id] = "[Math: " + (node.attrs.latex || "").slice(0, 40) + "]";
            } else {
              texts[id] = "[Block]";
            }
          }
        }
        // Inline mark comments
        node.marks.forEach((mark) => {
          if (mark.type.name === "commentMark") {
            const id = mark.attrs.commentId;
            if (!texts[id]) {
              let text = "";
              const from = pos;
              const end = pos + node.nodeSize;
              e.state.doc.nodesBetween(from, end, (n) => {
                if (n.isText && n.marks.some((m) => m.type.name === "commentMark" && m.attrs.commentId === id)) {
                  text += n.text || "";
                }
              });
              texts[id] = text;
            }
          }
        });
      });
      setCommentTexts(texts);
    }, [setCommentTexts]);

    const [linkEdit, setLinkEdit] = useState<{
      href: string;
      from: number;
      to: number;
      x: number;
      y: number;
    } | null>(null);

    const [tableMenu, setTableMenu] = useState<{
      x: number;
      y: number;
    } | null>(null);

    const linkInputRef = useRef<HTMLInputElement>(null);

    const commentInputRef = useRef<HTMLTextAreaElement>(null);
    const editorRef = useRef<Editor | null>(null);

    const handleImageInsert = useCallback(async (file: File) => {
      const filePath = useEditorStore.getState().filePath;
      if (!filePath) {
        const { addToast } = await import("../../stores/toastStore").then(m => m.useToastStore.getState());
        addToast("Save the file first to insert images", "error");
        return;
      }
      const dirPath = parentDir(filePath);
      const ext = file.name.split(".").pop() || "png";
      const filename = `image-${Date.now()}.${ext}`;
      const buffer = await file.arrayBuffer();
      const data = Array.from(new Uint8Array(buffer));
      try {
        await invoke<string>("save_image", {
          dirPath,
          filename,
          data,
        });
        const absolutePath = joinPath(dirPath, "assets", filename);
        const displaySrc = convertFileSrc(absolutePath);
        editorRef.current?.chain().focus().setImage({ src: displaySrc }).run();
      } catch (e) {
        console.error("Failed to save image:", e);
        const { addToast } = await import("../../stores/toastStore").then(m => m.useToastStore.getState());
        addToast("Failed to save image", "error");
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
        Image.extend({
          addNodeView() {
            return ReactNodeViewRenderer(ImageBlockView);
          },
        }),
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
        WikiLinkAutocomplete,
        TaskList,
        TaskItem.configure({ nested: true }),
      ],
      content: initialContent
        ? parseMarkdown(initialContent, parentDir(useEditorStore.getState().filePath || ""))
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
                    text: `Type "/" for commands, or open a file with ${modLabel()}+O.`,
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
        extractCommentTexts(e);
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

        // Detect if cursor is inside a link mark for floating editor
        const linkMark = marks.find((m) => m.type.name === "link");
        if (linkMark) {
          const href = linkMark.attrs.href;
          // Find link extent
          const parent = resolved.parent;
          const parentStart = resolved.start();
          let linkFrom = -1;
          let linkTo = -1;
          parent.forEach((node, offset) => {
            const nodeStart = parentStart + offset;
            const nodeEnd = nodeStart + node.nodeSize;
            if (node.isText && node.marks.some((m) => m.type.name === "link" && m.attrs.href === href)) {
              if (linkFrom === -1) linkFrom = nodeStart;
              linkTo = nodeEnd;
            }
          });
          if (linkFrom !== -1 && linkTo !== -1) {
            const coords = e.view.coordsAtPos(linkTo);
            setLinkEdit({ href, from: linkFrom, to: linkTo, x: coords.left, y: coords.bottom + 4 });
          }
        } else {
          setLinkEdit(null);
        }

        // Detect if cursor is inside a table for floating table menu
        let inTable = false;
        for (let d = resolved.depth; d > 0; d--) {
          if (resolved.node(d).type.name === "table") {
            inTable = true;
            const tableStart = resolved.start(d);
            const coords = e.view.coordsAtPos(tableStart);
            const editorRect = e.view.dom.getBoundingClientRect();
            setTableMenu({
              x: editorRect.left + editorRect.width / 2,
              y: coords.top - 4,
            });
            break;
          }
        }
        if (!inTable) {
          setTableMenu(null);
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
          // Tab / Shift+Tab navigation inside tables
          if (event.key === "Tab" && editor) {
            const { $anchor } = editor.state.selection;
            let inTable = false;
            for (let d = $anchor.depth; d > 0; d--) {
              const nodeName = $anchor.node(d).type.name;
              if (nodeName === "tableCell" || nodeName === "tableHeader") {
                inTable = true;
                break;
              }
            }
            if (inTable) {
              event.preventDefault();
              if (event.shiftKey) {
                editor.chain().focus().goToPreviousCell().run();
              } else {
                editor.chain().focus().goToNextCell().run();
              }
              return true;
            }
          }
          if (modKey(event) && event.key === "e") {
            event.preventDefault();
            editor?.chain().focus().toggleCode().run();
            return true;
          }
          if (modKey(event) && event.key === "k") {
            event.preventDefault();
            if (editor?.state.selection.empty) {
              // No selection — insert placeholder link
              editor?.chain().focus().insertContent({
                type: "text",
                text: "link text",
                marks: [{ type: "link", attrs: { href: "https://" } }],
              }).run();
              const { to } = editor!.state.selection;
              editor?.commands.setTextSelection({ from: to - 9, to });
            } else {
              // Wrap selection in link — placeholder URL, edit via floating bar
              editor?.chain().focus().setLink({ href: "https://" }).run();
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
        const mod = modLabel();
        items.push(
          {
            label: "Bold",
            icon: "B",
            shortcut: `${mod}+B`,
            action: () => editor.chain().focus().toggleBold().run(),
          },
          {
            label: "Italic",
            icon: "I",
            shortcut: `${mod}+I`,
            action: () => editor.chain().focus().toggleItalic().run(),
          },
          {
            label: "Strikethrough",
            icon: "S",
            shortcut: `${mod}+Shift+X`,
            action: () => editor.chain().focus().toggleStrike().run(),
          },
          {
            label: "Code",
            icon: "<>",
            shortcut: `${mod}+E`,
            action: () => editor.chain().focus().toggleCode().run(),
          },
          { label: "", action: () => {}, separator: true },
        );

        // Link
        items.push({
          label: "Add Link",
          icon: "🔗",
          shortcut: `${mod}+K`,
          action: () => {
            if (editor.state.selection.empty) {
              editor.chain().focus().insertContent({
                type: "text",
                text: "link text",
                marks: [{ type: "link", attrs: { href: "https://" } }],
              }).run();
              const { to } = editor.state.selection;
              editor.commands.setTextSelection({ from: to - 9, to });
            } else {
              editor.chain().focus().setLink({ href: "https://" }).run();
            }
          },
        });

        // Comment (only if text selected)
        if (hasSelection) {
          items.push({
            label: "Add Comment",
            icon: "💬",
            shortcut: `${mod}+Shift+M`,
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
      const selection = editor.state.selection;

      // Handle atom node selections (mermaid, math, etc.)
      if (selection instanceof NodeSelection && selection.node.type.spec.atom) {
        const nodeName = selection.node.type.name;
        const selectedText = nodeName === "mermaidBlock"
          ? "[Mermaid diagram]"
          : nodeName === "mathBlock" || nodeName === "mathInline"
            ? "[Math: " + (selection.node.attrs.latex || "").slice(0, 40) + "]"
            : "[Block]";

        // Set commentId attribute on the node
        editor.chain().focus().updateAttributes(nodeName, { commentId }).run();

        const coords = editor.view.coordsAtPos(to);
        setCommentCreation({
          commentId,
          selectedText,
          x: coords.left,
          y: coords.bottom + 8,
        });
        return;
      }

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

    // Remove a comment — clears either a mark or a node attribute
    const removeCommentFromEditor = useCallback((cId: string) => {
      if (!editor) return;
      // Try removing the mark
      editor.chain().focus().unsetMark("commentMark").run();
      // Also clear any node-level commentId attributes
      editor.state.doc.descendants((node, pos) => {
        if (node.type.spec.atom && node.attrs.commentId === cId) {
          editor.view.dispatch(
            editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, commentId: null }),
          );
        }
      });
    }, [editor]);

    // Handle comment submission
    const handleCommentSubmit = useCallback(
      (body: string) => {
        if (!commentCreation) return;
        if (body.trim()) {
          addThread(commentCreation.commentId, "User", body.trim());
          setActiveCommentId(commentCreation.commentId);
        } else {
          // Cancel — remove the mark or node attribute
          removeCommentFromEditor(commentCreation.commentId);
        }
        setCommentCreation(null);
      },
      [commentCreation, addThread, setActiveCommentId, removeCommentFromEditor],
    );

    const handleCommentCancel = useCallback(() => {
      if (commentCreation) {
        removeCommentFromEditor(commentCreation.commentId);
      }
      setCommentCreation(null);
    }, [commentCreation, removeCommentFromEditor]);

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

    // Drag-to-link: insert wiki link when file is dragged from tree onto editor
    useEffect(() => {
      const handler = (e: Event) => {
        if (!editor) return;
        const { name, clientX, clientY } = (e as CustomEvent).detail;
        const posData = editor.view.posAtCoords({ left: clientX, top: clientY });
        if (!posData) return;
        const linkName = name.replace(/\.md$/, "");
        editor
          .chain()
          .focus()
          .insertContentAt(posData.pos, `[[${linkName}]]`)
          .run();
      };
      window.addEventListener("file-tree-drop-link", handler);
      return () => window.removeEventListener("file-tree-drop-link", handler);
    }, [editor]);

    // Drag-to-image: insert image when image file is dragged from tree onto editor
    useEffect(() => {
      const handler = async (e: Event) => {
        if (!editor) return;
        const { path, clientX, clientY } = (e as CustomEvent).detail;
        const filePath = useEditorStore.getState().filePath;
        if (!filePath) return;
        const dirPath = parentDir(filePath);
                  const ext = path.split(".").pop() || "png";
                  const filename = `image-${Date.now()}.${ext}`;
                            try {
                              await invoke("copy_image", { source: path, dirPath, filename });
                  
                    const absolutePath = joinPath(dirPath, "assets", filename);
                    const displaySrc = convertFileSrc(absolutePath);
        
          const posData = editor.view.posAtCoords({ left: clientX, top: clientY });
          if (posData) {
            editor.chain().focus().insertContentAt(posData.pos, {
              type: "image",
              attrs: { src: displaySrc },
            }).run();
          } else {
            editor.chain().focus().setImage({ src: displaySrc }).run();
          }
        } catch (err) {
          console.error("Failed to insert image:", err);
        }
      };
      window.addEventListener("file-tree-drop-image", handler);
      return () => window.removeEventListener("file-tree-drop-image", handler);
    }, [editor]);

    // Sync active comment ID → ProseMirror decoration plugin
    useEffect(() => {
      if (!editor) return;
      const { tr } = editor.state;
      tr.setMeta(activeCommentPluginKey, activeCommentId ?? null);
      editor.view.dispatch(tr);
    }, [editor, activeCommentId]);

    // Scroll-to-comment: find comment (mark or node attr) in doc, scroll & pulse
    useEffect(() => {
      const handler = (e: Event) => {
        if (!editor) return;
        const { commentId } = (e as CustomEvent).detail;

        // Walk the doc to find the comment — either a mark or a node attribute
        let targetPos = -1;
        let isNodeComment = false;
        editor.state.doc.descendants((node, pos) => {
          if (targetPos !== -1) return false;
          // Check node-level comment (atom nodes like mermaid, math)
          if (node.type.spec.atom && node.attrs.commentId === commentId) {
            targetPos = pos;
            isNodeComment = true;
            return false;
          }
          // Check inline mark comment
          if (node.marks.some((m) => m.type.name === "commentMark" && m.attrs.commentId === commentId)) {
            targetPos = pos;
            return false;
          }
        });
        if (targetPos === -1) return;

        // Scroll to the position
        if (isNodeComment) {
          // For node selections, use NodeSelection
          const tr = editor.state.tr.setSelection(
            NodeSelection.create(editor.state.doc, targetPos),
          );
          editor.view.dispatch(tr.scrollIntoView());
        } else {
          editor.chain().setTextSelection(targetPos).scrollIntoView().run();
        }

        // After DOM settles, find the element and pulse it
        requestAnimationFrame(() => {
          // Try mark first, then node-level comment
          let el = editor.view.dom.querySelector(
            `mark[data-comment-id="${commentId}"]`,
          ) as HTMLElement | null;
          if (!el) {
            el = editor.view.dom.querySelector(
              `[data-node-comment-id="${commentId}"]`,
            ) as HTMLElement | null;
          }
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("comment-pulse");
            setTimeout(() => el!.classList.remove("comment-pulse"), 800);
          }
        });
      };
      window.addEventListener("scroll-to-comment", handler);
      return () => window.removeEventListener("scroll-to-comment", handler);
    }, [editor]);

    // Load content when initialContent changes
    useEffect(() => {
      if (initialContent !== undefined && editor) {
        const doc = parseMarkdown(initialContent, parentDir(useEditorStore.getState().filePath || ""));
        editor.commands.setContent(doc);
        setDirty(false);

        const text = editor.state.doc.textContent;
        const words = text.split(/\s+/).filter(Boolean).length;
        setWordCount(words);
        extractCommentTexts(editor);
      }
    }, [initialContent, editor, setDirty, setWordCount, extractCommentTexts]);

    return (
      <div className="h-full overflow-auto" onContextMenu={handleContextMenu}>
        <EditorContent editor={editor} className="h-full" />

        {linkEdit && (
          <div
            className="fixed z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--editor-border)] bg-[var(--surface-primary)] shadow-lg text-[12px]"
            style={{ left: linkEdit.x, top: linkEdit.y }}
          >
            <input
              ref={linkInputRef}
              className="bg-transparent border border-[var(--editor-border)] rounded px-1.5 py-0.5 text-[var(--text-secondary)] w-[260px] outline-none focus:border-[var(--accent)]"
              defaultValue={linkEdit.href}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const newHref = (e.target as HTMLInputElement).value.trim();
                  if (newHref && newHref !== linkEdit.href && editor) {
                    const { tr } = editor.state;
                    const linkType = editor.state.schema.marks.link;
                    tr.removeMark(linkEdit.from, linkEdit.to, linkType);
                    tr.addMark(linkEdit.from, linkEdit.to, linkType.create({ href: newHref, rel: "noopener noreferrer" }));
                    editor.view.dispatch(tr);
                  }
                  setLinkEdit(null);
                  editor?.commands.focus();
                }
                if (e.key === "Escape") {
                  setLinkEdit(null);
                  editor?.commands.focus();
                }
                e.stopPropagation();
              }}
              onMouseDown={(e) => e.stopPropagation()}
            />
            <button
              className="text-[var(--text-muted)] hover:text-[var(--accent)] px-1"
              title="Open link"
              onClick={() => {
                const href = linkEdit.href;
                if (/^https?:\/\//.test(href)) {
                  invoke("open_url", { url: href }).catch(() => window.open(href, "_blank"));
                }
              }}
            >
              Open
            </button>
            <button
              className="text-[var(--text-muted)] hover:text-red-500 px-1"
              title="Remove link"
              onClick={() => {
                if (editor) {
                  const { tr } = editor.state;
                  tr.removeMark(linkEdit.from, linkEdit.to, editor.state.schema.marks.link);
                  editor.view.dispatch(tr);
                }
                setLinkEdit(null);
                editor?.commands.focus();
              }}
            >
              Remove
            </button>
          </div>
        )}

        {tableMenu && editor && (
          <div
            className="table-menu"
            style={{ left: tableMenu.x, top: tableMenu.y }}
          >
            {/* Add row above: grid with dashed top row + plus */}
            <button className="table-menu-btn" title="Add row above" onClick={() => editor.chain().focus().addRowBefore().run()}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25">
                <rect x="2" y="7" width="12" height="3.5" rx="0.5"/><rect x="2" y="11.5" width="12" height="3.5" rx="0.5"/>
                <line x1="8" y1="1" x2="8" y2="5.5" strokeDasharray="0"/><line x1="5.75" y1="3.25" x2="10.25" y2="3.25"/>
              </svg>
            </button>
            {/* Add row below: grid with dashed bottom row + plus */}
            <button className="table-menu-btn" title="Add row below" onClick={() => editor.chain().focus().addRowAfter().run()}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25">
                <rect x="2" y="1" width="12" height="3.5" rx="0.5"/><rect x="2" y="5.5" width="12" height="3.5" rx="0.5"/>
                <line x1="8" y1="10.5" x2="8" y2="15"/><line x1="5.75" y1="12.75" x2="10.25" y2="12.75"/>
              </svg>
            </button>
            <span className="table-menu-sep" />
            {/* Add column left: grid with plus on left */}
            <button className="table-menu-btn" title="Add column left" onClick={() => editor.chain().focus().addColumnBefore().run()}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25">
                <rect x="7" y="2" width="3.5" height="12" rx="0.5"/><rect x="11.5" y="2" width="3.5" height="12" rx="0.5"/>
                <line x1="1" y1="8" x2="5.5" y2="8"/><line x1="3.25" y1="5.75" x2="3.25" y2="10.25"/>
              </svg>
            </button>
            {/* Add column right: grid with plus on right */}
            <button className="table-menu-btn" title="Add column right" onClick={() => editor.chain().focus().addColumnAfter().run()}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25">
                <rect x="1" y="2" width="3.5" height="12" rx="0.5"/><rect x="5.5" y="2" width="3.5" height="12" rx="0.5"/>
                <line x1="10.5" y1="8" x2="15" y2="8"/><line x1="12.75" y1="5.75" x2="12.75" y2="10.25"/>
              </svg>
            </button>
            <span className="table-menu-sep" />
            {/* Delete row: two rows with strikethrough on one */}
            <button className="table-menu-btn" title="Delete row" onClick={() => editor.chain().focus().deleteRow().run()}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25">
                <rect x="2" y="2" width="12" height="3.5" rx="0.5"/><rect x="2" y="7" width="12" height="3.5" rx="0.5" opacity="0.35"/>
                <line x1="1" y1="8.75" x2="15" y2="8.75" strokeWidth="1.5"/>
                <rect x="2" y="12" width="12" height="3" rx="0.5"/>
              </svg>
            </button>
            {/* Delete column: two cols with strikethrough on one */}
            <button className="table-menu-btn" title="Delete column" onClick={() => editor.chain().focus().deleteColumn().run()}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25">
                <rect x="1" y="2" width="3.5" height="12" rx="0.5"/><rect x="6.25" y="2" width="3.5" height="12" rx="0.5" opacity="0.35"/>
                <line x1="8" y1="1" x2="8" y2="15" strokeWidth="1.5"/>
                <rect x="11.5" y="2" width="3.5" height="12" rx="0.5"/>
              </svg>
            </button>
            <span className="table-menu-sep" />
            {/* Toggle header: grid with filled top row */}
            <button className="table-menu-btn" title="Toggle header row" onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25">
                <rect x="2" y="2" width="12" height="3.5" rx="0.5" fill="currentColor"/>
                <rect x="2" y="7" width="12" height="3.5" rx="0.5"/><rect x="2" y="12" width="12" height="3" rx="0.5"/>
              </svg>
            </button>
            {/* Delete table: trash can */}
            <button className="table-menu-btn table-menu-btn-danger" title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25">
                <path d="M2.5 4.5h11M5.5 4.5V3a1 1 0 011-1h3a1 1 0 011 1v1.5M12.5 4.5l-.75 9a1.5 1.5 0 01-1.5 1.5H5.75a1.5 1.5 0 01-1.5-1.5l-.75-9"/>
              </svg>
            </button>
          </div>
        )}

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
