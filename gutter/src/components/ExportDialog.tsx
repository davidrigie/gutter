import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

interface ExportDialogProps {
  markdown: string;
  onClose: () => void;
}

function markdownToHtml(md: string): string {
  // Simple markdown to HTML conversion for export
  let html = md;

  // Headings
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold, italic, strikethrough
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Links and images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Horizontal rules
  html = html.replace(/^---$/gm, "<hr>");

  // Code blocks
  html = html.replace(/```[\w]*\n([\s\S]*?)```/g, "<pre><code>$1</code></pre>");

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, "<blockquote><p>$1</p></blockquote>");

  // Lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>");

  // Paragraphs (lines not already wrapped)
  html = html
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (
        !trimmed ||
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<blockquote") ||
        trimmed.startsWith("<li") ||
        trimmed.startsWith("<hr") ||
        trimmed.startsWith("<img")
      ) {
        return trimmed;
      }
      return `<p>${trimmed}</p>`;
    })
    .join("\n");

  return html;
}

export function ExportDialog({ markdown, onClose }: ExportDialogProps) {
  const [includeComments, setIncludeComments] = useState(true);
  const [exporting, setExporting] = useState(false);

  const getContent = useCallback(() => {
    let content = markdown;
    if (!includeComments) {
      // Strip comment markers
      content = content.replace(/<mark>([\s\S]*?)<\/mark><sup>\[c\d+\]<\/sup>/g, "$1");
    }
    return content;
  }, [markdown, includeComments]);

  const handleExportHtml = useCallback(async () => {
    setExporting(true);
    try {
      const path = await save({
        filters: [{ name: "HTML", extensions: ["html"] }],
      });
      if (path) {
        const savePath = typeof path === "string" ? path : (path as { path: string }).path;
        const html = markdownToHtml(getContent());
        await invoke("export_html", { content: html, path: savePath });
      }
    } catch (e) {
      console.error("Export failed:", e);
    }
    setExporting(false);
    onClose();
  }, [getContent, onClose]);

  const handleCopyRichText = useCallback(async () => {
    try {
      const html = markdownToHtml(getContent());
      const blob = new Blob([html], { type: "text/html" });
      await navigator.clipboard.write([
        new ClipboardItem({ "text/html": blob }),
      ]);
    } catch (e) {
      console.error("Copy failed:", e);
    }
    onClose();
  }, [getContent, onClose]);

  const handleExportMarkdown = useCallback(async () => {
    setExporting(true);
    try {
      const path = await save({
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
      if (path) {
        const savePath = typeof path === "string" ? path : (path as { path: string }).path;
        await invoke("write_file", { path: savePath, content: getContent() });
      }
    } catch (e) {
      console.error("Export failed:", e);
    }
    setExporting(false);
    onClose();
  }, [getContent, onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200]"
      onClick={onClose}
    >
      <div
        className="w-80 bg-[var(--glass-bg)] backdrop-blur-[20px] rounded-xl border border-[var(--glass-border)] p-5"
        style={{ boxShadow: "var(--shadow-xl)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">
          Export Document
        </h2>

        <label className="flex items-center gap-2 mb-4 text-[13px] text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={includeComments}
            onChange={(e) => setIncludeComments(e.target.checked)}
            className="rounded"
          />
          Include comment markers
        </label>

        <div className="flex flex-col gap-2">
          <button
            className="w-full px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            onClick={handleExportHtml}
            disabled={exporting}
          >
            Export as HTML
          </button>
          <button
            className="w-full px-4 py-2 rounded-lg border border-[var(--editor-border)] text-[var(--text-primary)] text-[13px] font-medium hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50"
            onClick={handleExportMarkdown}
            disabled={exporting}
          >
            Export as Markdown
          </button>
          <button
            className="w-full px-4 py-2 rounded-lg border border-[var(--editor-border)] text-[var(--text-primary)] text-[13px] font-medium hover:bg-[var(--surface-hover)] transition-colors"
            onClick={handleCopyRichText}
          >
            Copy as Rich Text
          </button>
        </div>

        <button
          className="mt-3 w-full text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
