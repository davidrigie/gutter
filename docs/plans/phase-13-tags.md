# Phase 12: Tag System

**Files: 6-8 new/modified**

Frontmatter tags currently render as styled pills in the editor but aren't used anywhere else in the app. This phase makes tags a first-class organizational primitive.

## Tag Parsing & Store

- **New: **`**src/stores/tagStore.ts**` — Zustand store that maps `tag → Set<filePath>` and `filePath → Set<tag>`. Populated by scanning all workspace files' frontmatter YAML on workspace open and incrementally updated on file save.
- **Modify: **`**src/components/Editor/extensions/Frontmatter.tsx**` — On frontmatter change, notify `tagStore` of updated tags for the current file.

## Tag Browser Panel

- **New: **`**src/components/TagBrowser.tsx**` — Sidebar panel (toggled from status bar or command palette) showing all tags across the workspace. Click a tag to filter the file tree to files with that tag. Tag cloud view (sized by frequency) or alphabetical grouped list. Each tag shows file count badge.
- **Modify: **`**FileTree.tsx**` — Support optional tag filter from `tagStore`. When active, only show files matching the selected tag(s). Clear filter button in file tree header.

## Tag Autocomplete in Frontmatter

- **Modify: **`**Frontmatter.tsx**` — When editing the `tags:` field, show an autocomplete dropdown of existing tags from `tagStore`. Fuzzy match as user types. Enter/Tab to accept, Escape to dismiss.

## Tag Search Integration

- **Modify: **`**UnifiedSearch.tsx**` — Add a "Tags" result section. Typing `#tagname` filters to tag matches. Selecting a tag result activates the tag filter in the file tree.
- **Modify: **`**src-tauri/src/commands/search.rs**` — Optionally extract `tags:` from frontmatter during workspace search to support tag-aware results.

## Tag Cloud / Grouped View

- **Modify: **`**TagBrowser.tsx**` — Toggle between cloud view (tags sized proportionally to usage count) and list view (alphabetical with file counts). Both views support multi-select to filter by tag intersection.


