import { create } from "zustand";
import { fileName as pathFileName } from "../utils/path";

interface EditorState {
  filePath: string | null;
  fileName: string;
  content: string;
  isDirty: boolean;
  isSourceMode: boolean;
  isReadingMode: boolean;
  wordCount: number;
  cursorPosition: { line: number; col: number };
  showFileTree: boolean;
  showComments: boolean;
  activeCommentId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  showOutline: boolean;
  commentTexts: Record<string, string>;

  setFilePath: (path: string | null) => void;
  setContent: (content: string) => void;
  setDirty: (dirty: boolean) => void;
  toggleSourceMode: () => void;
  toggleReadingMode: () => void;
  setWordCount: (count: number) => void;
  setCursorPosition: (line: number, col: number) => void;
  toggleFileTree: () => void;
  toggleComments: () => void;
  setActiveCommentId: (id: string | null) => void;
  setUndoRedo: (canUndo: boolean, canRedo: boolean) => void;
  toggleOutline: () => void;
  setCommentTexts: (texts: Record<string, string>) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  filePath: null,
  fileName: "Untitled",
  content: "",
  isDirty: false,
  isSourceMode: false,
  isReadingMode: false,
  wordCount: 0,
  cursorPosition: { line: 1, col: 1 },
  showFileTree: true,
  showComments: true,
  activeCommentId: null,
  canUndo: false,
  canRedo: false,
  showOutline: false,
  commentTexts: {},

  setFilePath: (path) =>
    set({
      filePath: path,
      fileName: path ? pathFileName(path) || "Untitled" : "Untitled",
    }),
  setContent: (content) => set({ content, isDirty: true }),
  setDirty: (isDirty) => set({ isDirty }),
  toggleSourceMode: () => set((s) => ({ isSourceMode: !s.isSourceMode })),
  toggleReadingMode: () => set((s) => ({ isReadingMode: !s.isReadingMode })),
  setWordCount: (wordCount) => set({ wordCount }),
  setCursorPosition: (line, col) => set({ cursorPosition: { line, col } }),
  toggleFileTree: () => set((s) => ({ showFileTree: !s.showFileTree })),
  toggleComments: () => set((s) => ({ showComments: !s.showComments })),
  setActiveCommentId: (id) => set({ activeCommentId: id }),
  setUndoRedo: (canUndo, canRedo) => set({ canUndo, canRedo }),
  toggleOutline: () => set((s) => ({ showOutline: !s.showOutline })),
  setCommentTexts: (commentTexts) => set({ commentTexts }),
}));
