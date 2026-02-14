import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode, Mark } from "@tiptap/pm/model";
import { useWorkspaceStore, type FileEntry } from "../../../stores/workspaceStore";

function wikiTargetExists(target: string): boolean {
  const { fileTree } = useWorkspaceStore.getState();
  const search = (entries: FileEntry[]): boolean => {
    for (const entry of entries) {
      if (!entry.is_dir) {
        const nameWithoutExt = entry.name.replace(/\.md$/, "");
        if (nameWithoutExt === target || entry.name === target) return true;
      }
      if (entry.children && search(entry.children)) return true;
    }
    return false;
  };
  return search(fileTree);
}

const lineRevealKey = new PluginKey("lineReveal");

// ── Mark range detection ──────────────────────────────────────────

interface MarkRange {
  from: number;
  to: number;
  markName: string;
}

interface LinkRange {
  from: number;
  to: number;
  href: string;
}

interface WikiLinkMatch {
  fullStart: number;
  fullEnd: number;
  innerStart: number;
  innerEnd: number;
  target: string;
}

function findMarkRanges(block: PMNode, blockStart: number): MarkRange[] {
  const ranges: MarkRange[] = [];
  const active = new Map<string, { from: number; to: number }>();

  block.forEach((child, offset) => {
    const pos = blockStart + offset;
    const endPos = pos + child.nodeSize;
    const childMarkNames = new Set(child.marks.map((m: Mark) => m.type.name));

    // Close marks that ended or have a gap
    for (const [name, range] of active) {
      if (!childMarkNames.has(name) || range.to !== pos) {
        ranges.push({ from: range.from, to: range.to, markName: name });
        active.delete(name);
      }
    }

    if (child.isText) {
      for (const mark of child.marks) {
        const name = mark.type.name;
        const existing = active.get(name);
        if (existing && existing.to === pos) {
          existing.to = endPos;
        } else if (!existing) {
          active.set(name, { from: pos, to: endPos });
        } else {
          ranges.push({ from: existing.from, to: existing.to, markName: name });
          active.set(name, { from: pos, to: endPos });
        }
      }

      // Close marks not present on this node
      for (const [name, range] of active) {
        if (!childMarkNames.has(name)) {
          ranges.push({ from: range.from, to: range.to, markName: name });
          active.delete(name);
        }
      }
    }
  });

  for (const [name, range] of active) {
    ranges.push({ from: range.from, to: range.to, markName: name });
  }

  return ranges;
}

function findLinksInBlock(block: PMNode, blockStart: number): LinkRange[] {
  const links: LinkRange[] = [];
  let current: LinkRange | null = null;

  block.forEach((child, offset) => {
    const pos = blockStart + offset;
    const linkMark = child.marks.find((m: Mark) => m.type.name === "link");

    if (linkMark && child.isText) {
      const href = linkMark.attrs.href;
      if (current && current.href === href && current.to === pos) {
        current.to = pos + child.nodeSize;
      } else {
        if (current) links.push(current);
        current = { from: pos, to: pos + child.nodeSize, href };
      }
    } else {
      if (current) {
        links.push(current);
        current = null;
      }
    }
  });

  if (current) links.push(current);
  return links;
}

function findWikiLinksInBlock(block: PMNode, blockStart: number): WikiLinkMatch[] {
  const matches: WikiLinkMatch[] = [];
  block.forEach((child, offset) => {
    if (!child.isText || !child.text) return;
    const pos = blockStart + offset;
    const regex = /\[\[([^\]]+)\]\]/g;
    let match;
    while ((match = regex.exec(child.text)) !== null) {
      const fullStart = pos + match.index;
      const fullEnd = fullStart + match[0].length;
      matches.push({
        fullStart,
        fullEnd,
        innerStart: fullStart + 2,
        innerEnd: fullEnd - 2,
        target: match[1],
      });
    }
  });
  return matches;
}

// ── Syntax characters per mark ────────────────────────────────────

const MARK_SYNTAX: Record<string, { open: string; close: string }> = {
  bold: { open: "**", close: "**" },
  italic: { open: "*", close: "*" },
  strike: { open: "~~", close: "~~" },
  code: { open: "`", close: "`" },
};

// ── Widget helpers ────────────────────────────────────────────────

function syntaxWidget(text: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = "line-reveal-syntax";
  span.textContent = text;
  return span;
}

/**
 * Typora-style line reveal: when the cursor is on a line, reveal the raw
 * markdown syntax for headings, bold, italic, strikethrough, code, links,
 * and wiki links.
 */
export const LinkReveal = Extension.create({
  name: "linkReveal",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: lineRevealKey,
        props: {
          decorations(state) {
            const { selection } = state;
            const $from = selection.$from;
            const depth = $from.depth;
            if (depth === 0) return DecorationSet.empty;

            const block = $from.node(depth);
            const blockStart = $from.start(depth);
            const decorations: Decoration[] = [];

            // ── Heading prefix ──────────────────────────
            if (block.type.name === "heading") {
              const level = block.attrs.level as number;
              const prefix = "#".repeat(level) + " ";
              decorations.push(
                Decoration.widget(blockStart, () => syntaxWidget(prefix), { side: -1 }),
              );
            }

            // ── Inline marks (bold, italic, strike, code) ──
            const markRanges = findMarkRanges(block, blockStart);

            for (const range of markRanges) {
              if (range.markName === "link") continue;

              const syntax = MARK_SYNTAX[range.markName];
              if (!syntax) continue;

              decorations.push(
                Decoration.widget(range.from, () => syntaxWidget(syntax.open), { side: -1 }),
              );
              decorations.push(
                Decoration.widget(range.to, () => syntaxWidget(syntax.close), { side: 1 }),
              );
            }

            // ── Links: [text](url) — click URL to edit ──
            const links = findLinksInBlock(block, blockStart);

            if (links.length > 0) {
              const blockBefore = $from.before(depth);
              const blockAfter = $from.after(depth);
              decorations.push(
                Decoration.node(blockBefore, blockAfter, {
                  class: "line-reveal-has-links",
                }),
              );
            }

            for (const link of links) {
              // [
              decorations.push(
                Decoration.widget(link.from, () => syntaxWidget("["), { side: -1 }),
              );

              // ](url) — visual only, editing via floating toolbar
              decorations.push(
                Decoration.widget(link.to, () => {
                  const span = document.createElement("span");
                  span.className = "line-reveal-syntax";
                  span.textContent = `](${link.href})`;
                  return span;
                }, { side: 1 }),
              );
            }

            // ── Wiki links: show [[ and ]] on active line ──
            const wikiLinks = findWikiLinksInBlock(block, blockStart);

            for (const wl of wikiLinks) {
              // Show [[ brackets (visible, muted)
              decorations.push(
                Decoration.inline(wl.fullStart, wl.innerStart, {
                  class: "wiki-link-bracket wiki-link-bracket-visible",
                }),
              );
              // Style inner text as link — dim if target doesn't exist
              const exists = wikiTargetExists(wl.target);
              decorations.push(
                Decoration.inline(wl.innerStart, wl.innerEnd, {
                  class: exists ? "wiki-link-inline" : "wiki-link-inline wiki-link-new",
                  "data-wiki-target": wl.target,
                }),
              );
              // Show ]] brackets (visible, muted)
              decorations.push(
                Decoration.inline(wl.innerEnd, wl.fullEnd, {
                  class: "wiki-link-bracket wiki-link-bracket-visible",
                }),
              );
            }

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
