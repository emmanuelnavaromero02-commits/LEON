"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, BookOpen, GraduationCap, Settings, User, Trophy, Calendar, Target, ChevronRight, Lock, Sparkles, Zap, Check } from 'lucide-react';
import { academyApi } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem('certingo_user_id');
    if (!id) {
      router.push('/onboarding');
      return;
    }
    setUserId(id);

    const fetchDashboard = async () => {
      try {
        const res = await academyApi.getDashboard(id);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  const SKILL_TREE = [
    { id: 'cloud-concepts', name: 'Cloud Concepts', status: 'completed', score: 1.0 },
    { id: 'shared-responsibility', name: 'Shared Responsibility', status: 'current', score: 0.4 },
    { id: 'iam-basics', name: 'IAM Basics', status: 'unlocked', score: 0.0 },
    { id: 'networking', name: 'Cloud Networking', status: 'locked', score: 0.0 },
    { id: 'storage', name: 'Cloud Storage', status: 'locked', score: 0.0 },
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col p-6 fixed h-full">
        <div className="flex items-center space-x-2 mb-10">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">C</span>
          </div>
          <span className="text-lg font-bold tracking-tight">Certingo</span>
        </div>

        <nav className="space-y-1 flex-1">
          {[
            { icon: LayoutDashboard, label: 'Dashboard', active: true },
            { icon: BookOpen, label: 'Learn', active: false, href: '/learn' },
            { icon: GraduationCap, label: 'Exam Simulator', active: false, href: '/exam' },
            { icon: Trophy, label: 'Achievements', active: false },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => item.href && router.push(item.href)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                item.active ? 'bg-gray-50 text-black' : 'text-gray-500 hover:text-black hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-100 space-y-1">
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-black hover:bg-gray-50">
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
          <div className="flex items-center space-x-3 px-4 py-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs">
              {data.user_name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{data.user_name}</p>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Free Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-10">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <header className="flex items-end justify-between mb-12">
            <div>
              <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-2">Welcome Back</p>
              <h1 className="text-4xl font-bold tracking-tight">Ready to master <span className="text-gray-400">{data.certification}</span>?</h1>
            </div>
            <div className="flex space-x-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-orange-500 fill-orange-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">Current Streak</p>
                  <p className="text-xl font-black leading-none">{data.streak} Days</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">Total XP</p>
                  <p className="text-xl font-black leading-none">{data.xp}</p>
                </div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-3 gap-10">
            {/* Left Column: Skill Tree */}
            <div className="col-span-2 space-y-8">
              <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold tracking-tight">Your Learning Path</h2>
                  <div className="px-3 py-1 bg-gray-50 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {Math.round(data.progress * 100)}% Complete
                  </div>
                </div>

                <div className="space-y-4">
                  {SKILL_TREE.map((skill, i) => (
                    <div
                      key={i}
                      className={`group flex items-center p-5 rounded-2xl border transition-all ${
                        skill.status === 'locked' ? 'bg-gray-50/50 border-gray-100 opacity-60' :
                        skill.status === 'current' ? 'bg-white border-black shadow-lg ring-4 ring-black/5' :
                        'bg-white border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-5 shrink-0 ${
                        skill.status === 'locked' ? 'bg-gray-200' :
                        skill.status === 'completed' ? 'bg-green-100' :
                        'bg-black'
                      }`}>
                        {skill.status === 'locked' ? <Lock className="w-5 h-5 text-gray-400" /> :
                         skill.status === 'completed' ? <Check className="w-6 h-6 text-green-600" /> :
                         <Zap className="w-6 h-6 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-lg">{skill.name}</h3>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            {skill.status}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${skill.score * 100}%` }}
                            className={`h-full ${skill.status === 'completed' ? 'bg-green-500' : 'bg-black'}`}
                          />
                        </div>
                      </div>
                      {skill.status !== 'locked' && (
                        <button
                          onClick={() => skill.status !== 'locked' && router.push('/learn')}
                          className="ml-6 p-3 rounded-xl bg-gray-50 group-hover:bg-black group-hover:text-white transition-all"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Column: Stats & Recommendations */}
            <div className="space-y-8">
              <section className="bg-black text-white p-8 rounded-3xl shadow-xl shadow-indigo-200">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-indigo-300" />
                  </div>
                  <h2 className="font-bold">Next Recommended</h2>
                </div>
                <p className="text-indigo-200 text-sm mb-6 leading-relaxed">
                  You're making great progress in Cloud Security. We recommend finishing "Shared Responsibility Model" to hit your weekly goal.
                </p>
                <button
                  onClick={() => router.push('/learn')}
                  className="w-full bg-white text-black py-4 rounded-2xl font-bold text-sm hover:bg-indigo-50 transition-colors"
                >
                  Start Lesson
                </button>
              </section>

              <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">Daily Goal</h2>
                <div className="flex items-end justify-between mb-4">
                  <span className="text-3xl font-black">2/5</span>
                  <span className="text-xs font-bold text-gray-400 mb-1">Lessons completed</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="w-[40%] h-full bg-orange-500 rounded-full" />
                </div>
              </section>

              <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6">Upcoming Exam</h2>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex flex-col items-center justify-center text-red-600">
                    <span className="text-[10px] font-black leading-none">OCT</span>
                    <span className="text-lg font-black leading-none">12</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">AWS Cloud Practitioner</p>
                    <p className="text-xs text-gray-400">32 days remaining</p>
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
