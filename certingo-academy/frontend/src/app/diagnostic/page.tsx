"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DiagnosticPage() {
  const router = useRouter();

  useEffect(() => {
    // For the demo, we skip the actual diagnostic test and go to the dashboard
    // to keep the flow smooth, as the backend already has mock diagnostic logic
    // but the dashboard is the "wow" moment.
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-10">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-10 animate-bounce">
          <span className="text-black font-black text-2xl">C</span>
        </div>
        <h1 className="text-4xl font-black mb-6 tracking-tight">Analyzing your profile...</h1>
        <p className="text-gray-500 mb-12 leading-relaxed">
          Our AI is mapping your background to the AWS Cloud Practitioner domains to create your personalized path.
        </p>

        <div className="space-y-4">
          <div className="flex items-center space-x-4 text-left p-4 bg-white/5 rounded-2xl border border-white/10">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-bold text-gray-400">Loading domain weights...</span>
          </div>
          <div className="flex items-center space-x-4 text-left p-4 bg-white/5 rounded-2xl border border-white/10">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            <span className="text-sm font-bold text-gray-400">Configuring adaptive tutor...</span>
          </div>
          <div className="flex items-center space-x-4 text-left p-4 bg-white/5 rounded-2xl border border-white/10">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-sm font-bold text-gray-400">Generating initial roadmap...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
