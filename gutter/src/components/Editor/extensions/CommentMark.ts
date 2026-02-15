import { Mark, mergeAttributes } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const activeCommentPluginKey = new PluginKey("activeComment");

export const CommentMark = Mark.create({
  name: "commentMark",

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-comment-id"),
        renderHTML: (attributes) => {
          if (!attributes.commentId) return {};
          return { "data-comment-id": attributes.commentId };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "mark[data-comment-id]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "mark",
      mergeAttributes(HTMLAttributes),
      0,
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: activeCommentPluginKey,
        state: {
          init() {
            return null as string | null;
          },
          apply(tr, value) {
            const meta = tr.getMeta(activeCommentPluginKey);
            if (meta !== undefined) return meta as string | null;
            return value;
          },
        },
        props: {
          decorations(state) {
            const activeId = activeCommentPluginKey.getState(state) as string | null;
            if (!activeId) return DecorationSet.empty;

            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              // Inline mark comments
              if (node.isText) {
                const has = node.marks.some(
                  (m) => m.type.name === "commentMark" && m.attrs.commentId === activeId,
                );
                if (has) {
                  decorations.push(
                    Decoration.inline(pos, pos + node.nodeSize, { class: "active" }),
                  );
                }
              }
              // Node-level comments (atom nodes)
              if (node.type.spec.atom && node.attrs.commentId === activeId) {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, { class: "comment-active-node" }),
                );
              }
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
