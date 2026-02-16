import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useTagStore, getAllTags } from "../stores/tagStore";
import { useEditorStore } from "../stores/editorStore";
import { TagIcon, X } from "./Icons";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { Editor } from "@tiptap/react";

interface TagBarProps {
  getEditor: () => Editor | null;
  getMarkdown: () => string;
  onContentChange: (markdown: string) => void;
}

export function TagBar({ getEditor, getMarkdown, onContentChange }: TagBarProps) {
  const filePath = useEditorStore((s) => s.filePath);
  const fileToTags = useTagStore((s) => s.fileToTags);
  const tagToFiles = useTagStore((s) => s.tagToFiles);
  const isSourceMode = useEditorStore((s) => s.isSourceMode);

  const fileTags = useMemo(() => {
    if (!filePath) return [];
    const tags = fileToTags.get(filePath);
    return tags ? Array.from(tags) : [];
  }, [filePath, fileToTags]);

  const allWorkspaceTags = useMemo(() => getAllTags(tagToFiles), [tagToFiles]);

  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!inputValue) return [];
    const q = inputValue.toLowerCase();
    return allWorkspaceTags
      .filter((t) => t.tag.toLowerCase().includes(q) && !fileTags.includes(t.tag))
      .slice(0, 8);
  }, [inputValue, allWorkspaceTags, fileTags]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [inputValue]);

  useEffect(() => {
    if (showInput) {
      inputRef.current?.focus();
    }
  }, [showInput]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showInput) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as globalThis.Node)) {
        setShowInput(false);
        setShowDropdown(false);
        setInputValue("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showInput]);

  const updateFrontmatterTags = useCallback((newTags: string[]) => {
    const editor = getEditor();

    // WYSIWYG mode — update the frontmatter node directly
    if (editor && !isSourceMode) {
      let frontmatterPos = -1;
      let frontmatterNode: ReturnType<typeof editor.state.doc.nodeAt> = null;

      editor.state.doc.forEach((node, offset) => {
        if (node.type.name === "frontmatter" && frontmatterPos === -1) {
          frontmatterPos = offset;
          frontmatterNode = node;
        }
      });

      if (frontmatterNode && frontmatterPos >= 0) {
        // Update existing frontmatter
        const content = (frontmatterNode as unknown as { attrs: { content: string } }).attrs.content;
        let parsed: Record<string, unknown> = {};
        try {
          const p = parseYaml(content);
          if (p && typeof p === "object") parsed = p as Record<string, unknown>;
        } catch { /* empty */ }
        parsed.tags = newTags.length > 0 ? newTags : undefined;
        if (newTags.length === 0) delete parsed.tags;
        const newContent = stringifyYaml(parsed).trim();
        const tr = editor.state.tr.setNodeMarkup(frontmatterPos, undefined, { content: newContent });
        editor.view.dispatch(tr);
      } else if (newTags.length > 0) {
        // No frontmatter exists — insert one at the beginning
        const yamlContent = stringifyYaml({ tags: newTags }).trim();
        editor.chain().focus().insertContentAt(0, {
          type: "frontmatter",
          attrs: { content: yamlContent },
        }).run();
      }
      return;
    }

    // Source mode — edit the raw markdown
    const md = getMarkdown();
    const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n?/);

    if (fmMatch) {
      let parsed: Record<string, unknown> = {};
      try {
        const p = parseYaml(fmMatch[1]);
        if (p && typeof p === "object") parsed = p as Record<string, unknown>;
      } catch { /* empty */ }
      parsed.tags = newTags.length > 0 ? newTags : undefined;
      if (newTags.length === 0) delete parsed.tags;
      const newYaml = stringifyYaml(parsed).trim();
      const newMd = `---\n${newYaml}\n---\n${md.slice(fmMatch[0].length)}`;
      onContentChange(newMd);
    } else if (newTags.length > 0) {
      const newYaml = stringifyYaml({ tags: newTags }).trim();
      const newMd = `---\n${newYaml}\n---\n${md}`;
      onContentChange(newMd);
    }
  }, [getEditor, getMarkdown, onContentChange, isSourceMode]);

  const addTag = useCallback((tag: string) => {
    const trimmed = tag.trim().toLowerCase().replace(/\s+/g, "-");
    if (!trimmed || fileTags.includes(trimmed)) return;
    updateFrontmatterTags([...fileTags, trimmed]);
    // Incrementally update tag index
    if (filePath) {
      // Will be picked up on next save, but also update store now for immediate feedback
      const { tagToFiles, fileToTags } = useTagStore.getState();
      const newFileToTags = new Map(fileToTags);
      const newTagToFiles = new Map(tagToFiles);
      const currentTags = new Set(newFileToTags.get(filePath) || []);
      currentTags.add(trimmed);
      newFileToTags.set(filePath, currentTags);
      if (!newTagToFiles.has(trimmed)) newTagToFiles.set(trimmed, new Set());
      newTagToFiles.get(trimmed)!.add(filePath);
      useTagStore.setState({ tagToFiles: newTagToFiles, fileToTags: newFileToTags });
    }
    setInputValue("");
    setShowDropdown(false);
    inputRef.current?.focus();
  }, [fileTags, filePath, updateFrontmatterTags]);

  const removeTag = useCallback((tag: string) => {
    updateFrontmatterTags(fileTags.filter((t) => t !== tag));
    // Update store immediately for feedback
    if (filePath) {
      const { tagToFiles, fileToTags } = useTagStore.getState();
      const newFileToTags = new Map(fileToTags);
      const newTagToFiles = new Map(tagToFiles);
      const currentTags = new Set(newFileToTags.get(filePath) || []);
      currentTags.delete(tag);
      if (currentTags.size > 0) {
        newFileToTags.set(filePath, currentTags);
      } else {
        newFileToTags.delete(filePath);
      }
      const files = newTagToFiles.get(tag);
      if (files) {
        files.delete(filePath);
        if (files.size === 0) newTagToFiles.delete(tag);
      }
      useTagStore.setState({ tagToFiles: newTagToFiles, fileToTags: newFileToTags });
    }
  }, [fileTags, filePath, updateFrontmatterTags]);

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
      setShowInput(false);
      setShowDropdown(false);
      setInputValue("");
    } else if (e.key === "ArrowDown" && showDropdown) {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp" && showDropdown) {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Backspace" && !inputValue && fileTags.length > 0) {
      removeTag(fileTags[fileTags.length - 1]);
    }
  };

  if (!filePath) return null;

  return (
    <div className="tag-bar">
      <TagIcon size={12} className="text-[var(--text-muted)] shrink-0" />
      {fileTags.map((tag) => (
        <span key={tag} className="tag-bar-pill">
          {tag}
          <button
            className="tag-bar-pill-remove"
            onClick={() => removeTag(tag)}
          >
            <X size={9} />
          </button>
        </span>
      ))}
      {showInput ? (
        <div ref={containerRef} className="tag-bar-input-wrap">
          <input
            ref={inputRef}
            className="tag-bar-input"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => { if (inputValue) setShowDropdown(true); }}
            onKeyDown={handleKeyDown}
            placeholder="Tag name..."
          />
          {showDropdown && suggestions.length > 0 && (
            <div className="tag-bar-dropdown">
              {suggestions.map((s, i) => (
                <button
                  key={s.tag}
                  className={`tag-bar-dropdown-item ${i === selectedIdx ? "selected" : ""}`}
                  onMouseDown={(e) => { e.preventDefault(); addTag(s.tag); }}
                  onMouseEnter={() => setSelectedIdx(i)}
                >
                  <span>#{s.tag}</span>
                  <span className="tag-bar-dropdown-count">{s.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          className="tag-bar-add"
          onClick={() => setShowInput(true)}
        >
          + Add tag
        </button>
      )}
    </div>
  );
}
