import { useEditorStore } from "../stores/editorStore";

export function StatusBar() {
  const {
    wordCount,
    cursorPosition,
    filePath,
    isDirty,
    isSourceMode,
    fileName,
  } = useEditorStore();

  const saveStatus = isDirty ? "Unsaved changes" : "Saved";

  return (
    <div className="h-7 flex items-center px-3 text-xs border-t border-[var(--editor-border)] bg-[var(--sidebar-bg)] text-gray-600 dark:text-gray-400 select-none shrink-0 gap-4">
      <span className="truncate max-w-xs" title={filePath || undefined}>
        {filePath || fileName}
      </span>
      <span>{isDirty ? "●" : ""} {saveStatus}</span>
      <span className="ml-auto">
        {isSourceMode ? "Source" : "WYSIWYG"}
      </span>
      <span>
        Ln {cursorPosition.line}, Col {cursorPosition.col}
      </span>
      <span>{wordCount} words</span>
    </div>
  );
}
