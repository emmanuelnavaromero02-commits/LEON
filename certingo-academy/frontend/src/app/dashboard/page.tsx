"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BookOpen, GraduationCap, Trophy,
  Settings, Zap, Sparkles, ChevronRight, Lock,
  CheckCircle, Target, AlertCircle, History, Notebook,
  ChevronDown, Layers, TrendingUp
} from 'lucide-react';
import { academyApi } from '@/lib/api';

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-white/5 rounded-2xl ${className}`} />
);

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [activeCerts, setActiveCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCertSelector, setShowCertSelector] = useState(false);

  const fetchData = async (certId?: string) => {
    const id = localStorage.getItem('certingo_user_id');
    if (!id) { router.push('/onboarding'); return; }
    setLoading(true);
    try {
      const [dashRes, certsRes] = await Promise.all([
        academyApi.getDashboard(id, certId),
        academyApi.getActiveCertifications()
      ]);
      setData(dashRes.data);
      setActiveCerts(certsRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const switchCert = (certId: string) => {
    setShowCertSelector(false);
    fetchData(certId);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
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
                    item.active ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'
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
              <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 font-bold text-xs uppercase">
                 {data?.user_name?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-xs font-bold truncate">{data?.user_name || 'Loading...'}</p>
                 <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Enterprise Student</p>
              </div>
           </div>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-10 overflow-y-auto">
         <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="max-w-5xl mx-auto"
         >
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
               <div>
                  <div className="flex items-center space-x-4 mb-2">
                     <div className="relative">
                        <button
                          onClick={() => setShowCertSelector(!showCertSelector)}
                          className="flex items-center space-x-2 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all"
                        >
                           <Layers className="w-4 h-4" />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em]">{data?.certification || '...'}</span>
                           <ChevronDown className={`w-3 h-3 transition-transform ${showCertSelector ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {showCertSelector && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 mt-2 w-64 bg-[#111] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                               {activeCerts.map((cert) => (
                                  <button key={cert.id} onClick={() => switchCert(cert.id)} className={`w-full text-left px-4 py-3 text-xs font-bold hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${data?.certification_id === cert.id ? 'text-indigo-400 bg-white/5' : 'text-white/60'}`}>
                                     {cert.name}
                                  </button>
                               ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                     </div>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                    Welcome back, {data?.user_name?.split(' ')[0] || 'Learner'}
                  </h1>
               </div>
               <div className="flex space-x-4">
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center space-x-3">
                     <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                        <Zap className="w-5 h-5 text-orange-500 fill-orange-500" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Streak</p>
                        <p className="text-xl font-bold leading-none">{data?.streak || 0} Days</p>
                     </div>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center space-x-3">
                     <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-indigo-500" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Total XP</p>
                        <p className="text-xl font-bold leading-none">{data?.xp || 0}</p>
                     </div>
                  </div>
               </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
               <div className="lg:col-span-2 space-y-8">
                  <section className="bg-white/5 border border-white/5 p-8 rounded-[2.5rem]">
                     <div className="flex items-center justify-between mb-10">
                        <div>
                           <h2 className="text-xl font-bold mb-1">{data?.certification || 'Loading Certification...'}</h2>
                           <p className="text-sm text-white/40 font-medium">Certification Readiness Index</p>
                        </div>
                        <div className="text-right">
                           {loading ? <Skeleton className="w-12 h-10 ml-auto" /> : (
                              <>
                                <p className="text-3xl font-black text-indigo-400">{Math.round((data?.progress || 0) * 100)}%</p>
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Target 70%</p>
                              </>
                           )}
                        </div>
                     </div>

                     <div className="space-y-3">
                        {loading ? (
                           [1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full" />)
                        ) : (
                          data?.all_skills.map((skill: any, i: number) => {
                             const score = data.mastery_by_skill[skill.id] || 0;
                             const status = score > 0.8 ? 'completed' : score > 0 ? 'current' : i < 3 ? 'unlocked' : 'locked';

                             return (
                               <motion.div
                                 key={skill.id}
                                 whileHover={{ scale: 1.01 }}
                                 className={`p-6 rounded-2xl border transition-all flex items-center group ${status === 'locked' ? 'opacity-30 border-white/5' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                               >
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-5 transition-all ${status === 'completed' ? 'bg-green-500/10 text-green-500' : status === 'current' ? 'bg-indigo-500 text-white shadow-xl shadow-indigo-500/20' : 'bg-white/5 text-white/20'}`}>
                                     {status === 'completed' ? <CheckCircle className="w-6 h-6" /> : status === 'locked' ? <Lock className="w-5 h-5" /> : <Zap className="w-6 h-6" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                     <h3 className="font-bold mb-1 truncate">{skill.name}</h3>
                                     <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div initial={{width:0}} animate={{width: `${score*100}%` }} className="h-full bg-indigo-500" />
                                     </div>
                                  </div>
                                  {status !== 'locked' && (
                                    <button onClick={() => router.push(`/learn?cert_id=${data.certification_id}`)} className="ml-6 p-3 rounded-xl bg-white/5 text-white/20 group-hover:bg-white group-hover:text-black transition-all">
                                       <ChevronRight className="w-5 h-5" />
                                    </button>
                                  )}
                               </motion.div>
                             );
                          })
                        )}
                     </div>
                  </section>
               </div>

               <div className="space-y-8">
                  <section className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                     <motion.div
                       animate={{
                         scale: [1, 1.05, 1],
                         rotate: [0, 2, 0]
                       }}
                       transition={{ duration: 10, repeat: Infinity }}
                       className="absolute top-0 right-0 p-4 opacity-10"
                     >
                        <Sparkles className="w-32 h-32 text-white" />
                     </motion.div>
                     <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                           <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Adaptive Recommendation</h2>
                        <p className="text-indigo-100 text-sm mb-8 leading-relaxed">
                          {loading ? 'Analyzing your progress...' : data?.recommendation}
                        </p>
                        <button
                          onClick={() => router.push(`/learn?cert_id=${data?.certification_id}`)}
                          className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
                        >
                           Resume Journey
                        </button>
                     </div>
                  </section>

                  <section className="bg-white/5 border border-white/5 p-8 rounded-[2.5rem]">
                     <h3 className="font-bold mb-6 flex items-center space-x-2">
                        <History className="w-4 h-4 text-indigo-400" />
                        <span>Recent Activity</span>
                     </h3>
                     <div className="space-y-4">
                        {[1, 2].map(i => (
                           <div key={i} className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl">
                              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                 <CheckCircle className="w-4 h-4 text-indigo-400" />
                              </div>
                              <div>
                                 <p className="text-xs font-bold text-white/80">Completed Lesson</p>
                                 <p className="text-[10px] text-white/30 uppercase font-black">2 hours ago</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </section>
               </div>
            </div>
         </motion.div>
      </main>
    </div>
  );
}
