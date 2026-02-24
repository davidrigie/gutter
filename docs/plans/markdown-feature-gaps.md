# Markdown Feature Gap Analysis

Comparison of markdown features supported by GitHub, GitLab, and Typora that Gutter does not currently handle.

## Current Coverage

Gutter already supports: headings, bold/italic/strikethrough, inline code, underline, links, images, hard line breaks, blockquotes, bullet/ordered lists, task lists, fenced code blocks with syntax highlighting, GFM tables, horizontal rules, block/inline math (KaTeX), Mermaid diagrams, YAML frontmatter, wiki links, Obsidian wiki image embeds, comment highlights, and spell check.

## High Importance

| Feature | Who has it | Complexity | Notes | Do it? |
| --- | --- | --- | --- | --- |
| **Footnotes** | GitHub, GitLab, Typora | Medium | Very common in academic/long-form writing. Needs remark plugin + custom TipTap node + serializer. GitHub Flavored Markdown added these officially. | Maybe |
| **GitHub Alerts / Callouts** | GitHub, GitLab, Obsidian | Medium | `> [!NOTE]`, `> [!WARNING]`, etc. Increasingly standard — GitHub adopted them, Obsidian has callouts. Parsed as blockquotes today so content isn't lost, just unstyled. | Yes |
| **Image resizing** | Typora, Obsidian | Medium | Typora lets you drag to resize. Common pain point — images at 100% width often aren't what users want. Needs resize handles in `ImageBlockView` + width attr persistence. | Maybe |
| **Table column alignment** | GitHub, GitLab, Typora | Low | Already parsed (`align` data exists in parser) — just dropped in `convertTable`. Small fix to wire it through to cell styles and serializer. | Yes |
| **Highlight mark** | Typora, Obsidian | Low | `==highlighted text==` syntax. Already have `<mark>` rendering for comments — need to allow bare marks (without `[cN]` suffix) as a separate extension. | Yes |

## Medium Importance

| Feature | Who has it | Complexity | Notes | Do it? |
| --- | --- | --- | --- | --- |
| **Collapsible sections** | GitHub, GitLab | Medium | `<details><summary>` blocks. Useful for long docs. Needs a custom TipTap node with toggling behavior + HTML block handling in parser. | Yes |
| **Emoji shortcodes** | GitHub, GitLab, Typora | Low | `:smile:` → emoji. Small input rule + emoji data lookup. Nice polish, low friction to implement. | Yes |
| **Superscript / Subscript** | Typora, GitLab | Low | TipTap has official extensions for both. Just install + add parser/serializer handling for `<sup>`/`<sub>` or `^text^`/`~text~`. | Yes |
| **Word/character count** | Typora | Low | Status bar stat. TipTap has `@tiptap/extension-character-count` or compute from doc content. Users expect this in a writing tool. | Yes |
| **Table of contents** | Typora, GitLab | Medium | Auto-generated from headings. Could be a sidebar feature (Outline panel already exists) or an insertable `[[toc]]` block. | Yes |

## Lower Importance

| Feature | Who has it | Complexity | Notes | Do it? |
| --- | --- | --- | --- | --- |
| **Definition lists** | Typora (Pandoc), GitLab | Medium | Niche syntax. Rarely used outside technical docs. Needs custom remark plugin + TipTap node. | Yes |
| **Embedded video** | GitHub (limited), GitLab | Medium | `<video>` tag or drag-drop video files. Local-first app makes this more viable than web editors, but complex to get right. | Maybe |
| **Diagrams beyond Mermaid** | GitLab (PlantUML) | High | PlantUML, Graphviz, etc. Niche audience. Mermaid already covers most use cases. | No |
| **Abbreviations** | Typora (Pandoc) | Low | Very rarely used. Not in GFM spec. | No |
| **Mentions** | GitHub, GitLab | High | `@user` references. Makes more sense in collaborative tools — Gutter is local-first so less relevant unless collaboration is added. | No |

## Recommended Priority Order

1. **Table column alignment** — already 80% there, just wire up the existing parsed data
2. **Highlight mark (**`**==text==**`**)** — have the rendering infrastructure, just need to allow non-comment marks
3. **GitHub Alerts** — increasingly standard, great visual payoff, moderate effort
4. **Footnotes** — expected by academic/long-form writers, meaningful gap
5. **Word count** — trivial to add, every writing app has it
6. **Image resizing** — big UX win for a WYSIWYG editor, moderate effort


