"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  /** Low-level dismiss, exposed mostly for the close button. */
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const AUTO_DISMISS_MS = 4500;

const VARIANT_STYLES: Record<
  ToastVariant,
  { ring: string; icon: React.ReactNode; accent: string }
> = {
  success: {
    ring: 'border-green-500/30',
    accent: 'bg-green-500',
    icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
  },
  error: {
    ring: 'border-red-500/30',
    accent: 'bg-red-500',
    icon: <XCircle className="w-5 h-5 text-red-400" />,
  },
  info: {
    ring: 'border-indigo-500/30',
    accent: 'bg-indigo-500',
    icon: <Info className="w-5 h-5 text-indigo-400" />,
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: ToastVariant) => {
      const id = counter.current++;
      setToasts((prev) => [...prev, { id, message, variant }]);
      if (typeof window !== 'undefined') {
        window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      }
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message: string) => push(message, 'success'),
      error: (message: string) => push(message, 'error'),
      info: (message: string) => push(message, 'info'),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const style = VARIANT_STYLES[toast.variant];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                role="status"
                className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 bg-[#0A0A0A] border ${style.ring} rounded-2xl px-4 py-3.5 shadow-2xl shadow-black/50`}
              >
                <span className={`absolute left-0 top-0 h-full w-1 ${style.accent}`} />
                <div className="shrink-0 mt-0.5">{style.icon}</div>
                <p className="flex-1 text-sm font-medium text-white/80 leading-relaxed pr-2">
                  {toast.message}
                </p>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 p-1 -m-1 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
