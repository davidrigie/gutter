import { useRef, useEffect, useCallback } from "react";
import { common, createLowlight } from "lowlight";
import { toHtml } from "hast-util-to-html";

const lowlight = createLowlight(common);

interface SourceEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function SourceEditor({ value, onChange }: SourceEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Sync scroll between textarea and highlighted pre
  const handleScroll = useCallback(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Highlight markdown using lowlight
  const highlighted = lowlight.highlight("markdown", value);
  const html = toHtml(highlighted);

  return (
    <div className="h-full overflow-hidden relative bg-[var(--editor-bg)]">
      {/* Highlighted underlay */}
      <pre
        ref={preRef}
        className="source-highlight-pre"
        dangerouslySetInnerHTML={{ __html: html + "\n" }}
      />
      {/* Transparent textarea overlay for editing */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        className="source-textarea-overlay"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
    </div>
  );
}
