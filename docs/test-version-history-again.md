Three

again

# Phase 12: Tag System

**Files: 6-8 new/modified**

Frontmatter tags currently render as styled pills in the editor but aren't used anywhere else in the app. This phase makes tags a first-class organizational primitive.

## Tag Parsing & Store

- **New: **`**src/stores/tagStore.ts**` — Zustand store that maps `tag → Set<filePath>` and `filePath → Set<tag>`. Populated by scanning all workspace files' frontmatter YAML on workspace open and incrementally updated on file save.
- **Modify: **`**src/components/Editor/extensions/Frontmatter.tsx**` — On frontmatter change, notif


