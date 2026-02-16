# Phase 12: Templates

**Files: 4-5 new/modified**

Built-in document templates. Templates are just markdown files — no special format, no abstraction layer. Ships with useful defaults, users can save any document as a template.

## Design

- **Storage:** `.gutter/templates/` in the workspace. Each template is a `.md` file. The filename (minus extension) is the template name.
- **<mark>Built-in templates:</mark><sup>[c1]</sup>**<mark> Copied into </mark><sup>[c1]</sup>`.gutter/templates/`<mark> on first use if the directory doesn't exist. Users can edit or delete them freely.</mark><sup>[c1]</sup>
- **Bundled defaults:** Meeting Notes, Journal Entry, Project Brief, Weekly Review, Bug Report (or similar — pick 4-5 that cover common use cases).
- **"Save as Template":** Available from command palette or file menu. Copies the current document content to `.gutter/templates/{name}.md`. Prompts for a name.
- **"New from Template":** Creates a new file with the template content pre-filled. User picks a filename/location, then the template content is inserted.

## Rust Backend

- **New: **`**src-tauri/src/commands/templates.rs**` — Commands: `list_templates(workspace_path)` (lists `.gutter/templates/*.md`), `read_template(workspace_path, name)` (returns content), `save_template(workspace_path, name, content)` (writes to `.gutter/templates/`), `delete_template(workspace_path, name)`, `init_default_templates(workspace_path)` (copies bundled defaults if directory is empty/missing).
- **Modify: **`**src-tauri/src/lib.rs**` — Register template commands.

## Frontend

- **Modify: **`**src/components/UnifiedSearch.tsx**` — Add "New from Template" command. When selected, shows template list as sub-results. Picking one prompts for filename, then creates the file with template content.
- **Modify: **`**App.tsx**` — Add "Save as Template" to command palette. Prompts for template name, calls `save_template` with current editor content.
- **Modify: **`**src/components/FileTree.tsx**` — "New from Template" in right-click context menu (on folders). Shows template picker, creates file in the clicked folder.

## Bundled Default Templates

Stored as string constants in the Rust binary (or as files in `src-tauri/resources/templates/`). Copied to `.gutter/templates/` on first init.

Example templates:

- **Meeting Notes** — date, attendees, agenda, action items sections
- **Journal Entry** — date header, prompts for reflection
- **Project Brief** — overview, goals, timeline, stakeholders
- **Weekly Review** — accomplishments, blockers, next week's priorities
- **Bug Report** — description, steps to reproduce, expected/actual behavior


