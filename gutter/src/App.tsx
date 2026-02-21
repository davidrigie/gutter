import { useRef, useState } from "react";
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
import { useWorkspaceStore } from "./stores/workspaceStore";
import { useSettingsStore } from "./stores/settingsStore";
import { modLabel } from "./utils/platform";
import { useThemeApplication } from "./hooks/useThemeApplication";
import { useFileWatcher } from "./hooks/useFileWatcher";
import { useSaveHandler } from "./hooks/useSaveHandler";
import { useTabLifecycle } from "./hooks/useTabLifecycle";
import { useWindowLifecycle } from "./hooks/useWindowLifecycle";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useMenuBarListeners } from "./hooks/useMenuBarListeners";
import { useCommands } from "./hooks/useCommands";

function App() {
  const {
    isSourceMode,
    isReadingMode,
    showFileTree,
    showComments,
    showHistory,
    showTags,
    toggleReadingMode,
    toggleFileTree,
    toggleComments,
    toggleHistory,
    toggleTags,
    showOutline,
    toggleOutline,
    setContent,
    setDirty,
    contentVersion,
    bumpContentVersion,
  } = useEditorStore();

  const { cycleTheme, panelWidths, setPanelWidth } = useSettingsStore();

  const { setTabDirty, openTabs, activeTabPath } = useWorkspaceStore();

  const [unifiedSearchMode, setUnifiedSearchMode] = useState<"all" | "files" | "commands" | null>(null);
  const [findReplaceMode, setFindReplaceMode] = useState<"find" | "replace" | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [sourceSearchMatches, setSourceSearchMatches] = useState<{ start: number; end: number }[]>([]);
  const [sourceCurrentMatch, setSourceCurrentMatch] = useState(-1);
  const markdownRef = useRef("");
  const lastSaveTimeRef = useRef<number>(0);
  const tabContentCache = useRef<Map<string, string>>(new Map());

  const sourceTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const editorInstanceRef = useRef<{
    createComment: () => void;
    navigateComment: (direction: "next" | "prev") => void;
    getMarkdown: () => string;
    getEditor: () => import("@tiptap/react").Editor | null;
  } | null>(null);

  // File watcher
  const { showReloadPrompt, setShowReloadPrompt, reloadFromDisk, dismissReloadPrompt } = useFileWatcher(markdownRef, lastSaveTimeRef);

  // Save, history restore, version preview
  const { handleSave, handleHistoryRestore, handleHistoryPreview, versionPreview, setVersionPreview } = useSaveHandler(markdownRef, lastSaveTimeRef, tabContentCache);

  // Tab lifecycle
  const {
    handleOpenFile, handleFileTreeOpen, handleNewFile,
    handleSwitchTab, handleCloseTab,
    handleEditorUpdate, handleSourceChange,
    switchToSource, switchToWysiwyg,
    navigateComment,
    imagePreview, setImagePreview,
    templatePicker, setTemplatePicker,
  } = useTabLifecycle(markdownRef, tabContentCache, handleSave, setShowReloadPrompt, lastSaveTimeRef);

  // Commands for command palette
  const commands = useCommands({
    handleNewFile, handleOpenFile, handleSave,
    switchToSource, switchToWysiwyg,
    toggleFileTree, toggleComments, toggleHistory, toggleTags, toggleOutline,
    toggleReadingMode, cycleTheme, navigateComment,
    setUnifiedSearchMode, setFindReplaceMode,
    setShowExport, setShowPreferences, setTemplatePicker,
    createComment: () => editorInstanceRef.current?.createComment(),
    toggleSpellCheck: () => {
      const e = editorInstanceRef.current?.getEditor();
      if (e) e.commands.toggleSpellCheck();
    },
    getMarkdown: () => markdownRef.current,
  });

  // Native menu bar event listeners
  useMenuBarListeners({
    handleNewFile, handleOpenFile, handleSave,
    switchToSource, switchToWysiwyg,
    toggleFileTree, toggleComments, toggleHistory, toggleTags, toggleOutline,
    toggleReadingMode, cycleTheme, navigateComment,
    setUnifiedSearchMode, setFindReplaceMode,
    setShowExport, setShowPreferences, setTemplatePicker,
    createComment: () => editorInstanceRef.current?.createComment(),
    getMarkdown: () => markdownRef.current,
  });

  // Global keyboard shortcuts
  useKeyboardShortcuts(
    {
      handleNewFile, handleOpenFile, handleSave,
      switchToSource, switchToWysiwyg,
      toggleFileTree, toggleComments, toggleHistory, toggleTags,
      toggleReadingMode, cycleTheme, navigateComment,
      setUnifiedSearchMode, setFindReplaceMode,
      setShowExport, setShowPreferences,
      createComment: () => editorInstanceRef.current?.createComment(),
    },
    !!(unifiedSearchMode || showExport || showPreferences || templatePicker),
  );

  // Theme, CSS variables, and document title
  useThemeApplication();

  // Window lifecycle: close guard, drag-drop, settings, tags, version preview clear
  useWindowLifecycle(editorInstanceRef, handleFileTreeOpen, setVersionPreview);

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
                  onClick={reloadFromDisk}
                >
                  Reload
                </button>
                <button
                  className="px-2 py-0.5 rounded text-[11px] hover:bg-[var(--surface-hover)]"
                  onClick={dismissReloadPrompt}
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
