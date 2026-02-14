import { Mark, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiLink: {
      setWikiLink: (attrs: { target: string }) => ReturnType;
    };
  }
}

const wikiLinkPluginKey = new PluginKey("wikiLinkDecorations");

export const WikiLink = Mark.create({
  name: "wikiLink",

  addAttributes() {
    return {
      target: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-wiki-link]',
        getAttrs: (el) => ({
          target: (el as HTMLElement).getAttribute("data-wiki-link"),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-wiki-link": HTMLAttributes.target,
        class: "wiki-link",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setWikiLink:
        (attrs) =>
        ({ commands }) => {
          return commands.setMark(this.name, attrs);
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: wikiLinkPluginKey,
        props: {
          // Detect [[...]] patterns in text and render inline decorations
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
                  }),
                );
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
          handleClick(view, pos, event) {
            // Ctrl+click or Cmd+click on wiki link opens target
            if (!event.metaKey && !event.ctrlKey) return false;
            const resolved = view.state.doc.resolve(pos);
            const node = resolved.parent;
            if (!node.isText || !node.text) return false;

            // Find [[...]] around the clicked position
            const textOffset = pos - resolved.start();
            const regex = /\[\[([^\]]+)\]\]/g;
            let match;
            while ((match = regex.exec(node.text)) !== null) {
              if (textOffset >= match.index && textOffset <= match.index + match[0].length) {
                const target = match[1];
                // Dispatch a custom event that the app can listen to
                window.dispatchEvent(
                  new CustomEvent("wiki-link-click", { detail: { target } }),
                );
                return true;
              }
            }
            return false;
          },
        },
      }),
    ];
  },
});
