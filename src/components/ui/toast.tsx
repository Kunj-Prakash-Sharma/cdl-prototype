"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleCheck } from "lucide-react";

type Toast = { id: number; title: string; detail?: string };

const ToastContext = createContext<(title: string, detail?: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((title: string, detail?: string) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, title, detail }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex flex-col items-center gap-2 px-4"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              className="pointer-events-auto flex max-w-sm items-start gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-lift"
            >
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-400" aria-hidden />
              <div>
                <p className="text-sm font-semibold">{t.title}</p>
                {t.detail && <p className="mt-0.5 text-xs text-white/65">{t.detail}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
