"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Check, Shield, Clock, AlertTriangle, ArrowRight, Trophy } from 'lucide-react';
import { academyApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/StateScreens';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { PracticeQuestion } from '@/types/api';

const EXAM_DURATION_SECONDS = 1200; // 20 minutes
const WARNING_THRESHOLD_SECONDS = 60; // final-minute alert

export default function ExamPage() {
  const router = useRouter();
  const toast = useToast();

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timer, setTimer] = useState(EXAM_DURATION_SECONDS);
  const [confirmQuit, setConfirmQuit] = useState(false);

  // Guard so the final-minute toast fires once, and timeout-submit runs once.
  const warnedRef = useRef(false);
  const finishedRef = useRef(false);

  const startExam = useCallback(async () => {
    const id = localStorage.getItem('certingo_user_id');
    if (!id) {
      router.push('/login');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await academyApi.startExam(id);
      setQuestions(res.data.questions ?? []);
    } catch (err) {
      const message = getErrorMessage(err, 'Could not start the exam.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    startExam();
  }, [startExam]);

  // Finish the exam: briefly show a submitting state, then reveal results.
  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSubmitting(true);
    // Small delay so the "Submitting..." state is perceivable; the score is
    // computed locally from the revealed correct answers.
    window.setTimeout(() => {
      setSubmitting(false);
      setShowResults(true);
    }, 600);
  }, []);

  // Countdown — only runs while the learner is answering questions.
  useEffect(() => {
    if (loading || showResults || error || questions.length === 0) return;
    const interval = setInterval(() => {
      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, showResults, error, questions.length]);

  // Final-minute warning + auto-submit on timeout.
  useEffect(() => {
    if (loading || showResults || questions.length === 0) return;
    if (timer <= WARNING_THRESHOLD_SECONDS && timer > 0 && !warnedRef.current) {
      warnedRef.current = true;
      toast.info('One minute left — wrap up your answers.');
    }
    if (timer === 0 && !finishedRef.current) {
      toast.error("Time's up — submitting your exam.");
      finish();
    }
  }, [timer, loading, showResults, questions.length, toast, finish]);

  const handleSelect = (option: string) => {
    setAnswers((prev) => ({ ...prev, [questions[currentIndex].id]: option }));
  };

  const next = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finish();
    }
  };

  if (loading) {
    return <LoadingScreen label="Preparing your exam" />;
  }

  if (error && questions.length === 0) {
    return <ErrorScreen message={error} onRetry={startExam} />;
  }

  if (questions.length === 0) {
    return (
      <ErrorScreen
        message="No exam questions are available right now."
        onRetry={startExam}
      />
    );
  }

  if (showResults) {
    const score = Object.entries(answers).filter(([qid, ans]) => {
      const q = questions.find((q) => q.id === qid);
      return q?.correct_answer === ans;
    }).length;
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= 70;

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
            <p className="text-gray-500">{questions[0]?.source ?? 'Certification Simulator'}</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-12">
            <div className="bg-gray-50 p-8 rounded-3xl text-center">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Final Score</p>
              <p className={`text-6xl font-black ${passed ? 'text-green-600' : 'text-red-600'}`}>{percentage}%</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-3xl text-center">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Questions Correct</p>
              <p className="text-6xl font-black text-black">{score}/{questions.length}</p>
            </div>
          </div>

          <div
            className={`p-8 rounded-3xl mb-12 flex items-start space-x-6 ${
              passed ? 'bg-green-900 text-white' : 'bg-indigo-900 text-white'
            }`}
          >
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle className={`w-6 h-6 ${passed ? 'text-green-300' : 'text-indigo-300'}`} />
            </div>
            <div>
              <h4 className="font-bold mb-2">{passed ? 'You passed the simulation' : 'Keep practicing'}</h4>
              <p className={`text-sm leading-relaxed ${passed ? 'text-green-200' : 'text-indigo-200'}`}>
                {passed
                  ? 'Great work — your readiness is trending toward the real exam. Run another simulation to lock it in.'
                  : 'Review the concepts behind the questions you missed in your Mistakes Notebook, then try again.'}
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
  const lastMinute = timer <= WARNING_THRESHOLD_SECONDS;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between px-10 py-6 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <Shield className="w-6 h-6 text-indigo-600" />
          <h2 className="font-black tracking-tight text-lg uppercase">Exam Mode</h2>
        </div>
        <div className="flex items-center space-x-6">
          <div
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-colors ${
              lastMinute
                ? 'bg-red-50 border-red-200 text-red-600 animate-pulse'
                : 'bg-gray-50 border-gray-100 text-black'
            }`}
            role="timer"
            aria-live={lastMinute ? 'assertive' : 'off'}
          >
            <Clock className={`w-4 h-4 ${lastMinute ? 'text-red-500' : 'text-gray-400'}`} />
            <span className="text-sm font-black tabular-nums">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
          <button
            onClick={() => setConfirmQuit(true)}
            className="text-gray-400 hover:text-black transition-colors font-bold text-sm"
          >
            Quit
          </button>
        </div>
      </header>

      {lastMinute && (
        <div className="bg-red-500 text-white text-center text-xs font-black uppercase tracking-widest py-2">
          Final minute — your exam will auto-submit when the timer reaches zero
        </div>
      )}

      <main className="flex-1 max-w-4xl mx-auto w-full px-10 py-20">
        <div className="mb-12">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">
            Question {currentIndex + 1} of {questions.length}
          </p>
          <h1 className="text-3xl font-bold leading-tight">{questions[currentIndex].prompt}</h1>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {questions[currentIndex].options.map((option: string) => (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              disabled={submitting}
              className={`text-left p-8 rounded-3xl border-2 transition-all font-bold text-lg flex items-center justify-between disabled:opacity-60 ${
                answers[questions[currentIndex].id] === option
                  ? 'border-black bg-gray-50'
                  : 'border-gray-100 hover:border-gray-200 bg-white'
              }`}
            >
              <span>{option}</span>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  answers[questions[currentIndex].id] === option ? 'border-black bg-black' : 'border-gray-200'
                }`}
              >
                {answers[questions[currentIndex].id] === option && <Check className="w-4 h-4 text-white" />}
              </div>
            </button>
          ))}
        </div>
      </main>

      <footer className="p-10 border-t border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex space-x-2">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex ? 'bg-black w-6' : answers[q.id] ? 'bg-indigo-600' : 'bg-gray-100'
                }`}
              />
            ))}
          </div>
          <button
            disabled={!answers[questions[currentIndex].id] || submitting}
            onClick={next}
            className="bg-black text-white px-12 py-5 rounded-3xl font-black text-lg hover:bg-gray-800 transition-all disabled:bg-gray-100 disabled:text-gray-400 flex items-center group"
          >
            {submitting
              ? 'Submitting...'
              : currentIndex === questions.length - 1
              ? 'Finish Exam'
              : 'Next Question'}
            {!submitting && (
              <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
            )}
          </button>
        </div>
      </footer>

      <ConfirmDialog
        open={confirmQuit}
        title="Quit the exam?"
        description="Your progress on this simulation will be lost and your answers won't be scored. You can start a new exam anytime."
        confirmLabel="Quit exam"
        cancelLabel="Keep going"
        onConfirm={() => {
          setConfirmQuit(false);
          router.push('/dashboard');
        }}
        onCancel={() => setConfirmQuit(false)}
      />
    </div>
  );
}
