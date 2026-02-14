import { useCallback, useEffect, useRef, useState } from "react";
import { GutterEditor } from "./components/Editor/GutterEditor";
import { SourceEditor } from "./components/Editor/SourceEditor";
import { FileTree } from "./components/FileTree/FileTree";
import { CommentsPanel } from "./components/Comments/CommentsPanel";
import { StatusBar } from "./components/StatusBar";
import { TabBar } from "./components/TabBar";
import { CommandPalette } from "./components/CommandPalette";
import { useEditorStore } from "./stores/editorStore";
import { useWorkspaceStore } from "./stores/workspaceStore";
import { useCommentStore } from "./stores/commentStore";
import { useFileOps } from "./hooks/useFileOps";
import { useComments } from "./hooks/useComments";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const {
    isSourceMode,
    showFileTree,
    showComments,
    isZenMode,
    theme,
    isDirty,
    fileName,
    activeCommentId,
    toggleSourceMode,
    toggleFileTree,
    toggleComments,
    toggleZenMode,
    toggleTheme,
    setContent,
    setDirty,
    setFilePath,
    setActiveCommentId,
  } = useEditorStore();

  const { addTab, setActiveTab, removeTab, setTabDirty } = useWorkspaceStore();
  const { getThreadIds } = useCommentStore();
  const { openFile, saveFile, scheduleAutoSave } = useFileOps();
  const { loadCommentsFromFile, saveComments, generateCompanion } = useComments();

  const [editorContent, setEditorContent] = useState<string | undefined>(undefined);
  const [sourceContent, setSourceContent] = useState("");
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const markdownRef = useRef("");

  const editorInstanceRef = useRef<{
    createComment: () => void;
    navigateComment: (direction: "next" | "prev") => void;
    getMarkdown: () => string;
  } | null>(null);

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
      setEditorContent(content);
      markdownRef.current = content;
      setSourceContent(content);
      const path = useEditorStore.getState().filePath;
      if (path) {
        const name = path.split("/").pop() || "Untitled";
        addTab(path, name);
        await loadCommentsFromFile(path);
      }
    }
  }, [openFile, addTab, loadCommentsFromFile]);

  // Open specific file (from file tree)
  const handleFileTreeOpen = useCallback(
    async (path: string) => {
      try {
        const content = await invoke<string>("read_file", { path });
        setFilePath(path);
        setEditorContent(content);
        markdownRef.current = content;
        setSourceContent(content);
        setContent(content);
        setDirty(false);
        const name = path.split("/").pop() || "Untitled";
        addTab(path, name);
        await loadCommentsFromFile(path);
      } catch (e) {
        console.error("Failed to open file:", e);
      }
    },
    [setFilePath, setContent, setDirty, addTab, loadCommentsFromFile],
  );

  // Save handler — also saves comments and generates companion
  const handleSave = useCallback(async () => {
    const md = markdownRef.current;
    await saveFile(md);
    await saveComments();
    await generateCompanion(md);
    const path = useEditorStore.getState().filePath;
    if (path) {
      setTabDirty(path, false);
    }
  }, [saveFile, saveComments, generateCompanion, setTabDirty]);

  // Tab handlers
  const handleSwitchTab = useCallback(
    async (path: string) => {
      setActiveTab(path);
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
        console.error("Failed to switch tab:", e);
      }
    },
    [setActiveTab, setFilePath, setContent, setDirty, loadCommentsFromFile],
  );

  const handleCloseTab = useCallback(
    (path: string) => {
      removeTab(path);
    },
    [removeTab],
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
  const commands = [
    { name: "Open File", shortcut: "Cmd+O", action: handleOpenFile },
    { name: "Save File", shortcut: "Cmd+S", action: handleSave },
    { name: "Toggle Source Mode", shortcut: "Cmd+/", action: isSourceMode ? switchToWysiwyg : switchToSource },
    { name: "Toggle File Tree", shortcut: "Cmd+\\", action: toggleFileTree },
    { name: "Toggle Comments Panel", shortcut: "Cmd+Shift+C", action: toggleComments },
    { name: "Toggle Zen Mode", shortcut: "Cmd+Shift+F", action: toggleZenMode },
    { name: "Toggle Dark/Light Mode", shortcut: "Cmd+Shift+D", action: toggleTheme },
    { name: "New Comment", shortcut: "Cmd+Shift+M", action: () => editorInstanceRef.current?.createComment() },
    { name: "Next Comment", shortcut: "Cmd+Shift+N", action: () => navigateComment("next") },
    { name: "Previous Comment", shortcut: "Cmd+Shift+P", action: () => navigateComment("prev") },
  ];

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "o") {
        e.preventDefault();
        handleOpenFile();
      } else if (e.metaKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      } else if (e.metaKey && e.key === "/") {
        e.preventDefault();
        if (isSourceMode) {
          switchToWysiwyg();
        } else {
          switchToSource();
        }
      } else if (e.metaKey && e.key === "\\") {
        e.preventDefault();
        toggleFileTree();
      } else if (e.metaKey && e.shiftKey && e.key === "C") {
        e.preventDefault();
        toggleComments();
      } else if (e.metaKey && e.shiftKey && e.key === "F") {
        e.preventDefault();
        toggleZenMode();
      } else if (e.metaKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        toggleTheme();
      } else if (e.metaKey && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setShowCommandPalette(true);
      } else if (e.metaKey && e.shiftKey && e.key === "M") {
        e.preventDefault();
        editorInstanceRef.current?.createComment();
      } else if (e.metaKey && e.shiftKey && e.key === "N") {
        e.preventDefault();
        navigateComment("next");
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
    toggleTheme,
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

  // Update document title
  useEffect(() => {
    document.title = `${isDirty ? "● " : ""}${fileName} — Gutter`;
  }, [isDirty, fileName]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--editor-bg)] text-[var(--editor-text)]">
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree Sidebar */}
        {showFileTree && !isZenMode && (
          <aside className="w-56 border-r border-[var(--editor-border)] shrink-0 overflow-hidden">
            <FileTree onFileOpen={handleFileTreeOpen} />
          </aside>
        )}

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <TabBar onSwitchTab={handleSwitchTab} onCloseTab={handleCloseTab} />

          {/* Mode indicator */}
          {isSourceMode && (
            <div className="h-7 flex items-center px-3 text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border-b border-[var(--editor-border)]">
              Source Mode — Editing raw markdown (Cmd+/ to switch back)
            </div>
          )}

          <main
            className={`flex-1 overflow-auto ${isZenMode ? "max-w-3xl mx-auto w-full" : ""}`}
          >
            {isSourceMode ? (
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
          <aside className="w-72 border-l border-[var(--editor-border)] shrink-0 overflow-hidden">
            <CommentsPanel />
          </aside>
        )}
      </div>

      <StatusBar />

      {showCommandPalette && (
        <CommandPalette
          commands={commands}
          onClose={() => setShowCommandPalette(false)}
        />
      )}
    </div>
  );
}

export default App;
