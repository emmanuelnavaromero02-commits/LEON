"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Shield, Clock, AlertTriangle, ArrowRight, Trophy, Sparkles } from 'lucide-react';
import { academyApi } from '@/lib/api';

function ExamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const certId = searchParams.get('cert_id');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [timer, setTimer] = useState(1200); // 20 minutes
  const [examData, setExamData] = useState<any>(null);

  useEffect(() => {
    const id = localStorage.getItem('certingo_user_id');
    if (!id) {
      router.push('/onboarding');
      return;
    }

    const startExam = async () => {
      try {
        const res = await academyApi.startExam(id, certId || '');
        setQuestions(res.data.questions);
        setExamData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    startExam();

    const interval = setInterval(() => {
      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [certId, router]);

  const handleSelect = (option: string) => {
    setAnswers({ ...answers, [questions[currentIndex].id]: option });
  };

  const next = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResults(true);
    }
  };

  if (loading || questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (showResults) {
    const score = Object.entries(answers).filter(([qid, ans]) => {
      const q = questions.find(q => q.id === qid);
      return q.correct_answer === ans;
    }).length;
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <div className="min-h-screen bg-[#050505] text-white p-6 md:p-10 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-3xl w-full bg-white/5 p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-white/5"
        >
          <div className="text-center mb-12">
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 12 }}
              className="w-20 h-20 bg-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/20"
            >
              <Trophy className="w-10 h-10 text-white -rotate-12" />
            </motion.div>
            <h1 className="text-4xl font-black mb-2 tracking-tight">Exam Results</h1>
            <p className="text-white/40 font-bold uppercase tracking-widest text-[10px]">{examData?.certification_name}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-white/5 border border-white/5 p-8 rounded-3xl text-center">
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Final Score</p>
              <p className={`text-6xl font-black ${percentage >= 70 ? 'text-green-400' : 'text-red-400'}`}>{percentage}%</p>
            </div>
            <div className="bg-white/5 border border-white/5 p-8 rounded-3xl text-center">
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Questions Correct</p>
              <p className="text-6xl font-black text-white">{score}/{questions.length}</p>
            </div>
          </div>

          <div className="bg-indigo-600 p-8 rounded-3xl mb-12 flex items-start space-x-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
               <Sparkles className="w-24 h-24 text-white" />
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div className="relative z-10">
              <h4 className="font-bold mb-2">AI Performance Summary</h4>
              <p className="text-indigo-100 text-sm leading-relaxed font-medium">
                {percentage >= 70
                  ? "Outstanding performance. Your patterns indicate high conceptual retention. You are ready for the official certification."
                  : "More focus is required. We've updated your Mistakes Notebook with the specific patterns detected in this simulator session."}
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-white text-black py-6 rounded-3xl font-black text-lg md:text-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center group shadow-2xl shadow-white/5"
          >
            Back to Dashboard
            <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    );
  }

  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <header className="flex items-center justify-between px-6 md:px-10 py-6 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <Shield className="w-6 h-6 text-indigo-500" />
          <h2 className="font-black tracking-widest text-[10px] uppercase text-white/40 hidden md:block">Secure Exam Environment</h2>
        </div>
        <div className="flex items-center space-x-4 md:space-x-6">
          <div className="flex items-center space-x-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
            <Clock className="w-4 h-4 text-white/40" />
            <span className="text-sm font-black tabular-nums">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
          <button onClick={() => router.push('/dashboard')} className="text-white/20 hover:text-white transition-colors font-black text-[10px] uppercase tracking-widest">Terminate</button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 md:px-10 py-12 md:py-20 overflow-y-auto">
        <div className="mb-12">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3">Question {currentIndex + 1} of {questions.length}</p>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight">{questions[currentIndex].prompt}</h1>
        </div>

        <div className="grid grid-cols-1 gap-4 pb-40">
          {questions[currentIndex].options.map((option: string) => (
            <motion.button
              key={option}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleSelect(option)}
              className={`text-left p-6 md:p-8 rounded-[2rem] border transition-all font-bold text-lg flex items-center justify-between ${
                answers[questions[currentIndex].id] === option
                  ? 'border-white bg-white/5 shadow-xl shadow-white/5'
                  : 'border-white/5 hover:border-white/20 bg-white/[0.02]'
              }`}
            >
              <span>{option}</span>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                answers[questions[currentIndex].id] === option ? 'border-indigo-500 bg-indigo-500' : 'border-white/10'
              }`}>
                {answers[questions[currentIndex].id] === option && <Check className="w-4 h-4 text-white" />}
              </div>
            </motion.button>
          ))}
        </div>
      </main>

      <footer className="p-6 md:p-10 border-t border-white/5 bg-[#050505]/80 backdrop-blur-xl sticky bottom-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex space-x-2 overflow-hidden">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === currentIndex ? 'bg-indigo-400 w-6' :
                  answers[questions[i].id] ? 'bg-indigo-900' : 'bg-white/5'
                }`}
              />
            ))}
          </div>
          <button
            disabled={!answers[questions[currentIndex].id]}
            onClick={next}
            className="bg-white text-black px-8 md:px-12 py-4 md:py-5 rounded-[2rem] font-black text-[10px] md:text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 disabled:scale-100 flex items-center group shadow-2xl"
          >
            {currentIndex === questions.length - 1 ? 'Finish Exam' : 'Next Question'}
            <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    }>
      <ExamContent />
    </Suspense>
  );
}
