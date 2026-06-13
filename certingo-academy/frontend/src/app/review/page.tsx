"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Notebook, AlertCircle, RefreshCw, ChevronRight, BookOpen, Sparkles } from 'lucide-react';
import { academyApi } from '@/lib/api';

export default function MistakesNotebookPage() {
  const router = useRouter();
  const [notebook, setNotebook] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem('certingo_user_id');
    if (!id) { router.push('/login'); return; }

    const fetchNotebook = async () => {
      try {
        const res = await academyApi.getNotebook(id);
        setNotebook(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchNotebook();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <div className="flex items-center space-x-2 text-orange-400 mb-2">
             <Notebook className="w-4 h-4" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Personal Knowledge Debt</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Mistakes Notebook</h1>
          <p className="text-white/40 mt-2">Concepts where you've struggled. Review them to improve your readiness score.</p>
        </header>

        {notebook.length === 0 ? (
          <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-20 text-center">
             <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-green-500" />
             </div>
             <h3 className="text-xl font-bold mb-2">Clean Slate!</h3>
             <p className="text-white/40 max-w-xs mx-auto">You haven't failed any questions yet. Keep up the perfect streak.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {notebook.map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-all group">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center space-x-4">
                     <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
                        <AlertCircle className="w-5 h-5" />
                     </div>
                     <div>
                        <h3 className="font-bold text-lg">{item.skill_id.replace('-', ' ').toUpperCase()}</h3>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Failed {item.fail_count} times</p>
                     </div>
                  </div>
                  <button className="bg-white text-black px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-50 transition-colors">
                     Review Concept
                  </button>
                </div>

                <div className="bg-black/40 rounded-2xl p-6 mb-6">
                   <p className="text-xs font-black uppercase tracking-widest text-white/20 mb-3">Last Failed Question</p>
                   <p className="text-sm font-medium leading-relaxed italic text-white/60">"{item.last_question}"</p>
                </div>

                {item.review_hints.length > 0 && (
                   <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Review Hints</p>
                      {item.review_hints.map((hint: string, j: number) => (
                         <div key={j} className="flex items-start space-x-3 text-sm text-white/40">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                            <p>{hint}</p>
                         </div>
                      ))}
                   </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
