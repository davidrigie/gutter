import { useState, useCallback, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

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
  doc: { textBetween: (from: number, to: number) => string; content: { size: number } },
  searchTerm: string,
  matchCase: boolean,
  useRegex: boolean,
): { from: number; to: number }[] {
  if (!searchTerm) return [];
  const text = doc.textBetween(0, doc.content.size);
  const results: { from: number; to: number }[] = [];

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
      results.push({ from: match.index + 1, to: match.index + match[0].length + 1 });
      if (match[0].length === 0) regex.lastIndex++;
    }
  } catch {
    // Invalid regex, return empty
  }
  return results;
}

interface FindReplaceProps {
  editor: Editor | null;
  mode: "find" | "replace";
  onClose: () => void;
}

export function FindReplace({ editor, mode: initialMode, onClose }: FindReplaceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [showReplace, setShowReplace] = useState(initialMode === "replace");
  const [matchCount, setMatchCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShowReplace(initialMode === "replace");
  }, [initialMode]);

  useEffect(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

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
        editor.commands.setTextSelection(matches[index].from);
        editor.commands.scrollIntoView();
      }
    },
    [editor],
  );

  const handleSearchChange = useCallback(
    (term: string) => {
      setSearchTerm(term);
      updateSearch(term, matchCase, useRegex);
    },
    [matchCase, useRegex, updateSearch],
  );

  const navigateMatch = useCallback(
    (direction: "next" | "prev") => {
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

      editor.commands.setTextSelection(matches[newIndex].from);
      editor.commands.scrollIntoView();
    },
    [editor, matchCount, currentIndex],
  );

  const handleReplace = useCallback(() => {
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
  }, [editor, currentIndex, replaceTerm, searchTerm, matchCase, useRegex, updateSearch]);

  const handleReplaceAll = useCallback(() => {
    if (!editor || matchCount === 0) return;
    const pluginState = findReplacePluginKey.getState(editor.state) as FindReplaceState;
    const matches = [...pluginState.matches].reverse();

    editor.chain().focus().command(({ tr }) => {
      for (const match of matches) {
        tr.replaceWith(match.from, match.to, editor.schema.text(replaceTerm));
      }
      return true;
    }).run();

    updateSearch(searchTerm, matchCase, useRegex);
  }, [editor, matchCount, replaceTerm, searchTerm, matchCase, useRegex, updateSearch]);

  const handleClose = useCallback(() => {
    if (editor) {
      const tr = editor.state.tr.setMeta(findReplacePluginKey, {
        searchTerm: "",
        matches: [],
        currentMatchIndex: -1,
      });
      editor.view.dispatch(tr);
    }
    onClose();
  }, [editor, onClose]);

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
            updateSearch(searchTerm, next, useRegex);
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
            updateSearch(searchTerm, matchCase, next);
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
