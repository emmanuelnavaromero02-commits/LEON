"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, Sparkles, ChevronRight } from 'lucide-react';
import { academyApi } from '@/lib/api';

const STEPS = [
  {
    id: 'intro',
    title: 'Let\'s build your profile',
    description: 'Tell us a bit about yourself to personalize your learning journey.',
  },
  {
    id: 'certification',
    title: 'What are you aiming for?',
    description: 'Select the certification you want to prepare for.',
  },
  {
    id: 'background',
    title: 'What\'s your background?',
    description: 'This helps us choose the best analogies and examples for you.',
  },
  {
    id: 'style',
    title: 'How do you like to learn?',
    description: 'Choose your preferred explanation style.',
  },
  {
    id: 'commitment',
    title: 'Study Plan',
    description: 'How much time can you commit?',
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    target_certification_id: 'aws-cloud-practitioner',
    background: 'no-technical',
    preferred_style: 'simple-analogies',
    weekly_time_minutes: 180,
    confidence_level: 0.5,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await academyApi.onboarding(formData);
      localStorage.setItem('certingo_user_id', response.data.user_id);
      router.push('/diagnostic');
    } catch (error) {
      console.error('Onboarding failed', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full">
        {/* Progress Bar */}
        <div className="mb-12 flex items-center space-x-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                i <= currentStep ? 'bg-black' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white p-10 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100"
        >
          <div className="mb-10">
            <h2 className="text-3xl font-bold mb-3 tracking-tight">{STEPS[currentStep].title}</h2>
            <p className="text-gray-500">{STEPS[currentStep].description}</p>
          </div>

          <div className="space-y-6 min-h-[250px]">
            {currentStep === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-gray-400">Full Name</label>
                  <input
                    type="text"
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                    placeholder="Enter your name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-gray-400">Email Address</label>
                  <input
                    type="email"
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'aws-cloud-practitioner', label: 'AWS Cloud Practitioner', icon: '☁️' },
                  { id: 'azure-fundamentals', label: 'Azure Fundamentals', icon: '🔷' },
                  { id: 'google-cloud-digital', label: 'Google Cloud Digital Leader', icon: '🌈' },
                ].map((cert) => (
                  <button
                    key={cert.id}
                    onClick={() => setFormData({...formData, target_certification_id: cert.id})}
                    className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                      formData.target_certification_id === cert.id
                        ? 'border-black bg-black text-white shadow-lg'
                        : 'border-gray-100 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-4">{cert.icon}</span>
                      <span className="font-bold">{cert.label}</span>
                    </div>
                    {formData.target_certification_id === cert.id ? <Check className="w-5 h-5" /> : <ChevronRight className="w-5 h-5 text-gray-300" />}
                  </button>
                ))}
              </div>
            )}

            {currentStep === 2 && (
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'no-technical', label: 'Non-Technical / Business', desc: 'Marketing, Sales, Management' },
                  { id: 'it-support', label: 'IT Support / Operations', desc: 'Helpdesk, Sysadmin' },
                  { id: 'developer', label: 'Developer / Engineer', desc: 'Software, DevOps, Cloud' },
                  { id: 'student', label: 'Student / Career Changer', desc: 'Learning from scratch' },
                ].map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setFormData({...formData, background: bg.id})}
                    className={`text-left p-5 rounded-2xl border transition-all ${
                      formData.background === bg.id
                        ? 'border-black bg-black text-white shadow-lg'
                        : 'border-gray-100 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-bold mb-1">{bg.label}</div>
                    <div className={`text-xs ${formData.background === bg.id ? 'text-gray-300' : 'text-gray-400'}`}>{bg.desc}</div>
                  </button>
                ))}
              </div>
            )}

            {currentStep === 3 && (
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'simple-analogies', label: 'Simple Analogies', desc: "Explain like I'm five" },
                  { id: 'technical-deep', label: 'Technical Deep Dive', desc: 'Get into the weeds immediately' },
                  { id: 'business-use-cases', label: 'Business Use Cases', desc: 'Focus on value and ROI' },
                  { id: 'step-by-step', label: 'Step-by-Step', desc: 'Clear, logical progression' },
                ].map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setFormData({...formData, preferred_style: style.id})}
                    className={`text-left p-5 rounded-2xl border transition-all ${
                      formData.preferred_style === style.id
                        ? 'border-black bg-black text-white shadow-lg'
                        : 'border-gray-100 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-bold mb-1">{style.label}</div>
                    <div className={`text-xs ${formData.preferred_style === style.id ? 'text-gray-300' : 'text-gray-400'}`}>{style.desc}</div>
                  </button>
                ))}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between mb-4">
                    <span className="font-bold">Weekly Study Goal</span>
                    <span className="font-bold text-indigo-600">{Math.floor(formData.weekly_time_minutes / 60)} hours</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="600"
                    step="60"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                    value={formData.weekly_time_minutes}
                    onChange={(e) => setFormData({...formData, weekly_time_minutes: parseInt(e.target.value)})}
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>1h / week</span>
                    <span>10h / week</span>
                  </div>
                </div>

                <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start space-x-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shrink-0">
                    <Sparkles className="text-white w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-indigo-900 text-sm mb-1">AI Recommendation</h4>
                    <p className="text-indigo-800/70 text-xs leading-relaxed">
                      Based on your {formData.background} background, we'll focus on {formData.preferred_style === 'simple-analogies' ? 'conceptual mapping' : 'technical implementation'} first.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-12 flex items-center justify-between">
            <button
              onClick={prevStep}
              className={`p-4 rounded-full border border-gray-100 hover:bg-gray-50 transition-colors ${
                currentStep === 0 ? 'invisible' : 'visible'
              }`}
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextStep}
              disabled={isSubmitting || (currentStep === 0 && (!formData.full_name || !formData.email))}
              className="bg-black text-white px-8 py-4 rounded-full font-bold flex items-center hover:bg-gray-800 transition-all disabled:bg-gray-200"
            >
              {isSubmitting ? 'Initializing...' : currentStep === STEPS.length - 1 ? 'Start Learning' : 'Next Step'}
              {!isSubmitting && <ArrowRight className="ml-2 w-5 h-5" />}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
