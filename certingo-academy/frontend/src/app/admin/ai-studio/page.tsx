"use client";

import { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/Sidebar';
import {
  Zap, Play, Save, History, Search, Cpu, RefreshCw,
  MessageSquare, Layout, FileText, CheckCircle,
  Settings, Layers, Sliders
} from 'lucide-react';
import { academyApi } from '@/lib/api';

export default function AIStudioPage() {
  const [provider, setProvider] = useState('Mock Provider (Claude 3.5 Sonnet)');
  const [prompt, setPrompt] = useState('Generate a lesson about Shared Responsibility Model for a business profile student...');
  const [output, setOutput] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testGeneration = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setOutput({
        title: "Shared Responsibility in Cloud",
        analogy: "Like a rented apartment...",
        question: "Who is responsible for data encryption?",
        correct_answer: "The Customer"
      });
      setLoading(false);
    }, 1500);
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
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Prompt Engineering & LLM Lab</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">AI Studio</h1>
            </div>
            <div className="flex items-center space-x-4 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
               <Cpu className="w-4 h-4 text-white/40" />
               <span className="text-xs font-bold text-white/60">{provider}</span>
               <div className="w-2 h-2 bg-green-500 rounded-full" />
            </div>
          </header>

          <div className="grid grid-cols-2 gap-10">
            <div className="space-y-6">
               <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-8">
                  <div className="flex items-center justify-between mb-6">
                     <h3 className="font-bold flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-indigo-400" />
                        <span>Prompt Sandbox</span>
                     </h3>
                     <div className="flex space-x-2">
                        <button className="p-2 hover:bg-white/5 rounded-lg text-white/40"><History className="w-4 h-4" /></button>
                        <button className="p-2 hover:bg-white/5 rounded-lg text-white/40"><Settings className="w-4 h-4" /></button>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Target Skill</label>
                        <select className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none">
                           <option>Shared Responsibility Model</option>
                           <option>IAM Basics</option>
                           <option>VPC Fundamentals</option>
                        </select>
                     </div>

                     <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Template</label>
                        <div className="grid grid-cols-3 gap-2">
                           {['Lesson', 'Question', 'Feedback'].map(t => (
                              <button key={t} className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${t === 'Lesson' ? 'bg-white text-black border-white' : 'border-white/10 text-white/40 hover:border-white/20'}`}>
                                 {t}
                              </button>
                           ))}
                        </div>
                     </div>

                     <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Instructions Override</label>
                        <textarea
                           className="w-full h-48 bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                           value={prompt}
                           onChange={(e) => setPrompt(e.target.value)}
                        />
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
               <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-8 min-h-[500px] flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                     <h3 className="font-bold flex items-center space-x-2">
                        <Layout className="w-4 h-4 text-green-400" />
                        <span>Structured Output</span>
                     </h3>
                     {output && (
                        <button className="flex items-center space-x-2 bg-green-500/10 text-green-500 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-green-500/20">
                           <Save className="w-3 h-3" />
                           <span>Save as Draft</span>
                        </button>
                     )}
                  </div>

                  {!output && !loading ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20">
                        <Zap className="w-12 h-12 mb-4" />
                        <p className="text-sm font-medium">Run a generation to see the preview</p>
                     </div>
                  ) : loading ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <RefreshCw className="w-8 h-8 mb-4 animate-spin text-indigo-500" />
                        <p className="text-sm font-medium text-white/40 tracking-widest uppercase">Thinking...</p>
                     </div>
                  ) : (
                     <div className="flex-1 space-y-6">
                        <div className="bg-black/40 rounded-2xl p-4 font-mono text-[11px] overflow-auto max-h-[300px] border border-white/5">
                           <pre className="text-green-400">{JSON.stringify(output, null, 2)}</pre>
                        </div>

                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20">Visual Preview</h4>
                           <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                              <h2 className="text-xl font-bold mb-4">{output.title}</h2>
                              <p className="text-sm text-white/60 mb-6 italic">"{output.analogy}"</p>
                              <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                 <p className="text-xs font-bold text-white/40 mb-2 uppercase tracking-widest">Interactive Question</p>
                                 <p className="text-sm font-medium">{output.question}</p>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}
               </div>

               <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-3xl flex items-start space-x-4">
                  <div className="p-3 bg-indigo-500 rounded-xl">
                     <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                     <h4 className="font-bold text-sm mb-1 text-indigo-300">RAG Context Used</h4>
                     <p className="text-indigo-200/40 text-xs">Retrieved 4 chunks from "Shared Responsibility Model" document.</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
