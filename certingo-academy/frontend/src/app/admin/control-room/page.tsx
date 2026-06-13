"use client";

import { useCallback, useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/Sidebar';
import {
  Activity, Users, Server, Box, CheckCircle,
  AlertCircle, BarChart3, Zap, RefreshCw, Inbox,
} from 'lucide-react';
import { academyApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import type { AuditEvent, SystemStatus } from '@/types/api';

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: typeof Box;
  color: string;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/5 p-6 rounded-2xl hover:bg-white/[0.05] transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function ControlRoomPage() {
  const toast = useToast();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Audit events are a best-effort enrichment; the status drives the page.
      const [statusRes, eventsRes] = await Promise.allSettled([
        academyApi.getSystemStatus(),
        academyApi.getAuditEvents(),
      ]);

      if (statusRes.status === 'fulfilled') {
        setStatus(statusRes.value.data);
      } else {
        throw statusRes.reason;
      }

      if (eventsRes.status === 'fulfilled') {
        setEvents(eventsRes.value.data.slice(0, 5));
      } else {
        setEvents([]);
      }
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to load system status.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const isHealthy = (status?.health ?? '').toLowerCase() === 'healthy';

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-10">
        <div className="max-w-6xl mx-auto">
          <header className="mb-12 flex justify-between items-end">
            <div>
              <div className="flex items-center space-x-2 text-indigo-400 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Operational Console</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Control Room</h1>
            </div>
            <div className="flex items-center space-x-3">
              {status && (
                <div
                  className={`px-4 py-2 rounded-full flex items-center space-x-2 border ${
                    isHealthy
                      ? 'bg-green-500/10 border-green-500/20 text-green-500'
                      : 'bg-orange-500/10 border-orange-500/20 text-orange-500'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full animate-pulse ${isHealthy ? 'bg-green-500' : 'bg-orange-500'}`} />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {status.health ?? 'Unknown'}
                  </span>
                </div>
              )}
              <button
                onClick={load}
                disabled={loading}
                aria-label="Refresh status"
                className="bg-white/[0.03] border border-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </header>

          {loading ? (
            <div className="grid grid-cols-4 gap-6 mb-10">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-white/[0.03] border border-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-16 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
              <p className="text-sm text-red-400 mb-4">{error}</p>
              <button onClick={load} className="text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300">
                Try again
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-6 mb-10">
                <StatCard label="Total Tenants" value={status?.tenants ?? '—'} icon={Box} color="text-blue-400" />
                <StatCard label="Active Learners" value={status?.active_users ?? '—'} icon={Users} color="text-indigo-400" />
                <StatCard
                  label="MCP Registry"
                  value={status?.mcp_servers != null ? `${status.mcp_servers} Servers` : '—'}
                  icon={Server}
                  color="text-orange-400"
                />
                <StatCard label="AI Provider" value={status?.ai_provider ?? '—'} icon={Zap} color="text-yellow-400" />
              </div>

              <div className="grid grid-cols-3 gap-10">
                <div className="col-span-2 space-y-6">
                  <section className="bg-white/[0.03] border border-white/5 rounded-3xl overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                      <h3 className="font-bold tracking-tight">Recent Audit Events</h3>
                    </div>
                    {events.length === 0 ? (
                      <div className="p-12 text-center">
                        <Inbox className="w-8 h-8 text-white/15 mx-auto mb-3" />
                        <p className="text-sm text-white/40">No recent events.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {events.map((event) => {
                          const success = (event.status ?? 'success') !== 'failure';
                          return (
                            <div key={event.id} className="p-4 flex items-center justify-between hover:bg-white/[0.01]">
                              <div className="flex items-center space-x-4">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${success ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                  {success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                </div>
                                <div>
                                  <p className="text-sm font-bold">{event.action}</p>
                                  <p className="text-[10px] text-white/30 uppercase tracking-widest">{event.resource ?? '—'}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-white/60">{event.actor ?? event.user ?? 'system'}</p>
                                {event.created_at && (
                                  <p className="text-[10px] text-white/20 uppercase tracking-widest">{event.created_at}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>

                <div className="space-y-6">
                  <section className="bg-white/[0.03] border border-white/5 p-6 rounded-3xl">
                    <h3 className="font-bold text-sm mb-6 flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-indigo-400" />
                      <span>Content Pipeline</span>
                    </h3>
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                          <span className="text-white/40">Drafts</span>
                          <span>{status?.content_drafts ?? '—'}</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 w-full" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                          <span className="text-white/40">Review Pending</span>
                          <span>{status?.questions_pending ?? '—'}</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 w-full" />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
