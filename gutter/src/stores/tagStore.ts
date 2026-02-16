import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { parse as parseYaml } from "yaml";

export interface TagInfo {
  tag: string;
  count: number;
}

interface TagState {
  tagToFiles: Map<string, Set<string>>;
  fileToTags: Map<string, Set<string>>;
  selectedTags: Set<string>;
  filterMode: "any" | "all";
  viewMode: "list" | "cloud";
  loading: boolean;

  scanWorkspace: (workspacePath: string) => Promise<void>;
  updateFileTags: (filePath: string, content: string) => void;
  removeFile: (filePath: string) => void;
  toggleTag: (tag: string) => void;
  clearSelection: () => void;
  setFilterMode: (mode: "any" | "all") => void;
  setViewMode: (mode: "list" | "cloud") => void;
}

function extractTagsFromContent(content: string): string[] {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return [];
  try {
    const parsed = parseYaml(match[1]);
    if (parsed && typeof parsed === "object" && "tags" in parsed) {
      const tags = (parsed as Record<string, unknown>).tags;
      if (Array.isArray(tags)) {
        return tags.map(String).filter((t) => t.length > 0);
      }
    }
  } catch {
    // Invalid YAML
  }
  return [];
}

export const useTagStore = create<TagState>((set, get) => ({
  tagToFiles: new Map(),
  fileToTags: new Map(),
  selectedTags: new Set(),
  filterMode: "any",
  viewMode: "list",
  loading: false,

  scanWorkspace: async (workspacePath: string) => {
    set({ loading: true });
    try {
      const tree = await invoke<
        { name: string; path: string; is_dir: boolean; children: unknown[] | null }[]
      >("read_directory", { path: workspacePath });

      const mdFiles: string[] = [];
      const collectFiles = (
        entries: { name: string; path: string; is_dir: boolean; children: unknown[] | null }[],
      ) => {
        for (const entry of entries) {
          if (!entry.is_dir && entry.name.endsWith(".md")) {
            mdFiles.push(entry.path);
          }
          if (entry.children) {
            collectFiles(entry.children as typeof entries);
          }
        }
      };
      collectFiles(tree);

      const tagToFiles = new Map<string, Set<string>>();
      const fileToTags = new Map<string, Set<string>>();

      for (const filePath of mdFiles) {
        try {
          const content = await invoke<string>("read_file", { path: filePath });
          const tags = extractTagsFromContent(content);
          if (tags.length > 0) {
            fileToTags.set(filePath, new Set(tags));
            for (const tag of tags) {
              if (!tagToFiles.has(tag)) {
                tagToFiles.set(tag, new Set());
              }
              tagToFiles.get(tag)!.add(filePath);
            }
          }
        } catch {
          // Skip unreadable files
        }
      }

      set({ tagToFiles, fileToTags, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  updateFileTags: (filePath: string, content: string) => {
    const { tagToFiles, fileToTags } = get();
    const newTagToFiles = new Map(tagToFiles);
    const newFileToTags = new Map(fileToTags);

    // Remove old tags for this file
    const oldTags = newFileToTags.get(filePath);
    if (oldTags) {
      for (const tag of oldTags) {
        const files = newTagToFiles.get(tag);
        if (files) {
          files.delete(filePath);
          if (files.size === 0) {
            newTagToFiles.delete(tag);
          }
        }
      }
      newFileToTags.delete(filePath);
    }

    // Add new tags
    const newTags = extractTagsFromContent(content);
    if (newTags.length > 0) {
      newFileToTags.set(filePath, new Set(newTags));
      for (const tag of newTags) {
        if (!newTagToFiles.has(tag)) {
          newTagToFiles.set(tag, new Set());
        }
        newTagToFiles.get(tag)!.add(filePath);
      }
    }

    set({ tagToFiles: newTagToFiles, fileToTags: newFileToTags });
  },

  removeFile: (filePath: string) => {
    const { tagToFiles, fileToTags } = get();
    const oldTags = fileToTags.get(filePath);
    if (!oldTags) return;

    const newTagToFiles = new Map(tagToFiles);
    const newFileToTags = new Map(fileToTags);
    newFileToTags.delete(filePath);

    for (const tag of oldTags) {
      const files = newTagToFiles.get(tag);
      if (files) {
        files.delete(filePath);
        if (files.size === 0) {
          newTagToFiles.delete(tag);
        }
      }
    }

    set({ tagToFiles: newTagToFiles, fileToTags: newFileToTags });
  },

  toggleTag: (tag: string) => {
    const { selectedTags } = get();
    const next = new Set(selectedTags);
    if (next.has(tag)) {
      next.delete(tag);
    } else {
      next.add(tag);
    }
    set({ selectedTags: next });
  },

  clearSelection: () => set({ selectedTags: new Set() }),

  setFilterMode: (mode) => set({ filterMode: mode }),

  setViewMode: (mode) => set({ viewMode: mode }),
}));

/** Derive sorted tag list from the tagToFiles map */
export function getAllTags(tagToFiles: Map<string, Set<string>>): TagInfo[] {
  const tags: TagInfo[] = [];
  for (const [tag, files] of tagToFiles) {
    tags.push({ tag, count: files.size });
  }
  return tags.sort((a, b) => a.tag.localeCompare(b.tag));
}

/** Derive the set of files matching the selected tags */
export function getFilesForTags(
  selectedTags: Set<string>,
  filterMode: "any" | "all",
  tagToFiles: Map<string, Set<string>>,
): Set<string> {
  if (selectedTags.size === 0) return new Set<string>();

  const tagArray = Array.from(selectedTags);

  if (filterMode === "any") {
    const result = new Set<string>();
    for (const tag of tagArray) {
      const files = tagToFiles.get(tag);
      if (files) {
        for (const f of files) result.add(f);
      }
    }
    return result;
  }

  // "all" mode — intersection
  const sets = tagArray
    .map((tag) => tagToFiles.get(tag))
    .filter((s): s is Set<string> => s !== undefined);
  if (sets.length === 0) return new Set<string>();

  const result = new Set(sets[0]);
  for (let i = 1; i < sets.length; i++) {
    for (const f of result) {
      if (!sets[i].has(f)) result.delete(f);
    }
  }
  return result;
}
