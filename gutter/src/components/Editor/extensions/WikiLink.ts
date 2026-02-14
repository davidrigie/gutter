import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const wikiLinkPluginKey = new PluginKey("wikiLinkDecorations");

/**
 * Wiki link rendering: hides [[ and ]] brackets, styles inner text as a link.
 * Line-level reveal (showing brackets on active line) is handled by LinkReveal.
 * This plugin handles ALL wiki links — the LineReveal decorations layer on top
 * for the active line with the "visible" class.
 */
export const WikiLink = Extension.create({
  name: "wikiLink",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: wikiLinkPluginKey,
        props: {
          decorations(state) {
            const { selection } = state;
            const $from = selection.$from;
            const depth = $from.depth;
            // Find the active block range to skip (LineReveal handles it)
            let activeBlockStart = -1;
            let activeBlockEnd = -1;
            if (depth > 0) {
              activeBlockStart = $from.start(depth);
              activeBlockEnd = activeBlockStart + $from.node(depth).content.size;
            }

            const decorations: Decoration[] = [];

            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;

              // Skip nodes in the active block — LineReveal handles those
              const nodeEnd = pos + node.nodeSize;
              if (pos >= activeBlockStart && nodeEnd <= activeBlockEnd) return;

              const regex = /\[\[([^\]]+)\]\]/g;
              let match;
              while ((match = regex.exec(node.text)) !== null) {
                const fullStart = pos + match.index;
                const fullEnd = fullStart + match[0].length;
                const innerStart = fullStart + 2;
                const innerEnd = fullEnd - 2;

                // Hide brackets
                decorations.push(
                  Decoration.inline(fullStart, innerStart, {
                    class: "wiki-link-bracket",
                  }),
                );
                // Style inner text as link
                decorations.push(
                  Decoration.inline(innerStart, innerEnd, {
                    class: "wiki-link-inline",
                    "data-wiki-target": match[1],
                  }),
                );
                // Hide brackets
                decorations.push(
                  Decoration.inline(innerEnd, fullEnd, {
                    class: "wiki-link-bracket",
                  }),
                );
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },

  onCreate() {
    const dom = this.editor.view.dom;
    dom.addEventListener("click", (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest(".wiki-link-inline") as HTMLElement | null;
      if (!target) return;
      const wikiTarget = target.getAttribute("data-wiki-target");
      if (wikiTarget) {
        e.preventDefault();
        e.stopPropagation();
        window.dispatchEvent(
          new CustomEvent("wiki-link-click", { detail: { target: wikiTarget } }),
        );
      }
    });
  },
});
