import { useCommentStore } from "../../stores/commentStore";
import { useEditorStore } from "../../stores/editorStore";
import { Thread } from "./Thread";
import { useState } from "react";

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
    <div className="h-full flex flex-col bg-[var(--sidebar-bg)] text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--editor-border)]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
            Comments
          </span>
          {totalCount > 0 && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
              {openCount}
            </span>
          )}
        </div>
        {resolvedCount > 0 && (
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="text-xs text-[var(--accent)] hover:underline"
          >
            {showResolved ? "Hide resolved" : "Show resolved"}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto py-2">
        {visibleThreads.length === 0 && (
          <div className="px-3 py-8 text-center text-gray-500 dark:text-gray-400 text-xs">
            {totalCount === 0
              ? "No comments yet. Select text and press Cmd+Shift+M to add one."
              : "All comments resolved."}
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
