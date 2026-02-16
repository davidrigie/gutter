import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

interface Settings {
  theme: "light" | "dark" | "system";
  fontSize: number;
  fontFamily: "serif" | "sans" | "mono";
  autoSaveInterval: number;
  panelWidths: { fileTree: number; comments: number };
  recentFiles: string[];
  spellCheckEnabled: boolean;
  defaultAuthor: string;
  editorWidth: "narrow" | "medium" | "wide" | "full";
  lineHeight: "compact" | "comfortable" | "spacious";
  accentColor: string;
}

interface SettingsState extends Settings {
  loaded: boolean;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  setTheme: (theme: "light" | "dark" | "system") => void;
  cycleTheme: () => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: "serif" | "sans" | "mono") => void;
  setAutoSaveInterval: (ms: number) => void;
  setPanelWidth: (panel: "fileTree" | "comments", width: number) => void;
  addRecentFile: (path: string) => void;
  setSpellCheckEnabled: (enabled: boolean) => void;
  setDefaultAuthor: (author: string) => void;
  setEditorWidth: (width: "narrow" | "medium" | "wide" | "full") => void;
  setLineHeight: (height: "compact" | "comfortable" | "spacious") => void;
  setAccentColor: (color: string) => void;
}

const defaults: Settings = {
  theme: "light",
  fontSize: 16,
  fontFamily: "serif",
  autoSaveInterval: 2000,
  panelWidths: { fileTree: 224, comments: 288 },
  recentFiles: [],
  spellCheckEnabled: false,
  defaultAuthor: "Author",
  editorWidth: "medium",
  lineHeight: "comfortable",
  accentColor: "indigo",
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...defaults,
  loaded: false,

  loadSettings: async () => {
    try {
      const json = await invoke<string>("read_settings");
      const parsed = JSON.parse(json) as Partial<Settings>;
      // Map legacy fontFamily values
      if (parsed.fontFamily && !["serif", "sans", "mono"].includes(parsed.fontFamily)) {
        parsed.fontFamily = "serif";
      }
      set({ ...defaults, ...parsed, loaded: true });
    } catch {
      set({ ...defaults, loaded: true });
    }
  },

  saveSettings: async () => {
    const state = get();
    const data: Settings = {
      theme: state.theme,
      fontSize: state.fontSize,
      fontFamily: state.fontFamily,
      autoSaveInterval: state.autoSaveInterval,
      panelWidths: state.panelWidths,
      recentFiles: state.recentFiles,
      spellCheckEnabled: state.spellCheckEnabled,
      defaultAuthor: state.defaultAuthor,
      editorWidth: state.editorWidth,
      lineHeight: state.lineHeight,
      accentColor: state.accentColor,
    };
    try {
      await invoke("write_settings", { content: JSON.stringify(data, null, 2) });
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  },

  setTheme: (theme) => {
    set({ theme });
    get().saveSettings();
  },

  cycleTheme: () => {
    const current = get().theme;
    const next = current === "light" ? "dark" : current === "dark" ? "system" : "light";
    set({ theme: next });
    get().saveSettings();
  },

  setFontSize: (fontSize) => {
    set({ fontSize });
    get().saveSettings();
  },

  setFontFamily: (fontFamily) => {
    set({ fontFamily });
    get().saveSettings();
  },

  setAutoSaveInterval: (autoSaveInterval) => {
    set({ autoSaveInterval });
    get().saveSettings();
  },

  setPanelWidth: (panel, width) => {
    set((s) => ({
      panelWidths: { ...s.panelWidths, [panel]: width },
    }));
    get().saveSettings();
  },

  addRecentFile: (path) => {
    set((s) => {
      const filtered = s.recentFiles.filter((f) => f !== path);
      const recentFiles = [path, ...filtered].slice(0, 20);
      return { recentFiles };
    });
    get().saveSettings();
  },

  setSpellCheckEnabled: (spellCheckEnabled) => {
    set({ spellCheckEnabled });
    get().saveSettings();
  },

  setDefaultAuthor: (defaultAuthor) => {
    set({ defaultAuthor });
    get().saveSettings();
  },

  setEditorWidth: (editorWidth) => {
    set({ editorWidth });
    get().saveSettings();
  },

  setLineHeight: (lineHeight) => {
    set({ lineHeight });
    get().saveSettings();
  },

  setAccentColor: (accentColor) => {
    set({ accentColor });
    get().saveSettings();
  },
}));
