/**
 * Curated sample data for screenshot generation.
 * Content is derived from the demo/ workspace.
 */

// ── File tree structure (mirrors demo/) ──────────────────────────────

export const WORKSPACE_PATH = "/mock/workspace";

export const SAMPLE_FILE_TREE = [
  {
    name: "Welcome.md",
    path: `${WORKSPACE_PATH}/Welcome.md`,
    is_dir: false,
    children: null,
  },
  {
    name: "guides",
    path: `${WORKSPACE_PATH}/guides`,
    is_dir: true,
    children: [
      {
        name: "Code and Math.md",
        path: `${WORKSPACE_PATH}/guides/Code and Math.md`,
        is_dir: false,
        children: null,
      },
      {
        name: "Keyboard Shortcuts.md",
        path: `${WORKSPACE_PATH}/guides/Keyboard Shortcuts.md`,
        is_dir: false,
        children: null,
      },
      {
        name: "Markdown Cheatsheet.md",
        path: `${WORKSPACE_PATH}/guides/Markdown Cheatsheet.md`,
        is_dir: false,
        children: null,
      },
      {
        name: "Showcase.md",
        path: `${WORKSPACE_PATH}/guides/Showcase.md`,
        is_dir: false,
        children: null,
      },
      {
        name: "Writing Demo.md",
        path: `${WORKSPACE_PATH}/guides/Writing Demo.md`,
        is_dir: false,
        children: null,
      },
    ],
  },
  {
    name: "journal",
    path: `${WORKSPACE_PATH}/journal`,
    is_dir: true,
    children: [
      {
        name: "2025-01-15.md",
        path: `${WORKSPACE_PATH}/journal/2025-01-15.md`,
        is_dir: false,
        children: null,
      },
      {
        name: "2025-01-20.md",
        path: `${WORKSPACE_PATH}/journal/2025-01-20.md`,
        is_dir: false,
        children: null,
      },
      {
        name: "2025-01-25.md",
        path: `${WORKSPACE_PATH}/journal/2025-01-25.md`,
        is_dir: false,
        children: null,
      },
    ],
  },
  {
    name: "projects",
    path: `${WORKSPACE_PATH}/projects`,
    is_dir: true,
    children: [
      {
        name: "Design System.md",
        path: `${WORKSPACE_PATH}/projects/Design System.md`,
        is_dir: false,
        children: null,
      },
      {
        name: "Gutter Roadmap.md",
        path: `${WORKSPACE_PATH}/projects/Gutter Roadmap.md`,
        is_dir: false,
        children: null,
      },
      {
        name: "Meeting Notes.md",
        path: `${WORKSPACE_PATH}/projects/Meeting Notes.md`,
        is_dir: false,
        children: null,
      },
      {
        name: "Research Notes.md",
        path: `${WORKSPACE_PATH}/projects/Research Notes.md`,
        is_dir: false,
        children: null,
      },
    ],
  },
];

// ── Markdown file contents ──────────────────────────────────────────

const SHOWCASE_MD = `---
title: Building a Local-First Editor
author: Elena Voss
tags: [architecture, design-system, local-first]
---
# Building a Local-First Editor

> "The best tool is the one that disappears into the work." — Frank Chimero

Every writing tool makes a tradeoff between **power** and **simplicity**. Most editors choose one extreme: either a minimal plain-text box or a feature-dense IDE. The <mark>challenge is building something that feels like writing on paper but has the structure of a knowledge base</mark><sup>[c1]</sup>.

## Design Principles

| Principle | Implementation |
| --- | --- |
| **Local-first** | Files on disk, no server dependency |
| **Markdown native** | Standard \`.md\` files with full round-trip fidelity |
| **Linked thinking** | Wiki links connect ideas: [[Research Notes]] |
| **Inline commentary** | Comments live alongside text, not in a separate tool |

The rendering pipeline converts raw markdown to a live document:

$$
\\text{Source} \\xrightarrow{\\text{parse}} \\text{AST} \\xrightarrow{\\text{render}} \\text{WYSIWYG} \\xrightarrow{\\text{serialize}} \\text{Source}
$$

This round-trip must be *lossless* — the <mark>serializer must reproduce the original markdown byte-for-byte</mark><sup>[c2]</sup>, preserving frontmatter, comment markers, and whitespace.

## Architecture

\`\`\`mermaid
graph LR
    A[Markdown Files] --> B[Parser]
    B --> C[TipTap Editor]
    C --> D[Serializer]
    D --> A
    A --> E[.comments.json]
    E --> C
\`\`\`

The editor stack — Tauri for the native shell, React for the UI, and ProseMirror under TipTap — gives us native file access with web rendering flexibility. Inline math like $e^{i\\pi} + 1 = 0$ renders seamlessly alongside prose.

See also: [[Design System]] for tokens and [[Gutter Roadmap]] for planned features.
`;

