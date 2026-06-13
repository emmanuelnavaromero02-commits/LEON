"use client";

import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  /** Tailwind size classes for the icon, e.g. "w-8 h-8". */
  className?: string;
}

/**
 * A single, consistent spinner used across student-facing pages.
 * Inherits text color from its parent (defaults to indigo where used).
 */
export function Spinner({ className = 'w-8 h-8' }: SpinnerProps) {
  return <Loader2 className={`animate-spin text-indigo-500 ${className}`} aria-hidden="true" />;
}

interface LoadingScreenProps {
  /** Optional caption rendered under the spinner. */
  label?: string;
}

/**
 * Full-viewport dark loading state. Use as the initial-load placeholder for
 * student pages so the experience is identical everywhere.
 */
export function LoadingScreen({ label }: LoadingScreenProps) {
  return (
    <div
      className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
    >
      <Spinner />
      {label && (
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/30">{label}</p>
      )}
    </div>
  );
}
