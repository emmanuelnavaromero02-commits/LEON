"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isAdmin } from '@/lib/auth';

// Role gate for the whole /admin tree. The middleware already requires a
// session cookie; here we additionally require TENANT_ADMIN or SUPER_ADMIN.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Cookie present but no local session (edge case) — back to login.
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!isAdmin(user)) {
      setDenied(true);
      const timer = setTimeout(() => router.replace('/dashboard'), 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, user, pathname, router]);

  if (denied) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 text-center"
        >
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-xl font-bold mb-2">Admin access required</h1>
          <p className="text-sm text-white/40 leading-relaxed">
            Your account doesn't have admin permissions. Taking you back to your dashboard...
          </p>
        </motion.div>
      </div>
    );
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return <>{children}</>;
}
