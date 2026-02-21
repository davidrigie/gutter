import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ask } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useEditorStore } from "../stores/editorStore";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { useCommentStore } from "../stores/commentStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useToastStore } from "../stores/toastStore";
import { useFileOps } from "./useFileOps";
import { useComments } from "./useComments";
import { fileName as pathFileName, parentDir, joinPath, isImageFile, resolveWikiLink } from "../utils/path";

/**
 * Manages tab lifecycle: activation, deactivation, open/close/switch,
 * editor content updates, mode switching, comment navigation,
 * wiki link events, OS file-open events, and template picker events.
 */
export function useTabLifecycle(
  markdownRef: React.MutableRefObject<string>,
  tabContentCache: React.MutableRefObject<Map<string, string>>,
  handleSave: () => Promise<void>,
  setShowReloadPrompt: (show: boolean) => void,
  lastSaveTimeRef: React.MutableRefObject<number>,
) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [templatePicker, setTemplatePicker] = useState<{ mode: "new" | "save"; targetFolder: string } | null>(null);

  const untitledCounterRef = useRef(0);
  const activationIdRef = useRef(0);

  const { openFile, scheduleAutoSave, cancelAutoSave } = useFileOps();
  const { loadCommentsFromFile } = useComments();

  const setContent = useEditorStore((s) => s.setContent);
  const setContentClean = useEditorStore((s) => s.setContentClean);
  const setDirty = useEditorStore((s) => s.setDirty);
  const setFilePath = useEditorStore((s) => s.setFilePath);
  const setActiveCommentId = useEditorStore((s) => s.setActiveCommentId);
  const setCommentTexts = useEditorStore((s) => s.setCommentTexts);
  const bumpContentVersion = useEditorStore((s) => s.bumpContentVersion);
  const toggleSourceMode = useEditorStore((s) => s.toggleSourceMode);
  const activeCommentId = useEditorStore((s) => s.activeCommentId);

  const addTab = useWorkspaceStore((s) => s.addTab);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const removeTab = useWorkspaceStore((s) => s.removeTab);
  const setTabDirty = useWorkspaceStore((s) => s.setTabDirty);
  const openTabs = useWorkspaceStore((s) => s.openTabs);
  const workspacePath = useWorkspaceStore((s) => s.workspacePath);
  const loadFileTree = useWorkspaceStore((s) => s.loadFileTree);

  const getThreadIds = useCommentStore((s) => s.getThreadIds);
  const addRecentFile = useSettingsStore((s) => s.addRecentFile);

  // Track current markdown for saving
  const handleEditorUpdate = useCallback(
    (markdown: string) => {
      markdownRef.current = markdown;
      setContent(markdown);
      const activeTab = useWorkspaceStore.getState().activeTabPath;
      if (activeTab) setTabDirty(activeTab, true);
      scheduleAutoSave(markdown);
    },
    [setContent, setTabDirty, scheduleAutoSave, markdownRef],
  );

  // Source mode content sync
  const handleSourceChange = useCallback(
    (value: string) => {
      markdownRef.current = value;
      setContent(value);
      const activeTab = useWorkspaceStore.getState().activeTabPath;
      if (activeTab) setTabDirty(activeTab, true);
      scheduleAutoSave(value);
    },
    [setContent, setTabDirty, scheduleAutoSave, markdownRef],
  );

  // Switch to source mode
  const switchToSource = useCallback(() => {
    toggleSourceMode();
  }, [toggleSourceMode]);

  // Switch back to WYSIWYG
  const switchToWysiwyg = useCallback(() => {
    toggleSourceMode();
  }, [toggleSourceMode]);

  // ─── Centralized Tab Lifecycle ───

  // Deactivate the current tab: stash content, cancel auto-save, clear comment state
  const deactivateCurrentTab = useCallback(() => {
    const prevTab = useWorkspaceStore.getState().activeTabPath;
    if (prevTab) {
      tabContentCache.current.set(prevTab, markdownRef.current);
    }
    cancelAutoSave();
    setActiveCommentId(null);
    setCommentTexts({});
  }, [cancelAutoSave, setActiveCommentId, setCommentTexts, tabContentCache, markdownRef]);

  // Activate a tab: load content from cache or disk, load comments with staleness guard
  const activateTab = useCallback(
    async (path: string) => {
      const myActivation = ++activationIdRef.current;

      setActiveTab(path);
      setShowReloadPrompt(false);

      // Handle image files
      if (isImageFile(path)) {
        setImagePreview(convertFileSrc(path));
        return;
      }
      setImagePreview(null);

      const isUntitled = path.startsWith("untitled:");

      // Load content: from cache if present, otherwise from disk
      if (tabContentCache.current.has(path)) {
        const content = tabContentCache.current.get(path) || "";
        setFilePath(isUntitled ? null : path);
        markdownRef.current = content;
        setContentClean(content);
        bumpContentVersion();
        // Dirty state from tab's isDirty flag
        const tab = useWorkspaceStore.getState().openTabs.find(t => t.path === path);
        setDirty(!!tab?.isDirty);
      } else if (!isUntitled) {
        try {
          const content = await invoke<string>("read_file", { path });
          // Staleness check: if another activation happened, bail
          if (activationIdRef.current !== myActivation) return;
          setFilePath(path);
          markdownRef.current = content;
          setContentClean(content);
          bumpContentVersion();
          setDirty(false);
        } catch (e) {
          useToastStore.getState().addToast("Failed to open file", "error");
          console.error("Failed to open file:", e);
          return;
        }
      }

      // Load comments (with staleness guard)
      if (!isUntitled) {
        await loadCommentsFromFile(path);
        if (activationIdRef.current !== myActivation) return;
      }
    },
    [setActiveTab, setFilePath, setContentClean, setDirty, bumpContentVersion, loadCommentsFromFile, setShowReloadPrompt, tabContentCache, markdownRef],
  );

  // Open file handler
  const handleOpenFile = useCallback(async () => {
    const content = await openFile();
    if (content !== null) {
      deactivateCurrentTab();
      const path = useEditorStore.getState().filePath;
      if (path) {
        markdownRef.current = content;
        const name = pathFileName(path) || "Untitled";
        addTab(path, name);
        addRecentFile(path);
        // activateTab will set content from cache, so stash it first
        tabContentCache.current.set(path, content);
        await activateTab(path);
      }
    }
  }, [openFile, deactivateCurrentTab, activateTab, addTab, addRecentFile, markdownRef, tabContentCache]);

  // Open specific file (from file tree)
  const handleFileTreeOpen = useCallback(
    async (path: string) => {
      deactivateCurrentTab();
      const name = pathFileName(path) || (isImageFile(path) ? "Image" : "Untitled");
      addTab(path, name);
      if (!isImageFile(path)) {
        addRecentFile(path);
      }
      await activateTab(path);
    },
    [deactivateCurrentTab, activateTab, addTab, addRecentFile],
  );

  // New file handler — creates an in-memory untitled buffer, named on save
  const handleNewFile = useCallback(() => {
    deactivateCurrentTab();

    untitledCounterRef.current += 1;
    const id = `untitled:${untitledCounterRef.current}`;
    const label = untitledCounterRef.current === 1 ? "Untitled" : `Untitled ${untitledCounterRef.current}`;

    tabContentCache.current.set(id, "");
    addTab(id, label);
    // activateTab handles setting filePath, content, etc.
    activateTab(id);
  }, [deactivateCurrentTab, activateTab, addTab, tabContentCache]);

  // Handle file-open from OS (startup or running)
  useEffect(() => {
    // Check for file passed at startup
    invoke<string | null>("get_open_file_path").then((path) => {
      if (path) {
        handleFileTreeOpen(path);
      }
    });

    // Listen for files opened while running
    const unlisten = listen<string>("open-file", (event) => {
      handleFileTreeOpen(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [handleFileTreeOpen]);

  // Wiki link click handler
  useEffect(() => {
    const handler = (e: Event) => {
      const target = (e as CustomEvent).detail?.target;
      if (!target || !workspacePath) return;

      // Obsidian-style resolution: search workspace tree, shortest path wins
      const { fileTree } = useWorkspaceStore.getState();
      const found = resolveWikiLink(target, fileTree);
      if (found) {
        handleFileTreeOpen(found);
        return;
      }

      // Not found — create in same directory as current file
      const currentPath = useEditorStore.getState().filePath;
      const dir = currentPath ? parentDir(currentPath) : workspacePath;
      const fName = target.endsWith(".md") ? target : `${target}.md`;
      const newPath = joinPath(dir, fName);
      invoke("write_file", { path: newPath, content: `# ${target}\n\n` })
        .then(() => {
          loadFileTree(workspacePath);
          handleFileTreeOpen(newPath);
          useToastStore.getState().addToast(`Created ${fName}`, "success", 2000);
        })
        .catch(() => {
          useToastStore.getState().addToast(`Failed to create ${fName}`, "error");
        });
    };
    window.addEventListener("wiki-link-click", handler);

    // Internal markdown link click handler
    const internalLinkHandler = (e: Event) => {
      const href = (e as CustomEvent).detail?.href;
      if (!href) return;
      const currentPath = useEditorStore.getState().filePath;
      if (!currentPath) return;
      // Resolve relative to current file's directory
      const dir = parentDir(currentPath);
      const resolved = joinPath(dir, href);
      // Add .md extension if not present
      const target = resolved.endsWith(".md") ? resolved : `${resolved}.md`;
      handleFileTreeOpen(target);
    };
    window.addEventListener("internal-link-click", internalLinkHandler);

    return () => {
      window.removeEventListener("wiki-link-click", handler);
      window.removeEventListener("internal-link-click", internalLinkHandler);
    };
  }, [workspacePath, handleFileTreeOpen, loadFileTree]);

  // Template picker from file tree context menu
  useEffect(() => {
    const handler = (e: Event) => {
      const folder = (e as CustomEvent).detail?.folder;
      if (!folder) return;
      setTemplatePicker({ mode: "new", targetFolder: folder });
    };
    window.addEventListener("template-new-from", handler);
    return () => window.removeEventListener("template-new-from", handler);
  }, []);

  // Tab handlers
  const handleSwitchTab = useCallback(
    async (path: string) => {
      deactivateCurrentTab();
      await activateTab(path);
    },
    [deactivateCurrentTab, activateTab],
  );

  const handleCloseTab = useCallback(
    async (path: string) => {
      const isUntitled = path.startsWith("untitled:");
      const tab = openTabs.find((t) => t.path === path);
      if (tab?.isDirty) {
        const shouldSave = await ask(
          `"${tab.name}" has unsaved changes. Save before closing?`,
          { title: "Unsaved Changes", kind: "warning" },
        );
        if (shouldSave) {
          // For untitled tabs, we need to ensure it's the active tab so saveFile can prompt
          const isActive = useWorkspaceStore.getState().activeTabPath === path;
          if (isUntitled && !isActive) {
            setActiveTab(path);
            const content = tabContentCache.current.get(path) || "";
            setFilePath(null);
            markdownRef.current = content;
          }
          lastSaveTimeRef.current = Date.now();
          await handleSave();
        }
      }
      // Clean up cached content for this tab
      tabContentCache.current.delete(path);

      const wasActive = useWorkspaceStore.getState().activeTabPath === path;
      removeTab(path);

      if (wasActive) {
        const newActive = useWorkspaceStore.getState().activeTabPath;
        if (newActive) {
          await activateTab(newActive);
        } else {
          setImagePreview(null);
          markdownRef.current = "";
          setFilePath(null);
          setContentClean("");
          bumpContentVersion();
          setDirty(false);
        }
      }
    },
    [openTabs, removeTab, handleSave, activateTab, setActiveTab, setFilePath, setContentClean, setDirty, bumpContentVersion, tabContentCache, markdownRef, lastSaveTimeRef],
  );

  // Comment navigation
  const navigateComment = useCallback(
    (direction: "next" | "prev") => {
      const ids = getThreadIds();
      if (ids.length === 0) return;
      const currentIdx = activeCommentId ? ids.indexOf(activeCommentId) : -1;
      let nextIdx: number;
      if (direction === "next") {
        nextIdx = currentIdx < ids.length - 1 ? currentIdx + 1 : 0;
      } else {
        nextIdx = currentIdx > 0 ? currentIdx - 1 : ids.length - 1;
      }
      setActiveCommentId(ids[nextIdx]);
    },
    [getThreadIds, activeCommentId, setActiveCommentId],
  );

  return {
    handleOpenFile,
    handleFileTreeOpen,
    handleNewFile,
    handleSwitchTab,
    handleCloseTab,
    handleEditorUpdate,
    handleSourceChange,
    switchToSource,
    switchToWysiwyg,
    navigateComment,
    imagePreview,
    setImagePreview,
    templatePicker,
    setTemplatePicker,
  };
}
