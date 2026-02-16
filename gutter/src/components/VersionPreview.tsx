import { useEffect, useMemo } from "react";
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
import { MathBlock, MathBlockView, MathInline, MathInlineView } from "./Editor/extensions/MathBlock";
import { MermaidBlock, MermaidBlockView } from "./Editor/extensions/MermaidBlock";
import { CodeBlockView } from "./Editor/extensions/CodeBlockWithLang";
import { Frontmatter } from "./Editor/extensions/Frontmatter";
import { WikiLink } from "./Editor/extensions/WikiLink";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { parseMarkdown } from "./Editor/markdown/parser";
import { useEditorStore } from "../stores/editorStore";
import { parentDir } from "../utils/path";
import { RotateCcw, X } from "./Icons";
import "../styles/editor.css";

const lowlight = createLowlight(common);

// --- Diff logic ---

type DiffLine =
  | { type: "equal"; text: string }
  | { type: "add"; text: string }
  | { type: "remove"; text: string };

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const m = oldLines.length;
  const n = newLines.length;

  if (oldText === newText) {
    return oldLines.map((l) => ({ type: "equal" as const, text: l }));
  }

  if (m * n > 2_000_000) {
    return simpleDiff(oldLines, newLines);
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({ type: "equal", text: oldLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: "add", text: newLines[j - 1] });
      j--;
    } else {
      result.push({ type: "remove", text: oldLines[i - 1] });
      i--;
    }
  }
  result.reverse();
  return result;
}

function simpleDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  let prefix = 0;
  while (prefix < oldLines.length && prefix < newLines.length && oldLines[prefix] === newLines[prefix]) {
    result.push({ type: "equal", text: oldLines[prefix] });
    prefix++;
  }
  let oldEnd = oldLines.length - 1;
  let newEnd = newLines.length - 1;
  const suffix: DiffLine[] = [];
  while (oldEnd > prefix && newEnd > prefix && oldLines[oldEnd] === newLines[newEnd]) {
    suffix.push({ type: "equal", text: oldLines[oldEnd] });
    oldEnd--; newEnd--;
  }
  for (let i = prefix; i <= oldEnd; i++) result.push({ type: "remove", text: oldLines[i] });
  for (let i = prefix; i <= newEnd; i++) result.push({ type: "add", text: newLines[i] });
  suffix.reverse();
  result.push(...suffix);
  return result;
}

function diffStats(lines: DiffLine[]): { added: number; removed: number } {
  let added = 0, removed = 0;
  for (const l of lines) {
    if (l.type === "add") added++;
    else if (l.type === "remove") removed++;
  }
  return { added, removed };
}

// --- Component ---

interface Props {
  content: string;
  currentContent: string;
  label: string;
  onRestore: () => void;
  onDismiss: () => void;
}

export function VersionPreview({ content, currentContent, label, onRestore, onDismiss }: Props) {
  const filePath = useEditorStore((s) => s.filePath);

  const editor = useEditor({
    editable: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
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
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      CodeBlockLowlight.configure({ lowlight }).extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockView);
        },
      }),
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
    content: parseMarkdown(content, parentDir(filePath || "")),
  });

  useEffect(() => {
    if (editor && content) {
      const doc = parseMarkdown(content, parentDir(filePath || ""));
      editor.commands.setContent(doc);
    }
  }, [content, editor, filePath]);

  const diff = useMemo(() => computeDiff(content, currentContent), [content, currentContent]);
  const stats = useMemo(() => diffStats(diff), [diff]);
  const isIdentical = stats.added === 0 && stats.removed === 0;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--editor-bg)]">
      {/* Version banner */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-[var(--editor-border)] shrink-0"
        style={{ background: "color-mix(in srgb, var(--accent), transparent 92%)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">
            {label}
          </span>
          {!isIdentical && (
            <span className="flex items-center gap-1.5 text-[11px] shrink-0">
              <span className="text-[var(--status-success)] font-medium">+{stats.added}</span>
              <span className="text-[var(--status-error)] font-medium">-{stats.removed}</span>
              <span className="text-[var(--text-muted)]">lines vs current</span>
            </span>
          )}
          {isIdentical && (
            <span className="text-[11px] text-[var(--text-muted)]">identical to current</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRestore}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-[12px] font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
          >
            <RotateCcw size={12} />
            Restore
          </button>
          <button
            onClick={onDismiss}
            className="flex items-center gap-1 px-2 py-1 rounded text-[12px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X size={12} />
            Back to editor
          </button>
        </div>
      </div>

      {/* Rendered content */}
      <div className="flex-1 overflow-auto">
        <div className="version-preview-content mx-auto" style={{ maxWidth: "var(--editor-max-width)", padding: "2rem" }}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
