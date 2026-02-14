# Gemini's Gutter Refinement Plan (V2)

This plan identifies "missing links" and interaction refinements that complement the tactical work in `POLISH_PLAN.md`. These suggestions focus on making the existing features feel more mature and professional.

---

## 1. Writing Experience Refinements
*Deepening the focus for long-form writing.*

- **Typewriter Centering (Fixed-Line Scrolling)**: 
  - Enhance the existing Focus Mode with a "Typewriter" option where the active line remains vertically fixed (at 33% or 50% of the viewport). This prevents the user's gaze from constantly dropping to the bottom of the screen.
- **Selection-Aware Status Bar**:
  - Update the Status Bar to show contextual metadata. When text is selected, the word count should update to `X / Y words` (selected / total).
- **Smart Asset Organization**:
  - When an image is pasted or dragged, instead of just using `image-[timestamp].png`, show a small inline prompt to name the image (defaulting to the timestamp). This ensures the `assets/` directory remains human-readable.

## 2. Navigation & Workspace Polish
*Smoothing out the friction of managing complex hierarchies.*

- **Editor Breadcrumbs**:
  - Add a subtle breadcrumb trail at the top of the editor (`Folder > Subfolder > File.md`). Clicking a folder name should highlight that folder in the File Tree.
- **Tab Overflow Management**:
  - When more tabs are open than can fit in the viewport, add a "Chevron" button at the end of the Tab Bar that opens a searchable list of all open tabs.
- **Multi-Selection in File Tree**:
  - Implement `Cmd/Shift+Click` support in the File Tree. This allows for professional bulk operations: moving multiple files at once or deleting a batch of documents.

## 3. Comment System "Feel"
*Closing the loop on the primary differentiator.*

- **Click-to-Anchor**: 
  - Clicking the "quoted text" snippet at the top of a comment thread in the sidebar should immediately scroll the editor back to that specific highlight.
- **Visual Thread Continuity**:
  - When a comment mark is active, the corresponding thread in the sidebar should have a "pulse" or subtle border glow to make the connection between text and comment unmistakable.

---

## Relation to `POLISH_PLAN.md`

- **Phase 13 (Asset & Selection Polish)**: Can be implemented after Claude's Phase 12.
- **Phase 14 (Navigation & Hierarchy)**: Implements Breadcrumbs and Tab Overflow.
- **Phase 15 (Advanced Writing Modes)**: Implements Typewriter Centering.

**Recommendation**: Focus on Claude's Phases 1-8 first for stability, then integrate these refinements to elevate the app from "functional" to "delightful."
