import { create } from "zustand";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type: Toast["type"], duration?: number) => void;
  removeToast: (id: string) => void;
}

const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (message, type, duration = 4000) => {
    // Deduplicate: if a toast with the same message+type exists, reset its timer
    const existing = get().toasts.find((t) => t.message === message && t.type === type);
    if (existing) {
      const oldTimer = toastTimers.get(existing.id);
      if (oldTimer) clearTimeout(oldTimer);
      const timer = setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== existing.id) }));
        toastTimers.delete(existing.id);
      }, duration);
      toastTimers.set(existing.id, timer);
      return;
    }

    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const toast: Toast = { id, message, type, duration };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    const timer = setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      toastTimers.delete(id);
    }, duration);
    toastTimers.set(id, timer);
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
