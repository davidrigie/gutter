import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { BlockActionBar } from "../BlockActionBar";

export function ImageBlockView({ node, deleteNode, editor, getPos }: NodeViewProps) {
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
        src={node.attrs.src}
        alt={node.attrs.alt || ""}
        title={node.attrs.title || undefined}
        style={{ maxWidth: "100%" }}
      />
    </NodeViewWrapper>
  );
}
