import { useState, useEffect, useRef, useCallback } from "react";
import { Search } from "./Icons";

interface Command {
  name: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  commands: Command[];
  onClose: () => void;
}

export function CommandPalette({ commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = commands.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const executeCommand = useCallback(
    (command: Command) => {
      onClose();
      command.action();
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        executeCommand(filtered[selectedIndex]);
      }
    },
    [onClose, filtered, selectedIndex, executeCommand],
  );

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-24 z-[200] animate-[fadeIn_120ms_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-[32rem] bg-[var(--surface-primary)] rounded-xl border border-[var(--editor-border)] overflow-hidden animate-[fadeInScale_150ms_ease-out]"
        style={{ boxShadow: 'var(--shadow-lg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-[var(--editor-border)]">
          <Search size={16} className="text-[var(--text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="w-full py-3 text-[15px] bg-transparent outline-none placeholder:text-[var(--text-muted)]"
          />
        </div>
        <div className="max-h-72 overflow-auto py-1">
          {filtered.map((cmd, i) => (
            <div
              key={cmd.name}
              className={`flex items-center justify-between px-4 py-2.5 text-[13px] cursor-pointer transition-colors ${
                i === selectedIndex
                  ? "bg-[var(--surface-hover)] border-l-2 border-l-[var(--accent)]"
                  : "border-l-2 border-l-transparent hover:bg-[var(--surface-hover)]"
              }`}
              onClick={() => executeCommand(cmd)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className={i === selectedIndex ? "text-[var(--text-primary)] font-medium" : ""}>
                {cmd.name}
              </span>
              {cmd.shortcut && (
                <span className="text-[11px] text-[var(--text-muted)] font-mono bg-[var(--surface-active)] px-1.5 py-0.5 rounded">
                  {cmd.shortcut}
                </span>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-[var(--text-muted)]">
              No matching commands
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
