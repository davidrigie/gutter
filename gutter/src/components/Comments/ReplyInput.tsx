import { useState, useRef, useEffect } from "react";
import { useCommentStore } from "../../stores/commentStore";
import { useSettingsStore } from "../../stores/settingsStore";

interface ReplyInputProps {
  commentId: string;
  onSubmit: () => void;
  autoFocus?: boolean;
}

export function ReplyInput({ commentId, onSubmit, autoFocus }: ReplyInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { addReply } = useCommentStore();

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = () => {
    const text = value.trim();
    if (!text) return;
    const author = useSettingsStore.getState().defaultAuthor || "Author";
    addReply(commentId, author, text);
    setValue("");
    onSubmit();
  };

  return (
    <div className="mt-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Reply..."
        className="w-full text-[13px] px-3 py-2 rounded-lg border border-[var(--editor-border)] bg-[var(--surface-primary)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:[box-shadow:var(--focus-shadow)] placeholder:text-[var(--text-muted)]"
      />
    </div>
  );
}
