"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminSidebar } from '@/components/admin/Sidebar';
import {
  Search, CheckCircle, XCircle, Inbox, RefreshCw, FileQuestion,
} from 'lucide-react';
import { academyApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import type { ReviewQuestion } from '@/types/api';

export default function QuestionReviewPage() {
  const toast = useToast();
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await academyApi.getAdminQuestions();
      setQuestions(res.data);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to load the review queue.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter((item) =>
      [item.prompt, item.skill_id, item.difficulty, item.status]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [questions, query]);

  const handleApprove = async (id: string) => {
    setActingId(id);
    try {
      await academyApi.approveQuestion(id);
      toast.success('Question approved.');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not approve the question.'));
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActingId(id);
    try {
      await academyApi.rejectQuestion(id);
      toast.success('Question rejected.');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not reject the question.'));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-10">
        <div className="max-w-6xl mx-auto">
          <header className="mb-10 flex justify-between items-end">
            <div>
              <div className="flex items-center space-x-2 text-indigo-400 mb-2">
                <FileQuestion className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Content Studio</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Question Review Queue</h1>
              <p className="text-white/40 mt-2">Approve or reject AI-generated questions for the certification bank.</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search questions..."
                  aria-label="Search questions"
                  className="w-72 bg-white/[0.03] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
              <button
                onClick={load}
                disabled={loading}
                aria-label="Refresh queue"
                className="bg-white/[0.03] border border-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </header>

          <section className="bg-white/[0.03] border border-white/5 rounded-3xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-black text-white/40 uppercase tracking-widest">
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Question Prompt</th>
                  <th className="px-6 py-4">Skill</th>
                  <th className="px-6 py-4">Difficulty</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-6 py-5">
                        <div className="h-5 bg-white/[0.04] rounded-lg animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <p className="text-sm text-red-400 mb-4">{error}</p>
                      <button onClick={load} className="text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300">
                        Try again
                      </button>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <Inbox className="w-10 h-10 text-white/15 mx-auto mb-4" />
                      <p className="text-sm font-bold text-white/60 mb-1">
                        {questions.length === 0 ? 'The queue is empty' : 'No matching questions'}
                      </p>
                      <p className="text-xs text-white/30">
                        {questions.length === 0
                          ? 'AI-generated questions awaiting review will appear here.'
                          : 'Try a different search term.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((q) => (
                    <tr key={q.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-5">
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            q.status === 'approved'
                              ? 'bg-green-500/10 text-green-400'
                              : q.status === 'rejected'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-orange-500/10 text-orange-400'
                          }`}
                        >
                          {q.status ?? 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-5 max-w-md">
                        <p className="text-sm font-bold line-clamp-2">{q.prompt}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-medium text-white/40">{q.skill_id ?? '—'}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-bold capitalize">{q.difficulty ?? '—'}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleReject(q.id)}
                            disabled={actingId === q.id}
                            aria-label="Reject question"
                            className="p-2 hover:bg-red-500/10 rounded-lg text-white/40 hover:text-red-400 transition-colors disabled:opacity-40"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleApprove(q.id)}
                            disabled={actingId === q.id}
                            aria-label="Approve question"
                            className="p-2 hover:bg-green-500/10 rounded-lg text-white/40 hover:text-green-400 transition-colors disabled:opacity-40"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </div>
      </main>
    </div>
  );
}
