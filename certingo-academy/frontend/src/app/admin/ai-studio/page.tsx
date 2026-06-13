"use client";

import { useState } from 'react';
import { AdminSidebar } from '@/components/admin/Sidebar';
import {
  Zap, Play, Save, History, Cpu, RefreshCw,
  MessageSquare, Layout, FileText, AlertTriangle,
  Settings
} from 'lucide-react';
import { academyApi } from '@/lib/api';

const SKILLS = [
  { id: 'shared-responsibility-model', name: 'Shared Responsibility Model' },
  { id: 'iam-basics', name: 'IAM Basics' },
  { id: 'vpc-fundamentals', name: 'VPC Fundamentals' },
];

type PromptType = 'lesson' | 'question';
const TEMPLATES: { id: PromptType; label: string }[] = [
  { id: 'lesson', label: 'Lesson' },
  { id: 'question', label: 'Question' },
];

const PROVIDER_LABELS: Record<string, string> = {
  mock: 'Mock Provider',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
};

export default function AIStudioPage() {
  const [skillId, setSkillId] = useState(SKILLS[0].id);
  const [promptType, setPromptType] = useState<PromptType>('lesson');
  const [prompt, setPrompt] = useState('Generate a lesson about Shared Responsibility Model for a business profile student...');
  const [provider, setProvider] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [output, setOutput] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const providerLabel = provider
    ? `${PROVIDER_LABELS[provider] ?? provider}${model ? ` (${model})` : ''}`
    : 'No generation run yet';

  const testGeneration = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await academyApi.testAIGeneration({ skill_id: skillId, prompt_type: promptType });
      setOutput(res.data.output);
      setProvider(res.data.provider ?? null);
      setModel(res.data.model ?? null);
    } catch (err: any) {
      setOutput(null);
      setProvider(null);
      setModel(null);
      setError(err?.response?.data?.detail || err?.message || 'Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isLesson = output && typeof output.title === 'string';
  const isQuestionOnly = output && !output.title && typeof output.prompt === 'string';
  const isInsufficientContext = output?.status === 'insufficient_context';

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
               <span className="text-xs font-bold text-white/60">{providerLabel}</span>
               <div className={`w-2 h-2 rounded-full ${provider ? 'bg-green-500' : 'bg-white/20'}`} />
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
                        <select
                           value={skillId}
                           onChange={(e) => setSkillId(e.target.value)}
                           className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none"
                        >
                           {SKILLS.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                           ))}
                        </select>
                     </div>

                     <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-white/20 mb-2">Template</label>
                        <div className="grid grid-cols-3 gap-2">
                           {TEMPLATES.map(t => (
                              <button
                                 key={t.id}
                                 onClick={() => setPromptType(t.id)}
                                 className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${promptType === t.id ? 'bg-white text-black border-white' : 'border-white/10 text-white/40 hover:border-white/20'}`}
                              >
                                 {t.label}
                              </button>
                           ))}
                           <button
                              disabled
                              title="Not supported by the test endpoint yet"
                              className="py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/5 text-white/15 cursor-not-allowed"
                           >
                              Feedback
                           </button>
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
                        <span>{loading ? 'Generating...' : 'Run Generation'}</span>
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
                     {output && !loading && (
                        <button className="flex items-center space-x-2 bg-green-500/10 text-green-500 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-green-500/20">
                           <Save className="w-3 h-3" />
                           <span>Save as Draft</span>
                        </button>
                     )}
                  </div>

                  {loading ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <RefreshCw className="w-8 h-8 mb-4 animate-spin text-indigo-500" />
                        <p className="text-sm font-medium text-white/40 tracking-widest uppercase">Thinking...</p>
                     </div>
                  ) : error ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 max-w-sm">
                           <AlertTriangle className="w-8 h-8 mb-3 text-red-400 mx-auto" />
                           <p className="text-xs font-black uppercase tracking-widest text-red-400 mb-2">Generation Failed</p>
                           <p className="text-sm text-red-200/60">{error}</p>
                        </div>
                     </div>
                  ) : !output ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20">
                        <Zap className="w-12 h-12 mb-4" />
                        <p className="text-sm font-medium">Run a generation to see the preview</p>
                     </div>
                  ) : (
                     <div className="flex-1 space-y-6">
                        {provider && (
                           <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-white/30">
                              <Cpu className="w-3 h-3" />
                              <span>Answered by {providerLabel}</span>
                           </div>
                        )}

                        <div className="bg-black/40 rounded-2xl p-4 font-mono text-[11px] overflow-auto max-h-[300px] border border-white/5">
                           <pre className="text-green-400">{JSON.stringify(output, null, 2)}</pre>
                        </div>

                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20">Visual Preview</h4>
                           {isInsufficientContext ? (
                              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6">
                                 <p className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-widest">Insufficient Context</p>
                                 <p className="text-sm text-amber-100/60">{output.message}</p>
                              </div>
                           ) : isLesson ? (
                              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                                 <h2 className="text-xl font-bold mb-4">{output.title}</h2>
                                 {output.analogy && (
                                    <p className="text-sm text-white/60 mb-6 italic">"{output.analogy}"</p>
                                 )}
                                 {output.question?.prompt && (
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                       <p className="text-xs font-bold text-white/40 mb-2 uppercase tracking-widest">Interactive Question</p>
                                       <p className="text-sm font-medium mb-3">{output.question.prompt}</p>
                                       <div className="space-y-1.5">
                                          {(output.question.options ?? []).map((opt: string) => (
                                             <p key={opt} className="text-xs text-white/50 px-3 py-1.5 bg-white/[0.03] rounded-lg border border-white/5">{opt}</p>
                                          ))}
                                       </div>
                                    </div>
                                 )}
                              </div>
                           ) : isQuestionOnly ? (
                              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                                 <p className="text-xs font-bold text-white/40 mb-2 uppercase tracking-widest">Generated Question ({output.difficulty})</p>
                                 <p className="text-sm font-medium mb-3">{output.prompt}</p>
                                 <div className="space-y-1.5">
                                    {(output.options ?? []).map((opt: string) => (
                                       <p key={opt} className={`text-xs px-3 py-1.5 rounded-lg border ${opt === output.correct_answer ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-white/50 bg-white/[0.03] border-white/5'}`}>{opt}</p>
                                    ))}
                                 </div>
                              </div>
                           ) : null}
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
                     <p className="text-indigo-200/40 text-xs">Generations are grounded in the published Knowledge Base content for the selected skill.</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
