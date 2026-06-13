"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Shield, Clock, AlertTriangle, ArrowRight, Trophy } from 'lucide-react';
import { academyApi } from '@/lib/api';

export default function ExamPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [timer, setTimer] = useState(1200); // 20 minutes

  useEffect(() => {
    const id = localStorage.getItem('certingo_user_id');
    if (!id) {
      router.push('/login');
      return;
    }

    const startExam = async () => {
      try {
        const res = await academyApi.startExam(id);
        setQuestions(res.data.questions);
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
  }, []);

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (showResults) {
    const score = Object.entries(answers).filter(([qid, ans]) => {
      const q = questions.find(q => q.id === qid);
      return q.correct_answer === ans;
    }).length;
    const percentage = (score / questions.length) * 100;

    return (
      <div className="min-h-screen bg-gray-50 p-10 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-3xl w-full bg-white p-12 rounded-[3rem] shadow-xl border border-gray-100"
        >
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-12">
              <Trophy className="w-10 h-10 text-white -rotate-12" />
            </div>
            <h1 className="text-4xl font-black mb-2">Exam Results</h1>
            <p className="text-gray-500">AWS Cloud Practitioner Simulator</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-12">
            <div className="bg-gray-50 p-8 rounded-3xl text-center">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Final Score</p>
              <p className={`text-6xl font-black ${percentage >= 70 ? 'text-green-600' : 'text-red-600'}`}>{percentage}%</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-3xl text-center">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Questions Correct</p>
              <p className="text-6xl font-black text-black">{score}/{questions.length}</p>
            </div>
          </div>

          <div className="space-y-4 mb-12">
            <h3 className="font-bold text-lg mb-4">Performance by Domain</h3>
            {[
              { name: 'Cloud Concepts', score: 90 },
              { name: 'Security & Compliance', score: 40 },
              { name: 'Technology', score: 85 },
              { name: 'Billing', score: 100 },
            ].map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">{d.name}</span>
                <div className="flex items-center space-x-4 w-1/2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${d.score < 50 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${d.score}%` }} />
                  </div>
                  <span className="text-sm font-black w-8 text-right">{d.score}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-indigo-900 text-white p-8 rounded-3xl mb-12 flex items-start space-x-6">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <h4 className="font-bold mb-2">Study Recommendation</h4>
              <p className="text-indigo-200 text-sm leading-relaxed">
                Your security domain score is low. Focus on **Shared Responsibility Model** and **IAM Policies** before attempting the real exam.
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-black text-white py-6 rounded-3xl font-black text-xl hover:bg-gray-800 transition-all flex items-center justify-center group"
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
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between px-10 py-6 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <Shield className="w-6 h-6 text-indigo-600" />
          <h2 className="font-black tracking-tight text-lg uppercase">Exam Mode</h2>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-black tabular-nums">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-black transition-colors font-bold text-sm">Quit</button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-10 py-20">
        <div className="mb-12">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">Question {currentIndex + 1} of {questions.length}</p>
          <h1 className="text-3xl font-bold leading-tight">{questions[currentIndex].prompt}</h1>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {questions[currentIndex].options.map((option: string) => (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              className={`text-left p-8 rounded-3xl border-2 transition-all font-bold text-lg flex items-center justify-between ${
                answers[questions[currentIndex].id] === option
                  ? 'border-black bg-gray-50'
                  : 'border-gray-100 hover:border-gray-200 bg-white'
              }`}
            >
              <span>{option}</span>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                answers[questions[currentIndex].id] === option ? 'border-black bg-black' : 'border-gray-200'
              }`}>
                {answers[questions[currentIndex].id] === option && <Check className="w-4 h-4 text-white" />}
              </div>
            </button>
          ))}
        </div>
      </main>

      <footer className="p-10 border-t border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex space-x-2">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex ? 'bg-black w-6' :
                  answers[questions[i].id] ? 'bg-indigo-600' : 'bg-gray-100'
                }`}
              />
            ))}
          </div>
          <button
            disabled={!answers[questions[currentIndex].id]}
            onClick={next}
            className="bg-black text-white px-12 py-5 rounded-3xl font-black text-lg hover:bg-gray-800 transition-all disabled:bg-gray-100 flex items-center group"
          >
            {currentIndex === questions.length - 1 ? 'Finish Exam' : 'Next Question'}
            <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </footer>
    </div>
  );
}
