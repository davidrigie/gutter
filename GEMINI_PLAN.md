# Gemini's Gutter Refinement Plan

This plan focuses on **refining the existing experience**—smoothing out UI friction, improving interaction feedback, and ensuring visual consistency across the application. It is strictly about making Gutter feel more professional and tactile, rather than adding new conceptual directions.

---

## 1. UI & Visual Consistency
*Ensuring the interface feels cohesive and high-end.*

- **Design Token Audit**: 
  - Replace remaining hardcoded colors (like `rgba(0, 0, 0, 0.08)`) in CSS with semantic variables (`--surface-border`, `--surface-elevated`).
  - Standardize all modal and dropdown shadows to use a unified `var(--shadow-lg)`.
- **Refined Micro-interactions**:
  - Add smooth transitions for panel toggling (File Tree, Outline, Comments) to prevent "layout jumps."
  - Improve the `comment-creation-bar` and `context-menu` positioning logic to prevent clipping at window edges.
- **Enhanced Status Bar**:
  - Replace ASCII separators (`|`) and arrows (`&#x21A9;`) with refined SVG icons.
  - Add tooltips to all icon buttons in the status bar.
  - Fix the "Undo/Redo" logic to use TipTap's internal history state instead of `document.execCommand`.

## 2. Interaction & Workflow Polish
*Smoothing out the friction in daily writing and management.*

- **File Tree Tactility**:
  - Improve the "No folder open" state with a more inviting empty-state illustration or "Quick Start" actions.
  - Add visual feedback (drop-zone highlights) when dragging files over folders to clarify the target.
  - Fix "Inline Create" logic to avoid dynamic imports inside the render loop, improving performance on large trees.
- **Writing Experience Refinement**:
  - **Centering Polish**: In Zen mode, ensure the document is perfectly centered and the "measure" (line length) is locked to a comfortable 65-75 characters.
  - **Focus Mode Refinement**: Add a subtle "active line" highlight or a "typewriter" centering option where the current line stays vertically fixed.
- **Comment System "Feel"**:
  - Improve the transition when clicking a comment marker; the sidebar should scroll to the thread with a smooth animation rather than an instant jump.
  - Add a "Cancel" action to the right-click context menu when creating a comment to make the flow more forgiving.

## 3. Performance & Stability Refinements
*Ensuring Gutter remains fast as workspaces grow.*

- **Optimized Tree Rendering**: Implement virtualization or deferred rendering for the File Tree in workspaces with >500 files.
- **Save State Clarity**: Improve the visual indicator for "Saving..." to be more distinct than just a label change, perhaps using a subtle progress pulse in the status bar.
- **Asset Handling**: Refine the "Paste Image" flow to ensure images are saved with unique, human-readable names (e.g., `screenshot-2026-02-14.png`) instead of just timestamps.

---

## Execution Order

1. **Phase 1: Visual Audit**: Fix hardcoded colors and standardize shadows/radii across all components.
2. **Phase 2: Interaction Polish**: Refine the File Tree drag-drop feedback and Status Bar icon set.
3. **Phase 3: Writing Experience**: Implement typewriter centering and smooth comment sidebar scrolling.
4. **Phase 4: Optimization**: Audit large-workspace performance and refine the "Saving" feedback loop.
