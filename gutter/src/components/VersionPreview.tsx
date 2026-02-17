import { useMemo, useCallback, useRef, useEffect, useState } from "react";
import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
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
import { CommentMark } from "./Editor/extensions/CommentMark";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { parseMarkdown } from "./Editor/markdown/parser";
import { useEditorStore } from "../stores/editorStore";
import { parentDir } from "../utils/path";
import { RotateCcw, X, ChevronUp, ChevronDown } from "./Icons";
import "../styles/editor.css";

const lowlight = createLowlight(common);

// --- Block diff ---

function nodeKey(node: JSONContent): string {
  const clone = JSON.parse(JSON.stringify(node));
  const strip = (n: JSONContent) => {
    if (n.attrs) {
      const a = n.attrs as Record<string, unknown>;
      delete a.id;
      delete a.commentId;
      delete a.dataNodeCommentId;
    }
    if (n.content) n.content.forEach(strip);
    if (n.marks) n.marks.forEach((m: JSONContent) => {
      if (m.attrs) {
        const a = m.attrs as Record<string, unknown>;
        delete a.id;
        delete a.commentId;
      }
    });
  };
  strip(clone);
  return JSON.stringify(clone);
}

type BlockDiff = { type: "equal"; oldIdx: number; newIdx: number }
  | { type: "remove"; oldIdx: number }
  | { type: "add"; newIdx: number };

function diffBlocks(oldBlocks: JSONContent[], newBlocks: JSONContent[]): BlockDiff[] {
  const m = oldBlocks.length;
  const n = newBlocks.length;
  const oldKeys = oldBlocks.map(nodeKey);
  const newKeys = newBlocks.map(nodeKey);

  if (m * n > 500_000) {
    return simpleDiffBlocks(oldKeys, newKeys);
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldKeys[i - 1] === newKeys[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result: BlockDiff[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldKeys[i - 1] === newKeys[j - 1]) {
      result.push({ type: "equal", oldIdx: i - 1, newIdx: j - 1 });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: "add", newIdx: j - 1 });
      j--;
    } else {
      result.push({ type: "remove", oldIdx: i - 1 });
      i--;
    }
  }
  result.reverse();
  return result;
}

function simpleDiffBlocks(oldKeys: string[], newKeys: string[]): BlockDiff[] {
  const result: BlockDiff[] = [];
  let prefix = 0;
  while (prefix < oldKeys.length && prefix < newKeys.length && oldKeys[prefix] === newKeys[prefix]) {
    result.push({ type: "equal", oldIdx: prefix, newIdx: prefix });
    prefix++;
  }
  let oldEnd = oldKeys.length - 1, newEnd = newKeys.length - 1;
  const suffix: BlockDiff[] = [];
  while (oldEnd > prefix && newEnd > prefix && oldKeys[oldEnd] === newKeys[newEnd]) {
    suffix.push({ type: "equal", oldIdx: oldEnd, newIdx: newEnd });
    oldEnd--; newEnd--;
  }
  for (let k = prefix; k <= oldEnd; k++) result.push({ type: "remove", oldIdx: k });
  for (let k = prefix; k <= newEnd; k++) result.push({ type: "add", newIdx: k });
  suffix.reverse();
  result.push(...suffix);
  return result;
}

// --- Merged doc builder ---
// Interleaves equal/removed/added blocks into one document.
// Removed blocks come from the snapshot, added blocks from working copy.
// Equal blocks use the working copy version.

interface MergedBlock {
  node: JSONContent;
  diffType: "equal" | "removed" | "added";
  /** Index within this merged doc */
  mergedIdx: number;
  /** Which change group this belongs to (-1 for equal) */
  changeGroup: number;
}

function buildMergedDoc(
  snapshotBlocks: JSONContent[],
  editorBlocks: JSONContent[],
  diff: BlockDiff[],
): { doc: JSONContent; merged: MergedBlock[]; changeGroups: number[][] } {
  const merged: MergedBlock[] = [];
  const changeGroups: number[][] = []; // changeGroups[groupIdx] = [mergedIdx, ...]
  let currentGroup = -1;
  let inChange = false;

  for (const d of diff) {
    if (d.type === "equal") {
      inChange = false;
      merged.push({
        node: editorBlocks[d.newIdx],
        diffType: "equal",
        mergedIdx: merged.length,
        changeGroup: -1,
      });
    } else {
      if (!inChange) {
        currentGroup++;
        changeGroups.push([]);
        inChange = true;
      }
      const block = d.type === "remove"
        ? snapshotBlocks[d.oldIdx]
        : editorBlocks[d.newIdx];
      const idx = merged.length;
      changeGroups[currentGroup].push(idx);
      merged.push({
        node: block,
        diffType: d.type === "remove" ? "removed" : "added",
        mergedIdx: idx,
        changeGroup: currentGroup,
      });
    }
  }

  const doc: JSONContent = {
    type: "doc",
    content: merged.map((m) => m.node),
  };

  return { doc, merged, changeGroups };
}

