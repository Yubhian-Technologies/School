"use client";

import { useCallback, useRef, useState } from "react";

export interface ToastItem {
  id: number;
  message: string;
  variant: "success" | "error";
}

export function useToastStack() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastItem["variant"] = "success") => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, variant }]);
      setTimeout(() => dismiss(id), 3000);
    },
    [dismiss]
  );

  return { toasts, show, dismiss };
}

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg ring-1 ${
            toast.variant === "success"
              ? "bg-green-600 text-white ring-green-700"
              : "bg-red-600 text-white ring-red-700"
          }`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss"
            className="text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
