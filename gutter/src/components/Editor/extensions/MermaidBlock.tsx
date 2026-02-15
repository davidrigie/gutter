import { Node, mergeAttributes } from "@tiptap/react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { useState, useRef, useEffect, useCallback } from "react";
import mermaid from "mermaid";
import { modLabel } from "../../../utils/platform";
import { BlockActionBar } from "../BlockActionBar";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
});

let mermaidCounter = 0;

export function MermaidBlockView({ node, updateAttributes, selected, deleteNode, editor, getPos }: NodeViewProps) {
  const [editing, setEditing] = useState(!node.attrs.code);
  const [code, setCode] = useState(node.attrs.code || "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const renderDiagram = useCallback(async (source: string) => {
    if (!source.trim()) {
      setSvg("");
      setError("");
      return;
    }
    try {
      const id = `mermaid-${++mermaidCounter}`;
      const { svg: rendered } = await mermaid.render(id, source);
      setSvg(rendered);
      setError("");
    } catch (e) {
      setSvg("");
      setError(e instanceof Error ? e.message : "Invalid diagram");
    }
  }, []);

  useEffect(() => {
    if (!editing && node.attrs.code) {
      renderDiagram(node.attrs.code);
    }
  }, [node.attrs.code, editing, renderDiagram]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (!node.attrs.code) {
        // New block — don't select all
      } else {
        inputRef.current.select();
      }
    }
  }, [editing, node.attrs.code]);

  const handleSave = () => {
    updateAttributes({ code });
    setEditing(false);
  };

  const hasComment = !!node.attrs.commentId;

  return (
    <NodeViewWrapper className={`mermaid-block-wrapper ${selected ? "is-selected" : ""} ${hasComment ? "has-comment" : ""}`} data-node-comment-id={node.attrs.commentId || undefined}>
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
          <div className="mermaid-block-editor">
            <div className="mermaid-block-editor-label">Mermaid</div>
            <textarea
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSave();
                }
                if (e.key === "Escape") {
                  setCode(node.attrs.code || "");
                  setEditing(false);
                }
                if (e.key === "Tab") {
                  e.preventDefault();
                  const textarea = e.target as HTMLTextAreaElement;
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  setCode(code.slice(0, start) + "  " + code.slice(end));
                  setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start + 2;
                  }, 0);
                }
              }}
              className="mermaid-block-input"
              rows={8}
              spellCheck={false}
              placeholder={`graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[OK]\n    B -->|No| D[End]`}
            />
            <div className="mermaid-block-actions">
              <button className="mermaid-block-btn save" onClick={handleSave}>
                Render ({modLabel()}+Enter)
              </button>
              <button
                className="mermaid-block-btn cancel"
                onClick={() => {
                  setCode(node.attrs.code || "");
                  setEditing(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            className="mermaid-block-render"
            onDoubleClick={() => setEditing(true)}
            title="Double-click to edit"
          >
            {error ? (
              <div className="mermaid-block-error">{error}</div>
            ) : svg ? (
              <div dangerouslySetInnerHTML={{ __html: svg }} />
            ) : (
              <div className="mermaid-block-empty">
                Empty diagram — double-click to edit
              </div>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const MermaidBlock = Node.create({
  name: "mermaidBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      code: {
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
        tag: 'div[data-type="mermaid-block"]',
        getAttrs: (dom) => ({
          code: (dom as HTMLElement).getAttribute("data-code") || "",
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "mermaid-block",
        "data-code": HTMLAttributes.code,
      }),
    ];
  },

  addProseMirrorPlugins() {
    const mermaidType = this.type;
    return [
      new Plugin({
        key: new PluginKey("mermaidBlockTrigger"),
        props: {
          handleKeyDown(view, event) {
            // Detect Enter after typing ```mermaid on an empty line
            if (event.key !== "Enter") return false;
            const { $from } = view.state.selection;
            const lineText = $from.parent.textContent.trim();
            if (lineText !== "```mermaid") return false;

            event.preventDefault();
            const start = $from.before();
            const end = $from.after();
            const node = mermaidType.create({ code: "" });
            const tr = view.state.tr.replaceWith(start, end, node);
            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },
});
