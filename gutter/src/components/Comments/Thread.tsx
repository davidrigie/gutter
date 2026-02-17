import { useState } from "react";
import type { CommentThread } from "../../types/comments";
import { useCommentStore } from "../../stores/commentStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { ReplyInput } from "./ReplyInput";
import { Check, Trash, ChevronDown, ChevronRight } from "../Icons";

interface ThreadProps {
  commentId: string;
  thread: CommentThread;
  isActive: boolean;
  quotedText?: string;
  onClick: () => void;
}

export function Thread({ commentId, thread, isActive, quotedText, onClick }: ThreadProps) {
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
      className={`mx-2 mb-2 rounded-lg border border-[var(--editor-border)] border-l-[3px] transition-all duration-200 cursor-pointer ${
        isActive
          ? "border-l-[var(--accent)] bg-[var(--accent-subtle)] shadow-sm"
          : "bg-[var(--surface-elevated)] border-l-transparent hover:border-l-[var(--editor-border)]"
      } ${thread.resolved ? "opacity-50" : ""}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-[11px] font-mono text-[var(--text-muted)]">[{commentId}]</span>
        <div className="flex items-center gap-0.5">
          {!thread.resolved && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const author = useSettingsStore.getState().defaultAuthor || "Author";
                resolveThread(commentId, author);
              }}
              className="p-1 rounded text-[var(--status-success)] hover:bg-[var(--surface-hover)] transition-colors"
              title="Resolve"
            >
              <Check size={14} />
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
            className={`p-1 rounded transition-colors ${
              showDeleteConfirm
                ? "text-[var(--status-error)] bg-[var(--surface-hover)]"
                : "text-[var(--text-muted)] hover:text-[var(--status-error)] hover:bg-[var(--surface-hover)]"
            }`}
            title={showDeleteConfirm ? "Click again to confirm" : "Delete"}
          >
            {showDeleteConfirm ? (
              <span className="text-[11px] font-semibold px-1">Confirm?</span>
            ) : (
              <Trash size={14} />
            )}
          </button>
          {thread.resolved && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Quoted text from the highlighted region */}
      {quotedText && (
        <div
          className="mx-3 mb-1.5 text-[12px] text-[var(--text-tertiary)] italic border-l-[3px] border-l-[var(--accent)] pl-2 cursor-pointer truncate"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          title={quotedText}
        >
          "{quotedText.length > 80 ? quotedText.slice(0, 80) + "..." : quotedText}"
        </div>
      )}

      {/* Resolution status */}
      {thread.resolved && (
        <div className="px-3 pb-1 text-[11px] text-[var(--status-success)]">
          Resolved by {thread.resolvedBy} — {thread.resolvedAt && formatDate(thread.resolvedAt)}
        </div>
      )}

      {/* Messages */}
      {(expanded || !thread.resolved) && (
        <div className="px-3 pb-2">
          {thread.thread.map((msg) => (
            <div key={msg.id} className="mb-2 last:mb-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                  {msg.author}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">·</span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {formatDate(msg.timestamp)}
                </span>
              </div>
              <p className="text-[13px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
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
