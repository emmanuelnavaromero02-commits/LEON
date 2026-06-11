"use client";

import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/Sidebar';
import {
  Database, FileText, Upload, Plus, Search,
  Tag, Filter, MoreVertical, ExternalLink, RefreshCw,
  Box
} from 'lucide-react';
import { academyApi } from '@/lib/api';

export default function KnowledgeBasePage() {
  const [docs, setDocs] = useState<any[]>([
    { id: '1', title: 'Shared Responsibility Model', cert: 'AWS Cloud Practitioner', chunks: 14, status: 'synced', updated: '2h ago' },
    { id: '2', title: 'IAM Policies Deep Dive', cert: 'AWS Solutions Architect', chunks: 32, status: 'synced', updated: 'Yesterday' },
    { id: '3', title: 'VPC Peering Fundamentals', cert: 'AWS Cloud Practitioner', chunks: 8, status: 'draft', updated: '3 days ago' },
    { id: '4', title: 'SAP BTP Security Overview', cert: 'SAP BTP Fundamentals', chunks: 0, status: 'processing', updated: 'Just now' },
  ]);

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
            <div className="flex space-x-3">
              <button className="bg-white/5 border border-white/10 px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 hover:bg-white/10 transition-colors">
                <Upload className="w-4 h-4" />
                <span>Upload PDF/MD</span>
              </button>
              <button className="bg-white text-black px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 hover:bg-gray-200 transition-colors">
                <Plus className="w-4 h-4" />
                <span>Add Document</span>
              </button>
            </div>
          </header>

          <div className="grid grid-cols-4 gap-6 mb-10">
             <div className="bg-white/[0.03] border border-white/5 p-6 rounded-2xl">
                <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-1">Total Chunks</p>
                <p className="text-2xl font-bold">1,420</p>
             </div>
             <div className="bg-white/[0.03] border border-white/5 p-6 rounded-2xl">
                <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-1">Indexed Docs</p>
                <p className="text-2xl font-bold">54</p>
             </div>
             <div className="bg-white/[0.03] border border-white/5 p-6 rounded-2xl">
                <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-1">RAG Latency</p>
                <p className="text-2xl font-bold text-green-400">42ms</p>
             </div>
             <div className="bg-white/[0.03] border border-white/5 p-6 rounded-2xl">
                <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-1">Embeddings</p>
                <p className="text-2xl font-bold text-indigo-400">OpenAI-v3</p>
             </div>
          </div>

          <div className="flex items-center space-x-4 mb-6">
             <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  placeholder="Search Knowledge Base..."
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
             </div>
          </div>

          <section className="bg-white/[0.03] border border-white/5 rounded-3xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Document</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Certification</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Chunks</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Updated</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {docs.map((doc) => (
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
                       <span className="text-xs px-2 py-1 bg-white/5 rounded text-white/60">{doc.cert}</span>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center space-x-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${doc.status === 'synced' ? 'bg-green-500' : doc.status === 'processing' ? 'bg-yellow-500 animate-pulse' : 'bg-white/20'}`} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{doc.status}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-white/60">{doc.chunks}</td>
                    <td className="px-6 py-4 text-xs text-white/40">{doc.updated}</td>
                    <td className="px-6 py-4 text-right">
                       <button className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white">
                          <MoreVertical className="w-4 h-4" />
                       </button>
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
