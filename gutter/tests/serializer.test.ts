import { describe, it, expect } from "vitest";
import { serializeMarkdown } from "../src/components/Editor/markdown/serializer";
import type { JSONContent } from "@tiptap/react";

describe("Markdown Serializer", () => {
  it("serializes headings", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Hello" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "World" }],
        },
      ],
    };
    const md = serializeMarkdown(doc);
    expect(md).toContain("# Hello");
    expect(md).toContain("## World");
  });

  it("serializes inline formatting", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Some " },
            { type: "text", text: "bold", marks: [{ type: "bold" }] },
            { type: "text", text: " and " },
            { type: "text", text: "italic", marks: [{ type: "italic" }] },
            { type: "text", text: " and " },
            { type: "text", text: "struck", marks: [{ type: "strike" }] },
            { type: "text", text: " and " },
            { type: "text", text: "code", marks: [{ type: "code" }] },
          ],
        },
      ],
    };
    const md = serializeMarkdown(doc);
    expect(md).toContain("**bold**");
    expect(md).toContain("*italic*");
    expect(md).toContain("~~struck~~");
    expect(md).toContain("`code`");
  });

  it("serializes links", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "click here",
              marks: [
                { type: "link", attrs: { href: "https://example.com" } },
              ],
            },
          ],
        },
      ],
    };
    const md = serializeMarkdown(doc);
    expect(md).toContain("[click here](https://example.com)");
  });

  it("serializes bullet lists", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item 1" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item 2" }],
                },
              ],
            },
          ],
        },
      ],
    };
    const md = serializeMarkdown(doc);
    expect(md).toContain("- Item 1\n- Item 2");
  });

  it("serializes ordered lists", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "orderedList",
          attrs: { start: 1 },
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "First" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Second" }],
                },
              ],
            },
          ],
        },
      ],
    };
    const md = serializeMarkdown(doc);
    expect(md).toContain("1. First\n2. Second");
  });

  it("serializes code blocks", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: "javascript" },
          content: [{ type: "text", text: "const x = 1;" }],
        },
      ],
    };
    const md = serializeMarkdown(doc);
    expect(md).toContain("```javascript\nconst x = 1;\n```");
  });

  it("serializes blockquotes", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "A quote" }],
            },
          ],
        },
      ],
    };
    const md = serializeMarkdown(doc);
    expect(md).toContain("> A quote");
  });

  it("serializes horizontal rules", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [{ type: "horizontalRule" }],
    };
    const md = serializeMarkdown(doc);
    expect(md).toContain("---");
  });

  it("serializes images", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { src: "image.png", alt: "alt text", title: null },
        },
      ],
    };
    const md = serializeMarkdown(doc);
    expect(md).toContain("![alt text](image.png)");
  });

  it("serializes comment markers as HTML", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Some " },
            {
              type: "text",
              text: "highlighted",
              marks: [
                {
                  type: "commentMark",
                  attrs: { commentId: "c1" },
                },
              ],
            },
            { type: "text", text: " content." },
          ],
        },
      ],
    };
    const md = serializeMarkdown(doc);
    expect(md).toContain("<mark>highlighted</mark><sup>[c1]</sup>");
  });
});
