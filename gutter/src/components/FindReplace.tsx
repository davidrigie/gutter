import { useState, useCallback, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { useEditorStore } from "../stores/editorStore";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { TextSelection } from "@tiptap/pm/state";

const findReplacePluginKey = new PluginKey("findReplace");

interface FindReplaceState {
  searchTerm: string;
  matchCase: boolean;
  useRegex: boolean;
  matches: { from: number; to: number }[];
  currentMatchIndex: number;
}

export function createFindReplacePlugin() {
  return new Plugin<FindReplaceState>({
    key: findReplacePluginKey,
    state: {
      init() {
        return {
          searchTerm: "",
          matchCase: false,
          useRegex: false,
          matches: [],
          currentMatchIndex: -1,
        };
      },
      apply(tr, prev) {
        const meta = tr.getMeta(findReplacePluginKey);
        if (meta) {
          return { ...prev, ...meta };
        }
        if (tr.docChanged && prev.searchTerm) {
          const matches = findMatches(tr.doc, prev.searchTerm, prev.matchCase, prev.useRegex);
          const currentMatchIndex = matches.length > 0
            ? Math.min(prev.currentMatchIndex, matches.length - 1)
            : -1;
          return { ...prev, matches, currentMatchIndex };
        }
        return prev;
      },
    },
    props: {
      decorations(state) {
        const pluginState = findReplacePluginKey.getState(state) as FindReplaceState | undefined;
        if (!pluginState || pluginState.matches.length === 0) {
          return DecorationSet.empty;
        }
        const decorations = pluginState.matches.map((m, i) => {
          const className =
            i === pluginState.currentMatchIndex
              ? "find-match find-match-current"
              : "find-match";
          return Decoration.inline(m.from, m.to, { class: className });
        });
        return DecorationSet.create(state.doc, decorations);
      },
    },
  });
}

function findMatches(
  doc: import("@tiptap/pm/model").Node,
  searchTerm: string,
  matchCase: boolean,
  useRegex: boolean,
): { from: number; to: number }[] {
  if (!searchTerm) return [];
  const results: { from: number; to: number }[] = [];

  try {
    let regex: RegExp;
    if (useRegex) {
      regex = new RegExp(searchTerm, matchCase ? "g" : "gi");
    } else {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      regex = new RegExp(escaped, matchCase ? "g" : "gi");
    }

    // Walk each block node and search its text content with correct positions
    doc.descendants((node, pos) => {
      if (!node.isTextblock) return;
      // Collect text segments with their positions within this block
      const segments: { text: string; pos: number }[] = [];
      node.forEach((child, childOffset) => {
        if (child.isText && child.text) {
          segments.push({ text: child.text, pos: pos + 1 + childOffset });
        }
      });

      // Build the block's full text and a position map
      let blockText = "";
      const posMap: number[] = []; // posMap[stringIndex] = prosemirror position
      for (const seg of segments) {
        for (let i = 0; i < seg.text.length; i++) {
          posMap.push(seg.pos + i);
          blockText += seg.text[i];
        }
      }

      // Run regex on this block's text
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(blockText)) !== null) {
        if (match[0].length === 0) { regex.lastIndex++; continue; }
        const from = posMap[match.index];
        const to = posMap[match.index + match[0].length - 1] + 1;
        results.push({ from, to });
      }

      return false; // don't descend into inline nodes
    });
  } catch {
    // Invalid regex, return empty
  }
  return results;
}

/** Scroll a ProseMirror match into view reliably */
function scrollToMatch(editor: Editor, pos: number) {
  // Set selection and scroll in one transaction
  const tr = editor.state.tr.setSelection(
    TextSelection.create(editor.state.doc, pos)
  ).scrollIntoView();
  editor.view.dispatch(tr);

  // DOM fallback: ensure the match highlight is visible in the scroll container
  requestAnimationFrame(() => {
    const el = editor.view.dom.querySelector(".find-match-current");
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  });
}

// ── Source mode helpers ──

function findTextMatches(
  text: string,
  searchTerm: string,
  matchCase: boolean,
  useRegex: boolean,
): { start: number; end: number }[] {
  if (!searchTerm) return [];
  const results: { start: number; end: number }[] = [];
  try {
    let regex: RegExp;
    if (useRegex) {
      regex = new RegExp(searchTerm, matchCase ? "g" : "gi");
    } else {
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      regex = new RegExp(escaped, matchCase ? "g" : "gi");
    }
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match[0].length === 0) { regex.lastIndex++; continue; }
      results.push({ start: match.index, end: match.index + match[0].length });
    }
  } catch {
    // Invalid regex
  }
  return results;
}

// ── Component ──

