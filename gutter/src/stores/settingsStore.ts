import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

interface Settings {
  theme: "light" | "dark" | "system";
  fontSize: number;
  fontFamily: string;
  autoSaveInterval: number;
  panelWidths: { fileTree: number; comments: number };
  recentFiles: string[];
  spellCheckEnabled: boolean;
  focusModeEnabled: boolean;
  typewriterEnabled: boolean;
  defaultAuthor: string;
}

interface SettingsState extends Settings {
  loaded: boolean;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  setTheme: (theme: "light" | "dark" | "system") => void;
  cycleTheme: () => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setAutoSaveInterval: (ms: number) => void;
  setPanelWidth: (panel: "fileTree" | "comments", width: number) => void;
  addRecentFile: (path: string) => void;
  setSpellCheckEnabled: (enabled: boolean) => void;
  setFocusModeEnabled: (enabled: boolean) => void;
  setTypewriterEnabled: (enabled: boolean) => void;
  setDefaultAuthor: (author: string) => void;
}

const defaults: Settings = {
  theme: "light",
  fontSize: 16,
  fontFamily: "default",
  autoSaveInterval: 2000,
  panelWidths: { fileTree: 224, comments: 288 },
  recentFiles: [],
  spellCheckEnabled: false,
  focusModeEnabled: false,
  typewriterEnabled: false,
  defaultAuthor: "Author",
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...defaults,
  loaded: false,

  loadSettings: async () => {
    try {
      const json = await invoke<string>("read_settings");
      const parsed = JSON.parse(json) as Partial<Settings>;
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
      focusModeEnabled: state.focusModeEnabled,
      typewriterEnabled: state.typewriterEnabled,
      defaultAuthor: state.defaultAuthor,
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

  setFocusModeEnabled: (focusModeEnabled) => {
    set({ focusModeEnabled });
    get().saveSettings();
  },

  setTypewriterEnabled: (typewriterEnabled) => {
    set({ typewriterEnabled });
    get().saveSettings();
  },

  setDefaultAuthor: (defaultAuthor) => {
    set({ defaultAuthor });
    get().saveSettings();
  },
}));
