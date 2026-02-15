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
