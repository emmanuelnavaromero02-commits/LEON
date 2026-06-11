"use client";

import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/Sidebar';
import {
  Key, Shield, Plus, RefreshCw, Trash2, Eye, EyeOff,
  Lock, AlertTriangle
} from 'lucide-react';
import { academyApi } from '@/lib/api';

export default function SecretsPage() {
  const [secrets, setSecrets] = useState<any[]>([
    { id: '1', key: 'OPENAI_API_KEY', masked: 'sk-proj...4f2a', updated: '2 days ago', provider: 'OpenAI' },
    { id: '2', key: 'ANTHROPIC_API_KEY', masked: 'ant-api...9x1z', updated: 'Just now', provider: 'Anthropic' },
    { id: '3', key: 'MCP_SERVER_URL', masked: 'https://mcp.certingo.../api', updated: '1 week ago', provider: 'MCP' },
  ]);

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
            <button className="bg-white text-black px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 hover:bg-gray-200 transition-colors">
              <Plus className="w-4 h-4" />
              <span>Add Secret</span>
            </button>
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
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Last Updated</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {secrets.map((s) => (
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
                      <code className="text-xs font-mono text-white/40 bg-white/5 px-2 py-1 rounded">{s.masked}</code>
                    </td>
                    <td className="px-6 py-5 text-sm text-white/40 font-medium">
                      {s.updated}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end space-x-2">
                        <button className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-all">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-red-500/10 rounded-lg text-white/40 hover:text-red-500 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </main>
    </div>
  );
}
