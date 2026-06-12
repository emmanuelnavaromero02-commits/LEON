"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronRight, CheckCircle2, Sparkles, Target } from 'lucide-react';
import { academyApi } from '@/lib/api';

export default function DiagnosticPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const certId = searchParams.get('cert_id') || 'aws-cloud-practitioner';

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem('certingo_user_id');
    if (!id) { router.push('/onboarding'); return; }

    const fetchQuestions = async () => {
      try {
        const res = await academyApi.startDiagnostic(id, certId);
        setQuestions(res.data.questions);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchQuestions();
  }, [certId]);

  const handleAnswer = async (selected: string) => {
    const userId = localStorage.getItem('certingo_user_id');
    const newAnswers = [...answers, { question_id: questions[currentIndex].id, selected_answer: selected }];
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setSubmitting(true);
      try {
        await academyApi.submitDiagnostic(userId!, newAnswers);
        router.push('/dashboard');
      } catch (err) {
        console.error(err);
        setSubmitting(false);
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
    </div>
  );

  if (submitting) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-10 text-center">
       <div className="w-20 h-20 bg-indigo-500/20 rounded-3xl flex items-center justify-center mb-8 animate-pulse">
          <Brain className="w-10 h-10 text-indigo-500" />
       </div>
       <h1 className="text-3xl font-bold mb-4 tracking-tight">Personalizing your path...</h1>
       <p className="text-white/40 max-w-sm mx-auto">Our AI is analyzing your answers to create a custom roadmap for {certId}.</p>
    </div>
  );

  const q = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <header className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
         <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
               <span className="text-black font-black text-sm">C</span>
            </div>
            <span className="text-sm font-bold uppercase tracking-widest text-white/40">Diagnostic Assessment</span>
         </div>
         <div className="flex items-center space-x-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Question {currentIndex+1}/{questions.length}</span>
            <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
               <motion.div initial={{width:0}} animate={{width: `${progress}%` }} className="h-full bg-indigo-500" />
            </div>
         </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-10">
         <div className="max-w-2xl w-full">
            <motion.div key={currentIndex} initial={{opacity:0, x: 20}} animate={{opacity:1, x: 0}} className="space-y-12">
               <h2 className="text-4xl font-bold tracking-tight leading-tight">{q.prompt}</h2>

               <div className="grid gap-3">
                  {q.options.map((opt: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleAnswer(opt)}
                      className="w-full text-left p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/20 hover:bg-white/[0.04] transition-all flex items-center justify-between group"
                    >
                       <span className="font-bold text-lg text-white/80 group-hover:text-white transition-colors">{opt}</span>
                       <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
               </div>
            </motion.div>
         </div>
      </main>

      <footer className="p-10 border-t border-white/5 text-center">
         <div className="flex items-center justify-center space-x-8 opacity-20 grayscale">
            <Sparkles className="w-5 h-5" />
            <Target className="w-5 h-5" />
            <CheckCircle2 className="w-5 h-5" />
         </div>
      </footer>
    </div>
  );
}
