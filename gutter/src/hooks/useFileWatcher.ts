import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEditorStore } from "../stores/editorStore";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { hashContent } from "../utils/hash";

/**
 * Manages the file system watcher: starts/stops with workspace, listens for
 * tree-changed and file-changed events, and exposes a reload prompt.
 */
export function useFileWatcher(
  markdownRef: React.MutableRefObject<string>,
  lastSaveTimeRef: React.MutableRefObject<number>,
) {
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);
  const workspacePath = useWorkspaceStore((s) => s.workspacePath);
  const loadFileTree = useWorkspaceStore((s) => s.loadFileTree);

  useEffect(() => {
    if (!workspacePath) return;
    invoke("start_watcher", { path: workspacePath }).catch(console.error);

    let debounceTimer: ReturnType<typeof setTimeout>;
    const unlistenTree = listen<string>("tree-changed", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (workspacePath) loadFileTree(workspacePath);
      }, 500);
    });

    const fileChangeDebounces = new Map<string, ReturnType<typeof setTimeout>>();

    const unlistenFile = listen<string>("file-changed", (event) => {
      const changedPath = event.payload;
      const { openTabs } = useWorkspaceStore.getState();

      // Only care about files open in tabs
      const tab = openTabs.find(t => t.path === changedPath);
      if (!tab) return;

      // Ignore changes within 1.5s of our own save
      if (Date.now() - lastSaveTimeRef.current < 1500) return;

      // Per-path debounce (FSEvents fires multiple times)
      const existing = fileChangeDebounces.get(changedPath);
      if (existing) clearTimeout(existing);

      fileChangeDebounces.set(changedPath, setTimeout(async () => {
        fileChangeDebounces.delete(changedPath);
        try {
          const diskContent = await invoke<string>("read_file", { path: changedPath });
          const diskHash = hashContent(diskContent);
          const currentTab = useWorkspaceStore.getState().openTabs.find(t => t.path === changedPath);
          if (!currentTab) return;

          // If disk content matches what we last knew, nothing actually changed
          if (currentTab.diskHash === diskHash) return;

          const { activeTabPath: currentActive } = useWorkspaceStore.getState();

          if (changedPath === currentActive) {
            // ACTIVE TAB
            if (!currentTab.isDirty) {
              // Clean buffer → silent reload
              markdownRef.current = diskContent;
              useEditorStore.getState().setContentClean(diskContent);
              useEditorStore.getState().bumpContentVersion();
              useEditorStore.getState().setDirty(false);
              useWorkspaceStore.getState().setTabDiskHash(changedPath, diskHash);
              useWorkspaceStore.getState().setTabExternallyModified(changedPath, false);
            } else {
              // Dirty buffer → show conflict prompt
              useWorkspaceStore.getState().setTabExternallyModified(changedPath, true);
              setShowReloadPrompt(true);
            }
          } else {
            // BACKGROUND TAB: mark for handling on tab switch
            useWorkspaceStore.getState().setTabExternallyModified(changedPath, true);
          }
        } catch {
          // File may have been deleted
        }
      }, 500));
    });

    return () => {
      invoke("stop_watcher").catch(console.error);
      unlistenTree.then((fn) => fn());
      unlistenFile.then((fn) => fn());
      clearTimeout(debounceTimer);
      fileChangeDebounces.forEach((t) => clearTimeout(t));
      fileChangeDebounces.clear();
    };
  }, [workspacePath, loadFileTree, markdownRef, lastSaveTimeRef]);

  const reloadFromDisk = useCallback(async () => {
    const path = useEditorStore.getState().filePath;
    if (path) {
      const content = await invoke<string>("read_file", { path });
      markdownRef.current = content;
      useEditorStore.getState().setContent(content);
      useEditorStore.getState().bumpContentVersion();
      useEditorStore.getState().setDirty(false);
      const activeTab = useWorkspaceStore.getState().activeTabPath;
      if (activeTab) {
        useWorkspaceStore.getState().setTabDiskHash(activeTab, hashContent(content));
        useWorkspaceStore.getState().setTabExternallyModified(activeTab, false);
      }
    }
    setShowReloadPrompt(false);
  }, [markdownRef]);

  const dismissReloadPrompt = useCallback(() => {
    setShowReloadPrompt(false);
  }, []);

  return { showReloadPrompt, setShowReloadPrompt, reloadFromDisk, dismissReloadPrompt };
}
