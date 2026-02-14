import { create } from "zustand";

interface EditorState {
  filePath: string | null;
  fileName: string;
  content: string;
  isDirty: boolean;
  isSourceMode: boolean;
  wordCount: number;
  cursorPosition: { line: number; col: number };
  theme: "light" | "dark" | "system";
  showFileTree: boolean;
  showComments: boolean;
  isZenMode: boolean;
  activeCommentId: string | null;

  setFilePath: (path: string | null) => void;
  setContent: (content: string) => void;
  setDirty: (dirty: boolean) => void;
  toggleSourceMode: () => void;
  setWordCount: (count: number) => void;
  setCursorPosition: (line: number, col: number) => void;
  toggleTheme: () => void;
  toggleFileTree: () => void;
  toggleComments: () => void;
  toggleZenMode: () => void;
  setActiveCommentId: (id: string | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  filePath: null,
  fileName: "Untitled",
  content: "",
  isDirty: false,
  isSourceMode: false,
  wordCount: 0,
  cursorPosition: { line: 1, col: 1 },
  theme: "light",
  showFileTree: true,
  showComments: true,
  isZenMode: false,
  activeCommentId: null,

  setFilePath: (path) =>
    set({
      filePath: path,
      fileName: path ? path.split("/").pop() || "Untitled" : "Untitled",
    }),
  setContent: (content) => set({ content, isDirty: true }),
  setDirty: (isDirty) => set({ isDirty }),
  toggleSourceMode: () => set((s) => ({ isSourceMode: !s.isSourceMode })),
  setWordCount: (wordCount) => set({ wordCount }),
  setCursorPosition: (line, col) => set({ cursorPosition: { line, col } }),
  toggleTheme: () =>
    set((s) => ({
      theme: s.theme === "light" ? "dark" : s.theme === "dark" ? "system" : "light",
    })),
  toggleFileTree: () => set((s) => ({ showFileTree: !s.showFileTree })),
  toggleComments: () => set((s) => ({ showComments: !s.showComments })),
  toggleZenMode: () =>
    set((s) => ({
      isZenMode: !s.isZenMode,
      showFileTree: s.isZenMode ? true : false,
      showComments: s.isZenMode ? true : false,
    })),
  setActiveCommentId: (id) => set({ activeCommentId: id }),
}));
