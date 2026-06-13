"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, BookOpen, GraduationCap, Trophy,
  Settings, Zap, Sparkles, ChevronRight, Lock,
  CheckCircle, Target, AlertCircle, Notebook, LogOut, Map
} from 'lucide-react';
import { academyApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen, EmptyState } from '@/components/StateScreens';
import type { DashboardData, SkillNode } from '@/types/api';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    const id = localStorage.getItem('certingo_user_id');
    if (!id) { router.push('/login'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await academyApi.getDashboard(id);
      setData(res.data);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to load your dashboard.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) return <LoadingScreen label="Loading your dashboard" />;
  if (error && !data) return <ErrorScreen message={error} onRetry={fetchDashboard} />;
  if (!data) return <ErrorScreen message="No dashboard data available." onRetry={fetchDashboard} />;

  const skillTree: SkillNode[] = data.skill_tree ?? [];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0A0A0A] border-r border-white/5 flex flex-col h-screen fixed">
        <div className="p-8">
           <div className="flex items-center space-x-3 mb-10">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-black font-black">C</span>
              </div>
              <span className="text-lg font-bold tracking-tight">Certingo</span>
           </div>

           <nav className="space-y-1">
              {[
                { icon: LayoutDashboard, label: 'Dashboard', active: true },
                { icon: BookOpen, label: 'Learn', href: '/learn' },
                { icon: Zap, label: 'Adaptive Practice', href: '/practice' },
                { icon: Notebook, label: 'Mistakes Notebook', href: '/review' },
                { icon: GraduationCap, label: 'Exam Simulator', href: '/exam' },
                { icon: Target, label: 'My Progress', href: '/progress' },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => item.href && router.push(item.href)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    item.active ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${item.active ? 'text-indigo-400' : ''}`} />
                  <span>{item.label}</span>
                </button>
              ))}
           </nav>
        </div>

        <div className="mt-auto p-4 border-t border-white/5">
           <Link href="/admin/control-room" className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-white/40 hover:text-white hover:bg-white/5">
              <Settings className="w-4 h-4" />
              <span>Admin Console</span>
           </Link>
           <div className="mt-4 p-4 bg-white/5 rounded-2xl flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 font-bold text-xs uppercase shrink-0">
                 {(user?.full_name || data.user_name)?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-xs font-bold truncate">{user?.full_name || data.user_name}</p>
                 <p className="text-[10px] text-white/30 truncate">{user?.email || 'Student'}</p>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                 <LogOut className="w-4 h-4" />
              </button>
           </div>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-10">
         <div className="max-w-5xl mx-auto">
            <header className="mb-12 flex justify-between items-end">
               <div>
                  <div className="flex items-center space-x-2 text-indigo-400 mb-2">
                     <Sparkles className="w-4 h-4" />
                     <span className="text-[10px] font-black uppercase tracking-[0.2em]">Personalized Path</span>
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight">Welcome back, {data.user_name.split(' ')[0]}</h1>
               </div>
               <div className="flex space-x-4">
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center space-x-3">
                     <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                        <Zap className="w-5 h-5 text-orange-500 fill-orange-500" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Streak</p>
                        <p className="text-xl font-bold leading-none">{data.streak} Days</p>
                     </div>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center space-x-3">
                     <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-indigo-500" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest leading-none mb-1">Total XP</p>
                        <p className="text-xl font-bold leading-none">{data.xp}</p>
                     </div>
                  </div>
               </div>
            </header>

            <div className="grid grid-cols-3 gap-10">
               <div className="col-span-2 space-y-8">
                  <section className="bg-white/5 border border-white/5 p-8 rounded-[2.5rem]">
                     <div className="flex items-center justify-between mb-10">
                        <div>
                           <h2 className="text-xl font-bold mb-1">{data.certification}</h2>
                           <p className="text-sm text-white/40 font-medium">Progress to certification readiness</p>
                        </div>
                        <div className="text-right">
                           <p className="text-3xl font-black text-indigo-400">{Math.round(data.progress * 100)}%</p>
                           <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Mastery</p>
                        </div>
                     </div>

                     {skillTree.length === 0 ? (
                        <EmptyState
                           title="Your skill tree is being built"
                           description="Complete the diagnostic so we can map out your personalized path across the exam domains."
                           icon={<Map className="w-8 h-8 text-indigo-400" />}
                           action={
                              <button
                                 onClick={() => router.push('/diagnostic')}
                                 className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-white text-black hover:bg-gray-200 transition-colors"
                              >
                                 Start Diagnostic
                              </button>
                           }
                        />
                     ) : (
                        <div className="space-y-3">
                           {skillTree.map((skill) => {
                              const locked = skill.status === 'locked';
                              const mastered = skill.status === 'mastered';
                              const masteryPct = Math.round((skill.mastery ?? 0) * 100);
                              return (
                                 <div
                                    key={skill.skill_id}
                                    className={`p-6 rounded-2xl border transition-all flex items-center group ${
                                       locked ? 'opacity-40 border-white/5' : 'bg-white/5 border-white/5 hover:border-white/10'
                                    }`}
                                 >
                                    <div
                                       className={`w-12 h-12 rounded-xl flex items-center justify-center mr-5 shrink-0 ${
                                          mastered
                                             ? 'bg-green-500/10 text-green-500'
                                             : locked
                                             ? 'bg-white/5 text-white/20'
                                             : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                       }`}
                                    >
                                       {mastered ? (
                                          <CheckCircle className="w-6 h-6" />
                                       ) : locked ? (
                                          <Lock className="w-5 h-5" />
                                       ) : (
                                          <Zap className="w-6 h-6" />
                                       )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <div className="flex items-center justify-between mb-1.5">
                                          <h3 className="font-bold truncate">{skill.name}</h3>
                                          <span
                                             className={`text-[10px] font-black uppercase tracking-widest ml-3 shrink-0 ${
                                                mastered
                                                   ? 'text-green-500'
                                                   : locked
                                                   ? 'text-white/20'
                                                   : 'text-indigo-400'
                                             }`}
                                          >
                                             {mastered ? 'Mastered' : locked ? 'Locked' : `${masteryPct}%`}
                                          </span>
                                       </div>
                                       <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                          <motion.div
                                             initial={{ width: 0 }}
                                             animate={{ width: `${masteryPct}%` }}
                                             className={`h-full ${mastered ? 'bg-green-500' : 'bg-indigo-500'}`}
                                          />
                                       </div>
                                    </div>
                                    {!locked && (
                                       <button
                                          onClick={() => router.push('/learn')}
                                          aria-label={`Open ${skill.name}`}
                                          className="ml-6 p-3 rounded-xl bg-white/5 text-white/20 group-hover:bg-white group-hover:text-black transition-all shrink-0"
                                       >
                                          <ChevronRight className="w-5 h-5" />
                                       </button>
                                    )}
                                 </div>
                              );
                           })}
                        </div>
                     )}
                  </section>
               </div>

               <div className="space-y-8">
                  <section className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 relative overflow-hidden group">
                     <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all" />
                     <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                           <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">
                           {data.recommendation?.title ?? 'Next Best Action'}
                        </h2>
                        <p className="text-indigo-100 text-sm mb-8 leading-relaxed">
                           {data.recommendation?.message ??
                              'Continue your personalized path with the next recommended lesson.'}
                        </p>
                        <button onClick={() => router.push('/learn')} className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-[0.98]">
                           {data.recommendation?.action ?? 'Start Lesson'}
                        </button>
                     </div>
                  </section>

                  <section className="bg-white/5 border border-white/5 p-8 rounded-[2.5rem]">
                     <div className="flex items-center space-x-3 mb-6">
                        <AlertCircle className="w-5 h-5 text-orange-400" />
                        <h2 className="font-bold text-sm uppercase tracking-widest text-white/40">Mistakes Notebook</h2>
                     </div>
                     <div className="space-y-4">
                        <p className="text-sm text-white/40 leading-relaxed">
                           Concepts you've struggled with are collected here. Review them to lift your readiness score.
                        </p>
                        <button
                           onClick={() => router.push('/review')}
                           className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                           Open Notebook
                        </button>
                     </div>
                  </section>
               </div>
            </div>
         </div>
      </main>
    </div>
  );
}
