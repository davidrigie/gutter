import { useEffect } from "react";
import { useBacklinkStore } from "../stores/backlinkStore";
import { useEditorStore } from "../stores/editorStore";
import { useWorkspaceStore } from "../stores/workspaceStore";

interface BacklinksPanelProps {
  onOpenFile: (path: string) => void;
}

export function BacklinksPanel({ onOpenFile }: BacklinksPanelProps) {
  const { backlinks, loading, scanBacklinks } = useBacklinkStore();
  const fileName = useEditorStore((s) => s.fileName);
  const workspacePath = useWorkspaceStore((s) => s.workspacePath);

  useEffect(() => {
    if (fileName && workspacePath) {
      scanBacklinks(fileName, workspacePath);
    }
  }, [fileName, workspacePath, scanBacklinks]);

  return (
    <div className="p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
        Backlinks
      </div>
      {loading && (
        <div className="text-[12px] text-[var(--text-muted)]">Scanning...</div>
      )}
      {!loading && backlinks.length === 0 && (
        <div className="text-[12px] text-[var(--text-muted)]">
          No backlinks found
        </div>
      )}
      {backlinks.map((bl) => (
        <button
          key={bl.sourcePath}
          className="w-full text-left p-2 rounded-md hover:bg-[var(--surface-hover)] transition-colors mb-1 border-l-2 border-l-transparent hover:border-l-[var(--accent)]"
          onClick={() => onOpenFile(bl.sourcePath)}
        >
          <div className="text-[13px] font-medium text-[var(--text-primary)]">
            {bl.sourceName}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">
            {bl.context}
          </div>
        </button>
      ))}
    </div>
  );
}
