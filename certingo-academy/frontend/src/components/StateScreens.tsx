"use client";

import { AlertCircle, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface ErrorScreenProps {
  /** Human-readable error message (already extracted via getErrorMessage). */
  message: string;
  /** When provided, renders a "Try again" button wired to this handler. */
  onRetry?: () => void;
  /** When true, fills the viewport; otherwise fills its container. */
  fullScreen?: boolean;
}

/**
 * Consistent dark error panel. Use for blocking load failures on student
 * pages so a failed fetch never leaves a blank screen.
 */
export function ErrorScreen({ message, onRetry, fullScreen = true }: ErrorScreenProps) {
  return (
    <div
      className={`${
        fullScreen ? 'min-h-screen' : 'w-full py-20'
      } bg-[#050505] text-white flex items-center justify-center p-10`}
      role="alert"
    >
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
        <p className="text-sm text-white/40 leading-relaxed mb-8">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-white text-black hover:bg-gray-200 transition-colors"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional custom icon; defaults to an inbox glyph. */
  icon?: ReactNode;
  /** Optional call-to-action rendered under the copy. */
  action?: ReactNode;
  /** Tone of the icon chip. */
  tone?: 'neutral' | 'positive';
}

/**
 * Consistent dark "nothing here yet" panel for empty collections
 * (empty skill tree, no mistakes, etc.).
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  tone = 'neutral',
}: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-8">
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
          tone === 'positive'
            ? 'bg-green-500/10 border border-green-500/20'
            : 'bg-white/5 border border-white/5'
        }`}
      >
        {icon ?? <Inbox className="w-8 h-8 text-white/20" />}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-white/40 leading-relaxed max-w-xs mx-auto">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
