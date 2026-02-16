import { useMemo } from "react";
import { useTagStore, getAllTags } from "../stores/tagStore";
import { TagIcon, X } from "./Icons";

export function TagBrowser() {
  const tagToFiles = useTagStore((s) => s.tagToFiles);
  const selectedTags = useTagStore((s) => s.selectedTags);
  const filterMode = useTagStore((s) => s.filterMode);
  const viewMode = useTagStore((s) => s.viewMode);
  const loading = useTagStore((s) => s.loading);
  const toggleTag = useTagStore((s) => s.toggleTag);
  const clearSelection = useTagStore((s) => s.clearSelection);
  const setFilterMode = useTagStore((s) => s.setFilterMode);
  const setViewMode = useTagStore((s) => s.setViewMode);

  const allTags = useMemo(() => getAllTags(tagToFiles), [tagToFiles]);
  const maxCount = allTags.reduce((max, t) => Math.max(max, t.count), 1);

  return (
    <div className="h-full flex flex-col bg-[var(--surface-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--editor-border)]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            Tags
          </span>
          {allTags.length > 0 && (
            <span className="text-[11px] bg-[var(--accent-subtle)] text-[var(--accent)] px-1.5 py-0.5 rounded-full font-medium min-w-[18px] text-center">
              {allTags.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode("list")}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
              viewMode === "list"
                ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode("cloud")}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
              viewMode === "cloud"
                ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Cloud
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {selectedTags.size > 0 && (
        <div className="px-3 py-2 border-b border-[var(--editor-border)] bg-[var(--accent-subtle)]">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                Filtering by {selectedTags.size} tag{selectedTags.size > 1 ? "s" : ""}
              </span>
              <button
                onClick={() => setFilterMode(filterMode === "any" ? "all" : "any")}
                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {filterMode === "any" ? "ANY" : "ALL"}
              </button>
            </div>
            <button
              onClick={clearSelection}
              className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
              title="Clear filter"
            >
              <X size={12} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {Array.from(selectedTags).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--accent)] text-white cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                {tag}
                <X size={10} />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
            <span className="text-[12px]">Scanning tags...</span>
          </div>
        ) : allTags.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
            <TagIcon size={24} className="mb-2 opacity-30" />
            <span className="text-[12px]">No tags found</span>
            <span className="text-[11px] mt-1 opacity-60">
              Add tags in frontmatter YAML
            </span>
          </div>
        ) : viewMode === "list" ? (
          <div className="py-1">
            {allTags.map(({ tag, count }) => {
              const isSelected = selectedTags.has(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`tag-browser-item ${isSelected ? "selected" : ""}`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-[var(--text-muted)] shrink-0">#</span>
                    <span className="truncate">{tag}</span>
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] bg-[var(--surface-active)] px-1.5 py-0.5 rounded-full min-w-[20px] text-center shrink-0">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="tag-browser-cloud">
            {allTags.map(({ tag, count }) => {
              const isSelected = selectedTags.has(tag);
              const fontSize = 11 + Math.round((count / maxCount) * 9);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`tag-browser-cloud-item ${isSelected ? "selected" : ""}`}
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