/** Old version of SHOWCASE_MD for diff/snapshot preview */
export const SNAPSHOT_SHOWCASE_MD = `---
title: Building a Local-First Editor
author: Elena Voss
tags: [architecture, design-system, local-first]
---
# Building a Local-First Editor

> "The best tool is the one that disappears into the work." — Frank Chimero

Every writing tool makes a tradeoff between **power** and **simplicity**. Most editors choose one extreme: either a minimal plain-text box or a feature-dense IDE. The <mark>challenge is building something that feels like writing on paper but has the structure of a knowledge base</mark><sup>[c1]</sup>.

## Core Assumptions

We started with three assumptions that guided early development. First, that writers prefer files they own over cloud-hosted databases. Second, that markdown has won as the lingua franca of technical writing. Third, that comments and collaboration shouldn't require a separate platform.

## Design Principles

| Principle | Implementation |
| --- | --- |
| **Local-first** | Files on disk, no server dependency |
| **Markdown native** | Standard \`.md\` files with full round-trip fidelity |
| **Linked thinking** | Wiki links connect ideas: [[Research Notes]] |

The rendering pipeline converts raw markdown to a live document:

$$
\\text{Source} \\xrightarrow{\\text{parse}} \\text{AST} \\xrightarrow{\\text{render}} \\text{WYSIWYG} \\xrightarrow{\\text{serialize}} \\text{Source}
$$

This round-trip must be *lossless* — the <mark>serializer must reproduce the original source exactly</mark><sup>[c2]</sup>, preserving frontmatter, comment markers, and whitespace.

## Architecture

\`\`\`mermaid
graph LR
    A[Markdown Files] --> B[Parser]
    B --> C[TipTap Editor]
    C --> D[Serializer]
    D --> A
    A --> E[.comments.json]
    E --> C
\`\`\`

See also: [[Design System]] for tokens and [[Gutter Roadmap]] for planned features.
`;

const CODE_AND_MATH_MD = `---
title: Code and Math
tags: [demo, code, math, diagrams]
---
# Code and Math

Gutter supports syntax-highlighted code blocks, LaTeX math, and Mermaid diagrams.

## Code Blocks

### Rust

\`\`\`rust
use std::collections::HashMap;

fn word_count(text: &str) -> HashMap<&str, usize> {
    let mut counts = HashMap::new();
    for word in text.split_whitespace() {
        *counts.entry(word).or_insert(0) += 1;
    }
    counts
}
\`\`\`

### TypeScript

\`\`\`typescript
interface Comment {
  id: string;
  author: string;
  body: string;
  timestamp: Date;
}

function createThread(comment: Comment): Thread {
  return {
    comments: [comment],
    resolved: false,
    createdAt: comment.timestamp,
  };
}
\`\`\`

### Python

\`\`\`python
def fibonacci(n: int) -> list[int]:
    """Generate the first n Fibonacci numbers."""
    if n <= 0:
        return []
    fib = [0, 1]
    for _ in range(2, n):
        fib.append(fib[-1] + fib[-2])
    return fib[:n]
\`\`\`

## Mathematics

Inline math: The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.

### Block Math

Maxwell's equations in differential form:

$$
\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}
$$

$$
\\nabla \\cdot \\mathbf{B} = 0
$$

$$
\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}
$$

$$
\\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J} + \\mu_0 \\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}
$$

Euler's identity: $e^{i\\pi} + 1 = 0$

## Mermaid Diagrams

### Architecture

\`\`\`mermaid
graph TD
    A[Markdown File] --> B[Parser]
    B --> C[TipTap Editor]
    C --> D[Serializer]
    D --> A
    A --> E[.comments.json]
    A --> F[.comments.md]
    E --> C
\`\`\`

### Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant R as Rust Backend
    participant FS as File System

    U->>F: Cmd+S
    F->>R: invoke("write_file")
    R->>FS: Write .md
    R->>FS: Write .comments.json
    R->>FS: Write .comments.md
    R-->>F: Success
    F-->>U: "Saved" indicator
\`\`\`

See also: [[Writing Demo]] for text formatting, [[Welcome]] for shortcuts.
`;

