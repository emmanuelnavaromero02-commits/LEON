"use client";

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, the confirm action is in flight (disables buttons). */
  busy?: boolean;
  /** Visual emphasis for the confirm button. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A small, consistent confirmation modal for destructive admin actions.
 * Dark aesthetic, framer-motion, focus-friendly buttons.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          role="presentation"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="w-full max-w-sm bg-[#0A0A0A] border border-white/10 rounded-3xl p-8"
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${
                destructive
                  ? 'bg-red-500/10 border border-red-500/20'
                  : 'bg-indigo-500/10 border border-indigo-500/20'
              }`}
            >
              <AlertTriangle
                className={`w-6 h-6 ${destructive ? 'text-red-400' : 'text-indigo-400'}`}
              />
            </div>
            <h2 className="text-lg font-bold mb-2 text-white">{title}</h2>
            {description && (
              <p className="text-sm text-white/40 leading-relaxed mb-8">{description}</p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="flex-1 py-3 rounded-xl text-sm font-bold border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${
                  destructive
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-indigo-500 text-white hover:bg-indigo-600'
                }`}
              >
                {busy ? 'Working...' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
