"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminSidebar } from '@/components/admin/Sidebar';
import {
  Package, Search, Shield, CheckCircle, RefreshCw, Inbox, AlertCircle,
} from 'lucide-react';
import { academyApi } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/errors';
import type { MarketplacePack } from '@/types/api';

export default function MarketplacePage() {
  const toast = useToast();
  const [packs, setPacks] = useState<MarketplacePack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [installingId, setInstallingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await academyApi.getPacks();
      setPacks(res.data);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to load certification packs.');
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
    if (!q) return packs;
    return packs.filter((pack) =>
      [pack.name, pack.provider, pack.description]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [packs, query]);

  const handleInstall = async (pack: MarketplacePack) => {
    setInstallingId(pack.id);
    try {
      await academyApi.importPack(pack.id);
      toast.success(`${pack.name} installed.`);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, `Could not install ${pack.name}.`));
    } finally {
      setInstallingId(null);
    }
  };

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
            <button
              onClick={load}
              disabled={loading}
              aria-label="Refresh packs"
              className="bg-white/[0.03] border border-white/5 p-3 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </header>

          <div className="flex items-center space-x-4 mb-10">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search providers or certifications..."
                aria-label="Search certification packs"
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-56 bg-white/[0.03] border border-white/5 rounded-[2rem] animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-16 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
              <p className="text-sm text-red-400 mb-4">{error}</p>
              <button onClick={load} className="text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300">
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-20 text-center">
              <Inbox className="w-10 h-10 text-white/15 mx-auto mb-4" />
              <p className="text-sm font-bold text-white/60 mb-1">
                {packs.length === 0 ? 'No packs available' : 'No matching packs'}
              </p>
              <p className="text-xs text-white/30">
                {packs.length === 0 ? 'Certification packs will appear here once published.' : 'Try a different search term.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {filtered.map((pack) => {
                const installed = pack.status === 'installed';
                return (
                  <div key={pack.id} className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-8 hover:bg-white/[0.05] transition-all group relative overflow-hidden">
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-white/10 transition-colors">
                          <span className="text-xl font-black">{(pack.provider?.[0] ?? '?').toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{pack.provider}</span>
                            {pack.version && (
                              <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded-full text-white/60">v{pack.version}</span>
                            )}
                          </div>
                          <h3 className="font-bold text-xl">{pack.name}</h3>
                        </div>
                      </div>
                      {installed ? (
                        <div className="bg-green-500/10 text-green-500 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center space-x-2 border border-green-500/20">
                          <CheckCircle className="w-3 h-3" />
                          <span>Installed</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleInstall(pack)}
                          disabled={installingId === pack.id}
                          className="bg-white text-black px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center space-x-2"
                        >
                          {installingId === pack.id && <RefreshCw className="w-3 h-3 animate-spin" />}
                          <span>{installingId === pack.id ? 'Installing' : 'Install'}</span>
                        </button>
                      )}
                    </div>

                    {pack.description && (
                      <p className="text-white/40 text-sm leading-relaxed mb-8">{pack.description}</p>
                    )}

                    <div className="flex items-center space-x-6 pt-6 border-t border-white/5">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold">Official Guide</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
