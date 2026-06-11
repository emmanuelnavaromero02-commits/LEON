"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Target, BarChart3, TrendingUp, AlertTriangle, CheckCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { academyApi } from '@/lib/api';

export default function ReadinessDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem('certingo_user_id');
    if (!id) { router.push('/onboarding'); return; }

    const fetchStats = async () => {
      try {
        const res = await academyApi.getReadiness(id);
        setStats(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  if (loading || !stats) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white p-10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12">
          <div className="flex items-center space-x-2 text-indigo-400 mb-2">
             <Target className="w-4 h-4" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Certification Readiness</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Readiness Dashboard</h1>
        </header>

        <div className="grid grid-cols-3 gap-8 mb-10">
           <div className="col-span-2 bg-white/5 border border-white/5 rounded-[2.5rem] p-10 flex flex-col justify-center">
              <div className="flex items-end space-x-6 mb-8">
                 <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                       <circle cx="64" cy="64" r="60" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-white/5" />
                       <circle cx="64" cy="64" r="60" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray="377" strokeDashoffset={377 - (377 * stats.overall / 100)} className="text-indigo-500" strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-2xl font-black">{Math.round(stats.overall)}%</span>
                 </div>
                 <div>
                    <h3 className="text-2xl font-bold mb-1">Overall Mastery</h3>
                    <p className="text-white/40 text-sm">Calculated from {Object.keys(stats.domain_breakdown).length} exam domains.</p>
                 </div>
              </div>
              <div className="h-px bg-white/5 w-full mb-8" />
              <div className="grid grid-cols-2 gap-10">
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Pass Probability</p>
                    <p className="text-4xl font-black text-green-400">{stats.pass_probability}%</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Exam Status</p>
                    <div className="flex items-center space-x-2">
                       <div className={`w-2 h-2 rounded-full ${stats.status === 'Ready' ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`} />
                       <p className="text-xl font-bold">{stats.status}</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-indigo-600 rounded-[2.5rem] p-10 flex flex-col justify-between">
              <div>
                 <ShieldCheck className="w-12 h-12 mb-6" />
                 <h2 className="text-2xl font-bold mb-3">Goal: AWS Practitioner</h2>
                 <p className="text-indigo-100/70 text-sm leading-relaxed">
                    You're reaching the threshold for the real exam. We recommend two more full simulations.
                 </p>
              </div>
              <button onClick={() => router.push('/exam')} className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-50 transition-all">
                 Take Simulation
              </button>
           </div>
        </div>

        <section className="bg-white/5 border border-white/5 rounded-[2.5rem] p-10">
           <h3 className="text-xl font-bold mb-8 flex items-center space-x-3">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <span>Domain Proficiency</span>
           </h3>
           <div className="space-y-6">
              {Object.entries(stats.domain_breakdown).map(([name, score]: [string, any]) => (
                 <div key={name}>
                    <div className="flex justify-between items-end mb-2">
                       <span className="text-sm font-bold">{name}</span>
                       <span className="text-xs font-black text-white/40">{score}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                       <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${score}%` }}
                          className={`h-full ${score > 70 ? 'bg-indigo-500' : score > 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                       />
                    </div>
                 </div>
              ))}
           </div>
        </section>
      </div>
    </div>
  );
}
