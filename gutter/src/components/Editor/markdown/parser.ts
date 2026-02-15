import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Node as UnistNode } from "unist";
import type { JSONContent } from "@tiptap/react";
import { convertFileSrc } from "@tauri-apps/api/core";

interface MdastNode extends UnistNode {
  children?: MdastNode[];
  value?: string;
  url?: string;
  alt?: string;
  title?: string;
  lang?: string;
  meta?: string;
  ordered?: boolean;
  start?: number;
  depth?: number;
  checked?: boolean | null;
  align?: (string | null)[];
}

const COMMENT_MARKER_RE =
  /<mark>([\s\S]*?)<\/mark><sup>\[c(\d+)\]<\/sup>/g;

export function parseMarkdown(markdown: string, fileDirPath?: string): JSONContent {
  // Extract frontmatter before parsing
  let frontmatterContent: string | null = null;
  let body = markdown;
  const fmMatch = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (fmMatch) {
    frontmatterContent = fmMatch[1];
    body = fmMatch[2];
  }

  // Extract math blocks before parsing (remark doesn't handle $$)
  const { cleaned, mathBlocks } = extractMathBlocks(body);

  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .parse(cleaned) as MdastNode;
  const content = convertChildren(tree);

  // Re-insert math blocks
  const result = reinsertMathBlocks(content, mathBlocks);

  // Prepend frontmatter node if present
  const docContent: JSONContent[] = [];
  if (frontmatterContent !== null) {
    docContent.push({
      type: "frontmatter",
      attrs: { content: frontmatterContent },
    });
  }
  docContent.push(...result);

  const doc: JSONContent = {
    type: "doc",
    content: docContent.length > 0 ? docContent : [{ type: "paragraph" }],
  };

  // Resolve relative image paths to Tauri asset URLs for display
  if (fileDirPath) {
    resolveImagePaths(doc, fileDirPath);
  }

  return doc;
}

