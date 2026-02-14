import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";

const linkRevealKey = new PluginKey("linkReveal");

/**
 * Typora-style link reveal: when the cursor is inside a link,
 * show the full [text](url) syntax with muted brackets/URL.
 * Click the URL portion to edit it via prompt.
 * When cursor is elsewhere, links render normally.
 */
export const LinkReveal = Extension.create({
  name: "linkReveal",

  addProseMirrorPlugins() {
    let currentView: EditorView | null = null;

    return [
      new Plugin({
        key: linkRevealKey,
        view(view) {
          currentView = view;
          return {
            update(view) {
              currentView = view;
            },
            destroy() {
              currentView = null;
            },
          };
        },
        props: {
          decorations(state) {
            const { selection } = state;
            const { $from } = selection;
            const decorations: Decoration[] = [];

            // Find if cursor is inside a link mark
            const linkMark = $from.marks().find((m) => m.type.name === "link");
            if (!linkMark) return DecorationSet.empty;

            const href = linkMark.attrs.href;
            if (!href) return DecorationSet.empty;

            // Find the extent of this link mark in the current text block
            const parent = $from.parent;
            const parentStart = $from.start();
            let linkFrom = -1;
            let linkTo = -1;

            parent.forEach((node, offset) => {
              const nodeStart = parentStart + offset;
              const nodeEnd = nodeStart + node.nodeSize;
              if (
                node.isText &&
                node.marks.some(
                  (m) =>
                    m.type.name === "link" && m.attrs.href === href,
                )
              ) {
                if (linkFrom === -1) linkFrom = nodeStart;
                linkTo = nodeEnd;
              } else {
                // Reset if we hit a gap (different mark range)
                if (linkFrom !== -1 && linkTo !== -1) {
                  // Check if cursor is in this range
                  if ($from.pos >= linkFrom && $from.pos <= linkTo) {
                    return; // keep this range
                  }
                  // Not our range, reset
                  linkFrom = -1;
                  linkTo = -1;
                }
              }
            });

            if (linkFrom === -1 || linkTo === -1) return DecorationSet.empty;
            if ($from.pos < linkFrom || $from.pos > linkTo) return DecorationSet.empty;

            // Add [ before the link text
            decorations.push(
              Decoration.widget(linkFrom, () => {
                const span = document.createElement("span");
                span.className = "link-reveal-bracket";
                span.textContent = "[";
                return span;
              }, { side: -1 }),
            );

            // Add ](url) after the link text — clickable to edit
            const capturedFrom = linkFrom;
            const capturedTo = linkTo;
            decorations.push(
              Decoration.widget(linkTo, () => {
                const container = document.createElement("span");
                container.className = "link-reveal-url";

                const bracket = document.createElement("span");
                bracket.textContent = "](";

                const urlSpan = document.createElement("span");
                urlSpan.className = "link-reveal-url-editable";
                urlSpan.textContent = href;
                urlSpan.title = "Click to edit URL";
                urlSpan.addEventListener("click", (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const newHref = window.prompt("Edit link URL:", href);
                  if (newHref !== null && currentView) {
                    const { tr } = currentView.state;
                    const linkType = currentView.state.schema.marks.link;
                    // Remove old link mark and add new one with updated href
                    tr.removeMark(capturedFrom, capturedTo, linkType);
                    tr.addMark(
                      capturedFrom,
                      capturedTo,
                      linkType.create({ href: newHref, rel: "noopener noreferrer" }),
                    );
                    currentView.dispatch(tr);
                  }
                });

                const closeParen = document.createElement("span");
                closeParen.textContent = ")";

                container.append(bracket, urlSpan, closeParen);
                return container;
              }, { side: 1 }),
            );

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
