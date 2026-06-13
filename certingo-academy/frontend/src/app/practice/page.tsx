"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowRight, Sparkles, AlertCircle, Zap } from 'lucide-react';
import { academyApi } from '@/lib/api';

export default function PracticePage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchNext();
  }, []);

  const fetchNext = async () => {
    const id = localStorage.getItem('certingo_user_id');
    if (!id) {
      router.push('/login');
      return;
    }
    setLoading(true);
    setSelectedOption(null);
    setResult(null);
    try {
      const res = await academyApi.getNextPractice(id);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between px-10 py-6 border-b border-gray-100">
        <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
          <X className="w-6 h-6 text-gray-400" />
        </button>
        <div className="flex items-center space-x-3 bg-orange-50 px-5 py-2 rounded-full border border-orange-100">
          <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />
          <span className="text-xs font-bold text-orange-700 uppercase tracking-widest">Adaptive Practice</span>
        </div>
        <div className="w-10" />
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-10 py-20">
        <motion.div
          key={data.question.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="flex items-center space-x-3 mb-6">
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              data.question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
              data.question.difficulty === 'medium' ? 'bg-orange-100 text-orange-700' :
              'bg-red-100 text-red-700'
            }`}>
              {data.question.difficulty}
            </span>
          </div>

          <h2 className="text-3xl font-bold mb-12 leading-tight">
            {data.question.prompt}
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {data.question.options.map((option: string) => (
              <button
                key={option}
                disabled={!!result}
                onClick={() => setSelectedOption(option)}
                className={`text-left p-6 rounded-2xl border-2 transition-all font-bold text-lg ${
                  selectedOption === option
                    ? (result
                        ? (result.is_correct ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50')
                        : 'border-black bg-gray-50')
                    : 'border-gray-100 hover:border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {result && option === data.question.correct_answer && <Check className="text-green-500" />}
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </main>

      <AnimatePresence>
        {selectedOption && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className={`fixed bottom-0 left-0 right-0 p-8 border-t ${
              result
                ? (result.is_correct ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100')
                : 'bg-white border-gray-100'
            }`}
          >
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <div className="flex-1 mr-8">
                {result ? (
                  <div className="flex items-start space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      result.is_correct ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {result.is_correct ? <Check className="text-white w-6 h-6" /> : <AlertCircle className="text-white w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className={`font-black text-xl mb-1 ${result.is_correct ? 'text-green-900' : 'text-red-900'}`}>
                        {result.is_correct ? 'Great Job!' : 'Keep Learning'}
                      </h4>
                      <p className={`text-sm ${result.is_correct ? 'text-green-800/70' : 'text-red-800/70'}`}>
                        {result.feedback.message}. {result.feedback.technical_note}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-medium text-sm">AI Tutor is waiting for your answer...</span>
                  </div>
                )}
              </div>
              <button
                onClick={result ? fetchNext : handleSubmit}
                disabled={isSubmitting}
                className={`px-10 py-5 rounded-2xl font-black text-lg shadow-xl transition-all ${
                  result
                    ? (result.is_correct ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white')
                    : 'bg-black hover:bg-gray-800 text-white'
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
