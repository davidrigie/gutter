import { useState, useEffect, useCallback } from "react";
import { diffLines } from "diff";
import { useHistoryStore } from "../stores/historyStore";
import { useEditorStore } from "../stores/editorStore";

interface VersionHistoryProps {
  onRestore: (content: string) => void;
  onClose: () => void;
}

export function VersionHistory({ onRestore, onClose }: VersionHistoryProps) {
  const { snapshots, loading, loadSnapshots, readSnapshot } = useHistoryStore();
  const filePath = useEditorStore((s) => s.filePath);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState<
    { value: string; added?: boolean; removed?: boolean }[]
  >([]);
  const [currentContent, setCurrentContent] = useState("");

  useEffect(() => {
    if (filePath) {
      loadSnapshots(filePath);
    }
  }, [filePath, loadSnapshots]);

  const handleSelectSnapshot = useCallback(
    async (snapshotPath: string) => {
      setSelectedSnapshot(snapshotPath);
      try {
        const snapshotContent = await readSnapshot(snapshotPath);
        const current = useEditorStore.getState().content;
        setCurrentContent(snapshotContent);
        const changes = diffLines(snapshotContent, current);
        setDiffContent(changes);
      } catch (e) {
        console.error("Failed to load snapshot:", e);
      }
    },
    [readSnapshot],
  );

  const handleRestore = useCallback(() => {
    if (currentContent) {
      onRestore(currentContent);
    }
  }, [currentContent, onRestore]);

  const formatTimestamp = (ts: string) => {
    // Format: 20240214_103042 → Feb 14, 2024 10:30
    const match = ts.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/);
    if (!match) return ts;
    const [, year, month, day, hour, min] = match;
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${months[parseInt(month) - 1]} ${parseInt(day)}, ${year} ${hour}:${min}`;
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200]"
      onClick={onClose}
    >
      <div
        className="w-[48rem] max-h-[80vh] bg-[var(--surface-primary)] rounded-xl border border-[var(--editor-border)] flex overflow-hidden"
        style={{ boxShadow: "var(--shadow-lg)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Snapshot list */}
        <div className="w-56 border-r border-[var(--editor-border)] overflow-auto shrink-0">
          <div className="p-3 border-b border-[var(--editor-border)]">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">
              Version History
            </h3>
          </div>
          {loading && (
            <div className="p-3 text-[12px] text-[var(--text-muted)]">
              Loading...
            </div>
          )}
          {!loading && snapshots.length === 0 && (
            <div className="p-3 text-[12px] text-[var(--text-muted)]">
              No snapshots yet
            </div>
          )}
          {snapshots.map((s) => (
            <button
              key={s.path}
              className={`w-full text-left px-3 py-2 text-[12px] transition-colors ${
                selectedSnapshot === s.path
                  ? "bg-[var(--surface-active)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              }`}
              onClick={() => handleSelectSnapshot(s.path)}
            >
              <div className="font-medium">{formatTimestamp(s.timestamp)}</div>
              <div className="text-[var(--text-muted)]">
                {(s.size / 1024).toFixed(1)} KB
              </div>
            </button>
          ))}
        </div>

        {/* Diff view */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-[var(--editor-border)]">
            <span className="text-[13px] text-[var(--text-secondary)]">
              {selectedSnapshot ? "Diff view" : "Select a snapshot to compare"}
            </span>
            <div className="flex gap-2">
              {selectedSnapshot && (
                <button
                  className="px-3 py-1 text-[12px] rounded bg-[var(--accent-primary,#3b82f6)] text-white hover:opacity-90"
                  onClick={handleRestore}
                >
                  Restore
                </button>
              )}
              <button
                className="px-3 py-1 text-[12px] rounded border border-[var(--editor-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-3 font-mono text-[12px] leading-relaxed">
            {diffContent.map((part, i) => (
              <div
                key={i}
                className={
                  part.added
                    ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                    : part.removed
                      ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                      : "text-[var(--text-secondary)]"
                }
              >
                {part.value.split("\n").map((line, j) =>
                  line || j < part.value.split("\n").length - 1 ? (
                    <div key={j} className="px-2">
                      <span className="inline-block w-4 text-[var(--text-muted)] select-none">
                        {part.added ? "+" : part.removed ? "-" : " "}
                      </span>
                      {line}
                    </div>
                  ) : null,
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
