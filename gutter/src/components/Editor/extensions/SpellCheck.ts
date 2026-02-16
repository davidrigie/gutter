import { Extension } from "@tiptap/core";
import { useSettingsStore } from "../../../stores/settingsStore";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    spellCheck: {
      toggleSpellCheck: () => ReturnType;
      setSpellCheck: (enabled: boolean) => ReturnType;
    };
  }
}

export const SpellCheck = Extension.create({
  name: "spellCheck",

  addCommands() {
    return {
      toggleSpellCheck:
        () =>
        ({ view }) => {
          const current = view.dom.getAttribute("spellcheck") === "true";
          const next = !current;
          view.dom.setAttribute("spellcheck", next.toString());
          useSettingsStore.getState().setSpellCheckEnabled(next);
          return true;
        },
      setSpellCheck:
        (enabled: boolean) =>
        ({ view }) => {
          view.dom.setAttribute("spellcheck", enabled.toString());
          return true;
        },
    };
  },

  onCreate() {
    const enabled = useSettingsStore.getState().spellCheckEnabled;
    this.editor.view.dom.setAttribute("spellcheck", enabled.toString());
  },
});
