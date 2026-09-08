import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, X, XCircle, Info } from "lucide-react";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, { ring: string; icon: ReactNode }> = {
  success: { ring: "ring-emerald/30", icon: <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-emerald" /> },
  error: { ring: "ring-rose/30", icon: <XCircle aria-hidden="true" className="size-4 shrink-0 text-rose" /> },
  info: { ring: "ring-accent/30", icon: <Info aria-hidden="true" className="size-4 shrink-0 text-accent-soft" /> },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, tone }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`glass-strong fade-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg px-4 py-3 text-sm ring-1 ${TONE_STYLES[t.tone].ring}`}
          >
            {TONE_STYLES[t.tone].icon}
            <span className="flex-1 leading-5 text-fg">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="shrink-0 text-muted hover:text-fg"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
