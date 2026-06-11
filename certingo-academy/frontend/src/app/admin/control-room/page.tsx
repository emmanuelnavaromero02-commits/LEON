"use client";

import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/Sidebar';
import {
  Activity, Users, Shield, Server, Box, CheckCircle,
  AlertCircle, ArrowUpRight, BarChart3, Clock, Zap
} from 'lucide-react';
import { academyApi } from '@/lib/api';

export default function ControlRoomPage() {
  const [stats, setStats] = useState<any>({
    health: 'healthy',
    tenants: 12,
    active_users: 1450,
    mcp_servers: 3,
    ai_provider: 'Mock / GPT-4o',
    content_drafts: 24,
    questions_pending: 12
  });

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
            <div className="flex space-x-3">
              <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-green-500 uppercase tracking-widest">System Healthy</span>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-4 gap-6 mb-10">
            {[
              { label: 'Total Tenants', value: stats.tenants, icon: Box, color: 'text-blue-400' },
              { label: 'Active Learners', value: stats.active_users, icon: Users, color: 'text-indigo-400' },
              { label: 'MCP Registry', value: `${stats.mcp_servers} Servers`, icon: Server, color: 'text-orange-400' },
              { label: 'AI Provider', value: stats.ai_provider, icon: Zap, color: 'text-yellow-400' },
            ].map((stat, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/5 p-6 rounded-2xl hover:bg-white/[0.05] transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-white/20" />
                </div>
                <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mb-1">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-10">
            <div className="col-span-2 space-y-6">
              <section className="bg-white/[0.03] border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                  <h3 className="font-bold tracking-tight">Recent Audit Events</h3>
                  <button className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300">View All</button>
                </div>
                <div className="divide-y divide-white/5">
                  {[
                    { action: 'content_published', resource: 'Lesson: IAM Basics', user: 'instructor@certingo.demo', time: '2m ago', status: 'success' },
                    { action: 'secret_updated', resource: 'ANTHROPIC_API_KEY', user: 'admin@acme.corp', time: '14m ago', status: 'success' },
                    { action: 'pack_installation_failed', resource: 'SAP BTP Pack', user: 'system', time: '1h ago', status: 'failure' },
                    { action: 'mcp_tool_invoked', resource: 'search_docs', user: 'ai_tutor', time: '2h ago', status: 'success' },
                  ].map((event, i) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-white/[0.01]">
                      <div className="flex items-center space-x-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${event.status === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {event.status === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{event.action}</p>
                          <p className="text-[10px] text-white/30 uppercase tracking-widest">{event.resource}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-white/60">{event.user}</p>
                        <p className="text-[10px] text-white/20 uppercase tracking-widest">{event.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="bg-indigo-600 p-8 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                  <Shield className="w-32 h-32" />
                </div>
                <h3 className="text-xl font-bold mb-2 relative z-10">Quality Gate</h3>
                <p className="text-indigo-100 text-sm mb-6 leading-relaxed relative z-10">
                  AWS Cloud Practitioner pack is currently at 85% readiness. 12 skills need practice questions.
                </p>
                <button className="w-full bg-white text-indigo-600 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-colors relative z-10">
                  Review Quality
                </button>
              </section>

              <section className="bg-white/[0.03] border border-white/5 p-6 rounded-3xl">
                <h3 className="font-bold text-sm mb-6 flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                  <span>Content Pipeline</span>
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                      <span className="text-white/40">Drafts</span>
                      <span>{stats.content_drafts}</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 w-[60%]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                      <span className="text-white/40">Review Pending</span>
                      <span>{stats.questions_pending}</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 w-[30%]" />
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
