"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AdminSidebar } from '@/components/admin/Sidebar';
import {
  Database, FileText, Plus, Search, Trash2, RefreshCw, Inbox, AlertCircle, X,
} from 'lucide-react';
import { academyApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { KnowledgeDocument } from '@/types/api';

export default function KnowledgeBasePage() {
  const toast = useToast();
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // Add form
  const [formOpen, setFormOpen] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete
  const [pendingDelete, setPendingDelete] = useState<KnowledgeDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await academyApi.getKnowledgeDocuments();
      setDocs(res.data);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to load knowledge base.');
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
    if (!q) return docs;
    return docs.filter((doc) =>
      [doc.title, doc.skill_id, doc.certification_id]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [docs, query]);

  const resetForm = () => {
    setTitleInput('');
    setContentInput('');
    setSkillInput('');
    setFormOpen(false);
  };

  const handleCreate = async () => {
    const title = titleInput.trim();
    const content = contentInput.trim();
    if (!title || !content) {
      toast.error('A title and content are required.');
      return;
    }
    setSubmitting(true);
    try {
      await academyApi.createKnowledgeDocument({
        title,
        content,
        skill_id: skillInput.trim() || undefined,
      });
      toast.success(`Document "${title}" added.`);
      resetForm();
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not add the document.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await academyApi.deleteKnowledgeDocument(pendingDelete.id);
      toast.success(`Document "${pendingDelete.title}" deleted.`);
      setPendingDelete(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete the document.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-10">
        <div className="max-w-6xl mx-auto">
          <header className="mb-12 flex justify-between items-end">
            <div>
              <div className="flex items-center space-x-2 text-indigo-400 mb-2">
                <Database className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">RAG Infrastructure</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Knowledge Base</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={load}
                disabled={loading}
                aria-label="Refresh documents"
                className="bg-white/[0.03] border border-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setFormOpen(true)}
                className="bg-white text-black px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 hover:bg-gray-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Document</span>
              </button>
            </div>
          </header>

          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Knowledge Base..."
                aria-label="Search knowledge base"
                className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <section className="bg-white/[0.03] border border-white/5 rounded-3xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Document</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Skill</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Certification</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Created</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-6 py-4">
                        <div className="h-5 bg-white/[0.04] rounded-lg animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
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
                        {docs.length === 0 ? 'No documents indexed' : 'No matching documents'}
                      </p>
                      <p className="text-xs text-white/30">
                        {docs.length === 0 ? 'Add a document to ground AI generations in your content.' : 'Try a different search term.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((doc) => (
                    <tr key={doc.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-white/5 text-white/40 group-hover:text-indigo-400 transition-colors">
                            <FileText className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold">{doc.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {doc.skill_id ? (
                          <span className="text-xs px-2 py-1 bg-white/5 rounded text-white/60">{doc.skill_id}</span>
                        ) : (
                          <span className="text-xs text-white/20">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {doc.certification_id ? (
                          <span className="text-xs px-2 py-1 bg-white/5 rounded text-white/60">{doc.certification_id}</span>
                        ) : (
                          <span className="text-xs text-white/20">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-white/40">{doc.created_at ?? '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setPendingDelete(doc)}
                          aria-label={`Delete document ${doc.title}`}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-white/40 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </div>
      </main>

      {/* Add document modal */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetForm}
            role="presentation"
          >
            <motion.form
              role="dialog"
              aria-modal="true"
              aria-label="Add document"
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-3xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Add Document</h2>
                <button
                  type="button"
                  onClick={resetForm}
                  aria-label="Close dialog"
                  className="p-2 -m-2 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="doc-title" className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
                    Title
                  </label>
                  <input
                    id="doc-title"
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="Shared Responsibility Model"
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="doc-content" className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
                    Content
                  </label>
                  <textarea
                    id="doc-content"
                    value={contentInput}
                    onChange={(e) => setContentInput(e.target.value)}
                    placeholder="Paste the document content to embed for RAG..."
                    className="w-full h-40 bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <div>
                  <label htmlFor="doc-skill" className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
                    Skill <span className="text-white/20 normal-case">(optional)</span>
                  </label>
                  <input
                    id="doc-skill"
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="shared-responsibility-model"
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-8">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl text-sm font-bold border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl text-sm font-bold bg-indigo-500 text-white hover:bg-indigo-600 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Document'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete document?"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" and its embeddings will be permanently removed from the knowledge base.`
            : undefined
        }
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
