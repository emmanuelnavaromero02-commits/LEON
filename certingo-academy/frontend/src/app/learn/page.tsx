"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowRight, Lightbulb, Sparkles, AlertCircle } from 'lucide-react';
import { academyApi } from '@/lib/api';

export default function LearnPage() {
  const router = useRouter();
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem('certingo_user_id');
    if (!id) {
      router.push('/onboarding');
      return;
    }

    const fetchLesson = async () => {
      try {
        const res = await academyApi.getNextLesson(id);
        setLesson(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, []);

  const handleSubmit = async () => {
    if (!selectedOption) return;

    const correct = selectedOption === lesson.question.correct_answer;
    setIsCorrect(correct);
    setIsSubmitted(true);

    const id = localStorage.getItem('certingo_user_id');
    if (id) {
      await academyApi.submitLesson(id, {
        question_id: 'mock-id',
        selected_answer: selectedOption
      });
    }
  };

  if (loading || !lesson) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
        <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
          <X className="w-6 h-6 text-gray-400" />
        </button>
        <div className="flex-1 max-w-xl mx-8">
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-black rounded-full" />
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-indigo-50 px-4 py-2 rounded-full">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">AI Tutor Active</span>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-[0.2em] mb-4 block">New Lesson</span>
            <h1 className="text-5xl font-black mb-10 tracking-tight leading-tight">{lesson.title}</h1>

            <div className="space-y-12">
              <section className="prose prose-indigo max-w-none">
                <div className="flex items-start space-x-6 bg-gray-50 p-8 rounded-3xl border border-gray-100">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0">
                    <Lightbulb className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2">The Analogy</h3>
                    <p className="text-gray-600 leading-relaxed italic">"{lesson.analogy}"</p>
                  </div>
                </div>

                <div className="mt-12 space-y-6">
                  <h3 className="text-2xl font-bold">Key Concept</h3>
                  <p className="text-xl text-gray-600 leading-relaxed">{lesson.simple_explanation}</p>

                  <div className="p-8 bg-indigo-900 text-white rounded-3xl">
                    <h4 className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-4">Example</h4>
                    <p className="text-lg font-medium">{lesson.example}</p>
                  </div>
                </div>
              </section>

              <hr className="border-gray-100" />

              {/* Question Section */}
              <section className="pb-32">
                <h3 className="text-2xl font-bold mb-8">Test your knowledge</h3>
                <p className="text-xl font-medium mb-8 leading-relaxed">{lesson.question.prompt}</p>

                <div className="grid grid-cols-1 gap-4">
                  {lesson.question.options.map((option: string) => (
                    <button
                      key={option}
                      disabled={isSubmitted}
                      onClick={() => setSelectedOption(option)}
                      className={`text-left p-6 rounded-2xl border-2 transition-all font-bold ${
                        selectedOption === option
                          ? (isSubmitted
                              ? (isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50')
                              : 'border-black bg-gray-50')
                          : 'border-gray-100 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option}</span>
                        {isSubmitted && option === lesson.question.correct_answer && <Check className="text-green-500" />}
                        {isSubmitted && selectedOption === option && option !== lesson.question.correct_answer && <X className="text-red-500" />}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Action Bar */}
      <AnimatePresence>
        {selectedOption && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className={`fixed bottom-0 left-0 right-0 p-8 border-t transition-colors ${
              isSubmitted
                ? (isCorrect ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100')
                : 'bg-white border-gray-100'
            }`}
          >
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <div className="flex-1 mr-8">
                {isSubmitted ? (
                  <div className="flex items-start space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isCorrect ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {isCorrect ? <Check className="text-white w-6 h-6" /> : <AlertCircle className="text-white w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className={`font-black text-xl mb-1 ${isCorrect ? 'text-green-900' : 'text-red-900'}`}>
                        {isCorrect ? 'Excellent!' : 'Not quite right'}
                      </h4>
                      <p className={`text-sm ${isCorrect ? 'text-green-800/70' : 'text-red-800/70'}`}>
                        {lesson.question.explanation}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 font-medium">Think carefully about your choice.</p>
                )}
              </div>
              <button
                onClick={isSubmitted ? () => router.push('/dashboard') : handleSubmit}
                className={`px-10 py-5 rounded-2xl font-black text-lg shadow-xl transition-all ${
                  isSubmitted
                    ? (isCorrect ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-200' : 'bg-red-600 hover:bg-red-700 text-white shadow-red-200')
                    : 'bg-black hover:bg-gray-800 text-white shadow-gray-200'
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