/** Walk the doc tree and convert relative image src to Tauri asset URLs */
function resolveImagePaths(node: JSONContent, dirPath: string) {
  if (node.type === "image" && node.attrs?.src) {
    const src = node.attrs.src as string;
    if (src.startsWith("./") || src.startsWith("../")) {
      const absolute = dirPath + "/" + src.replace(/^\.\//, "");
      node.attrs.src = convertFileSrc(absolute);
    }
  }
  if (node.content) {
    for (const child of node.content) {
      resolveImagePaths(child, dirPath);
    }
  }
}

function extractMathBlocks(md: string): {
  cleaned: string;
  mathBlocks: Map<string, string>;
} {
  const mathBlocks = new Map<string, string>();
  let counter = 0;
  const cleaned = md.replace(/\$\$([\s\S]*?)\$\$/g, (_match, latex) => {
    const placeholder = `MATH_BLOCK_${counter++}`;
    mathBlocks.set(placeholder, latex.trim());
    return placeholder;
  });
  return { cleaned, mathBlocks };
}

function reinsertMathBlocks(
  content: JSONContent[],
  mathBlocks: Map<string, string>,
): JSONContent[] {
  if (mathBlocks.size === 0) return content;
  return content.map((node) => {
    if (node.type === "paragraph" && node.content?.length === 1) {
      const text = node.content[0].text || "";
      const match = text.match(/^MATH_BLOCK_(\d+)$/);
      if (match) {
        const placeholder = `MATH_BLOCK_${match[1]}`;
        const latex = mathBlocks.get(placeholder);
        if (latex !== undefined) {
          return { type: "mathBlock", attrs: { latex } };
        }
      }
    }
    if (node.content) {
      return { ...node, content: reinsertMathBlocks(node.content, mathBlocks) };
    }
    return node;
  });
}

function convertChildren(node: MdastNode): JSONContent[] {
  if (!node.children) return [];
  const result: JSONContent[] = [];
  for (const child of node.children) {
    const converted = convertNode(child);
    if (converted) {
      if (Array.isArray(converted)) {
        result.push(...converted);
      } else {
        result.push(converted);
      }
    }
  }
  return result;
}

function convertNode(node: MdastNode): JSONContent | JSONContent[] | null {
  switch (node.type) {
    case "heading":
      return {
        type: "heading",
        attrs: { level: node.depth || 1 },
        content: convertInlineChildren(node),
      };

    case "paragraph": {
      const inlineContent = convertInlineChildren(node);
      if (!inlineContent || inlineContent.length === 0) {
        return { type: "paragraph" };
      }
      return { type: "paragraph", content: inlineContent };
    }

    case "blockquote":
      return {
        type: "blockquote",
        content: convertChildren(node),
      };

    case "list": {
      // Check if any child is a task item (has checked !== null/undefined)
      const isTaskList = node.children?.some(
        (child) => child.checked !== null && child.checked !== undefined,
      );
      if (isTaskList) {
        return {
          type: "taskList",
          content: convertChildren(node),
        };
      }
      return {
        type: node.ordered ? "orderedList" : "bulletList",
        attrs: node.ordered ? { start: node.start || 1 } : undefined,
        content: convertChildren(node),
      };
    }

    case "listItem": {
      const content = convertChildren(node);
      if (node.checked !== null && node.checked !== undefined) {
        return {
          type: "taskItem",
          attrs: { checked: node.checked },
          content: content.length > 0 ? content : [{ type: "paragraph" }],
        };
      }
      return {
        type: "listItem",
        content: content.length > 0 ? content : [{ type: "paragraph" }],
      };
    }

    case "code":
      // Mermaid code blocks become mermaidBlock nodes
      if (node.lang === "mermaid") {
        return {
          type: "mermaidBlock",
          attrs: { code: node.value || "" },
        };
      }
      return {
        type: "codeBlock",
        attrs: { language: node.lang || null },
        content: node.value ? [{ type: "text", text: node.value }] : [],
      };

    case "thematicBreak":
      return { type: "horizontalRule" };

    case "image":
      return {
        type: "image",
        attrs: {
          src: node.url || "",
          alt: node.alt || null,
          title: node.title || null,
        },
      };

    case "table":
      return convertTable(node);

    case "html":
      return convertHtmlBlock(node);

    default:
      return null;
  }
}

/**
 * Convert inline children, detecting comment marker patterns across
 * adjacent nodes: <mark> + text + </mark> + <sup> + [cN] + </sup>
 */
function convertInlineChildren(node: MdastNode): JSONContent[] | undefined {
  if (!node.children || node.children.length === 0) return undefined;

  const children = node.children;
  const result: JSONContent[] = [];
  let i = 0;

  while (i < children.length) {
    // Try to match comment marker pattern: <mark> text </mark><sup>[cN]</sup>
    // remark splits this into: html(<mark>), text(content), html(</mark>), html(<sup>), text([cN]), html(</sup>)
    const markerResult = tryMatchCommentMarker(children, i);
    if (markerResult) {
      result.push(markerResult.node);
      i = markerResult.nextIndex;
      continue;
    }

    // Try to match bare <mark>text</mark> (no comment ID)
    const bareMarkResult = tryMatchBareMark(children, i);
    if (bareMarkResult) {
      result.push(...bareMarkResult.nodes);
      i = bareMarkResult.nextIndex;
      continue;
    }

    const converted = convertInlineNode(children[i]);
    if (converted) {
      if (Array.isArray(converted)) {
        result.push(...converted);
      } else {
        result.push(converted);
      }
    }
    i++;
  }

  return result.length > 0 ? result : undefined;
}

function tryMatchCommentMarker(
  children: MdastNode[],
  start: number,
): { node: JSONContent; nextIndex: number } | null {
  // Pattern: html(<mark>) text html(</mark>) html(<sup>) text([cN]) html(</sup>)
  if (start + 5 >= children.length) return null;

  const n0 = children[start];
  const n1 = children[start + 1];
  const n2 = children[start + 2];
  const n3 = children[start + 3];
  const n4 = children[start + 4];
  const n5 = children[start + 5];

  if (
    n0.type === "html" && n0.value === "<mark>" &&
    n1.type === "text" && n1.value &&
    n2.type === "html" && n2.value === "</mark>" &&
    n3.type === "html" && n3.value === "<sup>" &&
    n4.type === "text" && n4.value &&
    n5.type === "html" && n5.value === "</sup>"
  ) {
    const idMatch = n4.value.match(/^\[c(\d+)\]$/);
    if (idMatch) {
      return {
        node: {
          type: "text",
          text: n1.value,
          marks: [
            {
              type: "commentMark",
              attrs: { commentId: `c${idMatch[1]}` },
            },
          ],
        },
        nextIndex: start + 6,
      };
    }
  }

  return null;
}

function tryMatchBareMark(
  children: MdastNode[],
  start: number,
): { nodes: JSONContent[]; nextIndex: number } | null {
  // Pattern: html(<mark>) text html(</mark>) — without following <sup>[cN]</sup>
  if (start + 2 >= children.length) return null;

  const n0 = children[start];
  const n1 = children[start + 1];
  const n2 = children[start + 2];

  if (
    n0.type === "html" && n0.value === "<mark>" &&
    n1.type === "text" && n1.value &&
    n2.type === "html" && n2.value === "</mark>"
  ) {
    // Check if this is NOT followed by a comment sup
    const isComment = tryMatchCommentMarker(children, start) !== null;
    if (!isComment) {
      return {
        nodes: [
          { type: "text", text: "<mark>" },
          { type: "text", text: n1.value },
          { type: "text", text: "</mark>" },
        ],
        nextIndex: start + 3,
      };
    }
  }

  return null;
}

/** Split a text string on $...$ patterns, producing text nodes and mathInline nodes */
function extractInlineMath(text: string): JSONContent | JSONContent[] {
  // Match $...$ but not $$...$$ (block math) and not escaped \$
  // The content must not start/end with space and must be non-empty
  const re = /(?<!\$)\$(?!\$)([^\s$][^$]*?[^\s$]|[^\s$])\$(?!\$)/g;
  const parts: JSONContent[] = [];
  let lastIndex = 0;
  let match;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "mathInline", attrs: { latex: match[1] } });
    lastIndex = re.lastIndex;
  }

  if (parts.length === 0) {
    return { type: "text", text };
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", text: text.slice(lastIndex) });
  }

  return parts;
}

