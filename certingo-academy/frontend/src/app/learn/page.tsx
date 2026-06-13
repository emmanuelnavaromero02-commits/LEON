"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Lightbulb, Sparkles, AlertCircle, Info, TriangleAlert, BrainCircuit } from 'lucide-react';
import { academyApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/StateScreens';
import type { Lesson } from '@/types/api';

export default function LearnPage() {
  const router = useRouter();
  const toast = useToast();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const fetchLesson = useCallback(async () => {
    const id = localStorage.getItem('certingo_user_id');
    if (!id) { router.push('/login'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await academyApi.getNextLesson(id);
      setLesson(res.data);
    } catch (err) {
      const message = getErrorMessage(err, 'Could not load your lesson.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

  const handleSubmit = async () => {
    if (!selectedOption || !lesson) return;
    const correct = selectedOption === lesson.question.correct_answer;
    setIsCorrect(correct);
    setIsSubmitted(true);

    const id = localStorage.getItem('certingo_user_id');
    if (id) {
      try {
        await academyApi.submitLesson(id, {
          question_id: lesson.question.id ?? 'lesson-q',
          selected_answer: selectedOption,
          skill_id: lesson.skill_id
        });
      } catch (err) {
        // The answer is already revealed locally; surface a non-blocking notice.
        toast.error(getErrorMessage(err, 'Could not save your progress.'));
      }
    }
  };

  if (loading) return <LoadingScreen label="Loading your lesson" />;
  if (error && !lesson) return <ErrorScreen message={error} onRetry={fetchLesson} />;
  if (!lesson) return <ErrorScreen message="No lesson available right now." onRetry={fetchLesson} />;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/5 sticky top-0 bg-[#050505]/80 backdrop-blur-xl z-20">
        <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <X className="w-6 h-6 text-white/40" />
        </button>
        <div className="flex items-center space-x-2 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AI Tutor Active</span>
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4 block">Personalized Lesson</span>
            <h1 className="text-5xl font-bold mb-12 tracking-tight leading-tight">{lesson.title}</h1>

            <div className="space-y-10">
              {lesson.analogy && (
                <section className="bg-white/5 border border-white/5 p-8 rounded-[2rem] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                    <BrainCircuit className="w-24 h-24 text-indigo-400" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-3 mb-4">
                       <Lightbulb className="w-5 h-5 text-indigo-400" />
                       <h3 className="font-bold text-sm uppercase tracking-widest text-indigo-400">The Analogy</h3>
                    </div>
                    <p className="text-xl text-white/80 leading-relaxed italic font-medium">"{lesson.analogy}"</p>
                  </div>
                </section>
              )}

              <section className="space-y-6">
                <h3 className="text-2xl font-bold flex items-center space-x-3">
                   <Info className="w-6 h-6 text-blue-400" />
                   <span>Core Concept</span>
                </h3>
                <p className="text-xl text-white/60 leading-relaxed">{lesson.simple_explanation}</p>

                <div className="grid grid-cols-2 gap-6 mt-8">
                   {lesson.example && (
                     <div className="p-6 bg-green-500/5 border border-green-500/10 rounded-2xl">
                        <h4 className="text-green-400 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Real World Example</h4>
                        <p className="text-sm font-medium text-white/70 leading-relaxed">{lesson.example}</p>
                     </div>
                   )}
                   {lesson.common_mistake && (
                     <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl">
                        <h4 className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-3 text-center">Common Mistake</h4>
                        <p className="text-sm font-medium text-white/70 leading-relaxed">{lesson.common_mistake}</p>
                     </div>
                   )}
                </div>

                {lesson.exam_tip && (
                   <div className="p-6 bg-orange-500/5 border border-orange-500/10 rounded-2xl mt-6 flex items-start space-x-4">
                      <TriangleAlert className="w-5 h-5 text-orange-400 shrink-0 mt-1" />
                      <div>
                         <h4 className="text-orange-400 text-[10px] font-black uppercase tracking-widest mb-1">Exam Trap Warning</h4>
                         <p className="text-sm font-bold text-white/80">{lesson.exam_tip}</p>
                      </div>
                   </div>
                )}
              </section>

              <hr className="border-white/5 my-16" />

              <section className="pb-40">
                <h3 className="text-2xl font-bold mb-8">Concept Check</h3>
                <p className="text-xl font-medium mb-10 text-white/80 leading-relaxed">{lesson.question.prompt}</p>

                <div className="grid grid-cols-1 gap-3">
                  {lesson.question.options.map((option: string) => (
                    <button
                      key={option}
                      disabled={isSubmitted}
                      onClick={() => setSelectedOption(option)}
                      className={`text-left p-6 rounded-2xl border transition-all font-bold text-lg flex justify-between items-center ${
                        selectedOption === option
                          ? (isSubmitted
                              ? (isCorrect ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10')
                              : 'border-white bg-white/5')
                          : 'border-white/5 hover:border-white/20 bg-white/[0.02]'
                      }`}
                    >
                      <span>{option}</span>
                      {isSubmitted && option === lesson.question.correct_answer && <Check className="text-green-500" />}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </motion.div>
        </div>
      </main>

      <AnimatePresence>
        {selectedOption && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className={`fixed bottom-0 left-0 right-0 p-8 border-t backdrop-blur-2xl z-30 ${
              isSubmitted
                ? (isCorrect ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20')
                : 'bg-[#0A0A0A]/90 border-white/5'
            }`}
          >
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <div className="flex-1 mr-8">
                {isSubmitted ? (
                  <div className="flex items-start space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                      {isCorrect ? <Check className="text-white w-6 h-6" /> : <AlertCircle className="text-white w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className={`font-black text-xl mb-1 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {isCorrect ? 'Excellent!' : 'Not quite right'}
                      </h4>
                      <p className="text-sm text-white/50">{lesson.question.explanation}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Verify your understanding</p>
                )}
              </div>
              <button
                onClick={isSubmitted ? () => router.push('/dashboard') : handleSubmit}
                className={`px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl transition-all ${
                  isSubmitted
                    ? (isCorrect ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white')
                    : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                {isSubmitted ? 'Continue' : 'Check Answer'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
