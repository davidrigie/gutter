import { useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { invoke } from "@tauri-apps/api/core";
import { BlockActionBar } from "../BlockActionBar";

export function ImageBlockView({ node, deleteNode, editor, getPos }: NodeViewProps) {
  const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleError = () => {
    const filePath = node.attrs.filePath as string | undefined;
    if (fallbackSrc) {
      // Both asset URL and data URL fallback failed — show diagnostic info
      setError(
        `Image failed to load.\n` +
        `src: ${node.attrs.src}\n` +
        `filePath: ${filePath ?? "(not set)"}\n` +
        `originalSrc: ${node.attrs.originalSrc ?? "(not set)"}`
      );
      return;
    }
    if (filePath) {
      invoke<string>("read_file_data_url", { path: filePath })
        .then(setFallbackSrc)
        .catch((err) => {
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
        `originalSrc: ${node.attrs.originalSrc ?? "(not set)"}`
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
