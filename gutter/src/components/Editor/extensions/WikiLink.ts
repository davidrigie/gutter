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
            const { selection } = state;
            const cursorPos = selection.from;
            const decorations: Decoration[] = [];

            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              const regex = /\[\[([^\]]+)\]\]/g;
              let match;
              while ((match = regex.exec(node.text)) !== null) {
                const fullStart = pos + match.index;
                const fullEnd = fullStart + match[0].length;
                const innerStart = fullStart + 2; // after [[
                const innerEnd = fullEnd - 2; // before ]]

                // Cursor is inside or adjacent to this wiki link
                const cursorNear = cursorPos >= fullStart && cursorPos <= fullEnd;

                if (cursorNear) {
                  // Show brackets with muted styling
                  decorations.push(
                    Decoration.inline(fullStart, innerStart, {
                      class: "wiki-link-bracket wiki-link-bracket-visible",
                    }),
                  );
                  decorations.push(
                    Decoration.inline(innerEnd, fullEnd, {
                      class: "wiki-link-bracket wiki-link-bracket-visible",
                    }),
                  );
                } else {
                  // Hide brackets
                  decorations.push(
                    Decoration.inline(fullStart, innerStart, {
                      class: "wiki-link-bracket",
                    }),
                  );
                  decorations.push(
                    Decoration.inline(innerEnd, fullEnd, {
                      class: "wiki-link-bracket",
                    }),
                  );
                }

                // Always style the inner text as a link
                decorations.push(
                  Decoration.inline(innerStart, innerEnd, {
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
