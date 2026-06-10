"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { academyApi } from '@/lib/api';
import { Search, Filter, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await academyApi.getAdminQuestions();
        setQuestions(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-black text-white flex flex-col p-8 fixed h-full">
        <div className="flex items-center space-x-2 mb-12">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">C</span>
          </div>
          <span className="text-lg font-bold tracking-tight">Admin Console</span>
        </div>

        <nav className="space-y-2 flex-1">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Content Management</div>
          <button className="w-full text-left px-4 py-3 bg-white/10 rounded-xl text-sm font-bold flex items-center space-x-3">
            <CheckCircle className="w-4 h-4" />
            <span>Question Review</span>
          </button>
          <button className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl text-sm font-bold flex items-center space-x-3 text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Content Updates</span>
          </button>
        </nav>
      </aside>

      <main className="flex-1 ml-64 p-12">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-3xl font-bold mb-2">Question Review Queue</h1>
            <p className="text-gray-500">Approve or reject AI-generated questions for the certification bank.</p>
          </div>
          <div className="flex space-x-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search questions..."
                className="pl-12 pr-6 py-3 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>
            <button className="px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm font-bold flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>
        </header>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4">Question Prompt</th>
                <th className="px-8 py-4">Skill</th>
                <th className="px-8 py-4">Difficulty</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-gray-400 italic">Loading queue...</td>
                </tr>
              ) : questions.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      q.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 max-w-md">
                    <p className="text-sm font-bold line-clamp-2">{q.prompt}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-medium text-gray-500">{q.skill_id}</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-bold text-gray-900 capitalize">{q.difficulty}</span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end space-x-2">
                      <button className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
                        <XCircle className="w-5 h-5" />
                      </button>
                      <button className="p-2 hover:bg-green-50 rounded-lg text-green-500 transition-colors">
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
