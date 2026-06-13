"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminSidebar } from '@/components/admin/Sidebar';
import {
  History, Search, Download, RefreshCw, Inbox, AlertCircle,
} from 'lucide-react';
import { academyApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import type { AuditEvent } from '@/types/api';

const CSV_COLUMNS: { header: string; pick: (e: AuditEvent) => unknown }[] = [
  { header: 'id', pick: (e) => e.id },
  { header: 'action', pick: (e) => e.action },
  { header: 'actor', pick: (e) => e.actor ?? e.user },
  { header: 'resource', pick: (e) => e.resource },
  { header: 'status', pick: (e) => e.status },
  { header: 'ip_address', pick: (e) => e.ip_address ?? e.ip },
  { header: 'request_id', pick: (e) => e.request_id },
  { header: 'created_at', pick: (e) => e.created_at },
];

/** RFC-4180-ish escaping: wrap in quotes and double any embedded quote. */
function csvCell(value: unknown): string {
  const str = value == null ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function buildCsv(events: AuditEvent[]): string {
  const header = CSV_COLUMNS.map((c) => csvCell(c.header)).join(',');
  const rows = events.map((e) => CSV_COLUMNS.map((c) => csvCell(c.pick(e))).join(','));
  return [header, ...rows].join('\r\n');
}

export default function AuditLogPage() {
  const toast = useToast();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await academyApi.getAuditEvents();
      setEvents(res.data);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to load audit events.');
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
    if (!q) return events;
    return events.filter((e) =>
      [e.action, e.actor, e.user, e.resource, e.request_id, e.ip_address, e.ip, e.status]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [events, query]);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.info('There are no events to export.');
      return;
    }
    try {
      const csv = buildCsv(filtered);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `audit-events-${stamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${filtered.length} event${filtered.length === 1 ? '' : 's'}.`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not export the CSV.'));
    }
  };

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
            <div className="flex items-center space-x-2">
              <button
                onClick={load}
                disabled={loading}
                aria-label="Refresh events"
                className="bg-white/[0.03] border border-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleExport}
                className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-xs font-bold hover:bg-white/10 transition-colors flex items-center space-x-2"
              >
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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by action, user, or request ID..."
                aria-label="Filter audit events"
                className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
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
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-6 py-4">
                          <div className="h-4 bg-white/[0.04] rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                        <p className="text-sm text-red-400 mb-4">{error}</p>
                        <button onClick={load} className="text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300">
                          Try again
                        </button>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center">
                        <Inbox className="w-10 h-10 text-white/15 mx-auto mb-4" />
                        <p className="text-sm font-bold text-white/60 mb-1">
                          {events.length === 0 ? 'No audit events yet' : 'No matching events'}
                        </p>
                        <p className="text-xs text-white/30">
                          {events.length === 0 ? 'Activity across the platform will be recorded here.' : 'Try a different filter.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((log) => {
                      const success = (log.status ?? 'success') !== 'failure';
                      return (
                        <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${success ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className="text-sm font-bold">{log.action}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-white/60">{log.actor ?? log.user ?? '—'}</td>
                          <td className="px-6 py-4 text-xs font-mono text-white/40">{log.resource ?? '—'}</td>
                          <td className="px-6 py-4 text-[10px] font-mono text-white/20">{log.request_id ?? '—'}</td>
                          <td className="px-6 py-4 text-xs text-white/40">{log.created_at ?? '—'}</td>
                          <td className="px-6 py-4 text-xs font-mono text-white/20">{log.ip_address ?? log.ip ?? '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
