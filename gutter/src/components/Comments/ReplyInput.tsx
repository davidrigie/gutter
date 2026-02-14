import { useState, useRef, useEffect } from "react";
import { useCommentStore } from "../../stores/commentStore";

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
    addReply(commentId, "User", text);
    setValue("");
    onSubmit();
  };

  return (
    <div className="mt-1">
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
        className="w-full text-xs px-2 py-1 rounded border border-[var(--editor-border)] bg-white dark:bg-gray-800 outline-none focus:border-[var(--accent)]"
      />
    </div>
  );
}