export const SAMPLE_FILES: Record<string, string> = {
  [`${WORKSPACE_PATH}/guides/Showcase.md`]: SHOWCASE_MD,
  [`${WORKSPACE_PATH}/guides/Code and Math.md`]: CODE_AND_MATH_MD,
  // Short stubs for other files (in case anything tries to read them)
  [`${WORKSPACE_PATH}/Welcome.md`]: "# Welcome to Gutter\n\nA local-first markdown editor with first-class commenting.\n",
  [`${WORKSPACE_PATH}/guides/Writing Demo.md`]: "# Writing Demo\n\nFormatting examples.\n",
  [`${WORKSPACE_PATH}/guides/Keyboard Shortcuts.md`]: "# Keyboard Shortcuts\n\nAll shortcuts at a glance.\n",
  [`${WORKSPACE_PATH}/guides/Markdown Cheatsheet.md`]: "# Markdown Cheatsheet\n\nQuick reference.\n",
  [`${WORKSPACE_PATH}/journal/2025-01-15.md`]: "# Jan 15\n\nFirst entry.\n",
  [`${WORKSPACE_PATH}/journal/2025-01-20.md`]: "# Jan 20\n\nProgress update.\n",
  [`${WORKSPACE_PATH}/journal/2025-01-25.md`]: "# Jan 25 — Sprint Complete\n\nShipped 19 features.\n",
  [`${WORKSPACE_PATH}/projects/Design System.md`]: "# Design System\n\nTokens and patterns.\n",
  [`${WORKSPACE_PATH}/projects/Gutter Roadmap.md`]: "# Gutter Roadmap\n\nPlanned features.\n",
  [`${WORKSPACE_PATH}/projects/Meeting Notes.md`]: "# Meeting Notes\n\nProduct review.\n",
  [`${WORKSPACE_PATH}/projects/Research Notes.md`]: "# Research Notes\n\nCRDT research.\n",
};

// ── Comment threads ─────────────────────────────────────────────────

export const SAMPLE_COMMENTS: Record<string, { version: 1; comments: Record<string, unknown> }> = {
  [`${WORKSPACE_PATH}/guides/Showcase.md`]: {
    version: 1,
    comments: {
      c1: {
        thread: [
          {
            id: "m_s001",
            author: "Elena Voss",
            timestamp: "2026-02-10T09:15:00.000Z",
            body: "This tension is the central design challenge. Every feature we add risks making the tool heavier.",
          },
          {
            id: "m_s002",
            author: "James Chen",
            timestamp: "2026-02-10T10:30:00.000Z",
            body: "Agreed — Notion is powerful but takes 4 seconds to load a page. Obsidian is fast but the editing experience feels rough. We need to thread the needle.",
          },
        ],
        resolved: false,
        createdAt: "2026-02-10T09:15:00.000Z",
      },
      c2: {
        thread: [
          {
            id: "m_s003",
            author: "James Chen",
            timestamp: "2026-02-10T10:45:00.000Z",
            body: "This is the hardest constraint. Our parser tests have 47 round-trip cases now and any new extension risks breaking one.",
          },
          {
            id: "m_s004",
            author: "Elena Voss",
            timestamp: "2026-02-10T11:00:00.000Z",
            body: "Worth it. Users trust us with their files — if we ever mangle content on save, we've lost that trust permanently.",
          },
        ],
        resolved: false,
        createdAt: "2026-02-10T10:45:00.000Z",
      },
    },
  },
};

// ── Tag data ────────────────────────────────────────────────────────

