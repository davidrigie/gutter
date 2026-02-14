# Gemini's Vision for Gutter: The "Pro" Evolution

This plan outlines a path to take Gutter from a robust markdown editor to a world-class, AI-native knowledge environment. It complements the existing `POLISH_PLAN.md` and `GUTTER_ROADMAP.md` by focusing on deep intelligence, refined experience, and advanced information architecture.

---

## 1. Contextual Intelligence (AI-Native)
*Gutter shouldn't just store text; it should understand it.*

- **Semantic Workspace Indexing**: Implement a local vector store (via `tauri-plugin-sqlite` or similar) to index the entire workspace. This enables:
  - **"Ask Gutter"**: A command-palette interface to query your entire knowledge base using natural language.
  - **Auto-linking**: Suggest relevant `[[wiki-links]]` as you type based on semantic similarity, not just filename matching.
- **AI Comment Synthesis**: 
  - **Thread Summarization**: For long comment threads, provide a one-sentence "TL;DR" at the top.
  - **Action Item Extraction**: Automatically detect tasks/TODOs within comments and surface them in a workspace-wide "Review" view.
- **Contextual Copilot**: An inline AI assistant that has access to your *entire* current workspace context (not just the open file) to help rephrase, expand, or brainstorm while respecting your personal writing style.

## 2. Visual Mastery & Tactile Experience
*The "feel" of an app is what makes users love it.*

- **Fluid Motion Engine**: Integrate `framer-motion` for all UI transitions:
  - Smooth panel sliding when toggling file tree/comments.
  - Elegant "cross-fade" when switching between WYSIWYG and Source mode.
  - Subtle spring animations for modal overlays and the command palette.
- **The Typography Lab**: Go beyond font-size. Add professional typesetting controls:
  - Variable line-height and paragraph spacing.
  - "Measure" control (max-width adjustment) for the perfect reading line length.
  - Custom font-face support (loading `.ttf`/`.otf` from the workspace).
- **Advanced Focus Engine**:
  - **Variable Dimming**: In Focus Mode, allow users to adjust the opacity of non-active paragraphs.
  - **Centering Modes**: Choice between "Typewriter Scrolling" (fixed line) or "Paragraph Centering".

## 3. Advanced Information Architecture
*Turning a folder of files into a Knowledge Graph.*

- **Interactive Graph View**: 
  - A dedicated panel to visualize the connections between documents.
  - Nodes represent files, edges represent `[[links]]`.
  - Color-code nodes by folder or frontmatter tags.
- **Metadata Explorer**: 
  - A workspace-wide view that parses all YAML frontmatter.
  - Allows "SQL-like" querying of your notes (e.g., "Show all notes tagged #project-x with status:active").
- **Backlink Contextual Previews**: In the Backlinks panel, show a 3-line preview of the surrounding text for each link, not just the filename.

## 4. Connectivity & Scaling (The "Pro" Backend)
*Handling thousands of files without breaking a sweat.*

- **SQLite-backed Search**: Move away from simple grep-style searching to a persistent SQLite FTS5 index.
  - Sub-millisecond search across 10,000+ files.
  - Indexing of comment content as well as document content.
- **Local-First Sync (E2EE)**: 
  - Implement a peer-to-peer synchronization layer (using Yjs or Automerge).
  - Encrypted sync via the user's own provider (Dropbox/Google Drive/S3) or direct device-to-device.
- **Mobile Parity**: Leverage Tauri v2's mobile capabilities to bring the Gutter core to iOS/Android, ensuring comments and markdown remain perfectly in sync.

## 5. Ecosystem & Extensibility
*Letting users build Gutter into what they need.*

- **WASM-based Plugin API**: Create a secure way for users to add:
  - Custom Markdown nodes (e.g., Admonitions, Checklists).
  - Sidebar widgets (e.g., Calendar, Word Count goal tracker).
  - Custom Slash Commands.
- **Theme Marketplace**: A standard JSON format for themes that can be shared and imported.

---

## Initial Execution Strategy (Gemini's Choice)

1. **Phase Alpha (The Foundation)**: Upgrade the search engine to SQLite FTS5. This immediately makes the workspace feel "infinite" and professional.
2. **Phase Beta (The Feel)**: Implement the Fluid Motion Engine and Typography Lab. This is the visual "wow" factor.
3. **Phase Gamma (The Brain)**: Integrate local AI embeddings for Semantic Workspace Indexing.
