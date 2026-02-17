import type { JSONContent } from "@tiptap/react";

/**
 * Convert a Tauri asset protocol URL back to a relative path for markdown.
 * Prefers originalSrc (stored during parsing) for exact round-trip fidelity.
 */
function assetUrlToRelative(src: string, originalSrc?: string | null): string {
  // Use the original relative path if available (handles Obsidian bare paths, etc.)
  if (originalSrc) return originalSrc;
  // Fallback: extract ./assets/... from Tauri asset URLs
  // Normalize backslashes for Windows paths before matching
  if (src.includes("asset.localhost")) {
    const normalized = src.replace(/\\/g, "/");
    const match = normalized.match(/\/assets\/[^?#]+/);
    if (match) return "." + match[0];
  }
  return src;
}

/**
 * Serialize a TipTap JSON document back to markdown string.
 */
export function serializeMarkdown(doc: JSONContent): string {
  if (!doc.content) return "";

  // Handle frontmatter: if first node is frontmatter, serialize it separately
  let frontmatter = "";
  let contentNodes = doc.content;
  if (doc.content[0]?.type === "frontmatter") {
    const fmContent = doc.content[0].attrs?.content || "";
    frontmatter = `---\n${fmContent}\n---\n`;
    contentNodes = doc.content.slice(1);
  }

  const blocks = contentNodes.map((node, i) =>
    serializeBlock(node, contentNodes, i),
  );
  return frontmatter + blocks.join("\n\n") + "\n";
}

function serializeBlock(
  node: JSONContent,
  _siblings: JSONContent[],
  _index: number,
): string {
  switch (node.type) {
    case "heading": {
      const level = node.attrs?.level || 1;
      const prefix = "#".repeat(level);
      return `${prefix} ${serializeInline(node.content)}`;
    }

    case "paragraph":
      return serializeInline(node.content);

    case "blockquote": {
      if (!node.content) return ">";
      const inner = node.content
        .map((child, i) => serializeBlock(child, node.content!, i))
        .join("\n\n");
      return inner
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    }

    case "bulletList":
      return serializeList(node, false);

    case "orderedList":
      return serializeList(node, true);

    case "taskList":
      return serializeTaskList(node);

    case "codeBlock": {
      const lang = node.attrs?.language || "";
      const code = node.content?.map((c) => c.text || "").join("") || "";
      return "```" + lang + "\n" + code + "\n```";
    }

    case "horizontalRule":
      return "---";

    case "image": {
      const alt = node.attrs?.alt || "";
      const src = assetUrlToRelative(node.attrs?.src || "", node.attrs?.originalSrc);
      if (node.attrs?.wikiEmbed) {
        return alt ? `![[${src}|${alt}]]` : `![[${src}]]`;
      }
      const title = node.attrs?.title;
      if (title) {
        return `![${alt}](${src} "${title}")`;
      }
      return `![${alt}](${src})`;
    }

    case "table":
      return serializeTable(node);

    case "mathBlock": {
      const latex = node.attrs?.latex || "";
      return `$$\n${latex}\n$$`;
    }

    case "mermaidBlock": {
      const mermaidCode = node.attrs?.code || "";
      return "```mermaid\n" + mermaidCode + "\n```";
    }

    case "hardBreak":
      return "  \n";

    default:
      return serializeInline(node.content);
  }
}

function serializeList(node: JSONContent, ordered: boolean): string {
  if (!node.content) return "";
  const start = node.attrs?.start || 1;
  return node.content
    .map((item, i) => {
      const prefix = ordered ? `${start + i}. ` : "- ";
      const content = serializeListItem(item);
      const lines = content.split("\n");
      const first = prefix + lines[0];
      const rest = lines
        .slice(1)
        .map((line) => "  " + line)
        .join("\n");
      return rest ? first + "\n" + rest : first;
    })
    .join("\n");
}

function serializeListItem(node: JSONContent): string {
  if (!node.content) return "";
  return node.content
    .map((child, i) => {
      if (child.type === "bulletList" || child.type === "orderedList") {
        return serializeList(child, child.type === "orderedList");
      }
      if (child.type === "taskList") {
        return serializeTaskList(child);
      }
      const text = serializeBlock(child, node.content!, i);
      return text;
    })
    .join("\n");
}

function serializeTaskList(node: JSONContent): string {
  if (!node.content) return "";
  return node.content
    .map((item) => {
      const checked = item.attrs?.checked ? "x" : " ";
      const content = serializeListItem(item);
      const lines = content.split("\n");
      const first = `- [${checked}] ${lines[0]}`;
      const rest = lines
        .slice(1)
        .map((line) => "  " + line)
        .join("\n");
      return rest ? first + "\n" + rest : first;
    })
    .join("\n");
}

function serializeInline(content?: JSONContent[]): string {
  if (!content) return "";
  return content.map(serializeInlineNode).join("");
}

function serializeInlineNode(node: JSONContent): string {
  if (node.type === "hardBreak") {
    return "  \n";
  }

  if (node.type === "image") {
    const alt = node.attrs?.alt || "";
    const src = assetUrlToRelative(node.attrs?.src || "", node.attrs?.originalSrc);
    if (node.attrs?.wikiEmbed) {
      return alt ? `![[${src}|${alt}]]` : `![[${src}]]`;
    }
    return `![${alt}](${src})`;
  }

  if (node.type === "mathInline") {
    return `$${node.attrs?.latex || ""}$`;
  }

  if (node.type !== "text" || !node.text) return "";

  let text = node.text;
  const marks = node.marks || [];

  // Check for comment marks first — these serialize as HTML
  const commentMark = marks.find((m) => m.type === "commentMark");
  if (commentMark) {
    const id = commentMark.attrs?.commentId || "c0";
    const otherMarks = marks.filter((m) => m.type !== "commentMark");
    text = `<mark>${text}</mark><sup>[${id}]</sup>`;
    // Apply other marks around the HTML
    return wrapWithMarks(text, otherMarks);
  }

  return wrapWithMarks(text, marks);
}

function wrapWithMarks(text: string, marks: JSONContent[]): string {
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        text = `**${text}**`;
        break;
      case "italic":
        text = `*${text}*`;
        break;
      case "strike":
        text = `~~${text}~~`;
        break;
      case "code":
        text = `\`${text}\``;
        break;
      case "underline":
        text = `<u>${text}</u>`;
        break;
      case "link":
        text = `[${text}](${mark.attrs?.href || ""})`;
        break;
    }
  }
  return text;
}

