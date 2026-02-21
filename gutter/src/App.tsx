import { useCallback, useEffect, useRef, useState } from "react";
import { GutterEditor } from "./components/Editor/GutterEditor";
import { SourceEditor } from "./components/Editor/SourceEditor";
import { ReadingMode } from "./components/ReadingMode";
import { FileTree } from "./components/FileTree/FileTree";
import { CommentsPanel } from "./components/Comments/CommentsPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { TagBrowser } from "./components/TagBrowser";
import { TagBar } from "./components/TagBar";
import { VersionPreview } from "./components/VersionPreview";
import { StatusBar } from "./components/StatusBar";
import { TabBar } from "./components/TabBar";
import { UnifiedSearch } from "./components/UnifiedSearch";
import { ToastContainer } from "./components/Toast";
import { useToastStore } from "./stores/toastStore";
import { ResizeHandle } from "./components/ResizeHandle";
import { FindReplace } from "./components/FindReplace";
import { DocumentOutline } from "./components/DocumentOutline";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { BacklinksPanel } from "./components/BacklinksPanel";
import { ExportDialog } from "./components/ExportDialog";
import { TemplatePicker } from "./components/TemplatePicker";
import { PreferencesDialog } from "./components/PreferencesDialog";
import { useEditorStore } from "./stores/editorStore";
import { useTagStore } from "./stores/tagStore";
import { useWorkspaceStore } from "./stores/workspaceStore";
import { useCommentStore } from "./stores/commentStore";
import { useSettingsStore } from "./stores/settingsStore";
import { useFileOps } from "./hooks/useFileOps";
import { useComments } from "./hooks/useComments";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ask, open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { modKey, modLabel } from "./utils/platform";
import { fileName as pathFileName, parentDir, joinPath, isImageFile, resolveWikiLink } from "./utils/path";
import { convertFileSrc } from "@tauri-apps/api/core";

// Helper to normalize markdown content for comparison (handles line endings and trailing whitespace)
const normalizeMarkdown = (s: string) => s.replace(/\r\n/g, "\n").trim();

