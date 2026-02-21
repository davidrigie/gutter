import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { modKey, modLabel } from "../../../utils/platform";
import { useTagStore, getAllTags } from "../../../stores/tagStore";
import { BlockActionBar } from "../BlockActionBar";
import { useSyncedNodeState } from "../../../hooks/useSyncedNodeState";

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
  const [editContent, setEditContent] = useSyncedNodeState(node.attrs.content as string, editing);

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
                {key === "tags" && Array.isArray(value)
                  ? <TagAdder
                      tags={value.map(String)}
                      onChange={(newTags) => {
                        const parsed = parseYaml(node.attrs.content as string) || {};
                        const updated = { ...parsed as Record<string, unknown>, tags: newTags };
                        updateAttributes({ content: stringifyYaml(updated).trim() });
                      }}
                    />
                  : Array.isArray(value)
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

function TagAdder({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const tagToFiles = useTagStore((s) => s.tagToFiles);
  const allWorkspaceTags = useMemo(() => getAllTags(tagToFiles), [tagToFiles]);

  const suggestions = inputValue
    ? allWorkspaceTags
        .filter((t) => t.tag.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(t.tag))
        .slice(0, 8)
    : [];

  useEffect(() => {
    setSelectedIdx(0);
  }, [inputValue]);

  const addTag = useCallback((tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue("");
    setShowDropdown(false);
    inputRef.current?.focus();
  }, [tags, onChange]);

  const removeTag = useCallback((tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  }, [tags, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0 && showDropdown) {
        addTag(suggestions[selectedIdx].tag);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    } else if (e.key === "ArrowDown" && showDropdown) {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp" && showDropdown) {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as globalThis.Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="frontmatter-tag-adder" onClick={(e) => e.stopPropagation()}>
      {tags.map((tag) => (
        <span key={tag} className="frontmatter-tag">
          {tag}
          <button
            className="frontmatter-tag-remove"
            onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
          >
            &times;
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        className="frontmatter-tag-input"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => { if (inputValue) setShowDropdown(true); }}
        onKeyDown={handleKeyDown}
        placeholder="Add tag..."
      />
      {showDropdown && suggestions.length > 0 && (
        <div className="frontmatter-tag-dropdown">
          {suggestions.map((s, i) => (
            <button
              key={s.tag}
              className={`frontmatter-tag-dropdown-item ${i === selectedIdx ? "selected" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); addTag(s.tag); }}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <span>#{s.tag}</span>
              <span className="frontmatter-tag-dropdown-count">{s.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
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
