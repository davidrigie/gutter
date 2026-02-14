import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * Converts typed markdown link syntax [text](url) into a proper TipTap link.
 * Uses a ProseMirror plugin to watch for the closing ) character since
 * TipTap's InputRule can struggle with bracket characters.
 */
export const MarkdownLinkInput = Extension.create({
  name: "markdownLinkInput",

  addProseMirrorPlugins() {
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/;

    return [
      new Plugin({
        key: new PluginKey("markdownLinkInput"),
        props: {
          handleTextInput(view, from, to, text) {
            if (text !== ")") return false;

            const { state } = view;
            // Get text before cursor + the ) we're about to type
            const $from = state.doc.resolve(from);
            const textBefore = $from.parent.textBetween(
              0,
              $from.parentOffset,
              undefined,
              "\ufffc",
            ) + text;

            const match = linkRegex.exec(textBefore);
            if (!match) return false;

            const linkText = match[1];
            const url = match[2];
            const fullMatchLength = match[0].length;

            // Calculate the start position in the document
            const start = from - (fullMatchLength - 1); // -1 because ) hasn't been inserted yet

            const linkMark = state.schema.marks.link.create({
              href: url,
            });

            const tr = state.tr
              .delete(start, to)
              .insert(start, state.schema.text(linkText, [linkMark]));

            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },
});
