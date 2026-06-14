"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Check,
  Shield,
  Clock,
  AlertTriangle,
  ArrowRight,
  Trophy,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { academyApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ErrorScreen } from '@/components/StateScreens';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { ExamAnswer, ExamQuestion, ExamResult } from '@/types/api';

const WARNING_THRESHOLD_SECONDS = 60; // final-minute alert
const FALLBACK_DURATION_MINUTES = 20; // used if the server omits a duration

export default function ExamPage() {
  const router = useRouter();
  const toast = useToast();

  // Exam session — populated by the start endpoint.
  const [examId, setExamId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Lifecycle flags.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [timer, setTimer] = useState(FALLBACK_DURATION_MINUTES * 60);
  const [confirmQuit, setConfirmQuit] = useState(false);

  // Guards: fire the final-minute toast once, and only auto-submit once.
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
    // Reset any prior session state so retrying yields a clean exam.
    setResult(null);
    setAnswers({});
    setCurrentIndex(0);
    warnedRef.current = false;
    finishedRef.current = false;
    try {
      const res = await academyApi.startExam(id);
      const data = res.data;
      setExamId(data.exam_id);
      setQuestions(data.questions ?? []);
      const minutes =
        typeof data.duration_minutes === 'number' && data.duration_minutes > 0
          ? data.duration_minutes
          : FALLBACK_DURATION_MINUTES;
      setTimer(minutes * 60);
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

  // Submit every question (unanswered ones as ""), then render the server's
  // verdict. Nothing is graded on the client.
  const submitExam = useCallback(async () => {
    const id = localStorage.getItem('certingo_user_id');
    if (!id) {
      router.push('/login');
      return;
    }
    if (!examId) {
      const message = 'The exam session is missing. Please restart the exam.';
      setError(message);
      toast.error(message);
      return;
    }
    setSubmitting(true);
    setError(null);
    const payloadAnswers: ExamAnswer[] = questions.map((q) => ({
      question_id: q.id,
      selected_answer: answers[q.id] ?? '',
    }));
    try {
      const res = await academyApi.submitExam(id, {
        exam_id: examId,
        answers: payloadAnswers,
      });
      setResult(res.data);
    } catch (err) {
      // Allow a retry without losing answers: clear the finished guard so the
      // learner can re-submit, and surface the error.
      finishedRef.current = false;
      const message = getErrorMessage(err, 'Could not submit your exam.');
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [router, toast, examId, questions, answers]);

  // Finish the exam exactly once (manual finish or timeout).
  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    submitExam();
  }, [submitExam]);

  // Countdown — only runs while the learner is still answering.
  useEffect(() => {
    if (loading || result || error || submitting || questions.length === 0) return;
    const interval = setInterval(() => {
      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, result, error, submitting, questions.length]);

  // Final-minute warning + auto-submit on timeout.
  useEffect(() => {
    if (loading || result || questions.length === 0) return;
    if (timer <= WARNING_THRESHOLD_SECONDS && timer > 0 && !warnedRef.current) {
      warnedRef.current = true;
      toast.info('One minute left — wrap up your answers.');
    }
    if (timer === 0 && !finishedRef.current) {
      toast.error("Time's up — submitting your exam.");
      finish();
    }
  }, [timer, loading, result, questions.length, toast, finish]);

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

  // A start failure (no questions yet) is a hard error: retry restarts.
  if (error && !result && questions.length === 0) {
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

  /* ----------------------------------------------------------------------- */
  /* Results — rendered entirely from the server response.                   */
  /* ----------------------------------------------------------------------- */
  if (result) {
    const percentage = Math.round(result.score * 100);
    const passed = result.passed;

    return (
      <div className="min-h-screen bg-[#050505] text-white p-6 sm:p-10 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-3xl w-full bg-white/5 border border-white/5 p-8 sm:p-12 rounded-[2.5rem]"
        >
          <div className="text-center mb-10">
            <div
              className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-12 ${
                passed
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-indigo-500/10 border border-indigo-500/20'
              }`}
            >
              <Trophy
                className={`w-10 h-10 -rotate-12 ${passed ? 'text-green-400' : 'text-indigo-400'}`}
              />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Exam Results</h1>
            <p className="text-white/40">Certification Simulator</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-10">
            <div className="bg-white/5 border border-white/5 p-8 rounded-3xl text-center">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">
                Final Score
              </p>
              <p className={`text-6xl font-black ${passed ? 'text-green-400' : 'text-red-400'}`}>
                {percentage}%
              </p>
            </div>
            <div className="bg-white/5 border border-white/5 p-8 rounded-3xl text-center">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">
                Questions Correct
              </p>
              <p className="text-6xl font-black text-white">
                {result.correct}/{result.total}
              </p>
            </div>
          </div>

          {/* Pass / fail banner. */}
          <div
            className={`p-8 rounded-3xl mb-10 flex items-start space-x-6 border ${
              passed
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-indigo-500/10 border-indigo-500/20'
            }`}
          >
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle
                className={`w-6 h-6 ${passed ? 'text-green-400' : 'text-indigo-400'}`}
              />
            </div>
            <div>
              <h4 className="font-bold mb-2">
                {passed ? 'You passed the simulation' : 'Keep practicing'}
              </h4>
              <p className="text-sm leading-relaxed text-white/50">
                {passed
                  ? 'Great work — your readiness is trending toward the real exam. Run another simulation to lock it in.'
                  : 'Review the concepts behind the questions you missed below, then try again.'}
              </p>
            </div>
          </div>

          {/* Per-domain breakdown. */}
          {result.domain_breakdown.length > 0 && (
            <div className="mb-10">
              <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">
                Domain Breakdown
              </h3>
              <div className="space-y-4">
                {result.domain_breakdown.map((domain) => {
                  const pct = Math.round(domain.score * 100);
                  return (
                    <div key={domain.domain_id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold text-white/80 truncate pr-3">
                          {domain.name}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${
                            pct >= 70 ? 'text-green-400' : 'text-indigo-400'
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          className={`h-full ${pct >= 70 ? 'bg-green-500' : 'bg-indigo-500'}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Question-by-question review. */}
          {result.results.length > 0 && (
            <div className="mb-10">
              <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">
                Review
              </h3>
              <div className="space-y-4">
                {result.results.map((item, i) => {
                  const question = questions.find((q) => q.id === item.question_id);
                  const yourAnswer = item.selected_answer || 'No answer';
                  return (
                    <div
                      key={item.question_id}
                      className={`p-6 rounded-2xl border ${
                        item.correct
                          ? 'bg-green-500/[0.06] border-green-500/20'
                          : 'bg-red-500/[0.06] border-red-500/20'
                      }`}
                    >
                      <div className="flex items-start space-x-3 mb-4">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            item.correct ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        >
                          {item.correct ? (
                            <Check className="w-4 h-4 text-white" />
                          ) : (
                            <XCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <p className="font-bold text-white/90 leading-snug">
                          <span className="text-white/30 mr-2">{i + 1}.</span>
                          {question?.prompt ?? 'Question'}
                        </p>
                      </div>

                      <div className="space-y-2 pl-10 text-sm">
                        <p>
                          <span className="text-white/40 font-bold uppercase tracking-wider text-[10px] mr-2">
                            Your answer
                          </span>
                          <span
                            className={item.correct ? 'text-green-300' : 'text-red-300'}
                          >
                            {yourAnswer}
                          </span>
                        </p>
                        {!item.correct && (
                          <p>
                            <span className="text-white/40 font-bold uppercase tracking-wider text-[10px] mr-2">
                              Correct
                            </span>
                            <span className="text-green-300">{item.correct_answer}</span>
                          </p>
                        )}
                        {item.explanation && (
                          <p className="text-white/50 leading-relaxed pt-1">
                            {item.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-white text-black py-6 rounded-3xl font-black text-xl hover:bg-gray-200 transition-all flex items-center justify-center group"
          >
            Back to Dashboard
            <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    );
  }

  /* ----------------------------------------------------------------------- */
  /* Submit failed mid-exam — let the learner retry without losing answers.  */
  /* ----------------------------------------------------------------------- */
  if (error && !submitting) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-10">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Submission failed</h2>
          <p className="text-sm text-white/40 leading-relaxed mb-8">{error}</p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={submitExam}
              className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-white text-black hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry submission
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------------------- */
  /* Submitting — full-screen state while the server grades.                 */
  /* ----------------------------------------------------------------------- */
  if (submitting) {
    return <LoadingScreen label="Grading your exam" />;
  }

  /* ----------------------------------------------------------------------- */
  /* Exam in progress.                                                       */
  /* ----------------------------------------------------------------------- */
  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;
  const lastMinute = timer <= WARNING_THRESHOLD_SECONDS;
  const currentQuestion = questions[currentIndex];
  const selected = answers[currentQuestion.id];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <header className="flex items-center justify-between px-6 sm:px-10 py-6 border-b border-white/5 bg-[#0A0A0A] sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <Shield className="w-6 h-6 text-indigo-400" />
          <h2 className="font-black tracking-tight text-lg uppercase">Exam Mode</h2>
        </div>
        <div className="flex items-center space-x-6">
          <div
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-colors ${
              lastMinute
                ? 'bg-red-500/15 border-red-500/40 text-red-300 animate-pulse'
                : 'bg-white/5 border-white/10 text-white'
            }`}
            role="timer"
            aria-live={lastMinute ? 'assertive' : 'off'}
          >
            <Clock className={`w-4 h-4 ${lastMinute ? 'text-red-400' : 'text-white/40'}`} />
            <span className="text-sm font-black tabular-nums">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
          <button
            onClick={() => setConfirmQuit(true)}
            className="text-white/40 hover:text-white transition-colors font-bold text-sm"
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

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 sm:px-10 py-16 sm:py-20">
        <div className="mb-10 sm:mb-12">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3">
            Question {currentIndex + 1} of {questions.length}
          </p>
          <h1 className="text-3xl font-bold leading-tight">{currentQuestion.prompt}</h1>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {currentQuestion.options.map((option: string) => {
            const isSelected = selected === option;
            return (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                className={`text-left p-6 sm:p-8 rounded-3xl border-2 transition-all font-bold text-lg flex items-center justify-between ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-white/10 hover:border-white/20 bg-white/[0.03]'
                }`}
              >
                <span>{option}</span>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-4 ${
                    isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-white/20'
                  }`}
                >
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </main>

      <footer className="p-6 sm:p-10 border-t border-white/5 bg-[#0A0A0A]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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
            disabled={!selected}
            onClick={next}
            className="bg-white text-black px-8 sm:px-12 py-5 rounded-3xl font-black text-lg hover:bg-gray-200 transition-all disabled:bg-white/10 disabled:text-white/30 flex items-center group"
          >
            {currentIndex === questions.length - 1 ? 'Finish Exam' : 'Next Question'}
            <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
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
