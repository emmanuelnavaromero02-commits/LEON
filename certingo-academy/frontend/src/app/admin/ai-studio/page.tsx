"use client";

import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/Sidebar';
import {
  Zap, Play, Save, History, Search, Cpu,
  MessageSquare, Layout, FileText, CheckCircle,
  Settings, Layers, Sliders, RefreshCw
} from 'lucide-react';
import { academyApi } from '@/lib/api';

export default function AIStudioPage() {
  const [provider, setProvider] = useState('Mock Provider (GPT-4o)');
  const [skillId, setSkillId] = useState('shared-responsibility');
  const [promptType, setPromptType] = useState('lesson');
  const [output, setOutput] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testGeneration = async () => {
    setLoading(true);
    try {
      const res = await academyApi.testAIGeneration({
        tenant_id: 'default-demo-tenant',
        skill_id: skillId,
        prompt_type: promptType
      });
      setOutput(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-10">
        <div className="max-w-6xl mx-auto">
          <header className="mb-12 flex justify-between items-end">
            <div>
              <div className="flex items-center space-x-2 text-yellow-400 mb-2">
                <Zap className="w-4 h-4 fill-yellow-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">LLM Lab</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">AI Studio</h1>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-10">
            <div className="space-y-6">
               <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-8">
                  <div className="space-y-6">
                     <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Target Skill ID</label>
                        <input
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={skillId}
                          onChange={(e) => setSkillId(e.target.value)}
                        />
                     </div>

                     <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Output Type</label>
                        <div className="grid grid-cols-2 gap-2">
                           {['lesson', 'question'].map(t => (
                              <button
                                key={t}
                                onClick={() => setPromptType(t)}
                                className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${promptType === t ? 'bg-white text-black border-white' : 'border-white/10 text-white/40 hover:border-white/20'}`}
                              >
                                 {t}
                              </button>
                           ))}
                        </div>
                     </div>

                     <button
                        onClick={testGeneration}
                        disabled={loading}
                        className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center space-x-3 transition-all"
                     >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                        <span>Run Generation</span>
                     </button>
                  </div>
               </div>
            </div>

            <div className="space-y-6">
               <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-8 min-h-[400px] flex flex-col">
                  <h3 className="font-bold mb-6 text-green-400 uppercase text-[10px] tracking-widest">Structured JSON Result</h3>
                  {output ? (
                     <pre className="text-green-400 text-[10px] font-mono overflow-auto flex-1">{JSON.stringify(output, null, 2)}</pre>
                  ) : (
                     <div className="flex-1 flex items-center justify-center text-white/20 italic">No output yet</div>
                  )}
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
