"use client";
import Link from "next/link";

import React from 'react';

import { usePathname } from 'next/navigation';
import {
  Activity, Layout, ShoppingCart, BookOpen, Layers,
  Database, Zap, Cpu, Key, History, Settings, ChevronRight,
  Menu, X, LogOut
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const ADMIN_NAV = [
  { group: 'Operations', items: [
    { icon: Activity, label: 'Control Room', href: '/admin/control-room' },
    { icon: ShoppingCart, label: 'Marketplace', href: '/admin/marketplace' },
  ]},
  { group: 'Content Studio', items: [
    { icon: Layers, label: 'Certifications', href: '/admin/certifications' },
    { icon: BookOpen, label: 'Editor', href: '/admin/content-studio' },
    { icon: Database, label: 'Knowledge Base', href: '/admin/knowledge-base' },
  ]},
  { group: 'AI & Intelligence', items: [
    { icon: Zap, label: 'AI Studio', href: '/admin/ai-studio' },
    { icon: Cpu, label: 'MCP Registry', href: '/admin/mcp' },
  ]},
  { group: 'Infrastructure', items: [
    { icon: Key, label: 'Secrets / Vault', href: '/admin/secrets' },
    { icon: History, label: 'Audit Log', href: '/admin/audit' },
    { icon: Settings, label: 'Tenant Settings', href: '/admin/settings' },
  ]}
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'AD';

  return (
    <aside className="w-64 bg-[#0A0A0A] border-r border-white/5 flex flex-col h-screen fixed">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-black font-black text-sm">C</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-tight">Certingo</p>
            <p className="text-white/40 text-[10px] uppercase font-black tracking-widest">Admin Console</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-8">
        {ADMIN_NAV.map((group, idx) => (
          <div key={idx} className="space-y-2">
            <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
              {group.group}
            </h3>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                      active
                        ? 'bg-white/10 text-white'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'group-hover:text-white'}`} />
                      <span>{item.label}</span>
                    </div>
                    {active && <div className="w-1 h-1 bg-indigo-400 rounded-full" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="bg-white/5 p-4 rounded-xl flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-500/20 border border-indigo-500/30 rounded-full flex items-center justify-center shrink-0">
            <span className="text-indigo-400 font-bold text-xs">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{user?.full_name ?? 'Admin'}</p>
            <p className="text-[10px] text-white/30 truncate">{user?.email ?? ''}</p>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
