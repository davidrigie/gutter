import { useState, useEffect } from "react";

/**
 * Syncs local editing state with external (ProseMirror node) state.
 * While editing, local state is independent. When not editing, it syncs
 * from the external value (e.g. after undo/redo updates the node attrs).
 */
export function useSyncedNodeState<T>(
  externalValue: T,
  isEditing: boolean,
): [T, (v: T) => void] {
  const [local, setLocal] = useState(externalValue);

  useEffect(() => {
    if (!isEditing) {
      setLocal(externalValue);
    }
  }, [externalValue, isEditing]);

  return [local, setLocal];
}
