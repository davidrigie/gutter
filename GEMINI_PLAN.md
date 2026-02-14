# Gemini's Vision for Gutter: The "Pro" Evolution

This plan outlines a path to take Gutter from a robust markdown editor to a world-class, AI-native knowledge environment. 

**Note on Progress**: I have audited the current codebase (as of Feb 2026). While basics like Wiki-links, Backlinks, and Focus Mode are implemented, this plan focuses on the *next level* of depth, intelligence, and professional polish.

---

## 1. Contextual Intelligence (AI-Native)
*Gutter shouldn't just store text; it should understand it.*

- **Semantic Workspace Indexing**: Implement a local vector store (via `tauri-plugin-sqlite`) to index the entire workspace.
  - **"Ask Gutter"**: A command-palette interface to query your entire knowledge base using natural language.
  - **Proactive Discovery**: As you write, a "Related Notes" sidebar surfaces conceptually similar paragraphs from other files, even if they aren't explicitly linked.
- **AI Comment Synthesis**: 
  - **Thread Summarization**: For long comment threads, provide a one-sentence "TL;DR" at the top.
  - **Action Item Extraction**: Automatically detect tasks/TODOs within comments and surface them in a workspace-wide "Review" view.

## 2. Visual Mastery & Fluidity
*The "feel" of an app is what makes users love it.*

- **Fluid Motion Engine**: Integrate `framer-motion` for all UI transitions:
  - Smooth panel sliding when toggling file tree/comments.
  - Elegant "cross-fade" when switching between WYSIWYG and Source mode.
  - Subtle spring animations for modal overlays and the command palette.
- **Advanced Focus Engine**:
  - **Typewriter Centering**: Keep the current line vertically centered in the viewport.
  - **Variable Dimming**: In Focus Mode, allow users to adjust the opacity of non-active paragraphs via a slider in the status bar.
- **Typography Precision**: Professional typesetting controls including variable line-height, paragraph spacing, and custom font-face support.

## 3. Knowledge Graph & Metadata
*Turning a folder of files into a living Knowledge Base.*

- **Interactive Graph View**: 
  - A dedicated panel to visualize the connections between documents.
  - **Force-Directed Graph**: Nodes represent files, edges represent `[[links]]`.
  - **Graph Clusters**: Color-code nodes by folder or tags to visualize topic clusters.
- **Interactive Backlink Previews**: 
  - Go beyond simple text display; allow "hover-to-edit" previews of backlinked content directly within the sidebar.
- **Metadata Explorer**: A workspace-wide view that parses all YAML frontmatter, allowing "Dataview-style" querying (e.g., "Show all notes tagged #project-x with status:active").

## 4. Professional-Grade Backend
*Handling complexity without breaking a sweat.*

- **SQLite-backed Search**: Upgrade the search engine to a persistent SQLite FTS5 index for sub-millisecond search across thousands of files.
- **Local-First Sync (E2EE)**: 
  - Implement encrypted, peer-to-peer synchronization (using Yjs or Automerge).
  - Let users sync via their own provider (Dropbox/S3) while maintaining end-to-end encryption.
- **Mobile Core**: Leverage Tauri v2's mobile capabilities to bring the Gutter experience to iOS/Android with high-fidelity comment rendering.

## 5. Ecosystem & Extensibility
*Letting users build Gutter into what they need.*

- **WASM-based Plugin API**: Create a secure way for users to add custom Markdown nodes (e.g., Admonitions) or custom Sidebar widgets.
- **Theme Marketplace**: A standardized JSON format for sharing community-created themes.

---

## Initial Execution Strategy (Gemini's Choice)

1. **Phase Alpha**: Upgrade the search engine to SQLite FTS5. This immediately makes the workspace feel "infinite" and professional.
2. **Phase Beta**: Implement the Fluid Motion Engine. This provides the visual "wow" factor that defines high-end apps.
3. **Phase Gamma**: Integrate local AI embeddings for Semantic Workspace Indexing.
