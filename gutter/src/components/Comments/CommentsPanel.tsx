import { useCommentStore } from "../../stores/commentStore";
import { useEditorStore } from "../../stores/editorStore";
import { Thread } from "./Thread";
import { useState } from "react";
import { MessageSquare } from "../Icons";

export function CommentsPanel() {
  const { threads, getThreadIds } = useCommentStore();
  const { activeCommentId, setActiveCommentId } = useEditorStore();
  const [showResolved, setShowResolved] = useState(false);

  const threadIds = getThreadIds();
  const visibleThreads = showResolved
    ? threadIds
    : threadIds.filter((id) => !threads[id]?.resolved);

  const totalCount = threadIds.length;
  const resolvedCount = threadIds.filter((id) => threads[id]?.resolved).length;
  const openCount = totalCount - resolvedCount;

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
        {resolvedCount > 0 && (
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="text-[12px] text-[var(--accent)] hover:underline"
          >
            {showResolved ? "Hide resolved" : "Show resolved"}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto py-2">
        {visibleThreads.length === 0 && (
          <div className="px-4 py-12 text-center text-[var(--text-muted)]">
            <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-[13px] font-medium text-[var(--text-tertiary)] mb-1">
              {totalCount === 0 ? "No comments yet" : "All resolved"}
            </p>
            <p className="text-[12px]">
              {totalCount === 0
                ? "Select text and press Cmd+Shift+M to add a comment."
                : "All comments have been resolved."}
            </p>
          </div>
        )}
        {visibleThreads.map((id) => (
          <Thread
            key={id}
            commentId={id}
            thread={threads[id]}
            isActive={activeCommentId === id}
            onClick={() => setActiveCommentId(id)}
          />
        ))}
      </div>
    </div>
  );
}
