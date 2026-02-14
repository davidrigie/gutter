import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const wikiLinkPluginKey = new PluginKey("wikiLinkDecorations");

export const WikiLink = Extension.create({
  name: "wikiLink",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: wikiLinkPluginKey,
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              const regex = /\[\[([^\]]+)\]\]/g;
              let match;
              while ((match = regex.exec(node.text)) !== null) {
                const start = pos + match.index;
                const end = start + match[0].length;
                decorations.push(
                  Decoration.inline(start, end, {
                    class: "wiki-link-inline",
                    "data-wiki-target": match[1],
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