interface FindReplaceProps {
  editor: Editor | null;
  mode: "find" | "replace";
  onClose: () => void;
  /** Source mode: textarea ref for plain-text search */
  sourceTextarea?: React.RefObject<HTMLTextAreaElement | null>;
  onSourceReplace?: (from: number, to: number, replacement: string) => void;
  onSourceMatchesChange?: (matches: { start: number; end: number }[], currentIndex: number) => void;
}

export function FindReplace({ editor, mode: initialMode, onClose, sourceTextarea, onSourceReplace, onSourceMatchesChange }: FindReplaceProps) {
  const sourceContent = useEditorStore(s => sourceTextarea ? s.content : undefined);
  const isSourceMode = !!sourceTextarea;
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [showReplace, setShowReplace] = useState(initialMode === "replace");
  const [matchCount, setMatchCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sourceMatchesRef = useRef<{ start: number; end: number }[]>([]);

  useEffect(() => {
    setShowReplace(initialMode === "replace");
  }, [initialMode]);

  useEffect(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  // ── Source mode search ──
  const updateSourceSearch = useCallback(
    (term: string, caseSensitive: boolean, regex: boolean) => {
      const ta = sourceTextarea?.current;
      if (!ta || sourceContent === undefined) {
        onSourceMatchesChange?.([], -1);
        return;
      }
      const matches = findTextMatches(sourceContent, term, caseSensitive, regex);
      sourceMatchesRef.current = matches;
      const index = matches.length > 0 ? 0 : -1;
      setMatchCount(matches.length);
      setCurrentIndex(index);
      onSourceMatchesChange?.(matches, index);

      // Scroll to first match but don't steal focus from search input
      if (matches.length > 0 && index >= 0) {
        const linesBefore = sourceContent.substring(0, matches[index].start).split("\n").length;
        const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 20;
        ta.scrollTop = Math.max(0, (linesBefore - 3) * lineHeight);
      }
    },
    [sourceTextarea, sourceContent, onSourceMatchesChange],
  );

  const navigateSourceMatch = useCallback(
    (direction: "next" | "prev") => {
      const ta = sourceTextarea?.current;
      const matches = sourceMatchesRef.current;
      if (!ta || matches.length === 0) return;
      let newIndex: number;
      if (direction === "next") {
        newIndex = currentIndex < matches.length - 1 ? currentIndex + 1 : 0;
      } else {
        newIndex = currentIndex > 0 ? currentIndex - 1 : matches.length - 1;
      }
      setCurrentIndex(newIndex);
      onSourceMatchesChange?.(matches, newIndex);

      // Scroll to the match without stealing focus from the search input
      const content = sourceContent || "";
      const linesBefore = content.substring(0, matches[newIndex].start).split("\n").length;
      const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 20;
      ta.scrollTop = Math.max(0, (linesBefore - 3) * lineHeight);
    },
    [sourceTextarea, sourceContent, currentIndex, onSourceMatchesChange],
  );

  // ── WYSIWYG mode search ──
  const updateSearch = useCallback(
    (term: string, caseSensitive: boolean, regex: boolean) => {
      if (!editor) return;
      const doc = editor.state.doc;
      const matches = findMatches(doc, term, caseSensitive, regex);
      const index = matches.length > 0 ? 0 : -1;
      setMatchCount(matches.length);
      setCurrentIndex(index);

      const tr = editor.state.tr.setMeta(findReplacePluginKey, {
        searchTerm: term,
        matchCase: caseSensitive,
        useRegex: regex,
        matches,
        currentMatchIndex: index,
      });
      editor.view.dispatch(tr);

      if (matches.length > 0 && index >= 0) {
        scrollToMatch(editor, matches[index].from);
      }
    },
    [editor],
  );

  const handleSearchChange = useCallback(
    (term: string) => {
      setSearchTerm(term);
      if (isSourceMode) {
        updateSourceSearch(term, matchCase, useRegex);
      } else {
        updateSearch(term, matchCase, useRegex);
      }
    },
    [isSourceMode, matchCase, useRegex, updateSearch, updateSourceSearch],
  );

  const navigateMatch = useCallback(
    (direction: "next" | "prev") => {
      if (isSourceMode) {
        navigateSourceMatch(direction);
        return;
      }
      if (!editor || matchCount === 0) return;
      const pluginState = findReplacePluginKey.getState(editor.state) as FindReplaceState;
      const matches = pluginState.matches;
      let newIndex: number;
      if (direction === "next") {
        newIndex = currentIndex < matches.length - 1 ? currentIndex + 1 : 0;
      } else {
        newIndex = currentIndex > 0 ? currentIndex - 1 : matches.length - 1;
      }
      setCurrentIndex(newIndex);

      const tr = editor.state.tr.setMeta(findReplacePluginKey, {
        currentMatchIndex: newIndex,
      });
      editor.view.dispatch(tr);

      scrollToMatch(editor, matches[newIndex].from);
    },
    [isSourceMode, editor, matchCount, currentIndex, navigateSourceMatch],
  );

  const handleReplace = useCallback(() => {
    if (isSourceMode) {
      const matches = sourceMatchesRef.current;
      if (currentIndex < 0 || !matches[currentIndex] || !onSourceReplace) return;
      const m = matches[currentIndex];
      onSourceReplace(m.start, m.end, replaceTerm);
      // Re-search after a tick (content will have changed)
      setTimeout(() => {
        updateSourceSearch(searchTerm, matchCase, useRegex);
      }, 0);
      return;
    }
    if (!editor || currentIndex < 0) return;
    const pluginState = findReplacePluginKey.getState(editor.state) as FindReplaceState;
    const match = pluginState.matches[currentIndex];
    if (!match) return;

    editor
      .chain()
      .focus()
      .setTextSelection({ from: match.from, to: match.to })
      .insertContent(replaceTerm)
      .run();

    // Re-search after replace
    updateSearch(searchTerm, matchCase, useRegex);
  }, [isSourceMode, editor, currentIndex, replaceTerm, searchTerm, matchCase, useRegex, updateSearch, updateSourceSearch, onSourceReplace]);

  const handleReplaceAll = useCallback(() => {
    if (isSourceMode) {
      const matches = [...sourceMatchesRef.current].reverse();
      if (matches.length === 0 || !onSourceReplace) return;
      for (const m of matches) {
        onSourceReplace(m.start, m.end, replaceTerm);
      }
      setTimeout(() => {
        updateSourceSearch(searchTerm, matchCase, useRegex);
      }, 0);
      return;
    }
    if (!editor || matchCount === 0) return;
    const pluginState = findReplacePluginKey.getState(editor.state) as FindReplaceState;
    const matches = [...pluginState.matches].reverse();

    editor.chain().focus().command(({ tr }) => {
      for (const match of matches) {
        if (replaceTerm) {
          tr.replaceWith(match.from, match.to, editor.schema.text(replaceTerm));
        } else {
          tr.delete(match.from, match.to);
        }
      }
      return true;
    }).run();

    updateSearch(searchTerm, matchCase, useRegex);
  }, [isSourceMode, editor, matchCount, replaceTerm, searchTerm, matchCase, useRegex, updateSearch, updateSourceSearch, onSourceReplace]);

  const handleClose = useCallback(() => {
    if (editor) {
      const tr = editor.state.tr.setMeta(findReplacePluginKey, {
        searchTerm: "",
        matches: [],
        currentMatchIndex: -1,
      });
      editor.view.dispatch(tr);
    }
    onSourceMatchesChange?.([], -1);
    onClose();
  }, [editor, onClose, onSourceMatchesChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        navigateMatch("next");
      } else if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        navigateMatch("prev");
      }
    },
    [handleClose, navigateMatch],
  );

  return (
    <div className="find-replace-bar" onKeyDown={handleKeyDown}>
      <div className="find-replace-row">
        <input
          ref={searchInputRef}
          type="text"
          className="find-replace-input"
          placeholder="Find..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <button
          className={`find-replace-toggle ${matchCase ? "active" : ""}`}
          onClick={() => {
            const next = !matchCase;
            setMatchCase(next);
            if (isSourceMode) {
              updateSourceSearch(searchTerm, next, useRegex);
            } else {
              updateSearch(searchTerm, next, useRegex);
            }
          }}
          title="Match Case"
        >
          Aa
        </button>
        <button
          className={`find-replace-toggle ${useRegex ? "active" : ""}`}
          onClick={() => {
            const next = !useRegex;
            setUseRegex(next);
            if (isSourceMode) {
              updateSourceSearch(searchTerm, matchCase, next);
            } else {
              updateSearch(searchTerm, matchCase, next);
            }
          }}
          title="Use Regex"
        >
          .*
        </button>
        <span className="find-replace-count">
          {matchCount > 0 ? `${currentIndex + 1} of ${matchCount}` : "No results"}
        </span>
        <button className="find-replace-btn" onClick={() => navigateMatch("prev")} title="Previous (Shift+Enter)">
          &uarr;
        </button>
        <button className="find-replace-btn" onClick={() => navigateMatch("next")} title="Next (Enter)">
          &darr;
        </button>
        <button
          className="find-replace-btn"
          onClick={() => setShowReplace(!showReplace)}
          title="Toggle Replace"
        >
          {showReplace ? "−" : "+"}
        </button>
        <button className="find-replace-btn" onClick={handleClose} title="Close (Esc)">
          &times;
        </button>
      </div>
      {showReplace && (
        <div className="find-replace-row">
          <input
            type="text"
            className="find-replace-input"
            placeholder="Replace..."
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
          />
          <button className="find-replace-action" onClick={handleReplace}>
            Replace
          </button>
          <button className="find-replace-action" onClick={handleReplaceAll}>
            All
          </button>
        </div>
      )}
    </div>
  );
}
