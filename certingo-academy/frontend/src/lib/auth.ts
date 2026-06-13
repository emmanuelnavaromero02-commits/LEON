// Client-side session layer. Token + user live in localStorage; the token is
// mirrored in a cookie so middleware.ts can gate protected routes on the edge.
// All helpers are SSR-safe (no-ops on the server).

import type { AuthResponse, AuthUser, UserRole } from '@/types/auth';

export const TOKEN_STORAGE_KEY = 'certingo_token';
export const USER_STORAGE_KEY = 'certingo_user';
// Legacy key still read by existing pages (dashboard, learn, practice, ...).
export const LEGACY_USER_ID_KEY = 'certingo_user_id';

// Cookie lifetime. Keep in sync with the backend JWT expiry; if the cookie
// outlives the token, the API answers 401 and the axios interceptor logs out.
export const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h

const ADMIN_ROLES: readonly UserRole[] = ['SUPER_ADMIN', 'TENANT_ADMIN'];

const isBrowser = () => typeof window !== 'undefined';

export function saveSession(auth: AuthResponse): void {
  if (!isBrowser()) return;
  localStorage.setItem(TOKEN_STORAGE_KEY, auth.access_token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(auth.user));
  // Compatibility with pages that still read the raw user id.
  localStorage.setItem(LEGACY_USER_ID_KEY, auth.user.id);
  // Cookie mirror for middleware gating (UX only — backend validates the JWT).
  document.cookie = `${TOKEN_STORAGE_KEY}=${encodeURIComponent(
    auth.access_token
  )}; path=/; max-age=${TOKEN_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function getToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getUser(): AuthUser | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(LEGACY_USER_ID_KEY);
  document.cookie = `${TOKEN_STORAGE_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export function isAdmin(user: AuthUser | null | undefined): boolean {
  return !!user && ADMIN_ROLES.includes(user.role);
}
