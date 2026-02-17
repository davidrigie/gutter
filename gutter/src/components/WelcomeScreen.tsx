import { useState } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import { modLabel } from "../utils/platform";
import { fileName as pathFileName } from "../utils/path";

interface WelcomeScreenProps {
  onNewFile: () => void;
  onOpenFile: () => void;
  onOpenRecent: (path: string) => void;
}

const mod = modLabel();

// Power-user shortcuts that aren't discoverable via UI buttons
const featuredShortcuts = [
  { keys: `${mod}+P`, action: "Quick Open" },
  { keys: `${mod}+.`, action: "Command Palette" },
  { keys: `${mod}+/`, action: "Source Mode" },
  { keys: `${mod}+Shift+R`, action: "Reading Mode" },
  { keys: `${mod}+Shift+M`, action: "New Comment" },
  { keys: `${mod}+Shift+D`, action: "Cycle Theme" },
];

// Full list grouped by category
const allShortcuts = [
  { label: "File", items: [
    { keys: `${mod}+N`, action: "New file" },
    { keys: `${mod}+O`, action: "Open file" },
    { keys: `${mod}+S`, action: "Save" },
    { keys: `${mod}+P`, action: "Quick open" },
    { keys: `${mod}+Shift+E`, action: "Export" },
    { keys: `${mod}+,`, action: "Preferences" },
  ]},
  { label: "Edit", items: [
    { keys: `${mod}+B`, action: "Bold" },
    { keys: `${mod}+I`, action: "Italic" },
    { keys: `${mod}+E`, action: "Inline code" },
    { keys: `${mod}+K`, action: "Insert link" },
    { keys: `${mod}+Shift+X`, action: "Strikethrough" },
    { keys: `${mod}+Z`, action: "Undo" },
    { keys: `${mod}+Shift+Z`, action: "Redo" },
  ]},
  { label: "Find", items: [
    { keys: `${mod}+K`, action: "Search everything" },
    { keys: `${mod}+F`, action: "Find in document" },
    { keys: `${mod}+H`, action: "Find & replace" },
  ]},
  { label: "View", items: [
    { keys: `${mod}+/`, action: "Source mode" },
    { keys: `${mod}+Shift+R`, action: "Reading mode" },
    { keys: `${mod}+\\`, action: "Toggle file tree" },
    { keys: `${mod}+Shift+C`, action: "Toggle comments" },
    { keys: `${mod}+Shift+D`, action: "Cycle theme" },
    { keys: `${mod}+.`, action: "Command palette" },
  ]},
  { label: "Comments", items: [
    { keys: `${mod}+Shift+M`, action: "New comment" },
    { keys: `${mod}+Shift+N`, action: "Next comment" },
  ]},
];

export function WelcomeScreen({ onNewFile, onOpenFile, onOpenRecent }: WelcomeScreenProps) {
  const { recentFiles } = useSettingsStore();
  const [showAllShortcuts, setShowAllShortcuts] = useState(false);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="max-w-lg w-full px-8 py-12 text-center animate-[fadeIn_300ms_ease-out]">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1" style={{ fontFamily: "var(--font-serif)" }}>
          Gutter
        </h1>
        <p className="text-[14px] text-[var(--text-muted)] mb-8">
          A local-first markdown editor with first-class commenting
        </p>

        <div className="flex justify-center gap-3 mb-10">
          <button
            onClick={onNewFile}
            className="px-5 py-2 rounded-lg bg-[var(--accent)] text-white text-[14px] font-medium hover:opacity-90 transition-opacity"
          >
            New File
          </button>
          <button
            onClick={onOpenFile}
            className="px-5 py-2 rounded-lg border border-[var(--editor-border)] text-[var(--text-primary)] text-[14px] font-medium hover:bg-[var(--surface-hover)] transition-colors"
          >
            Open File
          </button>
        </div>

        {recentFiles.length > 0 && (
          <div className="mb-10 text-left">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Recent Files
            </h3>
            <div className="space-y-1">
              {recentFiles.slice(0, 8).map((path) => {
                const name = pathFileName(path) || path;
                return (
                  <button
                    key={path}
                    className="w-full text-left px-3 py-1.5 rounded-md text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors truncate"
                    onClick={() => onOpenRecent(path)}
                    title={path}
                  >
                    {name}
                    <span className="ml-2 text-[11px] text-[var(--text-muted)]">
                      {path}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-left">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Keyboard Shortcuts
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {featuredShortcuts.map((s) => (
              <div
                key={s.keys}
                className="flex items-center justify-between text-[12px] py-0.5"
              >
                <span className="text-[var(--text-secondary)]">{s.action}</span>
                <span className="text-[var(--text-muted)] font-mono text-[11px] border border-[var(--editor-border)] px-1.5 py-0.5 rounded">
                  {s.keys}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowAllShortcuts(true)}
            className="mt-2 text-[12px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            All shortcuts...
          </button>
        </div>

        <div className="mt-10 text-[11px] text-[var(--text-muted)]">
          v0.1.0
        </div>
      </div>

      {showAllShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => setShowAllShortcuts(false)}
        >
          <div
            className="w-[480px] max-h-[70vh] overflow-y-auto rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-2xl shadow-2xl p-5 animate-[fadeInScale_150ms_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setShowAllShortcuts(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[18px] leading-none px-1"
              >
                &times;
              </button>
            </div>
            {allShortcuts.map((group) => (
              <div key={group.label} className="mb-4 last:mb-0">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                  {group.label}
                </h3>
                <div className="space-y-0.5">
                  {group.items.map((s) => (
                    <div
                      key={s.keys + s.action}
                      className="flex items-center justify-between text-[12px] py-0.5"
                    >
                      <span className="text-[var(--text-secondary)]">{s.action}</span>
                      <span className="text-[var(--text-muted)] font-mono text-[11px] border border-[var(--editor-border)] px-1.5 py-0.5 rounded shrink-0 ml-4">
                        {s.keys}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
