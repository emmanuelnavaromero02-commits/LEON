"use client";

import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/Sidebar';
import {
  History, Filter, Search, Download, Clock, User,
  Globe, Terminal, Shield
} from 'lucide-react';
import { academyApi } from '@/lib/api';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([
    { id: '1', action: 'diagnostic_completed', user: 'student@certingo.demo', resource: 'Exam: Diagnostic', status: 'success', time: '5m ago', ip: '192.168.1.45', rid: 'req_8f2x' },
    { id: '2', action: 'secret_updated', user: 'superadmin@certingo.demo', resource: 'Secret: OPENAI_KEY', status: 'success', time: '12m ago', ip: '10.0.0.8', rid: 'req_9a1z' },
    { id: '3', action: 'content_generated', user: 'ai_tutor', resource: 'Lesson: VPC Peering', status: 'success', time: '1h ago', ip: 'internal', rid: 'req_0p4k' },
    { id: '4', action: 'login_failure', user: 'unknown@hacker.io', resource: 'Session', status: 'failure', time: '2h ago', ip: '45.12.89.2', rid: 'req_x882' },
  ]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-10">
        <div className="max-w-6xl mx-auto">
          <header className="mb-12 flex justify-between items-end">
            <div>
              <div className="flex items-center space-x-2 text-blue-400 mb-2">
                <History className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Compliance & Governance</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Audit Log</h1>
            </div>
            <div className="flex space-x-2">
              <button className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/10 transition-colors flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </header>

          <div className="flex items-center space-x-4 mb-6">
             <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  placeholder="Filter by action, user, or request ID..."
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
             </div>
             <button className="bg-white/[0.03] border border-white/5 p-3 rounded-xl hover:bg-white/10">
                <Filter className="w-4 h-4" />
             </button>
          </div>

          <section className="bg-white/[0.03] border border-white/5 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Action</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">User</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Resource</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Request ID</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Time</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                           <div className={`w-1.5 h-1.5 rounded-full ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                           <span className="text-sm font-bold">{log.action}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-white/60">{log.user}</td>
                      <td className="px-6 py-4 text-xs font-mono text-white/40 uppercase">{log.resource}</td>
                      <td className="px-6 py-4 text-[10px] font-mono text-white/20">{log.rid}</td>
                      <td className="px-6 py-4 text-xs text-white/40">{log.time}</td>
                      <td className="px-6 py-4 text-xs font-mono text-white/20">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
