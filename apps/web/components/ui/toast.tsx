"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  kind: ToastKind;
};

type ToastContextValue = {
  showToast: (toast: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClass: Record<ToastKind, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-rose-200 bg-rose-50 text-rose-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

function ToastIcon({ kind }: { kind: ToastKind }) {
  if (kind === "success") return <CircleCheck className="h-4 w-4" />;
  if (kind === "error") return <CircleAlert className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID();
    setItems((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const value = useMemo(
    () => ({
      showToast,
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] mx-auto flex w-full max-w-xl flex-col gap-2 px-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto rounded-xl border px-3 py-2 shadow-sm backdrop-blur ${toneClass[item.kind]}`}
          >
            <div className="flex items-start gap-2">
              <ToastIcon kind={item.kind} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.description ? <p className="mt-0.5 text-xs opacity-85">{item.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="rounded p-0.5 opacity-70 transition hover:opacity-100"
                aria-label="Dismiss toast"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }
  return context;
}
