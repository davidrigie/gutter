import { useEditorStore } from "../stores/editorStore";
import { modLabel } from "../utils/platform";
import { MessageSquare, SidebarIcon, OutlineIcon } from "./Icons";

export function StatusBar() {
  const wordCount = useEditorStore((s) => s.wordCount);
  const cursorPosition = useEditorStore((s) => s.cursorPosition);
  const filePath = useEditorStore((s) => s.filePath);
  const isDirty = useEditorStore((s) => s.isDirty);
  const isSourceMode = useEditorStore((s) => s.isSourceMode);
  const fileName = useEditorStore((s) => s.fileName);
  const showFileTree = useEditorStore((s) => s.showFileTree);
  const showComments = useEditorStore((s) => s.showComments);
  const showOutline = useEditorStore((s) => s.showOutline);
  const toggleFileTree = useEditorStore((s) => s.toggleFileTree);
  const toggleComments = useEditorStore((s) => s.toggleComments);
  const toggleOutline = useEditorStore((s) => s.toggleOutline);
  const toggleSourceMode = useEditorStore((s) => s.toggleSourceMode);

  return (
    <div
      className="flex items-center px-2 border-t border-[var(--editor-border)] bg-[var(--surface-secondary)] text-[var(--text-muted)] select-none shrink-0 gap-2"
      style={{ height: 26, fontSize: 11 }}
    >
      {/* Panel toggle buttons */}
      <button
        onClick={toggleFileTree}
        className={`p-0.5 rounded transition-colors ${
          showFileTree
            ? "text-[var(--accent)] bg-[var(--accent-subtle)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
        }`}
        title={showFileTree ? `Hide file tree (${modLabel()}+\\)` : `Show file tree (${modLabel()}+\\)`}
      >
        <SidebarIcon size={13} />
      </button>

      <button
        onClick={toggleOutline}
        className={`p-0.5 rounded transition-colors ${
          showOutline
            ? "text-[var(--accent)] bg-[var(--accent-subtle)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
        }`}
        title={showOutline ? "Hide outline" : "Show outline"}
      >
        <OutlineIcon size={13} />
      </button>

      <span className="truncate max-w-xs" title={filePath || undefined}>
        {filePath || fileName}
      </span>

      <span className={isDirty ? "text-[var(--text-muted)]" : "text-[var(--status-success)]"}>
        {isDirty ? "Edited" : "Saved"}
      </span>

      <button
        onClick={toggleSourceMode}
        className="px-1.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--text-secondary)] font-medium hover:text-[var(--text-primary)] transition-colors"
        title={`Toggle source mode (${modLabel()}+/)`}
        style={{ fontSize: 10 }}
      >
        {isSourceMode ? "Source" : "WYSIWYG"}
      </button>

      <span className="ml-auto">
        Ln {cursorPosition.line}, Col {cursorPosition.col}
      </span>

      <span>
        {wordCount} words
      </span>

      {/* Comments panel toggle */}
      <button
        onClick={toggleComments}
        className={`p-0.5 rounded transition-colors ${
          showComments
            ? "text-[var(--accent)] bg-[var(--accent-subtle)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
        }`}
        title={showComments ? `Hide comments (${modLabel()}+Shift+C)` : `Show comments (${modLabel()}+Shift+C)`}
      >
        <MessageSquare size={13} />
      </button>
    </div>
  );
}
