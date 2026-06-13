import Link from 'next/link';
import { ArrowRight, Cloud, Shield, Zap, BarChart } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-black selection:bg-indigo-100">
      {/* Header */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">C</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Certingo Academy</span>
        </div>
        <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-600">
          <Link href="#features" className="hover:text-black transition-colors">Features</Link>
          <Link href="#certifications" className="hover:text-black transition-colors">Certifications</Link>
          <Link href="/admin" className="hover:text-black transition-colors">Admin</Link>
        </div>
        <Link
          href="/login"
          className="bg-black text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-8 pt-20 pb-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full text-xs font-medium text-gray-600 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span>AI-Powered Adaptive Learning Engine</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
            Master Cloud Certifications <br />
            <span className="text-gray-400">with Adaptive Intelligence.</span>
          </h1>
          <p className="text-xl text-gray-500 mb-10 leading-relaxed max-w-2xl">
            The next generation of technical education. Certingo uses real-time AI to personalize your study path, diagnose weaknesses, and ensure you pass your exams with confidence.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link
              href="/login"
              className="group bg-black text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-800 transition-all flex items-center"
            >
              Get Started
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="px-8 py-4 rounded-full text-lg font-semibold text-gray-600 hover:text-black transition-colors">
              Explore Roadmap
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32">
          {[
            {
              icon: Zap,
              title: "Adaptive Learning",
              description: "Our engine adjusts difficulty in real-time based on your performance, maximizing retention."
            },
            {
              icon: Shield,
              title: "AI-First Tutoring",
              description: "Personalized explanations, analogies, and feedback generated from verified knowledge bases."
            },
            {
              icon: BarChart,
              title: "Skill Mastery",
              description: "Track your progress with granular data. Know exactly which skills need more focus."
            }
          ].map((feature, i) => (
            <div key={i} className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6">
                <feature.icon className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Certifications Preview */}
        <div id="certifications" className="mt-32">
          <h2 className="text-3xl font-bold mb-12">Available Certifications</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "AWS Cloud Practitioner", provider: "AWS", status: "Active" },
              { name: "Azure Fundamentals", provider: "Microsoft", status: "Coming Soon" },
              { name: "Google Cloud Digital Leader", provider: "Google", status: "Coming Soon" },
              { name: "SAP BTP Fundamentals", provider: "SAP", status: "Coming Soon" }
            ].map((cert, i) => (
              <div key={i} className="group p-6 rounded-2xl border border-gray-100 hover:border-black transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{cert.provider}</span>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                    cert.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                  )}>
                    {cert.status}
                  </span>
                </div>
                <h4 className="text-lg font-bold group-hover:text-indigo-600 transition-colors">{cert.name}</h4>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-8 md:mb-0">
            <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-[10px] text-white font-bold">C</div>
            <span className="font-bold tracking-tight">Certingo Academy</span>
          </div>
          <div className="text-gray-400 text-sm">
            © 2024 Certingo Academy. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
