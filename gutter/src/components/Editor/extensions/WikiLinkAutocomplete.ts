import { Extension } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { useWorkspaceStore, type FileEntry } from "../../../stores/workspaceStore";

const wikiAutocompleteKey = new PluginKey("wikiLinkAutocomplete");

/** Flatten a FileEntry tree into a list of .md file paths. */
function flattenMdFiles(entries: FileEntry[], prefix = ""): { name: string; path: string }[] {
  const result: { name: string; path: string }[] = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.is_dir && entry.children) {
      result.push(...flattenMdFiles(entry.children, rel));
    } else if (!entry.is_dir && entry.name.endsWith(".md")) {
      result.push({ name: entry.name.replace(/\.md$/, ""), path: rel });
    }
  }
  return result;
}

/** Simple fuzzy match: all query chars must appear in order. */
function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

export const WikiLinkAutocomplete = Extension.create({
  name: "wikiLinkAutocomplete",

  addProseMirrorPlugins() {
    const tiptapEditor = this.editor;

    return [
      new Plugin({
        key: wikiAutocompleteKey,
        props: {
          handleTextInput(view, from, _to, text) {
            const menu = WikiAutocompleteMenu.instance;

            // If menu is open, let the char be inserted and re-filter
            if (menu?.isOpen) {
              setTimeout(() => {
                const { from: cursorPos } = view.state.selection;
                // triggerPos points at the first `[`, query starts after `[[`
                const queryStart = menu.triggerPos + 2;
                if (cursorPos < queryStart) {
                  menu.close();
                  return;
                }
                const query = view.state.doc.textBetween(queryStart, cursorPos);
                menu.filter(query);
              }, 0);
              return false;
            }

            // Detect `[[` — user typed `[` and the char before cursor is already `[`
            if (text === "[") {
              const charBefore = from > 0
                ? view.state.doc.textBetween(from - 1, from)
                : "";
              if (charBefore === "[") {
                // triggerPos = position of the first `[`
                const triggerPos = from - 1;
                // Let the second `[` be inserted, then show menu
                setTimeout(() => {
                  const coords = view.coordsAtPos(view.state.selection.from);
                  WikiAutocompleteMenu.open(tiptapEditor, coords, triggerPos);
                }, 0);
              }
            }
            return false;
          },

          handleKeyDown(view, event) {
            const menu = WikiAutocompleteMenu.instance;
            if (!menu?.isOpen) return false;

            if (event.key === "ArrowDown") {
              event.preventDefault();
              menu.moveSelection(1);
              return true;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              menu.moveSelection(-1);
              return true;
            }
            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              menu.executeSelected();
              return true;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              menu.close();
              return true;
            }
            if (event.key === "Backspace") {
              setTimeout(() => {
                const { from } = view.state.selection;
                // If cursor is at or before the `[[`, close
                if (from <= menu.triggerPos + 1) {
                  menu.close();
                } else {
                  const queryStart = menu.triggerPos + 2;
                  const query = view.state.doc.textBetween(queryStart, from);
                  menu.filter(query);
                }
              }, 0);
              return false;
            }
            return false;
          },
        },
      }),
    ];
  },
});

interface WikiFile {
  name: string;   // filename without .md
  path: string;   // relative path
}

class WikiAutocompleteMenu {
  static instance: WikiAutocompleteMenu | null = null;

  wrapper!: HTMLDivElement;
  editor: Editor;
  allFiles: WikiFile[] = [];
  filteredFiles: WikiFile[] = [];
  buttons: HTMLButtonElement[] = [];
  selectedIndex = 0;
  isOpen = false;
  triggerPos = 0;

  static open(editor: Editor, coords: { left: number; bottom: number }, triggerPos: number) {
    if (WikiAutocompleteMenu.instance) {
      WikiAutocompleteMenu.instance.close();
    }
    const menu = new WikiAutocompleteMenu(editor, coords, triggerPos);
    WikiAutocompleteMenu.instance = menu;
  }

