import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";

const BLOCK_NODE_NAMES = new Set([
  "mathBlock",
  "mermaidBlock",
  "frontmatter",
  "codeBlock",
  "image",
  "table",
  "horizontalRule",
  "blockquote",
  "bulletList",
  "orderedList",
  "taskList",
  "heading",
]);

function isBlockNode(name: string): boolean {
  return BLOCK_NODE_NAMES.has(name);
}

export const BlockGapInserter = Extension.create({
  name: "blockGapInserter",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("blockGapInserter"),
        props: {
          handleClick(view, _pos, event) {
            if (!view.editable || event.button !== 0) return false;

            const coords = { left: event.clientX, top: event.clientY };
            const posAtCoords = view.posAtCoords(coords);

            // Only handle clicks that land outside any node (gap area)
            if (!posAtCoords || posAtCoords.inside !== -1) return false;

            const pos = posAtCoords.pos;
            const $pos = view.state.doc.resolve(pos);

            // Only handle doc-level gaps
            if ($pos.depth !== 0) return false;

            const doc = view.state.doc;
            const indexAfter = $pos.index(0);
            const indexBefore = indexAfter - 1;

            const nodeBefore =
              indexBefore >= 0 ? doc.child(indexBefore) : null;
            const nodeAfter =
              indexAfter < doc.childCount ? doc.child(indexAfter) : null;

            const hasBlockNeighbor =
              (nodeBefore && isBlockNode(nodeBefore.type.name)) ||
              (nodeAfter && isBlockNode(nodeAfter.type.name));

            if (!hasBlockNeighbor) return false;

            // Calculate position at the boundary
            let boundaryPos = 0;
            for (let i = 0; i < indexAfter; i++) {
              boundaryPos += doc.child(i).nodeSize;
            }

            // Check if there's already an empty paragraph adjacent
            if (
              nodeBefore?.type.name === "paragraph" &&
              nodeBefore.content.size === 0
            ) {
              const insidePos = boundaryPos - nodeBefore.nodeSize + 1;
              const tr = view.state.tr.setSelection(
                TextSelection.create(view.state.doc, insidePos),
              );
              view.dispatch(tr);
              view.focus();
              return true;
            }

            if (
              nodeAfter?.type.name === "paragraph" &&
              nodeAfter.content.size === 0
            ) {
              const insidePos = boundaryPos + 1;
              const tr = view.state.tr.setSelection(
                TextSelection.create(view.state.doc, insidePos),
              );
              view.dispatch(tr);
              view.focus();
              return true;
            }

            // Insert a new empty paragraph at the gap
            const paragraphType = view.state.schema.nodes.paragraph;
            const tr = view.state.tr.insert(
              boundaryPos,
              paragraphType.create(),
            );
            tr.setSelection(TextSelection.create(tr.doc, boundaryPos + 1));

            view.dispatch(tr);
            view.focus();
            return true;
          },
        },
      }),
    ];
  },
});
