"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import clsx from "clsx";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastApi = {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((type: ToastType, message: string) => {
    const id = uid();
    const item: ToastItem = { id, type, message };

    setItems((prev) => [item, ...prev].slice(0, 4));

    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (msg) => push("success", msg),
      error: (msg) => push("error", msg),
      info: (msg) => push("info", msg),
    }),[push]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="fixed top-4 right-4 z-9999 flex flex-col gap-2 w-[92vw] max-w-sm">
        {items.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "rounded-2xl border px-4 py-3 shadow-card backdrop-blur",
              "bg-slate-900/80",
              t.type === "success" && "border-emerald-500/40",
              t.type === "error" && "border-red-500/40",
              t.type === "info" && "border-slate-600"
            )}
          >
            <div
              className={clsx(
                "text-sm font-semibold",
                t.type === "success" && "text-emerald-300",
                t.type === "error" && "text-red-300",
                t.type === "info" && "text-slate-200"
              )}
            >
              {t.message}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast deve ser usado dentro de <ToastProvider />");
  }
  return ctx;
}
