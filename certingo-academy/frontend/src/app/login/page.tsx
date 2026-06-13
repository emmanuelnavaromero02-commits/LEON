"use client";

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle, ArrowRight, Loader2, Lock, Mail, Sparkles, User,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isAdmin } from '@/lib/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

type Mode = 'login' | 'register';

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setFieldErrors({});
    setFormError(null);
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (mode === 'register' && !fullName.trim()) {
      errors.fullName = 'Full name is required.';
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Enter a valid email address.';
    }
    if (mode === 'register') {
      if (password.length < MIN_PASSWORD_LENGTH) {
        errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
      }
    } else if (!password) {
      errors.password = 'Password is required.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (mode === 'register') {
        await register({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
        });
        // New accounts go straight to profile onboarding.
        router.push('/onboarding');
      } else {
        const user = await login({ email: email.trim(), password });
        const next = searchParams.get('next');
        if (next && next.startsWith('/')) {
          router.push(next);
        } else {
          router.push(isAdmin(user) ? '/admin/control-room' : '/dashboard');
        }
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 401) {
        setFormError('Invalid email or password.');
      } else if (typeof detail === 'string' && detail) {
        setFormError(detail);
      } else if (err?.code === 'ECONNABORTED' || !err?.response) {
        setFormError('Cannot reach the server. Please try again in a moment.');
      } else {
        setFormError('Something went wrong. Please try again.');
      }
      setSubmitting(false);
    }
  };

  const inputClass = (hasError?: string) =>
    `w-full p-4 pl-12 bg-white/5 border rounded-2xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 transition-all ${
      hasError
        ? 'border-red-500/40 focus:ring-red-500/30'
        : 'border-white/10 focus:ring-indigo-500/40 focus:border-indigo-500/40'
    }`;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient gradients */}
      <div className="absolute -top-40 -left-40 w-[30rem] h-[30rem] bg-indigo-600/20 rounded-full blur-[140px]" />
      <div className="absolute -bottom-40 -right-40 w-[30rem] h-[30rem] bg-purple-600/10 rounded-full blur-[140px]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Brand */}
        <Link href="/" className="flex items-center justify-center space-x-3 mb-10">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <span className="text-black font-black text-lg">C</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Certingo Academy</span>
        </Link>

        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-500/5">
          <div className="flex items-center space-x-2 text-indigo-400 mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              {mode === 'login' ? 'Welcome back' : 'Join the academy'}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-8">
            {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
          </h1>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-1 bg-white/5 border border-white/5 p-1 rounded-2xl mb-8">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  mode === m
                    ? 'bg-white text-black shadow-lg'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === 'register' ? 16 : -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'register' ? -16 : 16 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {mode === 'register' && (
                  <div>
                    <label className="block text-[10px] font-black mb-2 uppercase tracking-widest text-white/30">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type="text"
                        autoComplete="name"
                        className={inputClass(fieldErrors.fullName)}
                        placeholder="Ada Lovelace"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                    {fieldErrors.fullName && (
                      <p className="mt-2 text-xs text-red-400">{fieldErrors.fullName}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black mb-2 uppercase tracking-widest text-white/30">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="email"
                      autoComplete="email"
                      className={inputClass(fieldErrors.email)}
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="mt-2 text-xs text-red-400">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black mb-2 uppercase tracking-widest text-white/30">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className={inputClass(fieldErrors.password)}
                      placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-2 text-xs text-red-400">{fieldErrors.password}</p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {formError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start space-x-3"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300 leading-relaxed">{formError}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-8 w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center shadow-lg shadow-indigo-500/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/20 mt-8">
          {mode === 'login' ? (
            <>
              New to Certingo?{' '}
              <button onClick={() => switchMode('register')} className="text-indigo-400 hover:text-indigo-300 font-bold">
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => switchMode('login')} className="text-indigo-400 hover:text-indigo-300 font-bold">
                Sign in
              </button>
            </>
          )}
        </p>
      </motion.div>
    </div>
  );
}

// useSearchParams requires a Suspense boundary during prerendering.
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
