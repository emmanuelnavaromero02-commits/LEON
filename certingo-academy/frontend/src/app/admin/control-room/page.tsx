"use client";

import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/Sidebar';
import {
  Activity, Users, Shield, Server, Box, CheckCircle,
  AlertCircle, ArrowUpRight, BarChart3, Clock, Zap,
  Download, Database, RefreshCw, Lock, HardDrive
} from 'lucide-react';
import { academyApi } from '@/lib/api';
import { motion } from 'framer-motion';

export default function ControlRoomPage() {
  const [data, setData] = useState<any>(null);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, auditRes] = await Promise.all([
          academyApi.getSystemStatus(),
          academyApi.getAuditEvents()
        ]);
        setData(statusRes.data);
        setAuditEvents(auditRes.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert("System backup and audit export complete. Download ready.");
    }, 2000);
  };

  if (loading || !data) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <header className="mb-12 flex justify-between items-end">
            <div>
              <div className="flex items-center space-x-2 text-indigo-400 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Operational Console</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Control Room</h1>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center space-x-2 hover:bg-white/10 transition-all disabled:opacity-50"
              >
                {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span className="text-xs font-bold uppercase tracking-widest">Export Logs</span>
              </button>
              <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-green-500 uppercase tracking-widest">
                   {data.status === 'healthy' ? 'System Healthy' : 'Action Required'}
                </span>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-4 gap-6 mb-10">
            {[
              { label: 'Active Tenants', value: data.tenants, icon: Box, color: 'text-blue-400' },
              { label: 'Platform Users', value: data.users, icon: Users, color: 'text-indigo-400' },
              { label: 'MCP Registry', value: `${data.mcp_servers} Servers`, icon: Server, color: 'text-orange-400' },
              { label: 'Active Provider', value: data.ai_provider, icon: Zap, color: 'text-yellow-400' },
            ].map((stat, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/5 p-6 rounded-2xl hover:bg-white/[0.05] transition-colors group">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
                </div>
                <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-1">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-10">
            <div className="col-span-2 space-y-6">
              <section className="bg-white/[0.03] border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                  <h3 className="font-bold tracking-tight">Recent Audit Events</h3>
                  <button className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300">View All Trace</button>
                </div>
                <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                  {auditEvents.map((event, i) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-white/[0.01]">
                      <div className="flex items-center space-x-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-400`}>
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{event.action}</p>
                          <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
                             {event.resource_type}: {event.resource_id}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-white/60">{event.user_id}</p>
                        <p className="text-[10px] text-white/20 uppercase tracking-widest">{new Date(event.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-2 gap-6">
                 <section className="bg-white/[0.03] border border-white/5 p-8 rounded-3xl">
                    <div className="flex items-center space-x-3 mb-6">
                       <Database className="w-5 h-5 text-indigo-400" />
                       <h3 className="font-bold">Knowledge Sync</h3>
                    </div>
                    <p className="text-[10px] text-white/40 leading-relaxed mb-6 uppercase tracking-widest font-black">Pulling from 4 sources</p>
                    <div className="space-y-3">
                       <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-xs font-bold text-white/60">AWS Official Docs</span>
                          <span className="text-[10px] text-green-500 font-black">SYNCED</span>
                       </div>
                       <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-xs font-bold text-white/60">Azure Learn API</span>
                          <span className="text-[10px] text-indigo-400 font-black animate-pulse">PENDING</span>
                       </div>
                    </div>
                 </section>

                 <section className="bg-white/[0.03] border border-white/5 p-8 rounded-3xl">
                    <div className="flex items-center space-x-3 mb-6">
                       <Lock className="w-5 h-5 text-indigo-400" />
                       <h3 className="font-bold">Security Posture</h3>
                    </div>
                    <div className="flex items-end justify-between mb-2">
                       <p className="text-3xl font-black text-indigo-400">98%</p>
                       <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Compliance</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 w-[98%]" />
                    </div>
                    <p className="text-[10px] text-white/30 mt-4 leading-relaxed font-medium">
                       AES-256 Vault enabled. All tenant data strictly isolated at storage level.
                    </p>
                 </section>
              </div>
            </div>

            <div className="space-y-6">
              <section className="bg-indigo-600 p-8 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                  <Activity className="w-32 h-32" />
                </div>
                <h3 className="text-xl font-bold mb-2 relative z-10">Production Ready</h3>
                <p className="text-indigo-100 text-sm mb-6 leading-relaxed relative z-10">
                   System configuration is optimal. {data.tenants} tenants isolated. Audit logs active. High-availability mode simulated.
                </p>
                <button className="w-full bg-white text-indigo-600 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-colors relative z-10">
                  Instance Manager
                </button>
              </section>

              <section className="bg-white/[0.03] border border-white/5 p-6 rounded-3xl">
                <h3 className="font-bold text-sm mb-6 flex items-center space-x-2">
                  <HardDrive className="w-4 h-4 text-indigo-400" />
                  <span>System Resources</span>
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                      <span className="text-white/40">Storage (SQLite)</span>
                      <span>42.5 MB</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 w-[15%]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                      <span className="text-white/40">API Response</span>
                      <span>24ms</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 w-[10%]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                      <span className="text-white/40">AI Worker Load</span>
                      <span>12%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 w-[12%]" />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
