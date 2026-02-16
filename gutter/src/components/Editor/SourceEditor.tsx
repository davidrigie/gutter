import { useRef, useEffect, useCallback, useMemo } from "react";
import { common, createLowlight } from "lowlight";
import { toHtml } from "hast-util-to-html";

const lowlight = createLowlight(common);

export interface SourceSearchMatch {
  start: number;
  end: number;
}

interface SourceEditorProps {
  value: string;
  onChange: (value: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  searchMatches?: SourceSearchMatch[];
  currentMatchIndex?: number;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function SourceEditor({ value, onChange, textareaRef, searchMatches, currentMatchIndex }: SourceEditorProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const taRef = textareaRef || internalRef;
  const preRef = useRef<HTMLPreElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.focus();
    }
  }, [taRef]);

  // Sync scroll between textarea, syntax pre, and highlight overlay
  const handleScroll = useCallback(() => {
    if (taRef.current) {
      if (preRef.current) {
        preRef.current.scrollTop = taRef.current.scrollTop;
        preRef.current.scrollLeft = taRef.current.scrollLeft;
      }
      if (highlightRef.current) {
        highlightRef.current.scrollTop = taRef.current.scrollTop;
        highlightRef.current.scrollLeft = taRef.current.scrollLeft;
      }
    }
  }, [taRef]);

  // Highlight markdown using lowlight
  const highlighted = lowlight.highlight("markdown", value);
  const html = toHtml(highlighted);

  // Build search highlight overlay HTML
  const highlightHtml = useMemo(() => {
    if (!searchMatches || searchMatches.length === 0) return null;
    // Build HTML with transparent text and <mark> tags at match positions
    let result = "";
    let lastEnd = 0;
    for (let i = 0; i < searchMatches.length; i++) {
      const m = searchMatches[i];
      // Text before this match (invisible — just occupies space)
      result += escapeHtml(value.substring(lastEnd, m.start));
      // The match itself
      const cls = i === currentMatchIndex ? "find-match find-match-current" : "find-match";
      result += `<mark class="${cls}">${escapeHtml(value.substring(m.start, m.end))}</mark>`;
      lastEnd = m.end;
    }
    // Remaining text after last match
    result += escapeHtml(value.substring(lastEnd));
    return result + "\n";
  }, [value, searchMatches, currentMatchIndex]);

  return (
    <div className="h-full overflow-hidden relative bg-[var(--editor-bg)]">
      {/* Highlighted underlay */}
      <pre
        ref={preRef}
        className="source-highlight-pre"
        dangerouslySetInnerHTML={{ __html: html + "\n" }}
      />
      {/* Search match highlight overlay */}
      {highlightHtml && (
        <pre
          ref={highlightRef}
          className="source-highlight-pre"
          style={{ color: "transparent", zIndex: 1 }}
          dangerouslySetInnerHTML={{ __html: highlightHtml }}
        />
      )}
      {/* Transparent textarea overlay for editing */}
      <textarea
        ref={taRef as React.RefObject<HTMLTextAreaElement>}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        className="source-textarea-overlay"
        style={highlightHtml ? { zIndex: 2 } : undefined}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
    </div>
  );
}