function convertInlineNode(node: MdastNode): JSONContent | JSONContent[] | null {
  switch (node.type) {
    case "text":
      if (!node.value) return null;
      return extractInlineMath(node.value);

    case "strong": {
      const children = convertInlineChildren(node);
      if (!children) return null;
      return children.map((child) => addMark(child, { type: "bold" }));
    }

    case "emphasis": {
      const children = convertInlineChildren(node);
      if (!children) return null;
      return children.map((child) => addMark(child, { type: "italic" }));
    }

    case "delete": {
      const children = convertInlineChildren(node);
      if (!children) return null;
      return children.map((child) => addMark(child, { type: "strike" }));
    }

    case "inlineCode":
      return {
        type: "text",
        text: node.value || "",
        marks: [{ type: "code" }],
      };

    case "link": {
      const children = convertInlineChildren(node);
      if (!children) return null;
      const linkMark = {
        type: "link",
        attrs: {
          href: node.url || "",
          target: "_blank",
          rel: "noopener noreferrer",
          class: null,
        },
      };
      return children.map((child) => addMark(child, linkMark));
    }

    case "image":
      return {
        type: "image",
        attrs: {
          src: node.url || "",
          alt: node.alt || null,
          title: node.title || null,
        },
      };

    case "html":
      // Single HTML tag that wasn't caught by the multi-node pattern matcher
      return { type: "text", text: node.value || "" };

    case "break":
      return { type: "hardBreak" };

    default:
      return null;
  }
}

function addMark(node: JSONContent, mark: Record<string, unknown>): JSONContent {
  const existingMarks = (node.marks || []) as Record<string, unknown>[];
  return {
    ...node,
    marks: [...existingMarks, mark] as JSONContent["marks"],
  };
}

function convertHtmlBlock(node: MdastNode): JSONContent | JSONContent[] | null {
  const html = (node.value || "").trim();

  const markers: JSONContent[] = [];
  let lastIndex = 0;
  let match;
  const re = new RegExp(COMMENT_MARKER_RE.source, "g");

  while ((match = re.exec(html)) !== null) {
    if (match.index > lastIndex) {
      const before = html.slice(lastIndex, match.index).trim();
      if (before) {
        markers.push({ type: "text", text: before });
      }
    }
    markers.push({
      type: "text",
      text: match[1],
      marks: [
        { type: "commentMark", attrs: { commentId: `c${match[2]}` } },
      ],
    });
    lastIndex = re.lastIndex;
  }

  if (markers.length > 0) {
    if (lastIndex < html.length) {
      const after = html.slice(lastIndex).trim();
      if (after) {
        markers.push({ type: "text", text: after });
      }
    }
    return { type: "paragraph", content: markers };
  }

  return {
    type: "paragraph",
    content: [{ type: "text", text: html }],
  };
}

function convertTable(node: MdastNode): JSONContent | null {
  if (!node.children) return null;

  const rows: JSONContent[] = [];

  for (let i = 0; i < node.children.length; i++) {
    const row = node.children[i];
    if (row.type !== "tableRow" || !row.children) continue;

    const cells: JSONContent[] = [];
    for (const cell of row.children) {
      const cellType = i === 0 ? "tableHeader" : "tableCell";
      const content = convertInlineChildren(cell);
      cells.push({
        type: cellType,
        content: [
          {
            type: "paragraph",
            content: content,
          },
        ],
      });
    }

    rows.push({ type: "tableRow", content: cells });
  }

  return {
    type: "table",
    content: rows,
  };
}
