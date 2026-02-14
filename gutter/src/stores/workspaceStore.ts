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
  isPinned: boolean;
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
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  pinTab: (path: string) => void;
  unpinTab: (path: string) => void;
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
      set({ openTabs: [...openTabs, { path, name, isDirty: false, isPinned: false }] });
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

  reorderTabs: (fromIndex, toIndex) => {
    const { openTabs } = get();
    const tabs = [...openTabs];
    const [moved] = tabs.splice(fromIndex, 1);
    tabs.splice(toIndex, 0, moved);
    set({ openTabs: tabs });
  },

  pinTab: (path) => {
    const { openTabs } = get();
    const tabs = openTabs.map((t) =>
      t.path === path ? { ...t, isPinned: true } : t,
    );
    // Sort pinned tabs to front
    tabs.sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));
    set({ openTabs: tabs });
  },

  unpinTab: (path) => {
    const { openTabs } = get();
    set({
      openTabs: openTabs.map((t) =>
        t.path === path ? { ...t, isPinned: false } : t,
      ),
    });
  },
}));
