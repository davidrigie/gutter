import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  children: FileEntry[] | null;
}

export interface OpenTab {
  path: string;
  name: string;
  isDirty: boolean;
}

interface WorkspaceState {
  workspacePath: string | null;
  fileTree: FileEntry[];
  openTabs: OpenTab[];
  activeTabPath: string | null;

  setWorkspacePath: (path: string | null) => void;
  loadFileTree: (path: string) => Promise<void>;
  addTab: (path: string, name: string) => void;
  removeTab: (path: string) => void;
  setActiveTab: (path: string | null) => void;
  setTabDirty: (path: string, dirty: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspacePath: null,
  fileTree: [],
  openTabs: [],
  activeTabPath: null,

  setWorkspacePath: (path) => set({ workspacePath: path }),

  loadFileTree: async (path: string) => {
    try {
      const tree = await invoke<FileEntry[]>("read_directory", { path });
      set({ fileTree: tree, workspacePath: path });
    } catch (e) {
      console.error("Failed to load file tree:", e);
    }
  },

  addTab: (path, name) => {
    const { openTabs } = get();
    if (!openTabs.find((t) => t.path === path)) {
      set({ openTabs: [...openTabs, { path, name, isDirty: false }] });
    }
    set({ activeTabPath: path });
  },

  removeTab: (path) => {
    const { openTabs, activeTabPath } = get();
    const newTabs = openTabs.filter((t) => t.path !== path);
    let newActive = activeTabPath;
    if (activeTabPath === path) {
      newActive = newTabs.length > 0 ? newTabs[newTabs.length - 1].path : null;
    }
    set({ openTabs: newTabs, activeTabPath: newActive });
  },

  setActiveTab: (path) => set({ activeTabPath: path }),

  setTabDirty: (path, dirty) => {
    const { openTabs } = get();
    set({
      openTabs: openTabs.map((t) =>
        t.path === path ? { ...t, isDirty: dirty } : t,
      ),
    });
  },
}));
