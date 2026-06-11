"use client";

import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/Sidebar';
import {
  Cpu, Plus, Globe, Shield, Activity, Terminal,
  RefreshCw, Power, Server, Zap
} from 'lucide-react';
import { academyApi } from '@/lib/api';

export default function MCPRegistryPage() {
  const [servers, setServers] = useState<any[]>([
    { id: '1', name: 'Knowledge Retreiver', url: 'https://mcp.certingo.io/kb', status: 'online', tools: 12, category: 'Database' },
    { id: '2', name: 'Exam Simulator V2', url: 'https://mcp.certingo.io/exams', status: 'online', tools: 4, category: 'Generation' },
    { id: '3', name: 'Legacy PDF Parser', url: 'http://localhost:8080', status: 'offline', tools: 0, category: 'Import' },
  ]);

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
            <button className="bg-white text-black px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 hover:bg-gray-200 transition-colors">
              <Plus className="w-4 h-4" />
              <span>Register Server</span>
            </button>
          </header>

          <div className="grid grid-cols-3 gap-6 mb-10">
            {servers.map((server) => (
              <div key={server.id} className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 hover:bg-white/[0.05] transition-all group">
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${server.status === 'online' ? 'bg-green-500/10 text-green-500' : 'bg-white/5 text-white/20'}`}>
                    <Server className="w-5 h-5" />
                  </div>
                  <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${server.status === 'online' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {server.status}
                  </div>
                </div>

                <h3 className="font-bold text-lg mb-1">{server.name}</h3>
                <p className="text-white/40 text-xs font-mono mb-6 truncate">{server.url}</p>

                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{server.tools} Tools</span>
                  </div>
                  <button className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-all">
                    <Activity className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <section className="bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-[2.5rem] flex items-center justify-between">
             <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                   <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                   <h3 className="text-xl font-bold mb-1">MCP Security Gateway</h3>
                   <p className="text-indigo-200/60 text-sm">All MCP calls are signed with a per-request Security Context containing tenant and user claims.</p>
                </div>
             </div>
             <button className="bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-400 transition-colors">
                Configure Policies
             </button>
          </section>
        </div>
      </main>
    </div>
  );
}