function App() {
  const {
    isSourceMode,
    isReadingMode,
    showFileTree,
    showComments,
    showHistory,
    showTags,
    isDirty,
    fileName,
    activeCommentId,
    toggleSourceMode,
    toggleReadingMode,
    toggleFileTree,
    toggleComments,
    toggleHistory,
    toggleTags,
    showOutline,
    toggleOutline,
    setContent,
    setContentClean,
    setDirty,
    setFilePath,
    setActiveCommentId,
    setCommentTexts,
    contentVersion,
    bumpContentVersion,
  } = useEditorStore();

  const { theme, cycleTheme, loadSettings, addRecentFile, panelWidths, setPanelWidth, fontSize, fontFamily, editorWidth, lineHeight, accentColor } = useSettingsStore();

  const { addTab, setActiveTab, removeTab, setTabDirty, updateTabPath, workspacePath, loadFileTree, openTabs, activeTabPath } = useWorkspaceStore();
  const { getThreadIds } = useCommentStore();
  const { openFile, saveFile, scheduleAutoSave, cancelAutoSave } = useFileOps();
  const { loadCommentsFromFile, saveComments, generateCompanion } = useComments();

  const [unifiedSearchMode, setUnifiedSearchMode] = useState<"all" | "files" | "commands" | null>(null);
  const [findReplaceMode, setFindReplaceMode] = useState<"find" | "replace" | null>(null);
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [templatePicker, setTemplatePicker] = useState<{ mode: "new" | "save"; targetFolder: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [versionPreview, setVersionPreview] = useState<{ content: string; label: string } | null>(null);
  const [sourceSearchMatches, setSourceSearchMatches] = useState<{ start: number; end: number }[]>([]);
  const [sourceCurrentMatch, setSourceCurrentMatch] = useState(-1);
  const markdownRef = useRef("");
  const lastSaveTimeRef = useRef<number>(0);
  const untitledCounterRef = useRef(0);
  const tabContentCache = useRef<Map<string, string>>(new Map());
  const activationIdRef = useRef(0);

  const sourceTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const editorInstanceRef = useRef<{
    createComment: () => void;
    navigateComment: (direction: "next" | "prev") => void;
    getMarkdown: () => string;
    getEditor: () => import("@tiptap/react").Editor | null;
  } | null>(null);

  // Load settings on startup
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Scan tags when workspace loads
  useEffect(() => {
    if (workspacePath) {
      useTagStore.getState().scanWorkspace(workspacePath);
    }
  }, [workspacePath]);

  // File watcher: start when workspace changes, listen for events
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
  }, [workspacePath, loadFileTree]);

  // Track current markdown for saving
  const handleEditorUpdate = useCallback(
    (markdown: string) => {
      markdownRef.current = markdown;
      setContent(markdown);
      const activeTab = useWorkspaceStore.getState().activeTabPath;
      if (activeTab) setTabDirty(activeTab, true);
      scheduleAutoSave(markdown);
    },
    [setContent, setTabDirty, scheduleAutoSave],
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
    [setContent, setTabDirty, scheduleAutoSave],
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
  }, [cancelAutoSave, setActiveCommentId, setCommentTexts]);

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
    [setActiveTab, setFilePath, setContentClean, setDirty, bumpContentVersion, loadCommentsFromFile],
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
  }, [openFile, deactivateCurrentTab, activateTab, addTab, addRecentFile]);

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
  }, [deactivateCurrentTab, activateTab, addTab]);

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

  // Save handler — also saves comments and generates companion
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
  }, [saveFile, saveComments, generateCompanion, setTabDirty, updateTabPath, addRecentFile, loadFileTree]);

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
    [openTabs, removeTab, handleSave, activateTab, setActiveTab, setFilePath, setContentClean, setDirty, bumpContentVersion],
  );

  // Handle history restore
  const handleHistoryRestore = useCallback((content: string) => {
    markdownRef.current = content;
    setContent(content);
    bumpContentVersion();
    setDirty(true);
    setVersionPreview(null);
    const activeTab = useWorkspaceStore.getState().activeTabPath;
    if (activeTab) setTabDirty(activeTab, true);
  }, [setContent, bumpContentVersion, setDirty, setTabDirty]);

  // Handle history preview — show rendered version in main panel
  const handleHistoryPreview = useCallback((content: string, label: string) => {
    setVersionPreview({ content, label });
  }, []);

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

  // Commands for command palette
  const mod = modLabel();
  const commands = [
    { name: "New File", shortcut: `${mod}+N`, action: handleNewFile },
    { name: "Search", shortcut: `${mod}+K`, action: () => setUnifiedSearchMode("all") },
    { name: "Open File", shortcut: `${mod}+O`, action: handleOpenFile },
    { name: "Save File", shortcut: `${mod}+S`, action: handleSave },
    { name: "Toggle Source Mode", shortcut: `${mod}+/`, action: isSourceMode ? switchToWysiwyg : switchToSource },
    { name: "Toggle Reading Mode", shortcut: `${mod}+Shift+R`, action: () => {
      if (isSourceMode && !isReadingMode) switchToWysiwyg();
      toggleReadingMode();
    }},
    { name: "Toggle File Tree", shortcut: `${mod}+\\`, action: toggleFileTree },
    { name: "Toggle Comments Panel", shortcut: `${mod}+Shift+C`, action: toggleComments },
    { name: "Version History", shortcut: `${mod}+Shift+H`, action: toggleHistory },
    { name: "Tag Browser", shortcut: `${mod}+Shift+T`, action: toggleTags },
    { name: "Toggle Dark/Light Mode", shortcut: `${mod}+Shift+D`, action: () => cycleTheme() },
    { name: "Toggle Document Outline", action: () => toggleOutline() },
    { name: "Quick Open File", shortcut: `${mod}+P`, action: () => setUnifiedSearchMode("files") },
    { name: "Find", shortcut: `${mod}+F`, action: () => setFindReplaceMode("find") },
    { name: "Find and Replace", shortcut: `${mod}+H`, action: () => setFindReplaceMode("replace") },
    { name: "Export", shortcut: `${mod}+Shift+E`, action: () => setShowExport(true) },
    { name: "Preferences", shortcut: `${mod}+,`, action: () => setShowPreferences(true) },
    { name: "Toggle Spell Check", action: () => {
      const e = editorInstanceRef.current?.getEditor();
      if (e) e.commands.toggleSpellCheck();
    }},
    { name: "New Comment", shortcut: `${mod}+Shift+M`, action: () => editorInstanceRef.current?.createComment() },
    { name: "Next Comment", shortcut: `${mod}+Shift+N`, action: () => navigateComment("next") },
    { name: "Previous Comment", action: () => navigateComment("prev") },
    { name: "New from Template", action: async () => {
      const currentPath = useEditorStore.getState().filePath;
      const ws = useWorkspaceStore.getState().workspacePath;
      let folder = currentPath ? parentDir(currentPath) : ws;
      if (!folder) {
        const picked = await open({ directory: true });
        if (!picked) return;
        folder = typeof picked === "string" ? picked : (picked as { path: string }).path;
      }
      setTemplatePicker({ mode: "new", targetFolder: folder });
    }},
    { name: "Save as Template", action: () => {
      if (!markdownRef.current) { useToastStore.getState().addToast("No content to save as template", "error"); return; }
      const currentPath = useEditorStore.getState().filePath;
      const ws = useWorkspaceStore.getState().workspacePath;
      const folder = currentPath ? parentDir(currentPath) : (ws || "");
      setTemplatePicker({ mode: "save", targetFolder: folder });
    }},
  ];

  // Native menu bar event listeners
  useEffect(() => {
    const unlisteners = [
      listen("menu:new-file", () => handleNewFile()),
      listen("menu:open", () => handleOpenFile()),
      listen("menu:open-folder", async () => {
        const selected = await open({ directory: true });
        if (selected) {
          const path = typeof selected === "string" ? selected : (selected as { path: string }).path;
          await loadFileTree(path);
        }
      }),
      listen("menu:save", () => handleSave()),
      listen("menu:export", () => setShowExport(true)),
      listen("menu:preferences", () => setShowPreferences(true)),
      listen("menu:toggle-tree", () => toggleFileTree()),
      listen("menu:toggle-comments", () => toggleComments()),
      listen("menu:toggle-history", () => toggleHistory()),
      listen("menu:toggle-tags", () => toggleTags()),
      listen("menu:toggle-outline", () => toggleOutline()),
      listen("menu:toggle-source", () => {
        if (useEditorStore.getState().isSourceMode) {
          switchToWysiwyg();
        } else {
          switchToSource();
        }
      }),
      listen("menu:toggle-reading", () => {
        const state = useEditorStore.getState();
        if (state.isSourceMode && !state.isReadingMode) switchToWysiwyg();
        toggleReadingMode();
      }),
      listen("menu:cycle-theme", () => cycleTheme()),
      listen("menu:search", () => setUnifiedSearchMode("all")),
      listen("menu:quick-open", () => setUnifiedSearchMode("files")),
      listen("menu:find", () => setFindReplaceMode("find")),
      listen("menu:replace", () => setFindReplaceMode("replace")),
      listen("menu:new-comment", () => editorInstanceRef.current?.createComment()),
      listen("menu:next-comment", () => navigateComment("next")),
      listen("menu:prev-comment", () => navigateComment("prev")),
      listen("menu:new-from-template", async () => {
        const currentPath = useEditorStore.getState().filePath;
        const ws = useWorkspaceStore.getState().workspacePath;
        let folder = currentPath ? parentDir(currentPath) : ws;
        if (!folder) {
          const picked = await open({ directory: true });
          if (!picked) return;
          folder = typeof picked === "string" ? picked : (picked as { path: string }).path;
        }
        setTemplatePicker({ mode: "new", targetFolder: folder });
      }),
      listen("menu:save-as-template", () => {
        if (!markdownRef.current) return;
        const currentPath = useEditorStore.getState().filePath;
        const ws = useWorkspaceStore.getState().workspacePath;
        const folder = currentPath ? parentDir(currentPath) : (ws || "");
        setTemplatePicker({ mode: "save", targetFolder: folder });
      }),
    ];
    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, [
    handleNewFile,
    handleOpenFile,
    handleSave,
    toggleFileTree,
    toggleComments,
    toggleHistory,
    toggleTags,
    toggleOutline,
    toggleReadingMode,
    switchToSource,
    switchToWysiwyg,
    cycleTheme,
    navigateComment,
  ]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 4a: Skip all shortcuts (except Escape) when a modal/dialog is open
      if (e.key !== "Escape" && (unifiedSearchMode || showExport || showPreferences || templatePicker)) {
        return;
      }

      if (modKey(e) && !e.shiftKey && e.key === "n") {
        e.preventDefault();
        handleNewFile();
      } else if (modKey(e) && e.key === "o") {
        e.preventDefault();
        handleOpenFile();
      } else if (modKey(e) && e.key === "s") {
        e.preventDefault();
        handleSave();
      } else if (modKey(e) && e.key === "/") {
        e.preventDefault();
        if (isSourceMode) {
          switchToWysiwyg();
        } else {
          switchToSource();
        }
      } else if (modKey(e) && e.key === "\\") {
        e.preventDefault();
        toggleFileTree();
      } else if (modKey(e) && e.shiftKey && e.key === "C") {
        e.preventDefault();
        toggleComments();
      } else if (modKey(e) && e.shiftKey && e.key === "H") {
        e.preventDefault();
        toggleHistory();
      } else if (modKey(e) && e.shiftKey && e.key === "T") {
        e.preventDefault();
        toggleTags();
      } else if (modKey(e) && e.shiftKey && e.key === "D") {
        e.preventDefault();
        cycleTheme();
      } else if (modKey(e) && !e.shiftKey && e.key === "k") {
        // 4b: Don't hijack Cmd+K when focus is inside the ProseMirror editor (it inserts a link)
        if (document.activeElement?.closest(".ProseMirror")) return;
        e.preventDefault();
        setUnifiedSearchMode("all");
      } else if (modKey(e) && !e.shiftKey && e.key === "p") {
        e.preventDefault();
        setUnifiedSearchMode("files");
      } else if (modKey(e) && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setUnifiedSearchMode("commands");
      } else if (modKey(e) && e.key === ".") {
        e.preventDefault();
        setUnifiedSearchMode("commands");
      } else if (modKey(e) && e.shiftKey && e.key === "M") {
        e.preventDefault();
        editorInstanceRef.current?.createComment();
      } else if (modKey(e) && e.shiftKey && e.key === "N") {
        e.preventDefault();
        navigateComment("next");
      } else if (modKey(e) && e.shiftKey && e.key === "E") {
        e.preventDefault();
        setShowExport(true);
      } else if (modKey(e) && e.key === ",") {
        e.preventDefault();
        setShowPreferences(true);
      } else if (modKey(e) && e.shiftKey && e.key === "R") {
        e.preventDefault();
        const state = useEditorStore.getState();
        if (state.isSourceMode && !state.isReadingMode) switchToWysiwyg();
        toggleReadingMode();
      } else if (e.key === "Escape" && useEditorStore.getState().isReadingMode) {
        e.preventDefault();
        toggleReadingMode();
      } else if (modKey(e) && e.key === "f" && !e.shiftKey) {
        e.preventDefault();
        setFindReplaceMode("find");
      } else if (modKey(e) && e.key === "h" && !e.shiftKey) {
        e.preventDefault();
        setFindReplaceMode("replace");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleNewFile,
    handleOpenFile,
    handleSave,
    isSourceMode,
    switchToSource,
    switchToWysiwyg,
    toggleFileTree,
    toggleComments,
    toggleHistory,
    toggleTags,
    toggleReadingMode,
    cycleTheme,
    navigateComment,
    unifiedSearchMode,
    showExport,
    showPreferences,
    templatePicker,
  ]);

  // Theme application
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [theme]);

  // Sync editor CSS variables from settings
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--editor-font-size", `${fontSize}px`);

    const fontMap: Record<string, string> = {
      serif: "var(--font-serif)",
      sans: "var(--font-sans)",
      mono: '"SF Mono", "Fira Code", "Fira Mono", Menlo, monospace',
    };
    root.style.setProperty("--editor-font-family", fontMap[fontFamily] || fontMap.serif);

    const widthMap: Record<string, string> = {
      narrow: "36rem",
      medium: "48rem",
      wide: "64rem",
      full: "100%",
    };
    root.style.setProperty("--editor-max-width", widthMap[editorWidth] || widthMap.medium);

    const lineHeightMap: Record<string, string> = {
      compact: "1.4",
      comfortable: "1.7",
      spacious: "2.0",
    };
    root.style.setProperty("--editor-line-height", lineHeightMap[lineHeight] || lineHeightMap.comfortable);

    // Accent color presets — light and dark variants
    const accentPresets: Record<string, { light: string; dark: string }> = {
      indigo:  { light: "#6366f1", dark: "#818cf8" },
      blue:    { light: "#3b82f6", dark: "#60a5fa" },
      violet:  { light: "#8b5cf6", dark: "#a78bfa" },
      rose:    { light: "#f43f5e", dark: "#fb7185" },
      orange:  { light: "#f97316", dark: "#fb923c" },
      green:   { light: "#22c55e", dark: "#4ade80" },
      teal:    { light: "#0d9488", dark: "#2dd4bf" },
    };
    const isDark = document.documentElement.classList.contains("dark");
    const preset = accentPresets[accentColor];
    // Support custom hex colors (e.g. "#e05d44") or preset names
    const color = preset
      ? (isDark ? preset.dark : preset.light)
      : (accentColor.startsWith("#") ? accentColor : accentPresets.teal[isDark ? "dark" : "light"]);
    root.style.setProperty("--accent", color);
    // Derive hover and alpha variants
    const hoverColor = preset
      ? (isDark ? preset.light : preset.dark)
      : `color-mix(in srgb, ${color} 80%, ${isDark ? "white" : "black"})`;
    root.style.setProperty("--accent-hover", hoverColor);
    root.style.setProperty("--accent-subtle", `color-mix(in srgb, ${color} 8%, transparent)`);
    root.style.setProperty("--accent-muted", `color-mix(in srgb, ${color} 50%, transparent)`);
    root.style.setProperty("--focus-shadow", `0 0 0 2px color-mix(in srgb, ${color} 15%, transparent)`);
    root.style.setProperty("--selection-bg", `color-mix(in srgb, ${color} 10%, transparent)`);
  }, [fontSize, fontFamily, editorWidth, lineHeight, accentColor, theme]);

  // Prevent closing window with dirty tabs
  useEffect(() => {
    const unlisten = getCurrentWindow().onCloseRequested(async (event) => {
      try {
        const { openTabs: tabs } = useWorkspaceStore.getState();
        const hasDirty = tabs.some((t) => t.isDirty);
        if (hasDirty) {
          event.preventDefault();
          const shouldClose = await ask(
            "You have unsaved changes. Close without saving?",
            { title: "Unsaved Changes", kind: "warning" },
          );
          if (shouldClose) {
            getCurrentWindow().destroy();
          }
        }
      } catch {
        // If dialog fails, close anyway
        getCurrentWindow().destroy();
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Handle files dragged from OS file explorer
  useEffect(() => {
    const unlisten = getCurrentWindow().onDragDropEvent(async (event) => {
      if (event.payload.type !== "drop") return;
      const { paths } = event.payload;
      for (const path of paths) {
        if (isImageFile(path)) {
          const filePath = useEditorStore.getState().filePath;
          if (!filePath) {
            useToastStore.getState().addToast("Save the file first to insert images", "error");
            return;
          }
          const dirPath = parentDir(filePath);
          const ext = path.split(".").pop() || "png";
          const filename = `image-${Date.now()}.${ext}`;
          try {
            await invoke("copy_image", { source: path, dirPath, filename });
            const absolutePath = joinPath(dirPath, "assets", filename);
            const displaySrc = convertFileSrc(absolutePath);
            const editor = editorInstanceRef.current?.getEditor();
            if (editor) {
              editor.chain().focus().setImage({ src: displaySrc }).run();
            }
          } catch (e) {
            console.error("Failed to insert dropped image:", e);
            useToastStore.getState().addToast("Failed to insert image", "error");
          }
        } else if (path.endsWith(".md") || path.endsWith(".markdown")) {
          handleFileTreeOpen(path);
        }
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [handleFileTreeOpen]);

  // Clear version preview when history panel is closed
  useEffect(() => {
    if (!showHistory) setVersionPreview(null);
  }, [showHistory]);

  // Update document title
  useEffect(() => {
    document.title = `${isDirty ? "● " : ""}${fileName} — Gutter`;
  }, [isDirty, fileName]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--editor-bg)] text-[var(--editor-text)] transition-colors">
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree Sidebar */}
        {showFileTree && !isReadingMode && (
          <>
            <aside
              className="border-r border-[var(--editor-border)] shrink-0 overflow-hidden sidebar-panel"
              style={{ width: panelWidths.fileTree }}
            >
              <FileTree onFileOpen={handleFileTreeOpen} />
            </aside>
            <ResizeHandle
              side="left"
              currentWidth={panelWidths.fileTree}
              minWidth={160}
              maxWidth={Math.floor(window.innerWidth * 0.5)}
              onResize={(w) => setPanelWidth("fileTree", w)}
              onDoubleClick={() => setPanelWidth("fileTree", 224)}
            />
          </>
        )}

        {/* Document Outline */}
        {showOutline && !isReadingMode && (
          <>
            <aside
              className="w-56 border-r border-[var(--editor-border)] shrink-0 overflow-hidden sidebar-panel"
            >
              <DocumentOutline editor={editorInstanceRef.current?.getEditor() ?? null} />
            </aside>
          </>
        )}

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!isReadingMode && <TabBar onNewFile={handleNewFile} onSwitchTab={handleSwitchTab} onCloseTab={handleCloseTab} />}
          {!isReadingMode && !imagePreview && activeTabPath && (
            <TagBar
              getEditor={() => editorInstanceRef.current?.getEditor() ?? null}
              getMarkdown={() => markdownRef.current}
              onContentChange={(md) => {
                markdownRef.current = md;
                setContent(md);
                bumpContentVersion();
                setDirty(true);
                const tab = useWorkspaceStore.getState().activeTabPath;
                if (tab) setTabDirty(tab, true);
              }}
            />
          )}

          {showReloadPrompt && !isReadingMode && (
            <div className="h-8 flex items-center justify-between px-3 text-[12px] bg-[color-mix(in_srgb,var(--status-info),transparent_90%)] text-[var(--status-info)] border-b border-[var(--editor-border)]">
              <span>This file has been modified externally.</span>
              <div className="flex gap-2">
                <button
                  className="px-2 py-0.5 rounded text-[11px] bg-[var(--accent)] text-white hover:opacity-90"
                  onClick={async () => {
                    const path = useEditorStore.getState().filePath;
                    if (path) {
                      const content = await invoke<string>("read_file", { path });
                      markdownRef.current = content;
                      setContent(content);
                      bumpContentVersion();
                      setDirty(false);
                    }
                    setShowReloadPrompt(false);
                  }}
                >
                  Reload
                </button>
                <button
                  className="px-2 py-0.5 rounded text-[11px] hover:bg-[var(--surface-hover)]"
                  onClick={() => setShowReloadPrompt(false)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {findReplaceMode && !isReadingMode && (
            <FindReplace
              editor={isSourceMode ? null : (editorInstanceRef.current?.getEditor() ?? null)}
              mode={findReplaceMode}
              onClose={() => {
                setFindReplaceMode(null);
                setSourceSearchMatches([]);
                setSourceCurrentMatch(-1);
              }}
              sourceTextarea={isSourceMode ? sourceTextareaRef : undefined}
              onSourceReplace={isSourceMode ? (from, to, replacement) => {
                const current = useEditorStore.getState().content;
                const updated = current.substring(0, from) + replacement + current.substring(to);
                handleSourceChange(updated);
              } : undefined}
              onSourceMatchesChange={isSourceMode ? (matches, idx) => {
                setSourceSearchMatches(matches);
                setSourceCurrentMatch(idx);
              } : undefined}
            />
          )}

          {/* Mode indicator */}
          {isSourceMode && !isReadingMode && (
            <div className="h-7 flex items-center px-3 text-[12px] bg-[color-mix(in_srgb,var(--status-warning),transparent_90%)] text-[var(--status-warning)] border-b border-[var(--editor-border)]">
              Source Mode — Editing raw markdown ({modLabel()}+/ to switch back)
            </div>
          )}

          <main className="flex-1 flex flex-col overflow-auto">
            {versionPreview ? (
              <VersionPreview
                content={versionPreview.content}
                currentContent={markdownRef.current}
                label={versionPreview.label}
                onRestore={() => handleHistoryRestore(versionPreview.content)}
                onDismiss={() => setVersionPreview(null)}
              />
            ) : imagePreview ? (
              <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
                <img
                  src={imagePreview}
                  className="max-w-full max-h-full object-contain rounded shadow-lg"
                  onError={() => {
                    setImagePreview(null);
                    useToastStore.getState().addToast("Failed to load image", "error");
                  }}
                />
              </div>
            ) : openTabs.length === 0 && activeTabPath === null ? (
              <WelcomeScreen
                onNewFile={handleNewFile}
                onOpenFile={handleOpenFile}
                onOpenRecent={handleFileTreeOpen}
              />
            ) : isReadingMode ? (
              <ReadingMode content={markdownRef.current} />
            ) : isSourceMode ? (
              <SourceEditor
                onChange={handleSourceChange}
                textareaRef={sourceTextareaRef}
                searchMatches={sourceSearchMatches}
                currentMatchIndex={sourceCurrentMatch}
              />
            ) : (
              <GutterEditor
                key={`${activeTabPath}-${contentVersion}`}
                onUpdate={handleEditorUpdate}
                ref={editorInstanceRef}
              />
            )}
          </main>
        </div>

        {/* Comments Sidebar */}
        {showComments && !isReadingMode && (
          <>
            <ResizeHandle
              side="right"
              currentWidth={panelWidths.comments}
              minWidth={220}
              maxWidth={Math.floor(window.innerWidth * 0.5)}
              onResize={(w) => setPanelWidth("comments", w)}
              onDoubleClick={() => setPanelWidth("comments", 288)}
            />
            <aside
              className="border-l border-[var(--editor-border)] shrink-0 overflow-auto sidebar-panel"
              style={{ width: panelWidths.comments }}
            >
              <CommentsPanel />
              <div className="border-t border-[var(--editor-border)]">
                <BacklinksPanel onOpenFile={handleFileTreeOpen} />
              </div>
            </aside>
          </>
        )}

        {/* History Sidebar */}
        {showHistory && !isReadingMode && (
          <>
            <ResizeHandle
              side="right"
              currentWidth={panelWidths.history}
              minWidth={220}
              maxWidth={Math.floor(window.innerWidth * 0.5)}
              onResize={(w) => setPanelWidth("history", w)}
              onDoubleClick={() => setPanelWidth("history", 288)}
            />
            <aside
              className="border-l border-[var(--editor-border)] shrink-0 overflow-auto sidebar-panel"
              style={{ width: panelWidths.history }}
            >
              <HistoryPanel onPreview={handleHistoryPreview} />
            </aside>
          </>
        )}

        {/* Tags Sidebar */}
        {showTags && !isReadingMode && (
          <>
            <ResizeHandle
              side="right"
              currentWidth={panelWidths.tags}
              minWidth={220}
              maxWidth={Math.floor(window.innerWidth * 0.5)}
              onResize={(w) => setPanelWidth("tags", w)}
              onDoubleClick={() => setPanelWidth("tags", 288)}
            />
            <aside
              className="border-l border-[var(--editor-border)] shrink-0 overflow-auto sidebar-panel"
              style={{ width: panelWidths.tags }}
            >
              <TagBrowser />
            </aside>
          </>
        )}
      </div>

      {!isReadingMode && <StatusBar />}

      {showExport && (
        <ExportDialog
          markdown={markdownRef.current}
          onClose={() => setShowExport(false)}
        />
      )}

      {showPreferences && (
        <PreferencesDialog
          onClose={() => setShowPreferences(false)}
          editorRef={editorInstanceRef}
        />
      )}

      {templatePicker && (
        <TemplatePicker
          mode={templatePicker.mode}
          targetFolder={templatePicker.targetFolder}
          currentContent={markdownRef.current || undefined}
          onOpenFile={handleFileTreeOpen}
          onClose={() => setTemplatePicker(null)}
        />
      )}

      {unifiedSearchMode && (
        <UnifiedSearch
          commands={commands}
          onOpenFile={handleFileTreeOpen}
          onClose={() => setUnifiedSearchMode(null)}
          filterMode={unifiedSearchMode}
        />
      )}

      <ToastContainer />
    </div>
  );
}

export default App;