function serializeTable(node: JSONContent): string {
  if (!node.content) return "";

  const rows: string[][] = [];
  let headerCount = 0;

  for (const row of node.content) {
    if (row.type !== "tableRow" || !row.content) continue;
    const cells: string[] = [];
    let isHeader = false;
    for (const cell of row.content) {
      if (cell.type === "tableHeader") isHeader = true;
      const content = cell.content
        ?.map((p) => serializeInline(p.content))
        .join(" ") || "";
      cells.push(content);
    }
    rows.push(cells);
    if (isHeader) headerCount++;
  }

  if (rows.length === 0) return "";

  const colCount = Math.max(...rows.map((r) => r.length));
  const lines: string[] = [];

  // Header row
  const header = rows[0] || [];
  lines.push("| " + padRow(header, colCount).join(" | ") + " |");

  // Separator
  lines.push(
    "| " +
      Array(colCount)
        .fill("---")
        .join(" | ") +
      " |",
  );

  // Body rows
  for (let i = 1; i < rows.length; i++) {
    lines.push("| " + padRow(rows[i], colCount).join(" | ") + " |");
  }

  return lines.join("\n");
}

function padRow(row: string[], colCount: number): string[] {
  const result = [...row];
  while (result.length < colCount) {
    result.push("");
  }
  return result;
}
