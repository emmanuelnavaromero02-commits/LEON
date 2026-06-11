"use client";

import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/Sidebar';
import {
  Package, Download, Search, Globe, Shield, Star,
  CheckCircle, Plus, LayoutGrid, List
} from 'lucide-react';
import { academyApi } from '@/lib/api';

export default function MarketplacePage() {
  const [packs, setPacks] = useState<any[]>([
    { id: 'aws-cloud-practitioner', name: 'AWS Cloud Practitioner', provider: 'AWS', version: '2024.1', status: 'installed', description: 'Foundational cloud concepts and security model.' },
    { id: 'azure-fundamentals', name: 'Azure Fundamentals (AZ-900)', provider: 'Microsoft', version: '2023.4', status: 'available', description: 'Core Azure services and governance.' },
    { id: 'google-cloud-digital', name: 'Google Cloud Digital Leader', provider: 'Google', version: '2024.1', status: 'available', description: 'Cloud transformation and GCP services.' },
    { id: 'sap-btp-foundations', name: 'SAP BTP Fundamentals', provider: 'SAP', version: '1.2', status: 'available', description: 'Integration and extension on SAP BTP.' },
  ]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-10">
        <div className="max-w-6xl mx-auto">
          <header className="mb-12 flex justify-between items-end">
            <div>
              <div className="flex items-center space-x-2 text-indigo-400 mb-2">
                <Package className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Certification Marketplace</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Certification Packs</h1>
            </div>
            <button className="bg-white/5 border border-white/10 px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 hover:bg-white/10 transition-colors">
              <Plus className="w-4 h-4" />
              <span>Import Custom Pack</span>
            </button>
          </header>

          <div className="flex items-center space-x-4 mb-10">
             <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="text"
                  placeholder="Search providers or certifications..."
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
             </div>
             <div className="bg-white/[0.03] border border-white/5 p-1 rounded-xl flex">
                <button className="p-2.5 bg-white/10 rounded-lg"><LayoutGrid className="w-4 h-4" /></button>
                <button className="p-2.5 text-white/20 hover:text-white"><List className="w-4 h-4" /></button>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {packs.map((pack) => (
              <div key={pack.id} className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-8 hover:bg-white/[0.05] transition-all group relative overflow-hidden">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-white/10 transition-colors">
                       <span className="text-xl font-black">{pack.provider[0]}</span>
                    </div>
                    <div>
                       <div className="flex items-center space-x-2 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{pack.provider}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded-full text-white/60">v{pack.version}</span>
                       </div>
                       <h3 className="font-bold text-xl">{pack.name}</h3>
                    </div>
                  </div>
                  {pack.status === 'installed' ? (
                    <div className="bg-green-500/10 text-green-500 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center space-x-2 border border-green-500/20">
                      <CheckCircle className="w-3 h-3" />
                      <span>Installed</span>
                    </div>
                  ) : (
                    <button className="bg-white text-black px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors">
                      Install
                    </button>
                  )}
                </div>

                <p className="text-white/40 text-sm leading-relaxed mb-8">
                  {pack.description}
                </p>

                <div className="flex items-center space-x-6 pt-6 border-t border-white/5">
                   <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold">Official Guide</span>
                   </div>
                   <div className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-bold text-white/60">4.9 (1.2k)</span>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
