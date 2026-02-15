import { Node, mergeAttributes, InputRule } from "@tiptap/react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { useState, useRef, useEffect, useMemo } from "react";
import katex from "katex";
import { modLabel } from "../../../utils/platform";
import { BlockActionBar } from "../BlockActionBar";

// ─── Block math: $$...$$ ───

export function MathBlockView({ node, updateAttributes, selected, deleteNode, editor, getPos }: NodeViewProps) {
  const [editing, setEditing] = useState(false);
  const [latex, setLatex] = useState(node.attrs.latex || "");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const renderedHtml = useMemo(() => {
    const src = node.attrs.latex || "";
    if (!src) return "<span class=\"math-placeholder\">Empty equation — double-click to edit</span>";
    try {
      return katex.renderToString(src, {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return `<span class="math-error">Invalid LaTeX: ${src}</span>`;
    }
  }, [node.attrs.latex]);

  const handleSave = () => {
    updateAttributes({ latex });
    setEditing(false);
  };

  return (
    <NodeViewWrapper className={`math-block-wrapper ${selected ? "is-selected" : ""} ${node.attrs.commentId ? "has-comment" : ""}`} data-node-comment-id={node.attrs.commentId || undefined}>
      <BlockActionBar
        onDelete={() => deleteNode()}
        onDuplicate={() => {
          const pos = getPos();
          if (pos == null) return;
          const end = pos + node.nodeSize;
          editor.chain().focus().insertContentAt(end, { type: node.type.name, attrs: { ...node.attrs } }).run();
        }}
      />
      <div contentEditable={false}>
        {editing ? (
          <div className="math-block-editor">
            <div className="math-block-editor-label">LaTeX</div>
            <textarea
              ref={inputRef}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSave();
                }
                if (e.key === "Escape") {
                  setLatex(node.attrs.latex || "");
                  setEditing(false);
                }
              }}
              className="math-block-input"
              rows={3}
              spellCheck={false}
            />
            <div className="math-block-actions">
              <button className="math-block-btn save" onClick={handleSave}>
                Save ({modLabel()}+Enter)
              </button>
              <button
                className="math-block-btn cancel"
                onClick={() => {
                  setLatex(node.attrs.latex || "");
                  setEditing(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            className="math-block-render"
            onDoubleClick={() => setEditing(true)}
            title="Double-click to edit"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
      },
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-comment-id") || null,
        renderHTML: (attributes) => {
          if (!attributes.commentId) return {};
          return { "data-comment-id": attributes.commentId };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="math-block"]',
        getAttrs: (dom) => ({
          latex: (dom as HTMLElement).getAttribute("data-latex") || "",
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "math-block",
        "data-latex": HTMLAttributes.latex,
      }),
    ];
  },

  addProseMirrorPlugins() {
    const mathBlockType = this.type;
    return [
      new Plugin({
        key: new PluginKey("mathBlockTrigger"),
        props: {
          handleKeyDown(view, event) {
            // Detect Enter after typing $$ on an otherwise empty line
            if (event.key !== "Enter") return false;
            const { $from } = view.state.selection;
            const lineText = $from.parent.textContent;
            if (lineText.trim() !== "$$") return false;

            event.preventDefault();
            // Delete the paragraph containing $$, insert a math block
            const start = $from.before();
            const end = $from.after();
            const node = mathBlockType.create({ latex: "" });
            const tr = view.state.tr.replaceWith(start, end, node);
            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },
});

// ─── Inline math: $...$ ───

export function MathInlineView({ node, updateAttributes, selected }: NodeViewProps) {
  const [editing, setEditing] = useState(false);
  const [latex, setLatex] = useState(node.attrs.latex || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const renderedHtml = useMemo(() => {
    const src = node.attrs.latex || "";
    if (!src) return "<span class=\"math-placeholder\">$</span>";
    try {
      return katex.renderToString(src, {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return `<span class="math-error">${src}</span>`;
    }
  }, [node.attrs.latex]);

  const handleSave = () => {
    updateAttributes({ latex });
    setEditing(false);
  };

  if (editing) {
    return (
      <NodeViewWrapper as="span" className="math-inline-wrapper editing">
        <span contentEditable={false}>
          <span className="math-inline-dollar">$</span>
          <input
            ref={inputRef}
            className="math-inline-input"
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                e.preventDefault();
                if (e.key === "Enter") handleSave();
                else {
                  setLatex(node.attrs.latex || "");
                  setEditing(false);
                }
              }
            }}
            onBlur={handleSave}
          />
          <span className="math-inline-dollar">$</span>
        </span>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as="span"
      className={`math-inline-wrapper ${selected ? "is-selected" : ""} ${node.attrs.commentId ? "has-comment" : ""}`}
      data-node-comment-id={node.attrs.commentId || undefined}
    >
      <span
        contentEditable={false}
        className="math-inline-render"
        onDoubleClick={() => setEditing(true)}
        title="Double-click to edit"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    </NodeViewWrapper>
  );
}

export const MathInline = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
      },
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-comment-id") || null,
        renderHTML: (attributes) => {
          if (!attributes.commentId) return {};
          return { "data-comment-id": attributes.commentId };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="math-inline"]',
        getAttrs: (dom) => ({
          latex: (dom as HTMLElement).getAttribute("data-latex") || "",
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "math-inline",
        "data-latex": HTMLAttributes.latex,
      }),
    ];
  },

  addInputRules() {
    return [
      // Type $latex$ then space to create inline math
      new InputRule({
        find: /(?:^|\s)\$([^$\s][^$]*)\$\s$/,
        handler: ({ state, range, match }) => {
          const latex = (match[1] || "").trim();
          // Keep leading space if present
          const hasLeadingSpace = match[0].startsWith(" ");
          const from = hasLeadingSpace ? range.from + 1 : range.from;
          const node = this.type.create({ latex });
          const tr = state.tr;
          tr.replaceWith(from, range.to, [node, state.schema.text(" ")]);
        },
      }),
    ];
  },
});
