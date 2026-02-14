import { useState } from "react";
import type { CommentThread } from "../../types/comments";
import { useCommentStore } from "../../stores/commentStore";
import { ReplyInput } from "./ReplyInput";

interface ThreadProps {
  commentId: string;
  thread: CommentThread;
  isActive: boolean;
  onClick: () => void;
}

export function Thread({ commentId, thread, isActive, onClick }: ThreadProps) {
  const { resolveThread, deleteThread } = useCommentStore();
  const [expanded, setExpanded] = useState(!thread.resolved);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
      " " +
      d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
  };

  return (
    <div
      className={`mx-2 mb-2 rounded-lg border transition-colors cursor-pointer ${
        isActive
          ? "border-[var(--accent)] bg-blue-50 dark:bg-blue-950"
          : "border-[var(--editor-border)] hover:border-gray-300 dark:hover:border-gray-600"
      } ${thread.resolved ? "opacity-60" : ""}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">[{commentId}]</span>
        <div className="flex items-center gap-1">
          {!thread.resolved && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                resolveThread(commentId, "User");
              }}
              className="text-xs text-green-600 hover:text-green-700 px-1"
              title="Resolve"
            >
              ✓
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (showDeleteConfirm) {
                deleteThread(commentId);
              } else {
                setShowDeleteConfirm(true);
                setTimeout(() => setShowDeleteConfirm(false), 3000);
              }
            }}
            className={`text-xs px-1 ${
              showDeleteConfirm
                ? "text-red-600 font-semibold"
                : "text-gray-400 hover:text-red-500"
            }`}
            title={showDeleteConfirm ? "Click again to confirm" : "Delete"}
          >
            {showDeleteConfirm ? "Confirm?" : "×"}
          </button>
          {thread.resolved && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="text-xs text-gray-400 px-1"
            >
              {expanded ? "▼" : "▶"}
            </button>
          )}
        </div>
      </div>

      {/* Resolution status */}
      {thread.resolved && (
        <div className="px-3 pb-1 text-xs text-green-600 dark:text-green-400">
          Resolved by {thread.resolvedBy} — {thread.resolvedAt && formatDate(thread.resolvedAt)}
        </div>
      )}

      {/* Messages */}
      {(expanded || !thread.resolved) && (
        <div className="px-3 pb-2">
          {thread.thread.map((msg) => (
            <div key={msg.id} className="mb-2 last:mb-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {msg.author}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(msg.timestamp)}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                {msg.body}
              </p>
            </div>
          ))}

          {!thread.resolved && (
            <ReplyInput
              commentId={commentId}
              onSubmit={() => {}}
            />
          )}
        </div>
      )}
    </div>
  );
}
