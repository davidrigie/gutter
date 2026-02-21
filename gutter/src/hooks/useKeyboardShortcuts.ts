import { useEffect } from "react";
import { useEditorStore } from "../stores/editorStore";
import { modKey } from "../utils/platform";

export interface KeyboardShortcutActions {
  handleNewFile: () => void;
  handleOpenFile: () => void;
  handleSave: () => void;
  switchToSource: () => void;
  switchToWysiwyg: () => void;
  toggleFileTree: () => void;
  toggleComments: () => void;
  toggleHistory: () => void;
  toggleTags: () => void;
  toggleReadingMode: () => void;
  cycleTheme: () => void;
  navigateComment: (direction: "next" | "prev") => void;
  setUnifiedSearchMode: (mode: "all" | "files" | "commands") => void;
  setFindReplaceMode: (mode: "find" | "replace") => void;
  setShowExport: (show: boolean) => void;
  setShowPreferences: (show: boolean) => void;
  createComment: () => void;
}

/**
 * Global keyboard shortcut handler with modal guard.
 */
export function useKeyboardShortcuts(
  actions: KeyboardShortcutActions,
  modalOpen: boolean,
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip all shortcuts (except Escape) when a modal/dialog is open
      if (e.key !== "Escape" && modalOpen) {
        return;
      }

      if (modKey(e) && !e.shiftKey && e.key === "n") {
        e.preventDefault();
        actions.handleNewFile();
      } else if (modKey(e) && e.key === "o") {
        e.preventDefault();
        actions.handleOpenFile();
      } else if (modKey(e) && e.key === "s") {
        e.preventDefault();
        actions.handleSave();
      } else if (modKey(e) && e.key === "/") {
        e.preventDefault();
        if (useEditorStore.getState().isSourceMode) {
          actions.switchToWysiwyg();
        } else {
          actions.switchToSource();
        }
      } else if (modKey(e) && e.key === "\\") {
        e.preventDefault();
        actions.toggleFileTree();
      } else if (modKey(e) && e.shiftKey && e.key === "C") {
        e.preventDefault();
        actions.toggleComments();
      } else if (modKey(e) && e.shiftKey && e.key === "H") {
        e.preventDefault();
        actions.toggleHistory();
      } else if (modKey(e) && e.shiftKey && e.key === "T") {
        e.preventDefault();
        actions.toggleTags();
      } else if (modKey(e) && e.shiftKey && e.key === "D") {
        e.preventDefault();
        actions.cycleTheme();
      } else if (modKey(e) && !e.shiftKey && e.key === "k") {
        // Don't hijack Cmd+K when focus is inside the ProseMirror editor (it inserts a link)
        if (document.activeElement?.closest(".ProseMirror")) return;
        e.preventDefault();
        actions.setUnifiedSearchMode("all");
      } else if (modKey(e) && !e.shiftKey && e.key === "p") {
        e.preventDefault();
        actions.setUnifiedSearchMode("files");
      } else if (modKey(e) && e.shiftKey && e.key === "P") {
        e.preventDefault();
        actions.setUnifiedSearchMode("commands");
      } else if (modKey(e) && e.key === ".") {
        e.preventDefault();
        actions.setUnifiedSearchMode("commands");
      } else if (modKey(e) && e.shiftKey && e.key === "M") {
        e.preventDefault();
        actions.createComment();
      } else if (modKey(e) && e.shiftKey && e.key === "N") {
        e.preventDefault();
        actions.navigateComment("next");
      } else if (modKey(e) && e.shiftKey && e.key === "E") {
        e.preventDefault();
        actions.setShowExport(true);
      } else if (modKey(e) && e.key === ",") {
        e.preventDefault();
        actions.setShowPreferences(true);
      } else if (modKey(e) && e.shiftKey && e.key === "R") {
        e.preventDefault();
        const state = useEditorStore.getState();
        if (state.isSourceMode && !state.isReadingMode) actions.switchToWysiwyg();
        actions.toggleReadingMode();
      } else if (e.key === "Escape" && useEditorStore.getState().isReadingMode) {
        e.preventDefault();
        actions.toggleReadingMode();
      } else if (modKey(e) && e.key === "f" && !e.shiftKey) {
        e.preventDefault();
        actions.setFindReplaceMode("find");
      } else if (modKey(e) && e.key === "h" && !e.shiftKey) {
        e.preventDefault();
        actions.setFindReplaceMode("replace");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions, modalOpen]);
}
