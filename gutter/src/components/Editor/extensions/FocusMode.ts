import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const focusModeKey = new PluginKey("focusMode");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    focusMode: {
      toggleFocusMode: () => ReturnType;
      setFocusMode: (enabled: boolean) => ReturnType;
    };
  }
}

let focusEnabled = false;

export const FocusMode = Extension.create({
  name: "focusMode",

  addCommands() {
    return {
      toggleFocusMode:
        () =>
        ({ tr, dispatch }) => {
          focusEnabled = !focusEnabled;
          if (dispatch) dispatch(tr.setMeta(focusModeKey, true));
          return true;
        },
      setFocusMode:
        (enabled: boolean) =>
        ({ tr, dispatch }) => {
          focusEnabled = enabled;
          if (dispatch) dispatch(tr.setMeta(focusModeKey, true));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: focusModeKey,
        props: {
          decorations(state) {
            if (!focusEnabled) {
              return DecorationSet.empty;
            }

            const { from } = state.selection;
            const decorations: Decoration[] = [];

            let activeBlockStart = -1;
            let activeBlockEnd = -1;

            state.doc.nodesBetween(0, state.doc.content.size, (node, pos) => {
              if (node.isBlock && !node.isTextblock && node.type.name !== "doc") {
                return true;
              }
              if (node.isBlock && pos <= from && pos + node.nodeSize > from) {
                activeBlockStart = pos;
                activeBlockEnd = pos + node.nodeSize;
                return false;
              }
              return true;
            });

            state.doc.forEach((node, offset) => {
              const start = offset;
              const end = offset + node.nodeSize;
              if (start !== activeBlockStart || end !== activeBlockEnd) {
                decorations.push(
                  Decoration.node(start, end, {
                    class: "focus-mode-dimmed",
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
});
