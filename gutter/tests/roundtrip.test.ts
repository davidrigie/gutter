import { describe, it, expect } from "vitest";
import { parseMarkdown } from "../src/components/Editor/markdown/parser";
import { serializeMarkdown } from "../src/components/Editor/markdown/serializer";

const TEST_FIXTURE = `# Heading 1

## Heading 2

A paragraph with **bold**, *italic*, ~~strikethrough~~, \`inline code\`, and a [link](https://example.com).

- Bullet item 1
- Bullet item 2
  - Nested bullet

1. Ordered item
2. Ordered item

> A blockquote with **bold** inside

\`\`\`javascript
const x = 1;
\`\`\`

![alt text](image.png)

---

Some text with <mark>highlighted</mark><sup>[c1]</sup> content.

A bare <mark>highlight without comment</mark> should survive too.
`;

describe("Markdown Round-Trip", () => {
  it("round-trips the spec test fixture without content loss", () => {
    const doc = parseMarkdown(TEST_FIXTURE);
    const output = serializeMarkdown(doc);

    // Verify key content is preserved
    expect(output).toContain("# Heading 1");
    expect(output).toContain("## Heading 2");
    expect(output).toContain("**bold**");
    expect(output).toContain("*italic*");
    expect(output).toContain("~~strikethrough~~");
    expect(output).toContain("`inline code`");
    expect(output).toContain("[link](https://example.com)");
    expect(output).toContain("- Bullet item 1");
    expect(output).toContain("- Bullet item 2");
    expect(output).toContain("- Nested bullet");
    expect(output).toContain("1. Ordered item");
    expect(output).toContain("2. Ordered item");
    expect(output).toContain("> A blockquote with **bold** inside");
    expect(output).toContain("```javascript\nconst x = 1;\n```");
    expect(output).toContain("![alt text](image.png)");
    expect(output).toContain("---");
    expect(output).toContain("<mark>highlighted</mark><sup>[c1]</sup>");
  });

  it("round-trips task lists", () => {
    const taskMd = `- [ ] unchecked item\n- [x] checked item\n- [ ] another unchecked\n`;
    const doc = parseMarkdown(taskMd);
    const output = serializeMarkdown(doc);
    expect(output).toContain("- [ ] unchecked item");
    expect(output).toContain("- [x] checked item");
    expect(output).toContain("- [ ] another unchecked");

    // Double round-trip
    const doc2 = parseMarkdown(output);
    const output2 = serializeMarkdown(doc2);
    expect(output2).toBe(output);
  });

  it("round-trips twice without change", () => {
    const doc1 = parseMarkdown(TEST_FIXTURE);
    const md1 = serializeMarkdown(doc1);
    const doc2 = parseMarkdown(md1);
    const md2 = serializeMarkdown(doc2);
    expect(md2).toBe(md1);
  });
});
