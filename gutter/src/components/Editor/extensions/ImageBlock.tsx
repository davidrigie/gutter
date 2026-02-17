import { useState, useRef } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { invoke } from "@tauri-apps/api/core";
import { BlockActionBar } from "../BlockActionBar";
import { resolveFileInTree, fileName } from "../../../utils/path";
import { useWorkspaceStore } from "../../../stores/workspaceStore";

export function ImageBlockView({ node, deleteNode, editor, getPos }: NodeViewProps) {
  const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const triedWorkspace = useRef(false);

  const handleError = () => {
    const filePath = node.attrs.filePath as string | undefined;
    const originalSrc = node.attrs.originalSrc as string | undefined;

    if (fallbackSrc) {
      // Data URL fallback also failed — try workspace-wide resolution as last resort
      if (!triedWorkspace.current && originalSrc) {
        triedWorkspace.current = true;
        const { fileTree } = useWorkspaceStore.getState();
        // Search by bare filename (Obsidian-style: image can be anywhere in vault)
        const name = fileName(originalSrc);
        const resolved = resolveFileInTree(name, fileTree);
        if (resolved && resolved !== filePath) {
          invoke<string>("read_file_data_url", { path: resolved })
            .then(setFallbackSrc)
            .catch(() => {
              setError(
                `Image failed to load.\n` +
                `src: ${node.attrs.src}\n` +
                `filePath: ${filePath ?? "(not set)"}\n` +
                `originalSrc: ${originalSrc}`
              );
            });
          return;
        }
      }
      setError(
        `Image failed to load.\n` +
        `src: ${node.attrs.src}\n` +
        `filePath: ${filePath ?? "(not set)"}\n` +
        `originalSrc: ${originalSrc ?? "(not set)"}`
      );
      return;
    }
    if (filePath) {
      invoke<string>("read_file_data_url", { path: filePath })
        .then(setFallbackSrc)
        .catch((err) => {
          // filePath didn't exist — try workspace-wide resolution before giving up
          if (originalSrc) {
            const { fileTree } = useWorkspaceStore.getState();
            const name = fileName(originalSrc);
            const resolved = resolveFileInTree(name, fileTree);
            if (resolved && resolved !== filePath) {
              invoke<string>("read_file_data_url", { path: resolved })
                .then(setFallbackSrc)
                .catch(() => {
                  setError(
                    `Image failed to load.\n` +
                    `src: ${node.attrs.src}\n` +
                    `filePath: ${filePath}\n` +
                    `fallback error: ${err}`
                  );
                });
              return;
            }
          }
          setError(
            `Image failed to load.\n` +
            `src: ${node.attrs.src}\n` +
            `filePath: ${filePath}\n` +
            `fallback error: ${err}`
          );
        });
    } else {
      setError(
        `Image failed to load (no filePath for fallback).\n` +
        `src: ${node.attrs.src}\n` +
        `originalSrc: ${originalSrc ?? "(not set)"}`
      );
    }
  };

  return (
    <NodeViewWrapper className="image-block-wrapper" style={{ position: "relative" }}>
      <BlockActionBar
        onDelete={() => deleteNode()}
        onDuplicate={() => {
          const pos = getPos();
          if (pos == null) return;
          const end = pos + node.nodeSize;
          editor.chain().focus().insertContentAt(end, { type: node.type.name, attrs: { ...node.attrs } }).run();
        }}
      />
      {error ? (
        <div
          style={{
            padding: "12px 16px",
            background: "var(--surface-hover, #fee2e2)",
            border: "1px solid var(--border-primary, #fca5a5)",
            borderRadius: "6px",
            fontFamily: "monospace",
            fontSize: "12px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            color: "var(--text-primary, #991b1b)",
          }}
        >
          {error}
        </div>
      ) : (
        <img
          src={fallbackSrc || node.attrs.src}
          alt={node.attrs.alt || ""}
          title={node.attrs.title || undefined}
          style={{ maxWidth: "100%" }}
          onError={handleError}
        />
      )}
    </NodeViewWrapper>
  );
}
