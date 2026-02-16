import { useMemo, useCallback, useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
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
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { parseMarkdown } from "./Editor/markdown/parser";
import { useEditorStore } from "../stores/editorStore";
import { parentDir } from "../utils/path";
import { RotateCcw, X, ChevronUp, ChevronDown } from "./Icons";
import "../styles/editor.css";

const lowlight = createLowlight(common);

// --- Comparison Utility ---

/** Serialize a node to a stable string for comparison, ignoring non-visual metadata */
function nodeKey(node: JSONContent): string {
  // Deep clone to avoid mutating original
  const visualNode = JSON.parse(JSON.stringify(node));
  
  // Strip volatile/invisible attributes that trigger "false positive" diffs
  const strip = (n: any) => {
    if (n.attrs) {
      delete n.attrs.id;
      delete n.attrs.commentId;
      delete n.attrs.dataNodeCommentId;
    }
    if (n.content) n.content.forEach(strip);
    if (n.marks) n.marks.forEach((m: any) => {
      if (m.attrs) {
        delete m.attrs.id;
        delete m.attrs.commentId;
      }
    });
  };
  
  strip(visualNode);
  return JSON.stringify(visualNode);
}

type BlockDiff = { type: "equal"; oldIdx: number; newIdx: number }
  | { type: "remove"; oldIdx: number }
  | { type: "add"; newIdx: number };

function diffBlocks(oldBlocks: JSONContent[], newBlocks: JSONContent[]): BlockDiff[] {
  const m = oldBlocks.length;
  const n = newBlocks.length;

  if (m * n > 500_000) {
    return simpleDiffBlocks(oldBlocks, newBlocks);
  }

  const oldKeys = oldBlocks.map(nodeKey);
  const newKeys = newBlocks.map(nodeKey);

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldKeys[i - 1] === newKeys[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
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

function simpleDiffBlocks(oldBlocks: JSONContent[], newBlocks: JSONContent[]): BlockDiff[] {
  const oldKeys = oldBlocks.map(nodeKey);
  const newKeys = newBlocks.map(nodeKey);
  const result: BlockDiff[] = [];
  let prefix = 0;
  while (prefix < oldKeys.length && prefix < newKeys.length && oldKeys[prefix] === newKeys[prefix]) {
    result.push({ type: "equal", oldIdx: prefix, newIdx: prefix });
    prefix++;
  }
  let oldEnd = oldKeys.length - 1;
  let newEnd = newKeys.length - 1;
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

// --- ProseMirror Extension ---

const diffHighlightKey = new PluginKey("diffHighlight");

function createDiffHighlightExtension(changedIndices: Set<number>, activeIndices: Set<number>, cssClass: string) {
  return Extension.create({
    name: `diffHighlight_${cssClass}`,
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: diffHighlightKey,
          props: {
            decorations(state) {
              const decorations: Decoration[] = [];
              let blockIdx = 0;
              state.doc.forEach((node, offset) => {
                const isChanged = changedIndices.has(blockIdx);
                const isActive = activeIndices.has(blockIdx);
                
                if (isChanged || isActive) {
                  let finalClass = isChanged ? cssClass : "";
                  if (isActive) finalClass += " diff-block-active";
                  
                  decorations.push(
                    Decoration.node(offset, offset + node.nodeSize, {
                      class: finalClass.trim(),
                      'data-block-index': blockIdx.toString()
                    })
                  );
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

// --- Diff Stats ---

function lineDiffStats(baseText: string, targetText: string): { added: number; removed: number } {
  const baseLines = baseText.split("\n").filter(l => l.trim().length > 0);
  const targetLines = targetText.split("\n").filter(l => l.trim().length > 0);
  const baseSet = new Set(baseLines);
  const targetSet = new Set(targetLines);
  let removed = 0;
  for (const line of baseLines) if (!targetSet.has(line)) removed++;
  let added = 0;
  for (const line of targetLines) if (!baseSet.has(line)) added++;
  return { added, removed };
}

// --- Side Panel Component ---

interface DiffEditorPanelHandle {
  scrollToIndex: (index: number) => void;
}

const DiffEditorPanel = forwardRef<DiffEditorPanelHandle, {
  doc: JSONContent;
  changedIndices: Set<number>;
  activeIndices: Set<number>;
  cssClass: string;
  headerLabel: string;
  headerClass: string;
}>(({ doc, changedIndices, activeIndices, cssClass, headerLabel, headerClass }, ref) => {
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
    TaskList,
    TaskItem.configure({ nested: true }),
    createDiffHighlightExtension(changedIndices, activeIndices, cssClass),
  ], [changedIndices, activeIndices, cssClass]);

  const editor = useEditor({
    editable: false,
    extensions,
    content: doc,
  });

  // Keep content in sync if doc changes (though it shouldn't in this view)
  useEffect(() => {
    if (editor && doc) editor.commands.setContent(doc);
  }, [editor, doc]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    scrollToIndex: (index: number) => {
      if (!scrollContainerRef.current) return;
      const el = scrollContainerRef.current.querySelector(`[data-block-index="${index}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    }
  }));

  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      <div className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider border-b border-[var(--editor-border)] shrink-0 ${headerClass}`}>
        {headerLabel}
      </div>
      <div className="flex-1 overflow-auto" ref={scrollContainerRef}>
        <div className="version-preview-content p-6">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
});

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

  const { snapshotChanged, editorChanged, stats, changes } = useMemo(() => {
    const snapshotBlocks = snapshotDoc.content || [];
    const editorBlocks = editorDoc.content || [];
    const diff = diffBlocks(snapshotBlocks, editorBlocks);
    
    const changes: { snapshotIndices: number[]; editorIndices: number[] }[] = [];
    let currentChange: { snapshotIndices: number[]; editorIndices: number[] } | null = null;
    
    const snapshotChanged = new Set<number>();
    const editorChanged = new Set<number>();

    for (const d of diff) {
      if (d.type !== "equal") {
        if (!currentChange) {
          currentChange = { snapshotIndices: [], editorIndices: [] };
          changes.push(currentChange);
        }
        if (d.type === "remove") {
          currentChange.snapshotIndices.push(d.oldIdx);
          snapshotChanged.add(d.oldIdx);
        } else {
          currentChange.editorIndices.push(d.newIdx);
          editorChanged.add(d.newIdx);
        }
      } else {
        currentChange = null;
      }
    }

    return {
      snapshotChanged,
      editorChanged,
      stats: lineDiffStats(content, currentContent),
      changes
    };
  }, [snapshotDoc, editorDoc, content, currentContent]);

  const [currentChangeIdx, setCurrentChangeIdx] = useState(0);
  const snapshotPanelRef = useRef<DiffEditorPanelHandle>(null);
  const editorPanelRef = useRef<DiffEditorPanelHandle>(null);
  const isSyncingRef = useRef(false);
  const scrollDriverRef = useRef<HTMLElement | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derive active indices for highlighting
  const activeSnapshotIndices = useMemo(() => {
    if (changes.length === 0) return new Set<number>();
    return new Set(changes[currentChangeIdx].snapshotIndices);
  }, [changes, currentChangeIdx]);

  const activeEditorIndices = useMemo(() => {
    if (changes.length === 0) return new Set<number>();
    return new Set(changes[currentChangeIdx].editorIndices);
  }, [changes, currentChangeIdx]);

  const jumpToChange = useCallback((idx: number) => {
    if (changes.length === 0) return;
    const actualIdx = (idx + changes.length) % changes.length;
    setCurrentChangeIdx(actualIdx);
    const change = changes[actualIdx];
    
    isSyncingRef.current = true;
    if (change.snapshotIndices.length > 0) snapshotPanelRef.current?.scrollToIndex(change.snapshotIndices[0]);
    if (change.editorIndices.length > 0) editorPanelRef.current?.scrollToIndex(change.editorIndices[0]);
    
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => { 
      isSyncingRef.current = false; 
    }, 250);
  }, [changes]);

  useEffect(() => {
    if (changes.length > 0) {
      const timer = setTimeout(() => jumpToChange(0), 300);
      return () => clearTimeout(timer);
    }
  }, [changes, jumpToChange]);

  const isIdentical = changes.length === 0 && stats.added === 0 && stats.removed === 0;

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    if (isSyncingRef.current) return;
    const target = e.target as HTMLElement;
    if (!target.classList.contains('overflow-auto')) return;

    if (scrollDriverRef.current && scrollDriverRef.current !== target) return;
    scrollDriverRef.current = target;

    const container = e.currentTarget as HTMLElement;
    const panes = Array.from(container.querySelectorAll(":scope > div > .overflow-auto")) as HTMLElement[];
    if (panes.length === 2) {
      const other = panes[0] === target ? panes[1] : panes[0];
      
      const targetMax = target.scrollHeight - target.clientHeight;
      const otherMax = other.scrollHeight - other.clientHeight;
      
      if (targetMax > 0 && otherMax > 0) {
        const ratio = target.scrollTop / targetMax;
        const newScrollTop = ratio * otherMax;
        if (Math.abs(other.scrollTop - newScrollTop) > 1) {
          other.scrollTop = newScrollTop;
        }
      }
    }

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      scrollDriverRef.current = null;
    }, 150);
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--editor-bg)]">
      {/* Banner */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-[var(--editor-border)] shrink-0 relative"
        style={{ background: "color-mix(in srgb, var(--accent), transparent 92%)" }}
      >
        {/* Left: Metadata */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[12px] font-medium text-[var(--text-primary)] truncate max-w-[120px]">
            {label}
          </span>
          <div className="hidden sm:flex items-center gap-2 text-[11px] shrink-0 border-l border-[var(--editor-border)] pl-3 ml-1">
            <span className="text-[var(--status-success)] font-medium">+{stats.added}</span>
            <span className="text-[var(--status-error)] font-medium">-{stats.removed}</span>
          </div>
        </div>

        {/* Center: Navigation */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
          {changes.length > 0 && (
            <div className="flex items-center bg-[var(--surface-secondary)] rounded-md border border-[var(--editor-border)] overflow-hidden h-7 shrink-0 pointer-events-auto shadow-sm">
              <button
                onClick={() => jumpToChange(currentChangeIdx - 1)}
                className="px-2 h-full hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors"
                title="Previous change (K)"
              >
                <ChevronUp size={14} />
              </button>
              <div className="px-3 text-[10px] font-bold text-[var(--text-muted)] border-x border-[var(--editor-border)] min-w-[64px] text-center bg-[var(--editor-bg)] flex items-center justify-center">
                {currentChangeIdx + 1} / {changes.length}
              </div>
              <button
                onClick={() => jumpToChange(currentChangeIdx + 1)}
                className="px-2 h-full hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors"
                title="Next change (J)"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          )}
          {isIdentical && (
            <span className="text-[11px] text-[var(--text-muted)] italic pointer-events-auto">No visual changes</span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <button
            onClick={onRestore}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-bold bg-[var(--accent)] text-white hover:opacity-90 transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            <RotateCcw size={14} />
            <span className="hidden md:inline">Restore</span>
          </button>
          <button
            onClick={onDismiss}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors border border-[var(--editor-border)] bg-[var(--editor-bg)] whitespace-nowrap"
          >
            <X size={14} />
            <span className="hidden md:inline">Cancel</span>
          </button>
        </div>
      </div>

      <div
        className="flex-1 flex overflow-hidden outline-none"
        onScrollCapture={handleScroll}
        onKeyDown={(e) => {
          if (e.key === 'j' || e.key === 'n') jumpToChange(currentChangeIdx + 1);
          if (e.key === 'k' || e.key === 'p') jumpToChange(currentChangeIdx - 1);
          if (e.key === 'Escape') onDismiss();
        }}
        tabIndex={0}
      >
        <DiffEditorPanel
          ref={snapshotPanelRef}
          doc={snapshotDoc}
          changedIndices={snapshotChanged}
          activeIndices={activeSnapshotIndices}
          cssClass="diff-block-removed"
          headerLabel="Snapshot"
          headerClass="text-[var(--accent)] bg-[var(--accent-subtle)]"
        />
        <div className="w-px shrink-0 bg-[var(--editor-border)]" />
        <DiffEditorPanel
          ref={editorPanelRef}
          doc={editorDoc}
          changedIndices={editorChanged}
          activeIndices={activeEditorIndices}
          cssClass="diff-block-added"
          headerLabel="Working Copy"
          headerClass="text-[var(--text-secondary)] bg-[var(--surface-secondary)]"
        />
      </div>
    </div>
  );
}
