import { useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { invoke } from "@tauri-apps/api/core";
import { BlockActionBar } from "../BlockActionBar";

export function ImageBlockView({ node, deleteNode, editor, getPos }: NodeViewProps) {
  const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);

  const handleError = () => {
    // If the asset protocol URL fails (common on Windows), fall back to
    // reading the file via Rust and using a data: URL instead.
    const filePath = node.attrs.filePath as string | undefined;
    if (filePath && !fallbackSrc) {
      invoke<string>("read_file_data_url", { path: filePath })
        .then(setFallbackSrc)
        .catch(() => {});
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
      <img
        src={fallbackSrc || node.attrs.src}
        alt={node.attrs.alt || ""}
        title={node.attrs.title || undefined}
        style={{ maxWidth: "100%" }}
        onError={handleError}
      />
    </NodeViewWrapper>
  );
}
