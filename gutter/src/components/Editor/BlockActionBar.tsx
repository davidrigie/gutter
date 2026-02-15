import { Trash, Copy } from "../Icons";

export function BlockActionBar({
  onDelete,
  onDuplicate,
}: {
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div className="block-action-bar" contentEditable={false}>
      <button
        className="block-action-btn"
        title="Duplicate"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDuplicate();
        }}
      >
        <Copy size={14} />
      </button>
      <button
        className="block-action-btn block-action-btn-danger"
        title="Delete"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash size={14} />
      </button>
    </div>
  );
}