export const SAMPLE_TAGS = {
  tagToFiles: {
    architecture: [
      `${WORKSPACE_PATH}/guides/Showcase.md`,
      `${WORKSPACE_PATH}/projects/Design System.md`,
      `${WORKSPACE_PATH}/projects/Research Notes.md`,
    ],
    "design-system": [
      `${WORKSPACE_PATH}/guides/Showcase.md`,
      `${WORKSPACE_PATH}/projects/Design System.md`,
    ],
    "local-first": [
      `${WORKSPACE_PATH}/guides/Showcase.md`,
      `${WORKSPACE_PATH}/projects/Research Notes.md`,
    ],
    code: [`${WORKSPACE_PATH}/guides/Code and Math.md`],
    math: [`${WORKSPACE_PATH}/guides/Code and Math.md`],
    diagrams: [`${WORKSPACE_PATH}/guides/Code and Math.md`],
    formatting: [`${WORKSPACE_PATH}/guides/Writing Demo.md`],
    "weekly-review": [
      `${WORKSPACE_PATH}/projects/Meeting Notes.md`,
      `${WORKSPACE_PATH}/journal/2025-01-25.md`,
    ],
    roadmap: [
      `${WORKSPACE_PATH}/projects/Gutter Roadmap.md`,
    ],
    planning: [
      `${WORKSPACE_PATH}/projects/Gutter Roadmap.md`,
      `${WORKSPACE_PATH}/projects/Meeting Notes.md`,
    ],
    research: [
      `${WORKSPACE_PATH}/projects/Research Notes.md`,
    ],
    crdt: [
      `${WORKSPACE_PATH}/projects/Research Notes.md`,
    ],
    collaboration: [
      `${WORKSPACE_PATH}/projects/Research Notes.md`,
      `${WORKSPACE_PATH}/Welcome.md`,
    ],
    journal: [
      `${WORKSPACE_PATH}/journal/2025-01-15.md`,
      `${WORKSPACE_PATH}/journal/2025-01-20.md`,
      `${WORKSPACE_PATH}/journal/2025-01-25.md`,
    ],
    sprint: [
      `${WORKSPACE_PATH}/journal/2025-01-25.md`,
    ],
    onboarding: [
      `${WORKSPACE_PATH}/Welcome.md`,
      `${WORKSPACE_PATH}/guides/Keyboard Shortcuts.md`,
    ],
    shortcuts: [
      `${WORKSPACE_PATH}/guides/Keyboard Shortcuts.md`,
      `${WORKSPACE_PATH}/guides/Markdown Cheatsheet.md`,
    ],
    reference: [
      `${WORKSPACE_PATH}/guides/Markdown Cheatsheet.md`,
      `${WORKSPACE_PATH}/guides/Keyboard Shortcuts.md`,
    ],
  },
  fileToTags: {
    [`${WORKSPACE_PATH}/guides/Showcase.md`]: ["architecture", "design-system", "local-first"],
    [`${WORKSPACE_PATH}/guides/Code and Math.md`]: ["code", "math", "diagrams"],
    [`${WORKSPACE_PATH}/guides/Writing Demo.md`]: ["formatting"],
    [`${WORKSPACE_PATH}/Welcome.md`]: ["onboarding", "collaboration"],
    [`${WORKSPACE_PATH}/guides/Keyboard Shortcuts.md`]: ["onboarding", "shortcuts", "reference"],
    [`${WORKSPACE_PATH}/guides/Markdown Cheatsheet.md`]: ["shortcuts", "reference"],
    [`${WORKSPACE_PATH}/projects/Design System.md`]: ["architecture", "design-system"],
    [`${WORKSPACE_PATH}/projects/Gutter Roadmap.md`]: ["roadmap", "planning"],
    [`${WORKSPACE_PATH}/projects/Meeting Notes.md`]: ["weekly-review", "planning"],
    [`${WORKSPACE_PATH}/projects/Research Notes.md`]: ["research", "crdt", "local-first", "architecture", "collaboration"],
    [`${WORKSPACE_PATH}/journal/2025-01-15.md`]: ["journal"],
    [`${WORKSPACE_PATH}/journal/2025-01-20.md`]: ["journal"],
    [`${WORKSPACE_PATH}/journal/2025-01-25.md`]: ["journal", "sprint", "weekly-review"],
  },
};
