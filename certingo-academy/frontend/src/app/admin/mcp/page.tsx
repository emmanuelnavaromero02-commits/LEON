"use client";

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AdminSidebar } from '@/components/admin/Sidebar';
import {
  Cpu, Plus, Shield, Server, Zap, RefreshCw, Inbox, AlertCircle, X, Trash2, Wrench,
} from 'lucide-react';
import { academyApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { MCPServer, MCPTool } from '@/types/api';

export default function MCPRegistryPage() {
  const toast = useToast();
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Register form
  const [formOpen, setFormOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete
  const [pendingDelete, setPendingDelete] = useState<MCPServer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Tools viewer
  const [toolsServer, setToolsServer] = useState<MCPServer | null>(null);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [toolsError, setToolsError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await academyApi.getMCPServers();
      setServers(res.data);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to load MCP servers.');
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
    setNameInput('');
    setUrlInput('');
    setCategoryInput('');
    setFormOpen(false);
  };

  const handleCreate = async () => {
    const name = nameInput.trim();
    const url = urlInput.trim();
    if (!name || !url) {
      toast.error('A name and URL are required.');
      return;
    }
    setSubmitting(true);
    try {
      await academyApi.createMCPServer({
        name,
        url,
        category: categoryInput.trim() || undefined,
      });
      toast.success(`Server "${name}" registered.`);
      resetForm();
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not register the server.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await academyApi.deleteMCPServer(pendingDelete.id);
      toast.success(`Server "${pendingDelete.name}" removed.`);
      setPendingDelete(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not remove the server.'));
    } finally {
      setDeleting(false);
    }
  };

  const openTools = async (server: MCPServer) => {
    setToolsServer(server);
    setTools([]);
    setToolsError(null);
    setToolsLoading(true);
    try {
      const res = await academyApi.getMCPServerTools(server.id);
      setTools(res.data);
    } catch (err) {
      const message = getErrorMessage(err, 'Could not load tools.');
      setToolsError(message);
      toast.error(message);
    } finally {
      setToolsLoading(false);
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
                <Cpu className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">External Tool Integration</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">MCP Registry</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={load}
                disabled={loading}
                aria-label="Refresh servers"
                className="bg-white/[0.03] border border-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setFormOpen(true)}
                className="bg-white text-black px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 hover:bg-gray-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Register Server</span>
              </button>
            </div>
          </header>

          {loading ? (
            <div className="grid grid-cols-3 gap-6 mb-10">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 bg-white/[0.03] border border-white/5 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-16 text-center mb-10">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
              <p className="text-sm text-red-400 mb-4">{error}</p>
              <button onClick={load} className="text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300">
                Try again
              </button>
            </div>
          ) : servers.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-20 text-center mb-10">
              <Inbox className="w-10 h-10 text-white/15 mx-auto mb-4" />
              <p className="text-sm font-bold text-white/60 mb-1">No servers registered</p>
              <p className="text-xs text-white/30">Register an MCP server to expose external tools to the AI tutor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-6 mb-10">
              {servers.map((server) => {
                const online = (server.status ?? 'offline') === 'online';
                return (
                  <div key={server.id} className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 hover:bg-white/[0.05] transition-all group">
                    <div className="flex items-center justify-between mb-6">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${online ? 'bg-green-500/10 text-green-500' : 'bg-white/5 text-white/20'}`}>
                        <Server className="w-5 h-5" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${online ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {server.status ?? 'offline'}
                        </div>
                        <button
                          onClick={() => setPendingDelete(server)}
                          aria-label={`Remove server ${server.name}`}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg text-white/30 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-lg mb-1">{server.name}</h3>
                    <p className="text-white/40 text-xs font-mono mb-6 truncate">{server.url}</p>

                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                      <div className="flex items-center space-x-2">
                        <Zap className="w-3 h-3 text-indigo-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                          {typeof server.tools === 'number' ? `${server.tools} Tools` : 'Tools'}
                        </span>
                      </div>
                      <button
                        onClick={() => openTools(server)}
                        aria-label={`View tools for ${server.name}`}
                        className="flex items-center space-x-2 px-3 py-1.5 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>View Tools</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <section className="bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-[2.5rem] flex items-center space-x-6">
            <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">MCP Security Gateway</h3>
              <p className="text-indigo-200/60 text-sm">All MCP calls are signed with a per-request Security Context containing tenant and user claims.</p>
            </div>
          </section>
        </div>
      </main>

      {/* Register server modal */}
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
              aria-label="Register MCP server"
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
                <h2 className="text-lg font-bold">Register Server</h2>
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
                  <label htmlFor="mcp-name" className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
                    Name
                  </label>
                  <input
                    id="mcp-name"
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Knowledge Retriever"
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="mcp-url" className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
                    URL
                  </label>
                  <input
                    id="mcp-url"
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://mcp.certingo.io/kb"
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="mcp-category" className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">
                    Category <span className="text-white/20 normal-case">(optional)</span>
                  </label>
                  <input
                    id="mcp-category"
                    type="text"
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    placeholder="Database"
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
                  {submitting ? 'Registering...' : 'Register'}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tools viewer modal */}
      <AnimatePresence>
        {toolsServer && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setToolsServer(null)}
            role="presentation"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`Tools for ${toolsServer.name}`}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold">{toolsServer.name}</h2>
                  <p className="text-xs text-white/40 font-mono">{toolsServer.url}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setToolsServer(null)}
                  aria-label="Close dialog"
                  className="p-2 -m-2 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {toolsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 bg-white/[0.04] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : toolsError ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                  <p className="text-sm text-red-400">{toolsError}</p>
                </div>
              ) : tools.length === 0 ? (
                <div className="text-center py-10">
                  <Inbox className="w-8 h-8 text-white/15 mx-auto mb-3" />
                  <p className="text-sm text-white/40">This server exposes no tools.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tools.map((tool, i) => (
                    <div key={`${tool.name}-${i}`} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                      <div className="flex items-center space-x-2 mb-1">
                        <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-sm font-bold font-mono">{tool.name}</span>
                      </div>
                      {tool.description && (
                        <p className="text-xs text-white/40 leading-relaxed">{tool.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove MCP server?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" will be unregistered. The AI tutor will no longer be able to call its tools.`
            : undefined
        }
        confirmLabel="Remove"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
