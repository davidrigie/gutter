import { useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { useEditorStore } from "../stores/editorStore";
import { useSettingsStore } from "../stores/settingsStore";

export function useFileOps() {
  const {
    filePath,
    setFilePath,
    setContent,
    setDirty,
  } = useEditorStore();

  const autoSaveInterval = useSettingsStore((s) => s.autoSaveInterval);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openFile = useCallback(async () => {
    const selected = await open({
      filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
    });
    if (!selected) return null;
    const path = typeof selected === "string" ? selected : (selected as { path: string }).path;
    const fileContent = await invoke<string>("read_file", { path });
    setFilePath(path);
    setContent(fileContent);
    setDirty(false);
    return fileContent;
  }, [setFilePath, setContent, setDirty]);

  const saveFile = useCallback(
    async (markdown: string) => {
      let path = filePath;
      if (!path) {
        const selected = await save({
          filters: [{ name: "Markdown", extensions: ["md"] }],
        });
        if (!selected) return;
        path = typeof selected === "string" ? selected : (selected as { path: string }).path;
        setFilePath(path);
      }
      await invoke("write_file", { path, content: markdown });
      setDirty(false);
    },
    [filePath, setFilePath, setDirty],
  );

  const scheduleAutoSave = useCallback(
    (markdown: string) => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (!filePath || autoSaveInterval === 0) return;
      autoSaveTimerRef.current = setTimeout(() => {
        saveFile(markdown);
      }, autoSaveInterval);
    },
    [filePath, saveFile, autoSaveInterval],
  );

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  return { openFile, saveFile, scheduleAutoSave };
}
