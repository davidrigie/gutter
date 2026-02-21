import { useMemo } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useEditorStore } from "../stores/editorStore";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { useToastStore } from "../stores/toastStore";
import { modLabel } from "../utils/platform";
import { parentDir } from "../utils/path";

export interface Command {
  name: string;
  shortcut?: string;
  action: () => void | Promise<void>;
}

export interface CommandDeps {
  handleNewFile: () => void;
  handleOpenFile: () => void;
  handleSave: () => void;
  switchToSource: () => void;
  switchToWysiwyg: () => void;
  toggleFileTree: () => void;
  toggleComments: () => void;
  toggleHistory: () => void;
  toggleTags: () => void;
  toggleOutline: () => void;
  toggleReadingMode: () => void;
  cycleTheme: () => void;
  navigateComment: (direction: "next" | "prev") => void;
  setUnifiedSearchMode: (mode: "all" | "files" | "commands") => void;
  setFindReplaceMode: (mode: "find" | "replace") => void;
  setShowExport: (show: boolean) => void;
  setShowPreferences: (show: boolean) => void;
  setTemplatePicker: (v: { mode: "new" | "save"; targetFolder: string } | null) => void;
  createComment: () => void;
  toggleSpellCheck: () => void;
  getMarkdown: () => string;
}

/**
 * Builds the command palette commands array.
 */
export function useCommands(deps: CommandDeps): Command[] {
  const isSourceMode = useEditorStore((s) => s.isSourceMode);
  const isReadingMode = useEditorStore((s) => s.isReadingMode);

  return useMemo(() => {
    const mod = modLabel();
    return [
      { name: "New File", shortcut: `${mod}+N`, action: deps.handleNewFile },
      { name: "Search", shortcut: `${mod}+K`, action: () => deps.setUnifiedSearchMode("all") },
      { name: "Open File", shortcut: `${mod}+O`, action: deps.handleOpenFile },
      { name: "Save File", shortcut: `${mod}+S`, action: deps.handleSave },
      { name: "Toggle Source Mode", shortcut: `${mod}+/`, action: isSourceMode ? deps.switchToWysiwyg : deps.switchToSource },
      { name: "Toggle Reading Mode", shortcut: `${mod}+Shift+R`, action: () => {
        if (isSourceMode && !isReadingMode) deps.switchToWysiwyg();
        deps.toggleReadingMode();
      }},
      { name: "Toggle File Tree", shortcut: `${mod}+\\`, action: deps.toggleFileTree },
      { name: "Toggle Comments Panel", shortcut: `${mod}+Shift+C`, action: deps.toggleComments },
      { name: "Version History", shortcut: `${mod}+Shift+H`, action: deps.toggleHistory },
      { name: "Tag Browser", shortcut: `${mod}+Shift+T`, action: deps.toggleTags },
      { name: "Toggle Dark/Light Mode", shortcut: `${mod}+Shift+D`, action: () => deps.cycleTheme() },
      { name: "Toggle Document Outline", action: () => deps.toggleOutline() },
      { name: "Quick Open File", shortcut: `${mod}+P`, action: () => deps.setUnifiedSearchMode("files") },
      { name: "Find", shortcut: `${mod}+F`, action: () => deps.setFindReplaceMode("find") },
      { name: "Find and Replace", shortcut: `${mod}+H`, action: () => deps.setFindReplaceMode("replace") },
      { name: "Export", shortcut: `${mod}+Shift+E`, action: () => deps.setShowExport(true) },
      { name: "Preferences", shortcut: `${mod}+,`, action: () => deps.setShowPreferences(true) },
      { name: "Toggle Spell Check", action: () => deps.toggleSpellCheck() },
      { name: "New Comment", shortcut: `${mod}+Shift+M`, action: () => deps.createComment() },
      { name: "Next Comment", shortcut: `${mod}+Shift+N`, action: () => deps.navigateComment("next") },
      { name: "Previous Comment", action: () => deps.navigateComment("prev") },
      { name: "New from Template", action: async () => {
        const currentPath = useEditorStore.getState().filePath;
        const ws = useWorkspaceStore.getState().workspacePath;
        let folder = currentPath ? parentDir(currentPath) : ws;
        if (!folder) {
          const picked = await open({ directory: true });
          if (!picked) return;
          folder = typeof picked === "string" ? picked : (picked as { path: string }).path;
        }
        deps.setTemplatePicker({ mode: "new", targetFolder: folder });
      }},
      { name: "Save as Template", action: () => {
        if (!deps.getMarkdown()) { useToastStore.getState().addToast("No content to save as template", "error"); return; }
        const currentPath = useEditorStore.getState().filePath;
        const ws = useWorkspaceStore.getState().workspacePath;
        const folder = currentPath ? parentDir(currentPath) : (ws || "");
        deps.setTemplatePicker({ mode: "save", targetFolder: folder });
      }},
    ];
  }, [deps, isSourceMode, isReadingMode]);
}
