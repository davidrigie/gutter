import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ask } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useEditorStore } from "../stores/editorStore";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useTagStore } from "../stores/tagStore";
import { useToastStore } from "../stores/toastStore";
import { parentDir, joinPath, isImageFile } from "../utils/path";

/**
 * Window-level lifecycle effects: close guard, drag-drop, settings load,
 * tag scan, and clearing version preview when history panel closes.
 */
export function useWindowLifecycle(
  editorInstanceRef: React.MutableRefObject<{
    createComment: () => void;
    navigateComment: (direction: "next" | "prev") => void;
    getMarkdown: () => string;
    getEditor: () => import("@tiptap/react").Editor | null;
  } | null>,
  handleFileTreeOpen: (path: string) => Promise<void>,
  setVersionPreview: (v: { content: string; label: string } | null) => void,
) {
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const workspacePath = useWorkspaceStore((s) => s.workspacePath);
  const showHistory = useEditorStore((s) => s.showHistory);

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
  }, [handleFileTreeOpen, editorInstanceRef]);

  // Clear version preview when history panel is closed
  useEffect(() => {
    if (!showHistory) setVersionPreview(null);
  }, [showHistory, setVersionPreview]);
}
