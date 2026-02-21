import { useEffect } from "react";
import { useEditorStore } from "../stores/editorStore";
import { useSettingsStore } from "../stores/settingsStore";

/**
 * Applies theme class, CSS custom properties, and document title as side effects.
 */
export function useThemeApplication() {
  const theme = useSettingsStore((s) => s.theme);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const editorWidth = useSettingsStore((s) => s.editorWidth);
  const lineHeight = useSettingsStore((s) => s.lineHeight);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const isDirty = useEditorStore((s) => s.isDirty);
  const fileName = useEditorStore((s) => s.fileName);

  // Theme class toggle
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [theme]);

  // Sync editor CSS variables from settings
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--editor-font-size", `${fontSize}px`);

    const fontMap: Record<string, string> = {
      serif: "var(--font-serif)",
      sans: "var(--font-sans)",
      mono: '"SF Mono", "Fira Code", "Fira Mono", Menlo, monospace',
    };
    root.style.setProperty("--editor-font-family", fontMap[fontFamily] || fontMap.serif);

    const widthMap: Record<string, string> = {
      narrow: "36rem",
      medium: "48rem",
      wide: "64rem",
      full: "100%",
    };
    root.style.setProperty("--editor-max-width", widthMap[editorWidth] || widthMap.medium);

    const lineHeightMap: Record<string, string> = {
      compact: "1.4",
      comfortable: "1.7",
      spacious: "2.0",
    };
    root.style.setProperty("--editor-line-height", lineHeightMap[lineHeight] || lineHeightMap.comfortable);

    // Accent color presets — light and dark variants
    const accentPresets: Record<string, { light: string; dark: string }> = {
      indigo:  { light: "#6366f1", dark: "#818cf8" },
      blue:    { light: "#3b82f6", dark: "#60a5fa" },
      violet:  { light: "#8b5cf6", dark: "#a78bfa" },
      rose:    { light: "#f43f5e", dark: "#fb7185" },
      orange:  { light: "#f97316", dark: "#fb923c" },
      green:   { light: "#22c55e", dark: "#4ade80" },
      teal:    { light: "#0d9488", dark: "#2dd4bf" },
    };
    const isDark = document.documentElement.classList.contains("dark");
    const preset = accentPresets[accentColor];
    // Support custom hex colors (e.g. "#e05d44") or preset names
    const color = preset
      ? (isDark ? preset.dark : preset.light)
      : (accentColor.startsWith("#") ? accentColor : accentPresets.teal[isDark ? "dark" : "light"]);
    root.style.setProperty("--accent", color);
    // Derive hover and alpha variants
    const hoverColor = preset
      ? (isDark ? preset.light : preset.dark)
      : `color-mix(in srgb, ${color} 80%, ${isDark ? "white" : "black"})`;
    root.style.setProperty("--accent-hover", hoverColor);
    root.style.setProperty("--accent-subtle", `color-mix(in srgb, ${color} 8%, transparent)`);
    root.style.setProperty("--accent-muted", `color-mix(in srgb, ${color} 50%, transparent)`);
    root.style.setProperty("--focus-shadow", `0 0 0 2px color-mix(in srgb, ${color} 15%, transparent)`);
    root.style.setProperty("--selection-bg", `color-mix(in srgb, ${color} 10%, transparent)`);
  }, [fontSize, fontFamily, editorWidth, lineHeight, accentColor, theme]);

  // Document title
  useEffect(() => {
    document.title = `${isDirty ? "● " : ""}${fileName} — Gutter`;
  }, [isDirty, fileName]);
}
