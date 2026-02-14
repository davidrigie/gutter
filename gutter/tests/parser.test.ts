import { describe, it, expect } from "vitest";
import { parseMarkdown } from "../src/components/Editor/markdown/parser";

describe("Markdown Parser", () => {
  it("parses headings", () => {
    const doc = parseMarkdown("# Heading 1\n\n## Heading 2\n\n### Heading 3");
    expect(doc.content).toHaveLength(3);
    expect(doc.content![0].type).toBe("heading");
    expect(doc.content![0].attrs?.level).toBe(1);
    expect(doc.content![0].content![0].text).toBe("Heading 1");
    expect(doc.content![1].attrs?.level).toBe(2);
    expect(doc.content![2].attrs?.level).toBe(3);
  });

  it("parses paragraphs with inline formatting", () => {
    const doc = parseMarkdown(
      "A paragraph with **bold**, *italic*, ~~strikethrough~~, `inline code`, and a [link](https://example.com).",
    );
    expect(doc.content).toHaveLength(1);
    const p = doc.content![0];
    expect(p.type).toBe("paragraph");
    expect(p.content!.length).toBeGreaterThan(1);

    // Find bold
    const bold = p.content!.find(
      (n) => n.marks?.some((m) => m.type === "bold"),
    );
    expect(bold).toBeDefined();
    expect(bold!.text).toBe("bold");

    // Find italic
    const italic = p.content!.find(
      (n) => n.marks?.some((m) => m.type === "italic"),
    );
    expect(italic).toBeDefined();
    expect(italic!.text).toBe("italic");

    // Find strikethrough
    const strike = p.content!.find(
      (n) => n.marks?.some((m) => m.type === "strike"),
    );
    expect(strike).toBeDefined();
    expect(strike!.text).toBe("strikethrough");

    // Find inline code
    const code = p.content!.find(
      (n) => n.marks?.some((m) => m.type === "code"),
    );
    expect(code).toBeDefined();
    expect(code!.text).toBe("inline code");

    // Find link
    const link = p.content!.find(
      (n) => n.marks?.some((m) => m.type === "link"),
    );
    expect(link).toBeDefined();
    expect(link!.text).toBe("link");
    expect(link!.marks![0].attrs?.href).toBe("https://example.com");
  });

  it("parses bullet lists", () => {
    const doc = parseMarkdown("- Item 1\n- Item 2\n  - Nested item");
    expect(doc.content).toHaveLength(1);
    expect(doc.content![0].type).toBe("bulletList");
    expect(doc.content![0].content).toHaveLength(2);
  });

  it("parses ordered lists", () => {
    const doc = parseMarkdown("1. First\n2. Second");
    expect(doc.content).toHaveLength(1);
    expect(doc.content![0].type).toBe("orderedList");
    expect(doc.content![0].content).toHaveLength(2);
  });

  it("parses blockquotes", () => {
    const doc = parseMarkdown("> A blockquote with **bold** inside");
    expect(doc.content).toHaveLength(1);
    expect(doc.content![0].type).toBe("blockquote");
  });

  it("parses code blocks with language", () => {
    const doc = parseMarkdown('```javascript\nconst x = 1;\n```');
    expect(doc.content).toHaveLength(1);
    expect(doc.content![0].type).toBe("codeBlock");
    expect(doc.content![0].attrs?.language).toBe("javascript");
    expect(doc.content![0].content![0].text).toBe("const x = 1;");
  });

  it("parses images", () => {
    const doc = parseMarkdown("![alt text](image.png)");
    expect(doc.content).toHaveLength(1);
    const p = doc.content![0];
    // remark parses images inside paragraphs
    const img = p.type === "image" ? p : p.content?.find((n) => n.type === "image");
    expect(img).toBeDefined();
    expect(img!.attrs?.src).toBe("image.png");
    expect(img!.attrs?.alt).toBe("alt text");
  });

  it("parses horizontal rules", () => {
    const doc = parseMarkdown("---");
    expect(doc.content).toHaveLength(1);
    expect(doc.content![0].type).toBe("horizontalRule");
  });

  it("parses comment markers as commentMark", () => {
    const doc = parseMarkdown(
      "Some text with <mark>highlighted</mark><sup>[c1]</sup> content.",
    );
    // Find the comment mark
    const paragraph = doc.content!.find((n) => n.type === "paragraph");
    expect(paragraph).toBeDefined();
    const commentNode = paragraph!.content!.find(
      (n) => n.marks?.some((m) => m.type === "commentMark"),
    );
    expect(commentNode).toBeDefined();
    expect(commentNode!.text).toBe("highlighted");
    expect(commentNode!.marks![0].attrs?.commentId).toBe("c1");
  });

  it("preserves bare <mark> without comment ID as text", () => {
    const doc = parseMarkdown(
      "A bare <mark>highlight without comment</mark> should survive.",
    );
    const paragraph = doc.content!.find((n) => n.type === "paragraph");
    expect(paragraph).toBeDefined();
    // Should not have commentMark
    const hasComment = paragraph!.content!.some(
      (n) => n.marks?.some((m) => m.type === "commentMark"),
    );
    expect(hasComment).toBe(false);
  });

  it("parses empty document", () => {
    const doc = parseMarkdown("");
    expect(doc.type).toBe("doc");
    expect(doc.content).toHaveLength(1);
  });
});
