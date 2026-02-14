import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

interface Snapshot {
  timestamp: string;
  size: number;
  path: string;
}

interface HistoryState {
  snapshots: Snapshot[];
  loading: boolean;
  saveSnapshot: (mdPath: string, content: string) => Promise<void>;
  loadSnapshots: (mdPath: string) => Promise<void>;
  readSnapshot: (snapshotPath: string) => Promise<string>;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  snapshots: [],
  loading: false,

  saveSnapshot: async (mdPath: string, content: string) => {
    try {
      await invoke("save_snapshot", { mdPath, content });
    } catch (e) {
      console.error("Failed to save snapshot:", e);
    }
  },

  loadSnapshots: async (mdPath: string) => {
    set({ loading: true });
    try {
      const snapshots = await invoke<Snapshot[]>("list_snapshots", { mdPath });
      set({ snapshots, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  readSnapshot: async (snapshotPath: string) => {
    return invoke<string>("read_snapshot", { snapshotPath });
  },
}));