// --- ProseMirror decoration plugin ---

interface DiffDecoState {
  merged: MergedBlock[];
  activeGroup: number;
}

const diffHighlightKey = new PluginKey("diffHighlight");

function createDiffPlugin(stateRef: { current: DiffDecoState }) {
  return Extension.create({
    name: "diffHighlight",
    addProseMirrorPlugins() {
      const ref = stateRef;
      return [
        new Plugin({
          key: diffHighlightKey,
          props: {
            decorations(state) {
              const { merged, activeGroup } = ref.current;
              const decorations: Decoration[] = [];
              let blockIdx = 0;
              state.doc.forEach((node, offset) => {
                if (blockIdx < merged.length) {
                  const m = merged[blockIdx];
                  const isActive = m.changeGroup === activeGroup && activeGroup >= 0;
                  if (m.diffType === "removed") {
                    let cls = "diff-block-removed";
                    if (isActive) cls += " diff-block-active";
                    decorations.push(
                      Decoration.node(offset, offset + node.nodeSize, {
                        class: cls,
                        "data-diff-type": "removed",
                        "data-change-group": String(m.changeGroup),
                      })
                    );
                  } else if (m.diffType === "added") {
                    let cls = "diff-block-added";
                    if (isActive) cls += " diff-block-active";
                    decorations.push(
                      Decoration.node(offset, offset + node.nodeSize, {
                        class: cls,
                        "data-diff-type": "added",
                        "data-change-group": String(m.changeGroup),
                      })
                    );
                  }
                }
                blockIdx++;
              });
              return DecorationSet.create(state.doc, decorations);
            },
          },
        }),
      ];
    },
  });
}

// --- Diff stats ---

function lineDiffStats(a: string, b: string): { added: number; removed: number } {
  if (a === b) return { added: 0, removed: 0 };
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const aMap = new Map<string, number>();
  for (const l of aLines) aMap.set(l, (aMap.get(l) || 0) + 1);
  const bMap = new Map<string, number>();
  for (const l of bLines) bMap.set(l, (bMap.get(l) || 0) + 1);
  let removed = 0;
  for (const [line, count] of aMap) removed += Math.max(0, count - (bMap.get(line) || 0));
  let added = 0;
  for (const [line, count] of bMap) added += Math.max(0, count - (aMap.get(line) || 0));
  return { added, removed };
}

// --- Main component ---

interface Props {
  content: string;
  currentContent: string;
  label: string;
  onRestore: () => void;
  onDismiss: () => void;
}

