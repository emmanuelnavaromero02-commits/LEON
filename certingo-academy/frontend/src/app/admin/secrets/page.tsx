"use client";

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AdminSidebar } from '@/components/admin/Sidebar';
import {
  Shield, Plus, Trash2, Lock, AlertTriangle, RefreshCw, Inbox, AlertCircle, X,
} from 'lucide-react';
import { academyApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { Secret } from '@/types/api';

export default function SecretsPage() {
  const toast = useToast();
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [formOpen, setFormOpen] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [valueInput, setValueInput] = useState('');
  const [providerInput, setProviderInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation state
  const [pendingDelete, setPendingDelete] = useState<Secret | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await academyApi.getSecrets();
      setSecrets(res.data);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to load secrets.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setKeyInput('');
    setValueInput('');
    setProviderInput('');
    setFormOpen(false);
  };

  const handleCreate = async () => {
    const key = keyInput.trim();
    const value = valueInput.trim();
    if (!key || !value) {
      toast.error('Both a key and a value are required.');
      return;
    }
    setSubmitting(true);
    try {
      await academyApi.createSecret({
        key,
        value,
        provider: providerInput.trim() || undefined,
      });
      toast.success(`Secret ${key} saved.`);
      resetForm();
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the secret.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await academyApi.deleteSecret(pendingDelete.id);
      toast.success(`Secret ${pendingDelete.key} deleted.`);
      setPendingDelete(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete the secret.'));
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
              <div className="flex items-center space-x-2 text-orange-400 mb-2">
                <Shield className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Security & Infrastructure</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Secrets Vault</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={load}
                disabled={loading}
                aria-label="Refresh secrets"
                className="bg-white/[0.03] border border-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setFormOpen(true)}
                className="bg-white text-black px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 hover:bg-gray-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Secret</span>
              </button>
            </div>
          </header>

          <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-3xl mb-10 flex items-start space-x-6">
            <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h4 className="font-bold text-orange-400 mb-1">Zero-Trust Environment</h4>
              <p className="text-orange-200/60 text-sm leading-relaxed">
                Secrets are encrypted using AES-256 (Fernet) and are never exposed in plain text after being saved.
                Only the application backend can decrypt these values for AI Provider authentication.
              </p>
            </div>
          </div>

          <section className="bg-white/[0.03] border border-white/5 rounded-3xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Secret Key</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Preview</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Provider</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={4} className="px-6 py-5">
                        <div className="h-5 bg-white/[0.04] rounded-lg animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                      <p className="text-sm text-red-400 mb-4">{error}</p>
                      <button onClick={load} className="text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300">
                        Try again
                      </button>
                    </td>
                  </tr>
                ) : secrets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                      <Inbox className="w-10 h-10 text-white/15 mx-auto mb-4" />
                      <p className="text-sm font-bold text-white/60 mb-1">No secrets stored</p>
                      <p className="text-xs text-white/30">Add an API key to enable AI provider authentication.</p>
                    </td>
                  </tr>
                ) : (
                  secrets.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-white/5 text-white/60 group-hover:text-indigo-400 transition-colors">
                            <Lock className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-sm">{s.key}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <code className="text-xs font-mono text-white/40 bg-white/5 px-2 py-1 rounded">
                          {s.masked_preview ?? '••••••••'}
                        </code>
                      </td>
                      <td className="px-6 py-5 text-sm text-white/40 font-medium">{s.provider ?? '—'}</td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setPendingDelete(s)}
                            aria-label={`Delete secret ${s.key}`}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-white/40 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Add secret modal */}
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
              aria-label="Add secret"
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-3xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Add Secret</h2>
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
                  <label htmlFor="secret-key" className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
                    Key
                  </label>
                  <input
                    id="secret-key"
                    type="text"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="ANTHROPIC_API_KEY"
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="secret-value" className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
                    Value
                  </label>
                  <input
                    id="secret-value"
                    type="password"
                    value={valueInput}
                    onChange={(e) => setValueInput(e.target.value)}
                    placeholder="sk-..."
                    autoComplete="off"
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="secret-provider" className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
                    Provider <span className="text-white/20 normal-case">(optional)</span>
                  </label>
                  <input
                    id="secret-provider"
                    type="text"
                    value={providerInput}
                    onChange={(e) => setProviderInput(e.target.value)}
                    placeholder="Anthropic"
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                  {submitting ? 'Saving...' : 'Save Secret'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete secret?"
        description={
          pendingDelete
            ? `"${pendingDelete.key}" will be permanently removed. AI providers relying on it will stop authenticating.`
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
