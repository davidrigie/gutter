import { useCallback, useEffect, useRef, useState } from "react";
import { GutterEditor } from "./components/Editor/GutterEditor";
import { SourceEditor } from "./components/Editor/SourceEditor";
import { FileTree } from "./components/FileTree/FileTree";
import { CommentsPanel } from "./components/Comments/CommentsPanel";
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
import { PreferencesDialog } from "./components/PreferencesDialog";
import { useEditorStore } from "./stores/editorStore";
import { useWorkspaceStore } from "./stores/workspaceStore";
import { useCommentStore } from "./stores/commentStore";
import { useSettingsStore } from "./stores/settingsStore";
import { useFileOps } from "./hooks/useFileOps";
import { useComments } from "./hooks/useComments";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ask } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { modKey, modLabel } from "./utils/platform";
import { fileName as pathFileName, parentDir, joinPath, isImageFile, resolveWikiLink } from "./utils/path";
import { convertFileSrc } from "@tauri-apps/api/core";

// Helper to normalize markdown content for comparison (handles line endings and trailing whitespace)
const normalizeMarkdown = (s: string) => s.replace(/\r\n/g, "\n").trim();

function App() {
  const {
    isSourceMode,
    showFileTree,
    showComments,
    isZenMode,
    isDirty,
    fileName,
    activeCommentId,
    toggleSourceMode,
    toggleFileTree,
    toggleComments,
    toggleZenMode,
    showOutline,
    toggleOutline,
    setContent,
    setDirty,
    setFilePath,
    setActiveCommentId,
  } = useEditorStore();

  const { theme, cycleTheme, loadSettings, addRecentFile, panelWidths, setPanelWidth, fontSize, fontFamily, editorWidth, lineHeight } = useSettingsStore();

  const { addTab, setActiveTab, removeTab, setTabDirty, workspacePath, loadFileTree, openTabs } = useWorkspaceStore();
  const { getThreadIds } = useCommentStore();
  const { openFile, saveFile, scheduleAutoSave } = useFileOps();
  const { loadCommentsFromFile, saveComments, generateCompanion } = useComments();

  const [editorContent, setEditorContent] = useState<string | undefined>(undefined);
  const [sourceContent, setSourceContent] = useState("");
  const [unifiedSearchMode, setUnifiedSearchMode] = useState<"all" | "files" | "commands" | null>(null);
  const [findReplaceMode, setFindReplaceMode] = useState<"find" | "replace" | null>(null);
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const markdownRef = useRef("");
  const lastSaveTimeRef = useRef<number>(0);

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
      scheduleAutoSave(markdown);
    },
    [setContent, scheduleAutoSave],
  );

  // Source mode content sync
  const handleSourceChange = useCallback(
    (value: string) => {
      setSourceContent(value);
      markdownRef.current = value;
      setContent(value);
      scheduleAutoSave(value);
    },
    [setContent, scheduleAutoSave],
  );

  // Switch to source mode
  const switchToSource = useCallback(() => {
    setSourceContent(markdownRef.current);
    toggleSourceMode();
  }, [toggleSourceMode]);

  // Switch back to WYSIWYG
  const switchToWysiwyg = useCallback(() => {
    setEditorContent(sourceContent);
    markdownRef.current = sourceContent;
    toggleSourceMode();
  }, [sourceContent, toggleSourceMode]);

  // Open file handler
  const handleOpenFile = useCallback(async () => {

    const content = await openFile();
    if (content !== null) {
      setImagePreview(null);
      setEditorContent(content);
      markdownRef.current = content;
      setSourceContent(content);
      const path = useEditorStore.getState().filePath;
      if (path) {
        const name = pathFileName(path) || "Untitled";
        addTab(path, name);
        addRecentFile(path);
        await loadCommentsFromFile(path);
      }
    }
  }, [openFile, addTab, addRecentFile, loadCommentsFromFile]);

  // Open specific file (from file tree)
  const handleFileTreeOpen = useCallback(
    async (path: string) => {
      if (isImageFile(path)) {
        const name = pathFileName(path) || "Image";
        addTab(path, name);
        setActiveTab(path);
        setImagePreview(convertFileSrc(path));
        return;
      }
      try {
        setImagePreview(null);
        setShowReloadPrompt(false);
        const content = await invoke<string>("read_file", { path });
        setFilePath(path);
        setEditorContent(content);
        markdownRef.current = content;
        setSourceContent(content);
        setContent(content);
        setDirty(false);
        const name = pathFileName(path) || "Untitled";
        addTab(path, name);
        addRecentFile(path);
        await loadCommentsFromFile(path);
      } catch (e) {
        console.error("Failed to open file:", e);
      }
    },
    [setFilePath, setContent, setDirty, addTab, setActiveTab, addRecentFile, loadCommentsFromFile],
  );

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

  // Save handler — also saves comments and generates companion
  const handleSave = useCallback(async () => {
    const md = markdownRef.current;
    lastSaveTimeRef.current = Date.now();
    // Suppress file-changed notifications for 2s after our own save

    await saveFile(md);
    await saveComments();
    await generateCompanion(md);
    const path = useEditorStore.getState().filePath;
    if (path) {
      setTabDirty(path, false);
      useToastStore.getState().addToast("File saved", "success", 2000);
    }
  }, [saveFile, saveComments, generateCompanion, setTabDirty]);

  // Tab handlers
  const handleSwitchTab = useCallback(
    async (path: string) => {
      setShowReloadPrompt(false);
      setActiveTab(path);

      if (isImageFile(path)) {
        setImagePreview(convertFileSrc(path));
        return;
      }

      setImagePreview(null);
      try {
        const content = await invoke<string>("read_file", { path });
        setFilePath(path);
        setEditorContent(content);
        markdownRef.current = content;
        setSourceContent(content);
        setContent(content);
        setDirty(false);
        await loadCommentsFromFile(path);
      } catch (e) {
        useToastStore.getState().addToast("Failed to switch tab", "error");
        console.error("Failed to switch tab:", e);
      }
    },
    [setActiveTab, setFilePath, setContent, setDirty, loadCommentsFromFile],
  );

  const handleCloseTab = useCallback(
    async (path: string) => {
      const tab = openTabs.find((t) => t.path === path);
      if (tab?.isDirty) {
        const shouldSave = await ask(
          `"${tab.name}" has unsaved changes. Save before closing?`,
          { title: "Unsaved Changes", kind: "warning" },
        );
        if (shouldSave && path === useEditorStore.getState().filePath) {
          lastSaveTimeRef.current = Date.now();
          await handleSave();
        }
      }
      // If closing the currently previewed image tab, clear preview
      const wasActive = useWorkspaceStore.getState().activeTabPath === path;
      removeTab(path);

      if (wasActive) {
        // removeTab sets activeTabPath to last remaining tab (or null)
        const newActive = useWorkspaceStore.getState().activeTabPath;
        if (newActive) {
          if (isImageFile(newActive)) {
            setImagePreview(convertFileSrc(newActive));
          } else {
            setImagePreview(null);
            // Load the new active tab's content
            try {
              const content = await invoke<string>("read_file", { path: newActive });
              setFilePath(newActive);
              setEditorContent(content);
              markdownRef.current = content;
              setSourceContent(content);
              setContent(content);
              setDirty(false);
              await loadCommentsFromFile(newActive);
            } catch {
              // Tab may have been for a deleted file
            }
          }
        } else {
          setImagePreview(null);
          setEditorContent(undefined);
          markdownRef.current = "";
          setSourceContent("");
          setFilePath(null);
          setContent("");
          setDirty(false);
        }
      }
    },
    [openTabs, removeTab, handleSave, setFilePath, setContent, setDirty, loadCommentsFromFile],
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

  // Commands for command palette
  const mod = modLabel();
  const commands = [
    { name: "Search", shortcut: `${mod}+K`, action: () => setUnifiedSearchMode("all") },
    { name: "Open File", shortcut: `${mod}+O`, action: handleOpenFile },
    { name: "Save File", shortcut: `${mod}+S`, action: handleSave },
    { name: "Toggle Source Mode", shortcut: `${mod}+/`, action: isSourceMode ? switchToWysiwyg : switchToSource },
    { name: "Toggle File Tree", shortcut: `${mod}+\\`, action: toggleFileTree },
    { name: "Toggle Comments Panel", shortcut: `${mod}+Shift+C`, action: toggleComments },
    { name: "Toggle Zen Mode", shortcut: `${mod}+Shift+F`, action: toggleZenMode },
    { name: "Toggle Dark/Light Mode", shortcut: `${mod}+Shift+D`, action: () => cycleTheme() },
    { name: "Toggle Focus Mode", shortcut: `${mod}+Shift+T`, action: () => {
      const e = editorInstanceRef.current?.getEditor();
      if (e) e.commands.toggleFocusMode();
    }},
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
    { name: "Previous Comment", shortcut: `${mod}+Shift+P`, action: () => navigateComment("prev") },
  ];

  // Native menu bar event listeners
  useEffect(() => {
    const unlisteners = [
      listen("menu:open", () => handleOpenFile()),
      listen("menu:save", () => handleSave()),
      listen("menu:export", () => setShowExport(true)),
      listen("menu:preferences", () => setShowPreferences(true)),
      listen("menu:toggle-tree", () => toggleFileTree()),
      listen("menu:toggle-comments", () => toggleComments()),
      listen("menu:toggle-outline", () => toggleOutline()),
      listen("menu:toggle-zen", () => toggleZenMode()),
      listen("menu:toggle-focus", () => {
        const ed = editorInstanceRef.current?.getEditor();
        if (ed) ed.commands.toggleFocusMode();
      }),
      listen("menu:toggle-source", () => {
        if (useEditorStore.getState().isSourceMode) {
          switchToWysiwyg();
        } else {
          switchToSource();
        }
      }),
      listen("menu:cycle-theme", () => cycleTheme()),
      listen("menu:search", () => setUnifiedSearchMode("all")),
      listen("menu:quick-open", () => setUnifiedSearchMode("files")),
      listen("menu:find", () => setFindReplaceMode("find")),
      listen("menu:replace", () => setFindReplaceMode("replace")),
      listen("menu:new-comment", () => editorInstanceRef.current?.createComment()),
      listen("menu:next-comment", () => navigateComment("next")),
      listen("menu:prev-comment", () => navigateComment("prev")),
    ];
    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, [
    handleOpenFile,
    handleSave,
    toggleFileTree,
    toggleComments,
    toggleOutline,
    toggleZenMode,
    switchToSource,
    switchToWysiwyg,
    cycleTheme,
    navigateComment,
  ]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (modKey(e) && e.key === "o") {
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
      } else if (modKey(e) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        toggleZenMode();
      } else if (modKey(e) && e.shiftKey && e.key === "D") {
        e.preventDefault();
        cycleTheme();
      } else if (modKey(e) && !e.shiftKey && e.key === "k") {
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
      } else if (modKey(e) && e.shiftKey && e.key === "T") {
        e.preventDefault();
        const ed = editorInstanceRef.current?.getEditor();
        if (ed) ed.commands.toggleFocusMode();
      } else if (modKey(e) && e.key === ",") {
        e.preventDefault();
        setShowPreferences(true);
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
    handleOpenFile,
    handleSave,
    isSourceMode,
    switchToSource,
    switchToWysiwyg,
    toggleFileTree,
    toggleComments,
    toggleZenMode,
    cycleTheme,
    navigateComment,
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
  }, [fontSize, fontFamily, editorWidth, lineHeight]);

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

  // Update document title
  useEffect(() => {
    document.title = `${isDirty ? "● " : ""}${fileName} — Gutter`;
  }, [isDirty, fileName]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--editor-bg)] text-[var(--editor-text)] transition-colors">
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree Sidebar */}
        {showFileTree && !isZenMode && (
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
        {showOutline && !isZenMode && (
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
          <TabBar onSwitchTab={handleSwitchTab} onCloseTab={handleCloseTab} />

          {showReloadPrompt && (
            <div className="h-8 flex items-center justify-between px-3 text-[12px] bg-[color-mix(in_srgb,var(--status-info),transparent_90%)] text-[var(--status-info)] border-b border-[var(--editor-border)]">
              <span>This file has been modified externally.</span>
              <div className="flex gap-2">
                <button
                  className="px-2 py-0.5 rounded text-[11px] bg-[var(--accent)] text-white hover:opacity-90"
                  onClick={async () => {
                    const path = useEditorStore.getState().filePath;
                    if (path) {
                      const content = await invoke<string>("read_file", { path });
                      setEditorContent(content);
                      markdownRef.current = content;
                      setSourceContent(content);
                      setContent(content);
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

          {findReplaceMode && !isSourceMode && (
            <FindReplace
              editor={editorInstanceRef.current?.getEditor() ?? null}
              mode={findReplaceMode}
              onClose={() => setFindReplaceMode(null)}
            />
          )}

          {/* Mode indicator */}
          {isSourceMode && (
            <div className="h-7 flex items-center px-3 text-[12px] bg-[color-mix(in_srgb,var(--status-warning),transparent_90%)] text-[var(--status-warning)] border-b border-[var(--editor-border)]">
              Source Mode — Editing raw markdown ({modLabel()}+/ to switch back)
            </div>
          )}

          <main
            className={`flex-1 flex flex-col overflow-auto ${isZenMode ? "max-w-3xl mx-auto w-full" : ""}`}
          >
            {imagePreview ? (
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
            ) : openTabs.length === 0 && editorContent === undefined ? (
              <WelcomeScreen
                onOpenFile={handleOpenFile}
                onOpenRecent={handleFileTreeOpen}
              />
            ) : isSourceMode ? (
              <SourceEditor
                value={sourceContent}
                onChange={handleSourceChange}
              />
            ) : (
              <GutterEditor
                initialContent={editorContent}
                onUpdate={handleEditorUpdate}
                ref={editorInstanceRef}
              />
            )}
          </main>
        </div>

        {/* Comments Sidebar */}
        {showComments && !isZenMode && (
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
      </div>

      <StatusBar />

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
