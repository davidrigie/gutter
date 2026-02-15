import { useEditorStore } from "../stores/editorStore";
import { modLabel } from "../utils/platform";
import { Circle, MessageSquare, UndoIcon, RedoIcon, SidebarIcon, OutlineIcon } from "./Icons";

function Divider() {
  return (
    <div
      className="w-px h-3.5 shrink-0"
      style={{ background: "var(--editor-border)" }}
    />
  );
}

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
  const canUndo = useEditorStore((s) => s.canUndo);
  const canRedo = useEditorStore((s) => s.canRedo);
  const toggleFileTree = useEditorStore((s) => s.toggleFileTree);
  const toggleComments = useEditorStore((s) => s.toggleComments);
  const toggleOutline = useEditorStore((s) => s.toggleOutline);
  const toggleSourceMode = useEditorStore((s) => s.toggleSourceMode);

  return (
    <div className="h-8 flex items-center px-2 border-t border-[var(--editor-border)] bg-[var(--surface-secondary)] text-[var(--text-tertiary)] select-none shrink-0 gap-2 text-[13px]">
      {/* Panel toggle buttons */}
      <button
        onClick={toggleFileTree}
        className={`px-1.5 h-full flex items-center rounded transition-colors ${
          showFileTree
            ? "text-[var(--accent)] bg-[var(--accent-subtle)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
        }`}
        title={showFileTree ? `Hide file tree (${modLabel()}+\\)` : `Show file tree (${modLabel()}+\\)`}
      >
        <SidebarIcon size={15} />
      </button>

      <button
        onClick={toggleOutline}
        className={`px-1.5 h-full flex items-center rounded transition-colors ${
          showOutline
            ? "text-[var(--accent)] bg-[var(--accent-subtle)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
        }`}
        title={showOutline ? "Hide outline" : "Show outline"}
      >
        <OutlineIcon size={15} />
      </button>

      <Divider />

      <span className="truncate max-w-xs font-medium" title={filePath || undefined}>
        {filePath || fileName}
      </span>

      <Divider />

      <span className="flex items-center gap-1.5">
        <Circle
          size={7}
          className={isDirty ? "text-[var(--status-warning)]" : "text-[var(--status-success)]"}
        />
        <span>{isDirty ? "Unsaved" : "Saved"}</span>
      </span>

      <Divider />

      <button
        onClick={toggleSourceMode}
        className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[var(--surface-active)] text-[var(--text-secondary)] text-[11px] font-medium hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
        title={`Toggle source mode (${modLabel()}+/)`}
      >
        {isSourceMode ? "Source" : "WYSIWYG"}
      </button>

      {/* Undo/Redo */}
      <span className="ml-auto flex items-center gap-0.5">
        <button
          className={`p-0.5 rounded ${canUndo ? "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]" : "text-[var(--text-muted)] opacity-40 cursor-default"}`}
          onClick={() => canUndo && document.execCommand("undo")}
          disabled={!canUndo}
          title={`Undo (${modLabel()}+Z)`}
        >
          <UndoIcon size={14} />
        </button>
        <button
          className={`p-0.5 rounded ${canRedo ? "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]" : "text-[var(--text-muted)] opacity-40 cursor-default"}`}
          onClick={() => canRedo && document.execCommand("redo")}
          disabled={!canRedo}
          title={`Redo (${modLabel()}+Shift+Z)`}
        >
          <RedoIcon size={14} />
        </button>
      </span>

      <Divider />

      <span className="text-[var(--text-muted)]">
        Ln {cursorPosition.line}, Col {cursorPosition.col}
      </span>

      <Divider />

      <span className="text-[var(--text-muted)]">
        {wordCount} words
      </span>

      <Divider />

      {/* Comments panel toggle */}
      <button
        onClick={toggleComments}
        className={`px-1.5 h-full flex items-center rounded transition-colors ${
          showComments
            ? "text-[var(--accent)] bg-[var(--accent-subtle)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
        }`}
        title={showComments ? `Hide comments (${modLabel()}+Shift+C)` : `Show comments (${modLabel()}+Shift+C)`}
      >
        <MessageSquare size={15} />
      </button>
    </div>
  );
}
