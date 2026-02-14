import { Extension } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";

interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  action: (editor: Editor) => void;
}

const SLASH_ITEMS: SlashCommandItem[] = [
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: "H1",
    action: (editor) => {
      editor.chain().focus().setHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: "H2",
    action: (editor) => {
      editor.chain().focus().setHeading({ level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: "H3",
    action: (editor) => {
      editor.chain().focus().setHeading({ level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Unordered list",
    icon: "\u2022",
    action: (editor) => {
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Ordered list",
    icon: "1.",
    action: (editor) => {
      editor.chain().focus().toggleOrderedList().run();
    },
  },
  {
    title: "Code Block",
    description: "Fenced code block",
    icon: "<>",
    action: (editor) => {
      editor.chain().focus().toggleCodeBlock().run();
    },
  },
  {
    title: "Blockquote",
    description: "Quote block",
    icon: "\u201C",
    action: (editor) => {
      editor.chain().focus().toggleBlockquote().run();
    },
  },
  {
    title: "Horizontal Rule",
    description: "Divider line",
    icon: "\u2014",
    action: (editor) => {
      editor.chain().focus().setHorizontalRule().run();
    },
  },
  {
    title: "Image",
    description: "Insert image from URL",
    icon: "img",
    action: (editor) => {
      const url = window.prompt("Image URL:");
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
  },
  {
    title: "Table",
    description: "Insert a table",
    icon: "tbl",
    action: (editor) => {
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    title: "Math Block",
    description: "LaTeX equation block",
    icon: "fx",
    action: (editor) => {
      editor
        .chain()
        .focus()
        .insertContent({ type: "mathBlock", attrs: { latex: "E = mc^2" } })
        .run();
    },
  },
  {
    title: "Mermaid Diagram",
    description: "Flowchart, sequence, etc.",
    icon: "\u25C7",
    action: (editor) => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "mermaidBlock",
          attrs: { code: "graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[OK]\n    B -->|No| D[End]" },
        })
        .run();
    },
  },
];

const slashKey = new PluginKey("slashCommands");

/**
 * Self-contained slash commands — no @tiptap/suggestion dependency.
 * Watches for "/" typed in the editor, shows a floating menu,
 * and executes the selected command.
 */
export const SlashCommands = Extension.create({
  name: "slashCommands",

  addProseMirrorPlugins() {
    const tiptapEditor = this.editor;

    return [
      new Plugin({
        key: slashKey,
        props: {
          handleKeyDown(view, event) {
            const menu = SlashMenu.instance;

            // If the menu is open, handle navigation keys
            if (menu?.isOpen) {
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
              if (event.key === "Enter") {
                event.preventDefault();
                menu.executeSelected();
                return true;
              }
              if (event.key === "Escape") {
                event.preventDefault();
                menu.close();
                // Delete the "/" trigger character
                const { from } = view.state.selection;
                const textBefore = view.state.doc.textBetween(
                  Math.max(0, from - 1),
                  from,
                );
                if (textBefore === "/") {
                  view.dispatch(
                    view.state.tr.delete(from - 1, from),
                  );
                }
                return true;
              }
              // Any other key filters the menu
              if (event.key === "Backspace") {
                // Let ProseMirror handle the backspace, then update
                setTimeout(() => {
                  const { from } = view.state.selection;
                  const slashPos = menu.slashPos;
                  if (from <= slashPos) {
                    menu.close();
                  } else {
                    const query = view.state.doc.textBetween(
                      slashPos + 1,
                      from,
                    );
                    menu.filter(query);
                  }
                }, 0);
                return false;
              }
              if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
                // Let ProseMirror insert the character, then filter
                setTimeout(() => {
                  const { from } = view.state.selection;
                  const query = view.state.doc.textBetween(
                    menu.slashPos + 1,
                    from,
                  );
                  menu.filter(query);
                }, 0);
                return false;
              }
            }

            // Detect "/" typed
            if (event.key === "/" && !event.metaKey && !event.ctrlKey) {
              const { from } = view.state.selection;
              // Check if at start of block or after whitespace
              const textBefore =
                from > 0
                  ? view.state.doc.textBetween(
                      Math.max(0, from - 1),
                      from,
                    )
                  : "";
              const atStart =
                from === 0 ||
                textBefore === "" ||
                textBefore === " " ||
                textBefore === "\n";

              if (atStart) {
                // Let "/" be inserted, then show menu
                setTimeout(() => {
                  const coords = view.coordsAtPos(view.state.selection.from);
                  SlashMenu.open(tiptapEditor, coords, view.state.selection.from - 1);
                }, 0);
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});

/**
 * Singleton floating menu — plain DOM, no React, no framework dependencies.
 */
class SlashMenu {
  static instance: SlashMenu | null = null;

  wrapper: HTMLDivElement;
  editor: Editor;
  items: SlashCommandItem[] = [];
  filteredItems: SlashCommandItem[] = [];
  buttons: HTMLButtonElement[] = [];
  selectedIndex = 0;
  isOpen = false;
  slashPos = 0;

  static open(editor: Editor, coords: { left: number; bottom: number }, slashPos: number) {
    if (SlashMenu.instance) {
      SlashMenu.instance.close();
    }
    const menu = new SlashMenu(editor, coords, slashPos);
    SlashMenu.instance = menu;
  }

  constructor(editor: Editor, coords: { left: number; bottom: number }, slashPos: number) {
    this.editor = editor;
    this.items = SLASH_ITEMS;
    this.filteredItems = [...SLASH_ITEMS];
    this.slashPos = slashPos;

    this.wrapper = document.createElement("div");
    this.wrapper.className = "slash-menu";
    this.wrapper.style.position = "fixed";
    this.wrapper.style.left = `${coords.left}px`;
    this.wrapper.style.top = `${coords.bottom + 4}px`;
    this.wrapper.style.zIndex = "9999";

    // Prevent clicks from blurring the editor
    this.wrapper.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });

    this.buildList();
    document.body.appendChild(this.wrapper);
    this.isOpen = true;

    // Close when clicking outside
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
    this.filteredItems = this.items.filter((item) =>
      item.title.toLowerCase().includes(query.toLowerCase()),
    );
    this.selectedIndex = 0;
    this.buildList();
    if (this.filteredItems.length === 0) {
      this.close();
      return;
    }
  }

  buildList() {
    this.wrapper.innerHTML = "";
    this.buttons = [];

    if (this.filteredItems.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "padding:8px 12px;font-size:12px;color:#9ca3af";
      empty.textContent = "No results";
      this.wrapper.appendChild(empty);
      return;
    }

    this.filteredItems.forEach((item, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "slash-menu-item";
      if (index === this.selectedIndex) btn.classList.add("is-selected");

      const icon = document.createElement("span");
      icon.className = "slash-menu-icon";
      icon.textContent = item.icon;

      const textWrap = document.createElement("div");
      textWrap.className = "slash-menu-text";

      const title = document.createElement("span");
      title.className = "slash-menu-title";
      title.textContent = item.title;

      const desc = document.createElement("span");
      desc.className = "slash-menu-desc";
      desc.textContent = item.description;

      textWrap.appendChild(title);
      textWrap.appendChild(desc);
      btn.appendChild(icon);
      btn.appendChild(textWrap);

      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.execute(item);
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
    if (this.buttons[this.selectedIndex]) {
      this.buttons[this.selectedIndex].classList.remove("is-selected");
    }
    this.selectedIndex =
      (this.selectedIndex + delta + this.filteredItems.length) %
      this.filteredItems.length;
    if (this.buttons[this.selectedIndex]) {
      this.buttons[this.selectedIndex].classList.add("is-selected");
      this.buttons[this.selectedIndex].scrollIntoView({ block: "nearest" });
    }
  }

  executeSelected() {
    const item = this.filteredItems[this.selectedIndex];
    if (item) this.execute(item);
  }

  execute(item: SlashCommandItem) {
    // Delete the "/" and any query text
    const { from } = this.editor.state.selection;
    this.editor
      .chain()
      .focus()
      .deleteRange({ from: this.slashPos, to: from })
      .run();
    // Run the command
    item.action(this.editor);
    this.close();
  }

  close() {
    this.isOpen = false;
    this.wrapper.remove();
    document.removeEventListener("mousedown", this._outsideClickHandler, true);
    if (SlashMenu.instance === this) {
      SlashMenu.instance = null;
    }
  }
}
