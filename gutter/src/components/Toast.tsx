import { useToastStore } from "../stores/toastStore";
import { CheckCircle, AlertCircle, Info, X } from "./Icons";

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const colorMap = {
  success: "text-[var(--status-success)]",
  error: "text-[var(--status-error)]",
  info: "text-[var(--status-info)]",
};

const borderColorMap = {
  success: "border-l-[var(--status-success)]",
  error: "border-l-[var(--status-error)]",
  info: "border-l-[var(--status-info)]",
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-10 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2 px-3 py-2.5 bg-[var(--surface-primary)] border border-[var(--editor-border)] border-l-[3px] ${borderColorMap[toast.type]} rounded-lg shadow-md text-[13px] text-[var(--text-primary)] animate-[slideUp_150ms_ease-out]`}
          >
            <Icon size={16} className={`shrink-0 ${colorMap[toast.type]}`} />
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-0.5 rounded hover:bg-[var(--surface-hover)] text-[var(--text-muted)]"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
