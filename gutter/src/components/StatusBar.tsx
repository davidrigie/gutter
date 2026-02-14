import { useEditorStore } from "../stores/editorStore";
import { Circle } from "./Icons";

export function StatusBar() {
  const {
    wordCount,
    cursorPosition,
    filePath,
    isDirty,
    isSourceMode,
    fileName,
  } = useEditorStore();

  return (
    <div className="h-8 flex items-center px-3 border-t border-[var(--editor-border)] bg-[var(--surface-secondary)] text-[var(--text-tertiary)] select-none shrink-0 gap-3 text-[13px]">
      <span className="truncate max-w-xs font-medium" title={filePath || undefined}>
        {filePath || fileName}
      </span>

      <span className="text-[var(--editor-border)]">|</span>

      <span className="flex items-center gap-1.5">
        <Circle
          size={7}
          className={isDirty ? "text-amber-500" : "text-green-500"}
        />
        <span>{isDirty ? "Unsaved" : "Saved"}</span>
      </span>

      <span className="text-[var(--editor-border)]">|</span>

      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[var(--surface-active)] text-[var(--text-secondary)] text-[11px] font-medium">
        {isSourceMode ? "Source" : "WYSIWYG"}
      </span>

      <span className="ml-auto text-[var(--text-muted)]">
        Ln {cursorPosition.line}, Col {cursorPosition.col}
      </span>

      <span className="text-[var(--editor-border)]">|</span>

      <span className="text-[var(--text-muted)]">
        {wordCount} words
      </span>
    </div>
  );
}
