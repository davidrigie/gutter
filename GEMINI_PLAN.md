# Gemini's Vision for Gutter: The "Pro" Evolution

This plan outlines a strategic path to evolve Gutter from a robust markdown editor into a world-class, AI-native knowledge environment. It is designed to be **additive** to the tactical improvements in `POLISH_PLAN.md`.

## Relation to `POLISH_PLAN.md`

- **Claude's Plan (Tactical Polish)**: Focuses on "finishing" the V1 experience (Dirty tabs, Native Menus, Basic Search, PDF Export). **These are prerequisites.**
- **Gemini's Plan (Strategic Depth)**: Focuses on "next-level" differentiators (AI, Graphs, Sync, Fluidity) that turn Gutter into a "second brain."

**Recommendation**: Complete `POLISH_PLAN` Phases 1-4 (Infrastructure/Polish) before starting Gemini Phase Alpha. `POLISH_PLAN` Phase 7 (Workspace Search) can be superseded by Gemini Phase Alpha (SQLite Search) to avoid double-work.

---

## 1. Contextual Intelligence (AI-Native)
*Gutter shouldn't just store text; it should understand it.*

- **Semantic Workspace Indexing**: 
  - *Upgrade over standard search*: Implement a local vector store (via `tauri-plugin-sqlite`) to index the entire workspace.
  - **"Ask Gutter"**: A command-palette interface to query your entire knowledge base using natural language.
  - **Proactive Discovery**: A "Related Notes" sidebar that surfaces conceptually similar paragraphs from other files, even if they aren't explicitly linked.
- **AI Comment Synthesis**: 
  - **Thread Summarization**: Provide a one-sentence "TL;DR" at the top of long comment threads.
  - **Action Item Extraction**: Automatically detect tasks/TODOs within comments and surface them in a dedicated "Review" view.

## 2. Visual Mastery & Fluidity
*The "feel" of an app is what makes users love it.*

- **Fluid Motion Engine**: Integrate `framer-motion` for high-end UI transitions.
  - *Refinement*: Adds smooth panel sliding and cross-fades that standard CSS transitions miss.
- **Advanced Focus Engine**:
  - **Typewriter Centering**: Keep the current line vertically centered (expanding on the basic Focus Mode).
  - **Variable Dimming**: Slider control for non-active paragraph opacity in the status bar.
- **Typography Precision**: Professional typesetting controls (line-height, spacing, custom fonts) to complement the basic Settings Dialog from `POLISH_PLAN`.

## 3. Knowledge Graph & Metadata
*Turning a folder of files into a living Knowledge Base.*

- **Interactive Graph View**: 
  - **Force-Directed Graph**: Visualize connections (`[[links]]`) between documents.
  - **Graph Clusters**: Color-code nodes by folder or tags to see topic clusters.
- **Interactive Backlink Previews**: 
  - *Upgrade*: Allow "hover-to-edit" previews of backlinked content directly within the Backlinks panel, rather than just read-only snippets.
- **Metadata Explorer**: A workspace-wide view parsing all YAML frontmatter for "Dataview-style" querying (e.g., "Show all notes tagged #project-x with status:active").

## 4. Professional-Grade Backend
*Handling complexity without breaking a sweat.*

- **SQLite-backed Search (FTS5)**: 
  - *Strategic Replacement*: Instead of the grep-based search in `POLISH_PLAN` Phase 7, implement a persistent SQLite FTS5 index immediately. This enables sub-millisecond search across thousands of files and prepares the DB for vector embeddings.
- **Local-First Sync (E2EE)**: 
  - Implement encrypted, peer-to-peer synchronization (using Yjs or Automerge).
  - allow users to sync via their own provider (Dropbox/S3) while maintaining end-to-end encryption.
- **Mobile Core**: Leverage Tauri v2's mobile capabilities to bring Gutter to iOS/Android.

## 5. Ecosystem & Extensibility
*Letting users build Gutter into what they need.*

- **WASM-based Plugin API**: Securely allow users to add custom Markdown nodes (e.g., Admonitions) or Sidebar widgets.
- **Theme Marketplace**: A standardized JSON format for sharing themes.

---

## Execution Strategy (Gemini's Choice)

1. **Phase Alpha (The Brain)**: **Supersede POLISH_PLAN Phase 7**. Implement SQLite FTS5 Search immediately. This provides the foundation for both fast text search *and* future vector embeddings.
2. **Phase Beta (The Feel)**: Implement the Fluid Motion Engine and Advanced Focus Engine features.
3. **Phase Gamma (The Network)**: Build the Interactive Graph View and Metadata Explorer.
