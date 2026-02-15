const _isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);

export function isMac(): boolean { return _isMac; }
export function modLabel(): string { return _isMac ? "Cmd" : "Ctrl"; }
export function modKey(e: Pick<KeyboardEvent, "metaKey" | "ctrlKey">): boolean {
  return _isMac ? e.metaKey : e.ctrlKey;
}
