"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ArrowRight, Check, Target, Compass, ChevronRight,
} from 'lucide-react';
import { academyApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/StateScreens';
import type {
  DiagnosticAnswer,
  DiagnosticQuestion,
  DiagnosticResult,
} from '@/types/api';

type Phase = 'loading' | 'error' | 'questions' | 'submitting' | 'done';

export default function DiagnosticPage() {
  const router = useRouter();
  const toast = useToast();

  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string>('');
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const start = useCallback(async () => {
    const id = localStorage.getItem('certingo_user_id');
    if (!id) {
      router.push('/login');
      return;
    }
    setPhase('loading');
    setError('');
    try {
      const res = await academyApi.startDiagnostic(id);
      const qs = res.data.questions ?? [];
      if (qs.length === 0) {
        // Nothing to assess — skip straight to the dashboard rather than
        // trapping the learner on an empty screen.
        toast.info('No diagnostic needed — taking you to your dashboard.');
        router.push('/dashboard');
        return;
      }
      setQuestions(qs);
      setCurrentIndex(0);
      setAnswers({});
      setPhase('questions');
    } catch (err) {
      const message = getErrorMessage(err, 'Could not start the diagnostic.');
      setError(message);
      toast.error(message);
      setPhase('error');
    }
  }, [router, toast]);

  useEffect(() => {
    start();
  }, [start]);

  const current = questions[currentIndex];
  const selected = current ? answers[current.id] : undefined;
  const isLast = currentIndex === questions.length - 1;
  const answeredCount = Object.keys(answers).length;

  const handleSelect = (option: string) => {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: option }));
  };

  const submit = useCallback(async () => {
    const id = localStorage.getItem('certingo_user_id');
    if (!id) {
      router.push('/login');
      return;
    }
    setPhase('submitting');
    const payload: DiagnosticAnswer[] = questions.map((q) => ({
      question_id: q.id,
      selected_answer: answers[q.id] ?? '',
    }));
    try {
      const res = await academyApi.submitDiagnostic(id, payload);
      setResult(res.data);
      setPhase('done');
      toast.success('Diagnostic complete — your path is ready.');
    } catch (err) {
      const message = getErrorMessage(err, 'Could not submit the diagnostic.');
      toast.error(message);
      // Return to the questions so the learner can retry submitting.
      setPhase('questions');
    }
  }, [answers, questions, router, toast]);

  const next = () => {
    if (isLast) {
      submit();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  if (phase === 'loading') {
    return <LoadingScreen label="Preparing your diagnostic" />;
  }

  if (phase === 'error') {
    return <ErrorScreen message={error} onRetry={start} />;
  }

  if (phase === 'done') {
    return <DiagnosticSummary result={result} onContinue={() => router.push('/dashboard')} />;
  }

  // questions | submitting
  const submitting = phase === 'submitting';

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <header className="flex items-center justify-between px-8 py-6 border-b border-white/5 sticky top-0 bg-[#050505]/80 backdrop-blur-xl z-20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-black font-black">C</span>
          </div>
          <span className="text-lg font-bold tracking-tight">Certingo</span>
        </div>
        <div className="flex items-center space-x-2 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20">
          <Compass className="w-4 h-4 text-indigo-400" />
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
            Skill Diagnostic
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-8 py-16">
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">
              Question {currentIndex + 1} of {questions.length}
            </p>
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                current.difficulty === 'easy'
                  ? 'bg-green-500/10 text-green-400'
                  : current.difficulty === 'medium'
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              {current.difficulty}
            </span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={false}
              animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              className="h-full bg-indigo-500"
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
            <h1 className="text-3xl font-bold leading-tight mb-10">{current.prompt}</h1>

            <div className="grid grid-cols-1 gap-3">
              {current.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSelect(option)}
                  className={`text-left p-6 rounded-2xl border transition-all font-bold text-lg flex justify-between items-center disabled:opacity-60 ${
                    selected === option
                      ? 'border-white bg-white/5'
                      : 'border-white/5 hover:border-white/20 bg-white/[0.02]'
                  }`}
                >
                  <span>{option}</span>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selected === option ? 'border-white bg-white' : 'border-white/20'
                    }`}
                  >
                    {selected === option && <Check className="w-4 h-4 text-black" />}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="p-8 border-t border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex space-x-2">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className={`h-2 rounded-full transition-all ${
                  i === currentIndex
                    ? 'bg-white w-6'
                    : answers[q.id]
                    ? 'bg-indigo-500 w-2'
                    : 'bg-white/10 w-2'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            disabled={!selected || submitting}
            onClick={next}
            className="bg-white text-black px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all disabled:bg-white/10 disabled:text-white/30 flex items-center group"
          >
            {submitting
              ? 'Analyzing...'
              : isLast
              ? `Finish (${answeredCount}/${questions.length})`
              : 'Next'}
            {!submitting && (
              <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Result summary                                                             */
/* -------------------------------------------------------------------------- */

function DiagnosticSummary({
  result,
  onContinue,
}: {
  result: DiagnosticResult | null;
  onContinue: () => void;
}) {
  // Derive a headline accuracy from whatever the backend reported.
  const accuracyPct =
    typeof result?.accuracy === 'number'
      ? Math.round(result.accuracy * 100)
      : typeof result?.score === 'number' && typeof result?.total === 'number' && result.total > 0
      ? Math.round((result.score / result.total) * 100)
      : null;

  const domainEntries = result?.domain_breakdown
    ? Object.entries(result.domain_breakdown)
    : [];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-12"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">Your path is ready</h1>
          <p className="text-white/40">
            {result?.message ??
              'We mapped your answers to the certification domains to personalize your roadmap.'}
          </p>
        </div>

        {(accuracyPct !== null || domainEntries.length > 0) && (
          <div className="grid grid-cols-1 gap-6 mb-10">
            {accuracyPct !== null && (
              <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-8 text-center">
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">
                  Diagnostic Accuracy
                </p>
                <p className="text-5xl font-black text-indigo-400">{accuracyPct}%</p>
                {typeof result?.score === 'number' && typeof result?.total === 'number' && (
                  <p className="text-xs text-white/30 mt-2">
                    {result.score} of {result.total} correct
                  </p>
                )}
              </div>
            )}

            {domainEntries.length > 0 && (
              <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-8">
                <div className="flex items-center space-x-2 mb-6">
                  <Target className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">
                    Domain Breakdown
                  </h3>
                </div>
                <div className="space-y-5">
                  {domainEntries.map(([name, raw]) => {
                    const pct = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
                    return (
                      <div key={name}>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-sm font-bold">{name}</span>
                          <span className="text-xs font-black text-white/40">{pct}%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            className={`h-full ${
                              pct > 70 ? 'bg-indigo-500' : pct > 40 ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onContinue}
          className="w-full bg-white text-black py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center group"
        >
          Go to Dashboard
          <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>
    </div>
  );
}
