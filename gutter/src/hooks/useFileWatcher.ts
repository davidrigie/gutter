import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEditorStore } from "../stores/editorStore";
import { useWorkspaceStore } from "../stores/workspaceStore";

/** Normalize markdown for comparison (handles line endings and trailing whitespace) */
const normalizeMarkdown = (s: string) => s.replace(/\r\n/g, "\n").trim();

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

    let fileChangeDebounce: ReturnType<typeof setTimeout>;
    const unlistenFile = listen<string>("file-changed", (event) => {
      const changedPath = event.payload;
      const { openTabs, activeTabPath } = useWorkspaceStore.getState();

      // Ensure the file is actually still open in a tab
      const isFileOpen = openTabs.some(t => t.path === changedPath);
      if (!isFileOpen) {
        // If the file being reported is the one currently showing a prompt, clear it
        if (changedPath === activeTabPath) {
          setShowReloadPrompt(false);
        }
        return;
      }

      if (changedPath !== activeTabPath) return;

      // Ignore changes that happen within 1.5s of our own save
      if (Date.now() - lastSaveTimeRef.current < 1500) return;

      // Debounce: FSEvents can fire multiple times for one save
      clearTimeout(fileChangeDebounce);
      fileChangeDebounce = setTimeout(async () => {
        try {
          const diskContent = await invoke<string>("read_file", { path: changedPath });
          // Only show prompt if normalized disk content actually differs from editor content
          if (normalizeMarkdown(diskContent) !== normalizeMarkdown(markdownRef.current)) {
            setShowReloadPrompt(true);
          }
        } catch {
          // File may have been deleted — ignore
        }
      }, 500);
    });

    return () => {
      invoke("stop_watcher").catch(console.error);
      unlistenTree.then((fn) => fn());
      unlistenFile.then((fn) => fn());
      clearTimeout(debounceTimer);
      clearTimeout(fileChangeDebounce);
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
    }
    setShowReloadPrompt(false);
  }, [markdownRef]);

  const dismissReloadPrompt = useCallback(() => {
    setShowReloadPrompt(false);
  }, []);

  return { showReloadPrompt, setShowReloadPrompt, reloadFromDisk, dismissReloadPrompt };
}
