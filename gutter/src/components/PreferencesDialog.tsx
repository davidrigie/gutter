import { useEffect, useRef, type ReactNode } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import type { Editor } from "@tiptap/react";

interface PreferencesDialogProps {
  onClose: () => void;
  editorRef: React.RefObject<{
    getEditor: () => Editor | null;
  } | null>;
}

/* ── Segmented Control ── */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-md border border-[var(--editor-border)] overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`px-2.5 py-1 text-[12px] font-medium transition-colors ${
            value === opt.value
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          }`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ── Toggle Switch ── */
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      className={`relative w-9 h-5 rounded-full transition-colors ${
        checked ? "bg-[var(--accent)]" : "bg-[var(--text-muted)]"
      }`}
      onClick={() => onChange(!checked)}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
          checked ? "translate-x-4" : ""
        }`}
      />
    </button>
  );
}

/* ── Stepper ── */
function Stepper({
  value,
  min,
  max,
  onChange,
  suffix,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        className="w-6 h-6 flex items-center justify-center rounded border border-[var(--editor-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-30"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        −
      </button>
      <span className="w-10 text-center text-[13px] text-[var(--text-primary)] tabular-nums">
        {value}{suffix}
      </span>
      <button
        className="w-6 h-6 flex items-center justify-center rounded border border-[var(--editor-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-30"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}

/* ── Row layout ── */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[13px] text-[var(--text-secondary)]">{label}</span>
      {children}
    </div>
  );
}

/* ── Section header ── */
function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mt-4 mb-1 first:mt-0">
      {children}
    </div>
  );
}

export function PreferencesDialog({ onClose, editorRef }: PreferencesDialogProps) {
  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    editorWidth,
    setEditorWidth,
    lineHeight,
    setLineHeight,
    spellCheckEnabled,
    setSpellCheckEnabled,
    autoSaveInterval,
    setAutoSaveInterval,
    defaultAuthor,
    setDefaultAuthor,
  } = useSettingsStore();

  const authorRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSpellCheckToggle = (enabled: boolean) => {
    setSpellCheckEnabled(enabled);
    const editor = editorRef.current?.getEditor();
    if (editor) {
      if (enabled) {
        editor.commands.setSpellCheck(true);
      } else {
        editor.commands.setSpellCheck(false);
      }
    }
  };

  const handleAuthorBlur = () => {
    const val = authorRef.current?.value.trim();
    if (val !== undefined && val !== defaultAuthor) {
      setDefaultAuthor(val || "Author");
    }
  };

  const autoSaveOptions: { label: string; value: string }[] = [
    { label: "Off", value: "0" },
    { label: "1s", value: "1000" },
    { label: "2s", value: "2000" },
    { label: "5s", value: "5000" },
    { label: "10s", value: "10000" },
  ];

  return (
    <div
      className="fixed inset-0 z-[200]"
      onClick={onClose}
    >
      <div
        className="absolute right-6 top-12 w-[28rem] bg-[var(--glass-bg)] backdrop-blur-[20px] rounded-xl border border-[var(--glass-border)] p-5"
        style={{ boxShadow: "var(--shadow-xl)", animation: "fadeInScale 150ms ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-3">
          Preferences
        </h2>

        {/* ── Appearance ── */}
        <SectionHeader>Appearance</SectionHeader>

        <Row label="Theme">
          <SegmentedControl
            options={[
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" },
              { label: "System", value: "system" },
            ]}
            value={theme}
            onChange={setTheme}
          />
        </Row>

        <Row label="Editor font size">
          <Stepper
            value={fontSize}
            min={12}
            max={24}
            onChange={setFontSize}
            suffix="px"
          />
        </Row>

        <Row label="Editor font">
          <SegmentedControl
            options={[
              { label: "Serif", value: "serif" },
              { label: "Sans", value: "sans" },
              { label: "Mono", value: "mono" },
            ]}
            value={fontFamily}
            onChange={setFontFamily}
          />
        </Row>

        <Row label="Editor width">
          <SegmentedControl
            options={[
              { label: "Narrow", value: "narrow" },
              { label: "Medium", value: "medium" },
              { label: "Wide", value: "wide" },
              { label: "Full", value: "full" },
            ]}
            value={editorWidth}
            onChange={setEditorWidth}
          />
        </Row>

        <Row label="Line height">
          <SegmentedControl
            options={[
              { label: "Compact", value: "compact" },
              { label: "Comfy", value: "comfortable" },
              { label: "Spacious", value: "spacious" },
            ]}
            value={lineHeight}
            onChange={setLineHeight}
          />
        </Row>

        {/* ── Editor ── */}
        <SectionHeader>Editor</SectionHeader>

        <Row label="Spell check">
          <Toggle checked={spellCheckEnabled} onChange={handleSpellCheckToggle} />
        </Row>

        <Row label="Auto-save">
          <SegmentedControl
            options={autoSaveOptions}
            value={String(autoSaveInterval)}
            onChange={(v) => setAutoSaveInterval(Number(v))}
          />
        </Row>

        {/* ── Comments ── */}
        <SectionHeader>Comments</SectionHeader>

        <Row label="Default author">
          <input
            ref={authorRef}
            type="text"
            defaultValue={defaultAuthor}
            onBlur={handleAuthorBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAuthorBlur();
              }
            }}
            className="w-36 text-[13px] px-2 py-1 rounded-md border border-[var(--editor-border)] bg-[var(--surface-primary)] text-[var(--text-primary)] outline-none transition-all focus:border-[var(--accent)] focus:[box-shadow:var(--focus-shadow)]"
          />
        </Row>

        <button
          className="mt-4 w-full text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
