import { useRef, useEffect } from "react";

interface SourceEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function SourceEditor({ value, onChange }: SourceEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  return (
    <div className="h-full overflow-auto bg-[#1e1e1e]">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-full p-8 bg-transparent text-gray-200 font-mono text-sm leading-relaxed resize-none outline-none max-w-3xl mx-auto block"
        spellCheck={false}
      />
    </div>
  );
}
