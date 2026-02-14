import { useEditorStore } from "../stores/editorStore";
import { Circle, MessageSquare } from "./Icons";

function SidebarIcon({ size = 16, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

export function StatusBar() {
  const {
    wordCount,
    cursorPosition,
    filePath,
    isDirty,
    isSourceMode,
    fileName,
    showFileTree,
    showComments,
    toggleFileTree,
    toggleComments,
  } = useEditorStore();

  return (
    <div className="h-8 flex items-center px-2 border-t border-[var(--editor-border)] bg-[var(--surface-secondary)] text-[var(--text-tertiary)] select-none shrink-0 gap-2 text-[13px]">
      {/* Panel toggle buttons */}
      <button
        onClick={toggleFileTree}
        className={`p-1 rounded transition-colors ${
          showFileTree
            ? "text-[var(--accent)] bg-[var(--surface-active)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
        }`}
        title={showFileTree ? "Hide file tree (Cmd+\\)" : "Show file tree (Cmd+\\)"}
      >
        <SidebarIcon size={15} />
      </button>

      <span className="text-[var(--editor-border)]">|</span>

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

      <span className="text-[var(--editor-border)]">|</span>

      {/* Comments panel toggle */}
      <button
        onClick={toggleComments}
        className={`p-1 rounded transition-colors ${
          showComments
            ? "text-[var(--accent)] bg-[var(--surface-active)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
        }`}
        title={showComments ? "Hide comments (Cmd+Shift+C)" : "Show comments (Cmd+Shift+C)"}
      >
        <MessageSquare size={15} />
      </button>
    </div>
  );
}
