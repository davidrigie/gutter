import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

interface BacklinkEntry {
  sourcePath: string;
  sourceName: string;
  context: string;
}

interface BacklinkState {
  backlinks: BacklinkEntry[];
  loading: boolean;
  scanBacklinks: (targetFileName: string, workspacePath: string) => Promise<void>;
  clear: () => void;
}

export const useBacklinkStore = create<BacklinkState>((set) => ({
  backlinks: [],
  loading: false,

  scanBacklinks: async (targetFileName: string, workspacePath: string) => {
    set({ loading: true, backlinks: [] });
    try {
      const tree = await invoke<
        { name: string; path: string; is_dir: boolean; children: unknown[] | null }[]
      >("read_directory", { path: workspacePath });

      const mdFiles: { name: string; path: string }[] = [];
      const collectFiles = (
        entries: { name: string; path: string; is_dir: boolean; children: unknown[] | null }[],
      ) => {
        for (const entry of entries) {
          if (!entry.is_dir && entry.name.endsWith(".md")) {
            mdFiles.push({ name: entry.name, path: entry.path });
          }
          if (entry.children) {
            collectFiles(
              entry.children as typeof entries,
            );
          }
        }
      };
      collectFiles(tree);

      const backlinks: BacklinkEntry[] = [];
      const pattern = `[[${targetFileName.replace(/\.md$/, "")}]]`;

      for (const file of mdFiles) {
        try {
          const content = await invoke<string>("read_file", { path: file.path });
          if (content.includes(pattern)) {
            // Extract context around the link
            const idx = content.indexOf(pattern);
            const start = Math.max(0, idx - 40);
            const end = Math.min(content.length, idx + pattern.length + 40);
            const context = (start > 0 ? "..." : "") +
              content.slice(start, end).replace(/\n/g, " ") +
              (end < content.length ? "..." : "");
            backlinks.push({
              sourcePath: file.path,
              sourceName: file.name,
              context,
            });
          }
        } catch {
          // Skip unreadable files
        }
      }

      set({ backlinks, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  clear: () => set({ backlinks: [], loading: false }),
}));
