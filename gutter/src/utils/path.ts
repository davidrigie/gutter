export function fileName(p: string): string {
  const parts = p.split(/[/\\]/);
  return parts[parts.length - 1] || p;
}

export function parentDir(p: string): string {
  const idx = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return idx > 0 ? p.substring(0, idx) : p;
}

export function joinPath(...segments: string[]): string {
  return segments.map(s => s.replace(/[/\\]$/, "")).join("/");
}

/**
 * Obsidian-style wiki link resolution.
 * Collects all files matching by name (or path suffix), then picks the
 * shortest path — which mirrors Obsidian's "shortest path first" strategy.
 * Supports bare names (`Note`) and path-qualified (`folder/Note`).
 */
export function resolveWikiLink(
  target: string,
  entries: { name: string; path: string; is_dir: boolean; children: { name: string; path: string; is_dir: boolean; children: unknown }[] | null }[],
): string | null {
  const matches: string[] = [];
  const targetWithExt = target.endsWith(".md") ? target : `${target}.md`;
  const hasPath = target.includes("/");

  const collect = (items: typeof entries) => {
    for (const entry of items) {
      if (!entry.is_dir) {
        if (hasPath) {
          // Path-suffix match: [[folder/Note]] matches .../folder/Note.md
          const normalized = entry.path.replace(/\\/g, "/");
          const suffix = targetWithExt.replace(/\\/g, "/");
          if (normalized.endsWith(`/${suffix}`) || normalized === suffix) {
            matches.push(entry.path);
          }
        } else {
          const nameWithoutExt = entry.name.replace(/\.md$/, "");
          if (nameWithoutExt === target || entry.name === target) {
            matches.push(entry.path);
          }
        }
      }
      if (entry.children) collect(entry.children as typeof entries);
    }
  };
  collect(entries);

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  // Shortest path wins (fewest segments = closest to root)
  return matches.sort((a, b) => a.split("/").length - b.split("/").length)[0];
}

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"]);

export function isImageFile(p: string): boolean {
  const ext = p.split(".").pop()?.toLowerCase() || "";
  return IMAGE_EXTENSIONS.has(ext);
}
