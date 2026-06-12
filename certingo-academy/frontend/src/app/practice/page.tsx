"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowRight, Sparkles, AlertCircle, Zap, Brain } from 'lucide-react';
import { academyApi } from '@/lib/api';

function PracticeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const certId = searchParams.get('cert_id');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNext = async () => {
    const id = localStorage.getItem('certingo_user_id');
    if (!id) {
      router.push('/onboarding');
      return;
    }
    setLoading(true);
    setSelectedOption(null);
    setResult(null);
    try {
      const res = await academyApi.getNextPractice(id, certId || '');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNext();
  }, [certId]);

  const handleSubmit = async () => {
    if (!selectedOption || isSubmitting) return;
    setIsSubmitting(true);
    const id = localStorage.getItem('certingo_user_id');
    try {
      const res = await academyApi.submitPractice(id!, {
        question_id: data.question.id,
        selected_answer: selectedOption
      });
      setResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <header className="flex items-center justify-between px-10 py-6 border-b border-white/5 sticky top-0 bg-[#050505]/80 backdrop-blur-xl z-20">
        <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <X className="w-6 h-6 text-white/40" />
        </button>
        <div className="flex items-center space-x-3 bg-orange-500/10 px-5 py-2 rounded-full border border-orange-500/20 shadow-lg shadow-orange-500/5">
          <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />
          <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Adaptive Practice</span>
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-10 py-20 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={data.question.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="flex items-center space-x-3 mb-6">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                data.question.difficulty === 'easy' ? 'bg-green-500/10 text-green-400' :
                data.question.difficulty === 'medium' ? 'bg-orange-500/10 text-orange-400' :
                'bg-red-500/10 text-red-400'
              }`}>
                {data.question.difficulty} Level
              </span>
              <div className="w-1 h-1 bg-white/10 rounded-full" />
              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                Skill Domain: {data.question.skill_id}
              </span>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold mb-12 tracking-tight leading-tight">
              {data.question.prompt}
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {data.question.options.map((option: string) => (
                <motion.button
                  key={option}
                  disabled={!!result}
                  onClick={() => setSelectedOption(option)}
                  whileTap={{ scale: 0.98 }}
                  className={`text-left p-6 rounded-[2rem] border transition-all font-bold text-lg flex justify-between items-center ${
                    selectedOption === option
                      ? (result
                          ? (result.is_correct ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10')
                          : 'border-white bg-white/5')
                      : 'border-white/5 hover:border-white/20 bg-white/[0.02]'
                  }`}
                >
                  <span>{option}</span>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedOption === option
                      ? (result ? (result.is_correct ? 'bg-green-500 border-green-500' : 'bg-red-500 border-red-500') : 'bg-indigo-500 border-indigo-500')
                      : 'border-white/10'
                  }`}>
                    {selectedOption === option && <Check className="w-4 h-4 text-white" />}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {selectedOption && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className={`fixed bottom-0 left-0 right-0 p-8 border-t backdrop-blur-2xl z-30 ${
              result
                ? (result.is_correct ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20')
                : 'bg-[#0A0A0A]/90 border-white/5'
            }`}
          >
            <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 mr-8">
                {result ? (
                  <div className="flex items-start space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      result.is_correct ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {result.is_correct ? <Check className="text-white w-6 h-6" /> : <AlertCircle className="text-white w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className={`font-black text-xl mb-1 ${result.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                        {result.is_correct ? 'Excellent Job!' : 'Keep Practicing'}
                      </h4>
                      <p className="text-sm text-white/50 leading-relaxed">
                        {result.feedback.message}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 text-white/40">
                    <Brain className="w-5 h-5 text-indigo-400 animate-pulse" />
                    <span className="font-bold text-xs uppercase tracking-widest">AI Tutor is verifying your response...</span>
                  </div>
                )}
              </div>
              <button
                onClick={result ? fetchNext : handleSubmit}
                disabled={isSubmitting}
                className={`px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl transition-all w-full md:w-auto ${
                  result
                    ? (result.is_correct ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white')
                    : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                {result ? 'Next Question' : isSubmitting ? 'Checking...' : 'Check Answer'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    }>
      <PracticeContent />
    </Suspense>
  );
}
