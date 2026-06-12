"use client";

import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/Sidebar';
import { History, Search, Download } from 'lucide-react';
import { academyApi } from '@/lib/api';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await academyApi.getAuditEvents();
        setLogs(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchLogs();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
    </div>
  );

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
          </header>

          <section className="bg-white/[0.03] border border-white/5 rounded-3xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Action</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">User ID</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Resource</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.01]">
                    <td className="px-6 py-4">
                       <span className="text-sm font-bold">{log.action}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-white/60">{log.user_id}</td>
                    <td className="px-6 py-4 text-xs font-mono text-white/40 uppercase">{log.resource_type}</td>
                    <td className="px-6 py-4 text-xs text-white/40">{new Date(log.created_at).toLocaleString()}</td>
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