  constructor(editor: Editor, coords: { left: number; bottom: number }, triggerPos: number) {
    this.editor = editor;
    this.triggerPos = triggerPos;

    // Gather workspace files
    const fileTree = useWorkspaceStore.getState().fileTree;
    this.allFiles = flattenMdFiles(fileTree);
    this.filteredFiles = [...this.allFiles];

    if (this.allFiles.length === 0) {
      // No files in workspace — don't show menu
      return;
    }

    this.wrapper = document.createElement("div");
    this.wrapper.className = "wiki-autocomplete";
    this.wrapper.style.position = "fixed";
    this.wrapper.style.left = `${coords.left}px`;
    this.wrapper.style.top = `${coords.bottom + 4}px`;
    this.wrapper.style.zIndex = "9999";
    this.wrapper.style.maxHeight = "min(300px, 50vh)";
    this.wrapper.style.overflowY = "auto";

    this.wrapper.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });

    this.buildList();
    document.body.appendChild(this.wrapper);
    this.isOpen = true;

    // Viewport adjustment
    requestAnimationFrame(() => {
      const rect = this.wrapper.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (rect.right > vw) {
        this.wrapper.style.left = `${Math.max(4, vw - rect.width - 4)}px`;
      }
      if (rect.bottom > vh) {
        this.wrapper.style.top = `${Math.max(4, coords.bottom - 4 - rect.height)}px`;
      }
    });

    this._outsideClickHandler = (e: MouseEvent) => {
      if (!this.wrapper.contains(e.target as Node)) {
        this.close();
      }
    };
    setTimeout(() => {
      document.addEventListener("mousedown", this._outsideClickHandler, true);
    }, 10);
  }

  _outsideClickHandler: (e: MouseEvent) => void = () => {};

  filter(query: string) {
    if (!query) {
      this.filteredFiles = [...this.allFiles];
    } else {
      this.filteredFiles = this.allFiles.filter((f) =>
        fuzzyMatch(query, f.name) || fuzzyMatch(query, f.path),
      );
    }
    this.selectedIndex = 0;
    this.buildList();
    if (this.filteredFiles.length === 0) {
      // Show "no results" but keep menu open so user can keep typing
      this.buildList();
    }
  }

  buildList() {
    this.wrapper.innerHTML = "";
    this.buttons = [];

    if (this.filteredFiles.length === 0) {
      const empty = document.createElement("div");
      empty.className = "wiki-autocomplete-empty";
      empty.textContent = "No matching files";
      this.wrapper.appendChild(empty);
      return;
    }

    this.filteredFiles.forEach((file, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wiki-autocomplete-item";
      if (index === this.selectedIndex) btn.classList.add("is-selected");

      const nameSpan = document.createElement("span");
      nameSpan.className = "wiki-autocomplete-name";
      nameSpan.textContent = file.name;

      btn.appendChild(nameSpan);

      // Show relative path for disambiguation if file is in a subdirectory
      if (file.path.includes("/")) {
        const pathSpan = document.createElement("span");
        pathSpan.className = "wiki-autocomplete-path";
        pathSpan.textContent = file.path.replace(/\.md$/, "");
        btn.appendChild(pathSpan);
      }

      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.execute(file);
      });

      btn.addEventListener("mouseenter", () => {
        if (this.buttons[this.selectedIndex]) {
          this.buttons[this.selectedIndex].classList.remove("is-selected");
        }
        this.selectedIndex = index;
        btn.classList.add("is-selected");
      });

      this.buttons.push(btn);
      this.wrapper.appendChild(btn);
    });
  }

  moveSelection(delta: number) {
    if (this.filteredFiles.length === 0) return;
    if (this.buttons[this.selectedIndex]) {
      this.buttons[this.selectedIndex].classList.remove("is-selected");
    }
    this.selectedIndex =
      (this.selectedIndex + delta + this.filteredFiles.length) %
      this.filteredFiles.length;
    if (this.buttons[this.selectedIndex]) {
      this.buttons[this.selectedIndex].classList.add("is-selected");
      this.buttons[this.selectedIndex].scrollIntoView({ block: "nearest" });
    }
  }

  executeSelected() {
    const file = this.filteredFiles[this.selectedIndex];
    if (file) this.execute(file);
  }

  execute(file: WikiFile) {
    // Delete from `[[` to cursor, insert `[[FileName]]`
    const { from } = this.editor.state.selection;
    this.editor
      .chain()
      .focus()
      .deleteRange({ from: this.triggerPos, to: from })
      .insertContent(`[[${file.name}]]`)
      .run();
    this.close();
  }

  close() {
    this.isOpen = false;
    if (this.wrapper) {
      this.wrapper.remove();
    }
    document.removeEventListener("mousedown", this._outsideClickHandler, true);
    if (WikiAutocompleteMenu.instance === this) {
      WikiAutocompleteMenu.instance = null;
    }
  }
}
