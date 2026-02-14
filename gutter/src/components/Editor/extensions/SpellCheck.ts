import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    spellCheck: {
      toggleSpellCheck: () => ReturnType;
      setSpellCheck: (enabled: boolean) => ReturnType;
    };
  }
}

let spellCheckEnabled = false;

export const SpellCheck = Extension.create({
  name: "spellCheck",

  addCommands() {
    return {
      toggleSpellCheck:
        () =>
        ({ view }) => {
          spellCheckEnabled = !spellCheckEnabled;
          view.dom.setAttribute("spellcheck", spellCheckEnabled.toString());
          return true;
        },
      setSpellCheck:
        (enabled: boolean) =>
        ({ view }) => {
          spellCheckEnabled = enabled;
          view.dom.setAttribute("spellcheck", enabled.toString());
          return true;
        },
    };
  },

  onCreate() {
    this.editor.view.dom.setAttribute("spellcheck", spellCheckEnabled.toString());
  },
});
