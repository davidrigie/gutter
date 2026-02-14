# Gemini's Gutter Refinement & Completeness Plan

This plan focuses on **refining and filling out the existing experience**. It identifies "missing links" in the current feature set and smoothes out UI/UX friction to make Gutter feel like a complete, professional tool without changing its core local-first mission.

---

## 1. Functional Completeness (Filling the Gaps)
*Features that feel "missing" from the current implementation.*

- **Wiki-link Autocomplete**: 
  - When typing `[[`, trigger a floating suggestion menu showing files in the current workspace.
  - This turns the existing Wiki-link extension from a "manual entry" tool into a powerful discovery tool.
- **Interactive Task Lists**:
  - Make `[ ]` and `[x]` markdown checkboxes interactive in the WYSIWYG editor.
  - Clicking a checkbox should update the underlying markdown without needing to switch to source mode.
- **Drag-to-Link**:
  - Allow dragging a file from the **File Tree** directly into the **Editor** to insert a `[[link]]` at the cursor position.
- **Enhanced Command Palette History**:
  - Weight "Recent Files" and "Recently Used Commands" at the top of the palette to speed up common workflows.

## 2. Interaction & Workflow Polish
*Smoothing out the friction in daily writing and management.*

- **Typewriter Centering**: 
  - Add an option to keep the active line vertically centered in the viewport, preventing the user's eyes from constantly moving to the bottom of the screen.
- **File Tree Tactility**:
  - Add visual "drop-zone" highlights when dragging files over folders to clarify where a file will land.
  - Improve the "No folder open" state with a "Quick Start" menu (Open Folder, New Document, Tutorial).
- **Comment System Continuity**:
  - **Smooth Scrolling**: When clicking a comment marker in the text, the sidebar should animate smoothly to the thread, and the thread itself should briefly "pulse" to indicate focus.
  - **Click-to-Anchor**: Clicking the "quoted text" at the top of a comment thread should scroll the editor back to the exact position of the highlight.

## 3. UI & Visual Consistency
*Ensuring the interface feels cohesive and high-end.*

- **Design Token Audit**: 
  - Replace remaining hardcoded colors (like `rgba(0, 0, 0, 0.08)`) in CSS with semantic variables (`--surface-border`, `--surface-elevated`).
  - Standardize all modal and dropdown shadows to use a unified `var(--shadow-lg)`.
- **Icon Refinement**:
  - Replace ASCII separators (`|`) and arrows (`&#x21A9;`) in the Status Bar with refined SVG icons.
  - Ensure every interactive icon has a descriptive tooltip.

## 4. Performance & Stability Refinements
*Ensuring Gutter remains fast as workspaces grow.*

- **Optimized Tree Rendering**: Improve performance for large workspaces (>500 files) by optimizing how the file tree re-renders during external file changes.
- **Asset Naming**: Refine the "Paste Image" flow to prompt for a filename or use a human-readable pattern (e.g., `img_2026_02_14_1020.png`) instead of just a raw timestamp.

---

## Execution Strategy

1. **Phase 1: The Basics**: Design token audit, Status Bar icon replacement, and interactive task lists.
2. **Phase 2: The Workflow**: Wiki-link autocomplete and drag-to-link.
3. **Phase 3: The Feel**: Typewriter centering and smooth comment sidebar interactions.
4. **Phase 4: Optimization**: Large workspace file tree tuning and refined asset handling.
