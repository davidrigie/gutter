import { useCommentStore } from "../../stores/commentStore";
import { useEditorStore } from "../../stores/editorStore";
import { modLabel } from "../../utils/platform";
import { Thread } from "./Thread";
import { useState, useCallback, useMemo } from "react";
import { MessageSquare } from "../Icons";

type FilterMode = "all" | "open" | "resolved";

export function CommentsPanel() {
  const { threads, getThreadIds } = useCommentStore();
  const { activeCommentId, setActiveCommentId, commentTexts } = useEditorStore();
  const [filter, setFilter] = useState<FilterMode>("open");

  const threadIds = getThreadIds();
  const totalCount = threadIds.length;
  const resolvedCount = threadIds.filter((id) => threads[id]?.resolved).length;
  const openCount = totalCount - resolvedCount;

  const visibleThreads = useMemo(
    () =>
      threadIds.filter((id) => {
        if (filter === "all") return true;
        if (filter === "open") return !threads[id]?.resolved;
        return threads[id]?.resolved;
      }),
    [threadIds, threads, filter],
  );

  const handleExportComments = useCallback(() => {
    const lines: string[] = ["# Comments Export\n"];
    for (const id of threadIds) {
      const thread = threads[id];
      if (!thread) continue;
      lines.push(`## [${id}]`);
      lines.push(`Status: ${thread.resolved ? "Resolved" : "Open"}\n`);
      for (const msg of thread.thread) {
        const date = new Date(msg.timestamp).toLocaleString();
        lines.push(`**${msg.author}** - ${date}`);
        lines.push(`${msg.body}\n`);
      }
      lines.push("---\n");
    }
    lines.push(`\n*${totalCount} comments (${resolvedCount} resolved, ${openCount} open)*`);
    const md = lines.join("\n");
    navigator.clipboard.writeText(md).catch(console.error);
  }, [threadIds, threads, totalCount, resolvedCount, openCount]);

  return (
    <div className="h-full flex flex-col bg-[var(--surface-secondary)]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--editor-border)]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            Comments
          </span>
          {totalCount > 0 && (
            <span className="text-[11px] bg-[var(--accent)] text-white px-1.5 py-0.5 rounded-full font-medium min-w-[18px] text-center">
              {openCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterMode)}
            className="text-[11px] bg-transparent text-[var(--text-secondary)] border border-[var(--editor-border)] rounded px-1 py-0.5 outline-none"
          >
            <option value="all">All ({totalCount})</option>
            <option value="open">Open ({openCount})</option>
            <option value="resolved">Resolved ({resolvedCount})</option>
          </select>
          {totalCount > 0 && (
            <button
              onClick={handleExportComments}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1"
              title="Copy comments as markdown"
            >
              Export
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto py-2">
        {visibleThreads.length === 0 && (
          <div className="px-4 py-12 text-center text-[var(--text-muted)]">
            <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-[13px] font-medium text-[var(--text-tertiary)] mb-1">
              {totalCount === 0
                ? "No comments yet"
                : filter === "open"
                  ? "All resolved"
                  : "No resolved comments"}
            </p>
            <p className="text-[12px]">
              {totalCount === 0
                ? `Select text and press ${modLabel()}+Shift+M to add a comment.`
                : "Try changing the filter."}
            </p>
          </div>
        )}
        {visibleThreads.map((id) => (
          <Thread
            key={id}
            commentId={id}
            thread={threads[id]}
            isActive={activeCommentId === id}
            quotedText={commentTexts[id]}
            onClick={() => {
              setActiveCommentId(id);
              window.dispatchEvent(
                new CustomEvent("scroll-to-comment", {
                  detail: { commentId: id },
                }),
              );
            }}
          />
        ))}
      </div>
    </div>
  );
}
