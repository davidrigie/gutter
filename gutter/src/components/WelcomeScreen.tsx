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
  { keys: `${mod}+K`, action: "Search" },
  { keys: `${mod}+/`, action: "Source Mode" },
  { keys: `${mod}+\\`, action: "File Tree" },
  { keys: `${mod}+Shift+C`, action: "Comments" },
  { keys: `${mod}+Shift+F`, action: "Zen Mode" },
  { keys: `${mod}+Shift+D`, action: "Theme" },
];

export function WelcomeScreen({ onOpenFile, onOpenRecent }: WelcomeScreenProps) {
  const { recentFiles } = useSettingsStore();

  return (
    <div className="flex-1 flex items-center justify-center animate-[fadeIn_300ms_ease-out]">
      <div className="max-w-md w-full px-8 text-center">
        <h1
          className="text-4xl font-bold text-[var(--text-primary)] mb-1"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Gutter
        </h1>
        <p className="text-[14px] text-[var(--text-muted)] mb-8">
          A local-first markdown editor with first-class commenting
        </p>

        <div className="flex justify-center gap-3 mb-10">
          <button
            onClick={onOpenFile}
            className="px-5 py-2 rounded-lg bg-[var(--accent)] text-white text-[14px] font-medium hover:bg-[var(--accent-hover)] hover:shadow-lg transition-all"
          >
            Open File
          </button>
        </div>

        {recentFiles.length > 0 && (
          <div className="mb-8 text-left">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Recent Files
            </h3>
            <div className="space-y-0.5">
              {recentFiles.slice(0, 6).map((path) => {
                const name = pathFileName(path) || path;
                return (
                  <button
                    key={path}
                    className="w-full text-left px-3 py-1.5 rounded-md text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors truncate"
                    onClick={() => onOpenRecent(path)}
                    title={path}
                  >
                    {name}
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
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
            {shortcuts.map((s) => (
              <div
                key={s.keys}
                className="flex items-center justify-between text-[11px] py-0.5"
              >
                <span className="text-[var(--text-muted)]">{s.action}</span>
                <span className="text-[var(--text-muted)] font-mono text-[10px] bg-[var(--surface-active)] px-1 py-0.5 rounded opacity-70">
                  {s.keys}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-[11px] text-[var(--text-muted)] opacity-50">
          v0.1.0
        </div>
      </div>
    </div>
  );
}
