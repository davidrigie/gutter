import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { useToastStore } from "../stores/toastStore";
import { joinPath, fileName as pathFileName } from "../utils/path";

interface TemplatePickerProps {
  mode: "new" | "save";
  targetFolder: string;
  currentContent?: string;
  onOpenFile: (path: string) => void;
  onClose: () => void;
}

export function TemplatePicker({
  mode,
  targetFolder,
  currentContent,
  onOpenFile,
  onClose,
}: TemplatePickerProps) {
  const [templates, setTemplates] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const workspacePath = useWorkspaceStore((s) => s.workspacePath);
  const loadFileTree = useWorkspaceStore((s) => s.loadFileTree);

  // Load templates on mount
  useEffect(() => {
    (async () => {
      try {
        await invoke("init_default_templates");
        const names = await invoke<string[]>("list_templates");
        setTemplates(names);
        if (mode === "new" && names.length > 0) {
          setSelectedTemplate(names[0]);
        }
      } catch (e) {
        console.error("Failed to load templates:", e);
      }
    })();
  }, [mode]);

  // Load preview when selection changes
  useEffect(() => {
    if (!selectedTemplate) {
      setPreview(null);
      return;
    }
    (async () => {
      try {
        const content = await invoke<string>("read_template", {
          name: selectedTemplate,
        });
        setPreview(content);
        // Pre-fill filename
        const today = new Date().toISOString().slice(0, 10);
        setFilename(`${selectedTemplate} ${today}.md`);
      } catch (e) {
        setPreview(null);
        console.error("Failed to read template:", e);
      }
    })();
  }, [selectedTemplate]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (mode === "new" && templates.length > 0) {
        const idx = selectedTemplate ? templates.indexOf(selectedTemplate) : -1;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const next = idx < templates.length - 1 ? idx + 1 : 0;
          setSelectedTemplate(templates[next]);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const next = idx > 0 ? idx - 1 : templates.length - 1;
          setSelectedTemplate(templates[next]);
        }
      }
    },
    [mode, templates, selectedTemplate, onClose],
  );

  const handleCreate = useCallback(async () => {
    if (!selectedTemplate || !filename.trim()) return;
    setLoading(true);
    try {
      const content = await invoke<string>("read_template", {
        name: selectedTemplate,
      });
      // Replace {{date}} with today's date
      const today = new Date().toISOString().slice(0, 10);
      const processed = content.replace(/\{\{date\}\}/g, today);

      const fname = filename.trim().endsWith(".md")
        ? filename.trim()
        : `${filename.trim()}.md`;
      const filePath = joinPath(targetFolder, fname);
      await invoke("write_file", { path: filePath, content: processed });
      if (workspacePath) await loadFileTree(workspacePath);
      onOpenFile(filePath);
      useToastStore
        .getState()
        .addToast(`Created ${pathFileName(filePath)}`, "success", 2000);
      onClose();
    } catch (e) {
      useToastStore.getState().addToast("Failed to create file", "error");
      console.error("Failed to create from template:", e);
    }
    setLoading(false);
  }, [
    selectedTemplate,
    filename,
    targetFolder,
    workspacePath,
    loadFileTree,
    onOpenFile,
    onClose,
  ]);

  const handleSave = useCallback(async () => {
    if (!templateName.trim() || !currentContent) return;
    setLoading(true);
    try {
      await invoke("save_template", {
        name: templateName.trim(),
        content: currentContent,
      });
      useToastStore
        .getState()
        .addToast(`Template "${templateName.trim()}" saved`, "success", 2000);
      onClose();
    } catch (e) {
      useToastStore.getState().addToast("Failed to save template", "error");
      console.error("Failed to save template:", e);
    }
    setLoading(false);
  }, [templateName, currentContent, onClose]);

  const handleDelete = useCallback(
    async (name: string) => {
      try {
        await invoke("delete_template", { name });
        setTemplates((prev) => prev.filter((t) => t !== name));
        if (selectedTemplate === name) {
          setSelectedTemplate(null);
          setPreview(null);
        }
        useToastStore
          .getState()
          .addToast(`Template "${name}" deleted`, "success", 2000);
      } catch (e) {
        useToastStore.getState().addToast("Failed to delete template", "error");
      }
    },
    [selectedTemplate],
  );

  const existingMatch = templates.find(
    (t) => t.toLowerCase() === templateName.trim().toLowerCase(),
  );

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200]"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-[480px] max-h-[80vh] flex flex-col bg-[var(--glass-bg)] backdrop-blur-[20px] rounded-xl border border-[var(--glass-border)] overflow-hidden"
        style={{ boxShadow: "var(--shadow-xl)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
            {mode === "new" ? "New from Template" : "Save as Template"}
          </h2>
        </div>

        {mode === "new" ? (
          <>
            {/* Template list */}
            <div
              ref={listRef}
              className="flex-1 overflow-auto px-2 min-h-0"
              style={{ maxHeight: "300px" }}
            >
              {templates.length === 0 ? (
                <div className="px-3 py-6 text-center text-[13px] text-[var(--text-muted)]">
                  No templates found
                </div>
              ) : (
                templates.map((name) => (
                  <div
                    key={name}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-[13px] transition-colors ${
                      selectedTemplate === name
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                    }`}
                    onClick={() => setSelectedTemplate(name)}
                  >
                    <span className="truncate">{name}</span>
                    <button
                      className={`opacity-0 group-hover:opacity-60 hover:!opacity-100 text-[11px] px-1.5 py-0.5 rounded transition-opacity ${
                        selectedTemplate === name
                          ? "text-white/70 hover:!text-white"
                          : "text-[var(--text-muted)]"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(name);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Preview */}
            {preview && (
              <div className="mx-5 mt-2 mb-2 max-h-[120px] overflow-auto rounded-lg bg-[var(--surface-secondary)] border border-[var(--editor-border)] p-3 text-[12px] text-[var(--text-secondary)] font-mono whitespace-pre-wrap leading-relaxed">
                {preview.slice(0, 500)}
                {preview.length > 500 && "..."}
              </div>
            )}

            {/* Filename input + Create */}
            <div className="px-5 pb-5 pt-2 flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="filename.md"
                className="flex-1 px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--editor-border)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && selectedTemplate && filename.trim()) {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
              />
              <button
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                onClick={handleCreate}
                disabled={loading || !selectedTemplate || !filename.trim()}
              >
                Create
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Save mode */}
            <div className="px-5 pb-2">
              <input
                ref={inputRef}
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name"
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--editor-border)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && templateName.trim()) {
                    e.preventDefault();
                    handleSave();
                  }
                }}
              />
            </div>

            {/* Existing templates */}
            {templates.length > 0 && (
              <div
                className="px-2 overflow-auto"
                style={{ maxHeight: "200px" }}
              >
                <div className="px-3 py-1 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                  Existing templates
                </div>
                {templates.map((name) => (
                  <div
                    key={name}
                    className={`px-3 py-1.5 text-[13px] rounded-lg ${
                      existingMatch === name
                        ? "text-[var(--status-warning)] bg-[color-mix(in_srgb,var(--status-warning),transparent_92%)]"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}

            <div className="px-5 pb-5 pt-3 flex items-center justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg border border-[var(--editor-border)] text-[var(--text-primary)] text-[13px] font-medium hover:bg-[var(--surface-hover)] transition-colors"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                onClick={handleSave}
                disabled={loading || !templateName.trim()}
              >
                {existingMatch ? "Replace Template" : "Save Template"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
