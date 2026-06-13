"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { clearSession, getUser, saveSession } from '@/lib/auth';
import type { AuthUser, LoginPayload, RegisterPayload } from '@/types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the session has been hydrated from localStorage. */
  loading: boolean;
  login: (data: LoginPayload) => Promise<AuthUser>;
  register: (data: RegisterPayload) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate the session from localStorage on first client render.
  useEffect(() => {
    setUser(getUser());
    setLoading(false);
  }, []);

  const login = useCallback(async (data: LoginPayload) => {
    const res = await authApi.login(data);
    saveSession(res.data);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (data: RegisterPayload) => {
    const res = await authApi.register(data);
    saveSession(res.data);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    router.push('/login');
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
