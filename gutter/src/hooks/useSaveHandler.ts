import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useEditorStore } from "../stores/editorStore";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { useTagStore } from "../stores/tagStore";
import { useToastStore } from "../stores/toastStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useFileOps } from "./useFileOps";
import { useComments } from "./useComments";
import { fileName as pathFileName } from "../utils/path";

/**
 * Encapsulates save logic, history restore, and version preview state.
 */
export function useSaveHandler(
  markdownRef: React.MutableRefObject<string>,
  lastSaveTimeRef: React.MutableRefObject<number>,
  tabContentCache: React.MutableRefObject<Map<string, string>>,
) {
  const [versionPreview, setVersionPreview] = useState<{ content: string; label: string } | null>(null);

  const { saveFile } = useFileOps();
  const { saveComments, generateCompanion } = useComments();
  const setTabDirty = useWorkspaceStore((s) => s.setTabDirty);
  const updateTabPath = useWorkspaceStore((s) => s.updateTabPath);
  const loadFileTree = useWorkspaceStore((s) => s.loadFileTree);
  const addRecentFile = useSettingsStore((s) => s.addRecentFile);

  const handleSave = useCallback(async () => {
    const md = markdownRef.current;
    const activeTab = useWorkspaceStore.getState().activeTabPath;
    const wasUntitled = activeTab?.startsWith("untitled:");
    lastSaveTimeRef.current = Date.now();

    await saveFile(md);
    const path = useEditorStore.getState().filePath;

    // If this was an untitled tab that now has a real path, update the tab
    if (wasUntitled && path && activeTab) {
      const name = pathFileName(path) || "Untitled";
      updateTabPath(activeTab, path, name);
      // Move cached content to new path key
      tabContentCache.current.delete(activeTab);
      tabContentCache.current.set(path, md);
      addRecentFile(path);
      const ws = useWorkspaceStore.getState().workspacePath;
      if (ws) await loadFileTree(ws);
    }

    if (path) {
      await saveComments();
      await generateCompanion(md);
      setTabDirty(path, false);
      useToastStore.getState().addToast("File saved", "success", 2000);
      // Fire-and-forget snapshot for version history
      invoke("save_snapshot", { filePath: path, content: md }).catch(console.error);
      // Incrementally update tag index
      useTagStore.getState().updateFileTags(path, md);
    }
  }, [saveFile, saveComments, generateCompanion, setTabDirty, updateTabPath, addRecentFile, loadFileTree, markdownRef, lastSaveTimeRef, tabContentCache]);

  const handleHistoryRestore = useCallback((content: string) => {
    markdownRef.current = content;
    useEditorStore.getState().setContent(content);
    useEditorStore.getState().bumpContentVersion();
    useEditorStore.getState().setDirty(true);
    setVersionPreview(null);
    const activeTab = useWorkspaceStore.getState().activeTabPath;
    if (activeTab) setTabDirty(activeTab, true);
  }, [setTabDirty, markdownRef]);

  const handleHistoryPreview = useCallback((content: string, label: string) => {
    setVersionPreview({ content, label });
  }, []);

  return { handleSave, handleHistoryRestore, handleHistoryPreview, versionPreview, setVersionPreview };
}
