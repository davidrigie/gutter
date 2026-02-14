import { useState, useEffect, useRef, useCallback } from "react";

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
      className="fixed inset-0 bg-black/30 flex items-start justify-center pt-24 z-50"
      onClick={onClose}
    >
      <div
        className="w-[32rem] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-[var(--editor-border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command..."
          className="w-full px-4 py-3 text-sm bg-transparent outline-none border-b border-[var(--editor-border)]"
        />
        <div className="max-h-72 overflow-auto py-1">
          {filtered.map((cmd, i) => (
            <div
              key={cmd.name}
              className={`flex items-center justify-between px-4 py-2 text-sm cursor-pointer ${
                i === selectedIndex
                  ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
              onClick={() => executeCommand(cmd)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span>{cmd.name}</span>
              {cmd.shortcut && (
                <span className="text-xs text-gray-400 font-mono">
                  {cmd.shortcut}
                </span>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No matching commands
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
