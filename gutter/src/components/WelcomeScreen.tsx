import { useSettingsStore } from "../stores/settingsStore";
import { modLabel } from "../utils/platform";
import { fileName as pathFileName } from "../utils/path";

interface WelcomeScreenProps {
  onOpenFile: () => void;
  onOpenRecent: (path: string) => void;
}

const mod = modLabel();
const shortcuts = [
  { keys: `${mod}+O`, action: "Open File" },
  { keys: `${mod}+S`, action: "Save" },
  { keys: `${mod}+P`, action: "Quick Open" },
  { keys: `${mod}+Shift+P`, action: "Command Palette" },
  { keys: `${mod}+/`, action: "Toggle Source Mode" },
  { keys: `${mod}+\\`, action: "Toggle File Tree" },
  { keys: `${mod}+Shift+C`, action: "Toggle Comments" },
  { keys: `${mod}+Shift+F`, action: "Zen Mode" },
  { keys: `${mod}+Shift+D`, action: "Toggle Theme" },
  { keys: `${mod}+Shift+M`, action: "New Comment" },
  { keys: `${mod}+F`, action: "Find" },
  { keys: `${mod}+H`, action: "Find & Replace" },
];

export function WelcomeScreen({ onOpenFile, onOpenRecent }: WelcomeScreenProps) {
  const { recentFiles } = useSettingsStore();

  return (
    <div className="flex-1">
      <div className="max-w-lg w-full px-8 py-12 m-auto text-center">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1">
          Gutter
        </h1>
        <p className="text-[14px] text-[var(--text-muted)] mb-8">
          A local-first markdown editor with first-class commenting
        </p>

        <div className="flex justify-center gap-3 mb-10">
          <button
            onClick={onOpenFile}
            className="px-5 py-2 rounded-lg bg-[var(--accent-primary,#3b82f6)] text-white text-[14px] font-medium hover:opacity-90 transition-opacity"
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
            {shortcuts.map((s) => (
              <div
                key={s.keys}
                className="flex items-center justify-between text-[12px] py-0.5"
              >
                <span className="text-[var(--text-secondary)]">{s.action}</span>
                <span className="text-[var(--text-muted)] font-mono text-[11px] bg-[var(--surface-active)] px-1.5 py-0.5 rounded">
                  {s.keys}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 text-[11px] text-[var(--text-muted)]">
          v0.1.0
        </div>
      </div>
    </div>
  );
}
