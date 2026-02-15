import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { modKey, modLabel } from "../../../utils/platform";
import { BlockActionBar } from "../BlockActionBar";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    frontmatter: {
      setFrontmatter: (attrs: { content: string }) => ReturnType;
    };
  }
}

export const Frontmatter = Node.create({
  name: "frontmatter",
  group: "block",
  atom: true,
  draggable: false,
  selectable: true,
  isolating: true,

  addAttributes() {
    return {
      content: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="frontmatter"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "frontmatter" }),
    ];
  },

  addCommands() {
    return {
      setFrontmatter:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContentAt(0, {
            type: this.name,
            attrs,
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(FrontmatterView);
  },
});

export function FrontmatterView({ node, updateAttributes, deleteNode, editor, getPos }: NodeViewProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(node.attrs.content as string);

  let fields: Record<string, string> = {};
  try {
    const parsed = parseYaml(node.attrs.content as string);
    if (parsed && typeof parsed === "object") {
      fields = parsed as Record<string, string>;
    }
  } catch {
    // Invalid YAML
  }

  const handleSave = () => {
    updateAttributes({ content: editContent });
    setEditing(false);
  };

  if (editing) {
    return (
      <NodeViewWrapper>
        <div className="frontmatter-block frontmatter-editing">
          <textarea
            className="frontmatter-textarea"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && modKey(e)) {
                e.preventDefault();
                handleSave();
              }
              if (e.key === "Escape") {
                setEditing(false);
                setEditContent(node.attrs.content as string);
              }
            }}
            rows={Math.max(3, editContent.split("\n").length)}
            autoFocus
          />
          <div className="frontmatter-actions">
            <button className="frontmatter-btn" onClick={handleSave}>
              Save ({modLabel()}+Enter)
            </button>
            <button
              className="frontmatter-btn-secondary"
              onClick={() => {
                setEditing(false);
                setEditContent(node.attrs.content as string);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <div
        className="frontmatter-block"
        onDoubleClick={() => setEditing(true)}
      >
        <BlockActionBar
          onDelete={() => deleteNode()}
          onDuplicate={() => {
            const pos = getPos();
            if (pos == null) return;
            const end = pos + node.nodeSize;
            editor.chain().focus().insertContentAt(end, { type: node.type.name, attrs: { ...node.attrs } }).run();
          }}
        />
        <div className="frontmatter-label">Frontmatter</div>
        <div className="frontmatter-fields">
          {Object.entries(fields).map(([key, value]) => (
            <div key={key} className="frontmatter-field">
              <span className="frontmatter-key">{key}</span>
              <span className="frontmatter-value">
                {Array.isArray(value)
                  ? value.map((v, i) => (
                      <span key={i} className="frontmatter-tag">
                        {String(v)}
                      </span>
                    ))
                  : String(value)}
              </span>
            </div>
          ))}
          {Object.keys(fields).length === 0 && (
            <span className="text-[var(--text-muted)] text-[12px]">
              Empty frontmatter (double-click to edit)
            </span>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

// Helper to extract frontmatter from markdown
export function extractFrontmatter(
  md: string,
): { frontmatter: string; body: string } | null {
  const match = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;
  return { frontmatter: match[1], body: match[2] };
}

// Helper to serialize frontmatter back to markdown
export function serializeFrontmatter(yamlContent: string, body: string): string {
  if (!yamlContent.trim()) return body;
  return `---\n${yamlContent}\n---\n${body}`;
}

// Re-export for convenience
export { stringifyYaml };
