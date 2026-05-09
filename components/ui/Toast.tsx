"use client";
import { useEffect, useRef, useState, createContext, useContext, ReactNode } from "react";

type Toast = { id: number; kind: "success" | "error" | "info"; text: string };

const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void }>({ push: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const recentToastRef = useRef<Map<string, number>>(new Map());

  const push = (t: Omit<Toast, "id">) => {
    const key = `${t.kind}:${t.text}`;
    const now = Date.now();
    const lastSeen = recentToastRef.current.get(key) ?? 0;
    if (now - lastSeen < 3500) return;
    recentToastRef.current.set(key, now);

    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }].slice(-4));
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
      if (recentToastRef.current.get(key) === now) recentToastRef.current.delete(key);
    }, 5000);
  };
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
            className="px-4 py-3 rounded-xl text-sm font-fun font-bold cursor-pointer shadow-lg backdrop-blur-md transition-all"
            style={{
              background:
                t.kind === "success" ? "linear-gradient(135deg, rgba(38,170,104,0.92), rgba(105,217,154,0.85))" :
                t.kind === "error"   ? "linear-gradient(135deg, rgba(255,98,78,0.92), rgba(255,106,132,0.85))" :
                                       "linear-gradient(135deg, rgba(122,85,198,0.92), rgba(180,141,255,0.85))",
              color: "white",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