export function VersionPreview({ content, currentContent, label, onRestore, onDismiss }: Props) {
  const filePath = useEditorStore((s) => s.filePath);
  const dir = parentDir(filePath || "");
  const snapshotDoc = useMemo(() => parseMarkdown(content, dir), [content, dir]);
  const editorDoc = useMemo(() => parseMarkdown(currentContent, dir), [currentContent, dir]);

  const { mergedDoc, merged, changeGroups, stats } = useMemo(() => {
    const snapshotBlocks = snapshotDoc.content || [];
    const editorBlocks = editorDoc.content || [];
    const diff = diffBlocks(snapshotBlocks, editorBlocks);
    const { doc, merged, changeGroups } = buildMergedDoc(snapshotBlocks, editorBlocks, diff);
    return { mergedDoc: doc, merged, changeGroups, stats: lineDiffStats(content, currentContent) };
  }, [snapshotDoc, editorDoc, content, currentContent]);

  const [activeGroup, setActiveGroup] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Mutable ref for decoration plugin
  const decoRef = useRef<DiffDecoState>({ merged, activeGroup: 0 });
  decoRef.current.merged = merged;
  decoRef.current.activeGroup = changeGroups.length > 0 ? activeGroup : -1;

  const extensions = useMemo(() => [
    StarterKit.configure({ codeBlock: false }),
    Underline,
    Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
    Image.extend({ addNodeView() { return ReactNodeViewRenderer(ImageBlockView); } }),
    Table.configure({ resizable: false }),
    TableRow,
    TableCell,
    TableHeader,
    CodeBlockLowlight.configure({ lowlight }).extend({
      addNodeView() { return ReactNodeViewRenderer(CodeBlockView); },
    }),
    MathBlock.extend({ addNodeView() { return ReactNodeViewRenderer(MathBlockView); } }),
    MathInline.extend({ addNodeView() { return ReactNodeViewRenderer(MathInlineView); } }),
    MermaidBlock.extend({ addNodeView() { return ReactNodeViewRenderer(MermaidBlockView); } }),
    Frontmatter,
    WikiLink,
    CommentMark,
    TaskList,
    TaskItem.configure({ nested: true }),
    createDiffPlugin(decoRef),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const editor = useEditor({
    editable: false,
    extensions,
    content: mergedDoc,
  });

  // Update content when diff changes
  useEffect(() => {
    if (editor && mergedDoc) editor.commands.setContent(mergedDoc);
  }, [editor, mergedDoc]);

  const scrollToGroup = useCallback((groupIdx: number) => {
    if (!scrollContainerRef.current || changeGroups.length === 0) return;
    const indices = changeGroups[groupIdx];
    if (!indices || indices.length === 0) return;
    const el = scrollContainerRef.current.querySelector(`[data-change-group="${groupIdx}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [changeGroups]);

  const jumpToChange = useCallback((idx: number) => {
    if (changeGroups.length === 0) return;
    const actual = ((idx % changeGroups.length) + changeGroups.length) % changeGroups.length;
    setActiveGroup(actual);
    decoRef.current.activeGroup = actual;
    // Force decoration re-read
    if (editor) editor.view.dispatch(editor.state.tr);
    scrollToGroup(actual);
  }, [changeGroups, editor, scrollToGroup]);

  // Jump to first change after mount
  useEffect(() => {
    if (changeGroups.length > 0) {
      const t = setTimeout(() => jumpToChange(0), 300);
      return () => clearTimeout(t);
    }
  }, [changeGroups.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const isIdentical = changeGroups.length === 0 && stats.added === 0 && stats.removed === 0;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--editor-bg)]">
      {/* Banner */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-[var(--editor-border)] shrink-0 relative"
        style={{ background: "color-mix(in srgb, var(--accent), transparent 92%)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[12px] font-medium text-[var(--text-primary)] truncate max-w-[200px]">
            {label}
          </span>
          {!isIdentical && (
            <div className="hidden sm:flex items-center gap-2 text-[11px] shrink-0 border-l border-[var(--editor-border)] pl-3 ml-1">
              <span className="text-[var(--status-success)] font-medium">+{stats.added}</span>
              <span className="text-[var(--status-error)] font-medium">-{stats.removed}</span>
            </div>
          )}
        </div>

        {/* Center: change navigation */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {changeGroups.length > 0 && (
            <div className="flex items-center bg-[var(--surface-secondary)] rounded-md border border-[var(--editor-border)] overflow-hidden h-7 pointer-events-auto shadow-sm">
              <button
                onClick={() => jumpToChange(activeGroup - 1)}
                className="px-2 h-full hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors"
                title="Previous change"
              >
                <ChevronUp size={14} />
              </button>
              <div className="px-3 text-[10px] font-bold text-[var(--text-muted)] border-x border-[var(--editor-border)] min-w-[56px] text-center bg-[var(--editor-bg)] flex items-center justify-center">
                {activeGroup + 1} / {changeGroups.length}
              </div>
              <button
                onClick={() => jumpToChange(activeGroup + 1)}
                className="px-2 h-full hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors"
                title="Next change"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          )}
          {isIdentical && (
            <span className="text-[11px] text-[var(--text-muted)] italic pointer-events-auto">No changes</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          <button
            onClick={onRestore}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <RotateCcw size={12} />
            Restore
          </button>
          <button
            onClick={onDismiss}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-[12px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors border border-[var(--editor-border)] bg-[var(--editor-bg)] whitespace-nowrap"
          >
            <X size={12} />
            Cancel
          </button>
        </div>
      </div>

      {/* Inline diff view */}
      <div
        className="flex-1 overflow-auto outline-none"
        ref={scrollContainerRef}
        onKeyDown={(e) => {
          if (e.key === "j" || e.key === "n") jumpToChange(activeGroup + 1);
          if (e.key === "k" || e.key === "p") jumpToChange(activeGroup - 1);
          if (e.key === "Escape") onDismiss();
        }}
        tabIndex={0}
      >
        <div className="version-preview-content p-6">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
