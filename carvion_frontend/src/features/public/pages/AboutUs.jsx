import React from 'react';
import {
  FiCpu, FiFileText, FiActivity, FiBriefcase,
  FiBookOpen, FiMessageSquare, FiAward, FiBarChart2,
  FiGithub, FiLinkedin, FiMail, FiGlobe, FiCode,
  FiDatabase, FiZap, FiShield, FiLayers, FiTarget
} from 'react-icons/fi';
import PublicNavbar from '../components/PublicNavbar.jsx';
import Footer from '../components/Footer.jsx';

const features = [
  { icon: <FiFileText className="w-5 h-5" />, title: 'Smart Resume Builder', desc: 'Build, edit, and version-control professional resumes with AI-powered ATS optimization.', color: 'orange' },
  { icon: <FiCpu className="w-5 h-5" />, title: 'AI Career Assistant', desc: 'Chat with Gemini-powered AI to get personalized career guidance and industry insights.', color: 'blue' },
  { icon: <FiActivity className="w-5 h-5" />, title: 'Skill Gap Analyzer', desc: 'Automatically detect missing skills and receive actionable recommendations to close gaps.', color: 'purple' },
  { icon: <FiBriefcase className="w-5 h-5" />, title: 'Job Board & Tracking', desc: 'Discover curated job opportunities, save favorites, and track application progress.', color: 'emerald' },
  { icon: <FiBookOpen className="w-5 h-5" />, title: 'Learning & Roadmaps', desc: 'Follow structured career roadmaps and discover courses aligned to your career goals.', color: 'amber' },
  { icon: <FiAward className="w-5 h-5" />, title: 'Mock Assessments', desc: 'Test your technical knowledge with AI-generated quizzes and get detailed performance reviews.', color: 'rose' },
  { icon: <FiBarChart2 className="w-5 h-5" />, title: 'Analytics Dashboard', desc: 'Monitor your career progress, ATS score trends, and skill development over time.', color: 'indigo' },
  { icon: <FiMessageSquare className="w-5 h-5" />, title: 'Interview Practice', desc: 'Practice behavioral and technical interview questions with AI-powered feedback.', color: 'teal' },
];

const technologies = [
  { name: 'React 18', desc: 'Frontend SPA framework', icon: <FiCode className="w-4 h-4" />, color: 'text-blue-500 bg-blue-50' },
  { name: 'Django REST', desc: 'Backend API framework', icon: <FiShield className="w-4 h-4" />, color: 'text-emerald-600 bg-emerald-50' },
  { name: 'MongoDB', desc: 'NoSQL database (via MongoEngine)', icon: <FiDatabase className="w-4 h-4" />, color: 'text-green-600 bg-green-50' },
  { name: 'Google Gemini', desc: 'LLM AI integration', icon: <FiCpu className="w-4 h-4" />, color: 'text-orange-500 bg-orange-50' },
  { name: 'Vite', desc: 'Frontend build tool', icon: <FiZap className="w-4 h-4" />, color: 'text-purple-500 bg-purple-50' },
  { name: 'Framer Motion', desc: 'UI animations library', icon: <FiLayers className="w-4 h-4" />, color: 'text-pink-500 bg-pink-50' },
  { name: 'React Query', desc: 'Server state management', icon: <FiActivity className="w-4 h-4" />, color: 'text-red-500 bg-red-50' },
  { name: 'Redux Toolkit', desc: 'Client state management', icon: <FiTarget className="w-4 h-4" />, color: 'text-indigo-500 bg-indigo-50' },
];

const colorMap = {
  orange: 'bg-orange-50 text-orange-500 dark:bg-orange-950/40 dark:text-orange-400',
  blue: 'bg-blue-50 text-blue-500 dark:bg-blue-950/40 dark:text-blue-400',
  purple: 'bg-purple-50 text-purple-500 dark:bg-purple-950/40 dark:text-purple-400',
  emerald: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-500 dark:bg-amber-950/40 dark:text-amber-400',
  rose: 'bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-400',
  indigo: 'bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-400',
  teal: 'bg-teal-50 text-teal-500 dark:bg-teal-950/40 dark:text-teal-400',
};

export default function AboutUs() {
  return (
    <div className="bg-slate-50/50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 flex flex-col justify-between selection:bg-orange-500 selection:text-white transition-colors duration-200">
      <PublicNavbar />
      
      <main className="flex-grow max-w-4xl mx-auto px-4 py-24 space-y-10">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-white dark:from-slate-900 dark:to-slate-950 border border-orange-100 dark:border-slate-800 rounded-3xl p-8 md:p-12 text-center space-y-4 shadow-sm">
          <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 border border-orange-100 dark:border-slate-800 rounded-full px-4 py-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 shadow-sm">
            <FiCpu className="w-3.5 h-3.5" />
            AI-Powered Career Platform
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight">
            About <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Carvion AI</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-2xl mx-auto">
            Carvion AI is an intelligent career development platform that leverages cutting-edge AI to help professionals optimize their resumes, prepare for interviews, navigate their career journey, and land their dream jobs faster.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-3 py-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 shadow-sm">
              v1.2.0-stable
            </span>
            <span className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-full px-3 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-450 shadow-sm">
              ● Live & Active
            </span>
          </div>
        </div>

        {/* Mission Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-7 shadow-sm space-y-3">
          <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            <FiTarget className="text-orange-500 w-5 h-5" /> Our Mission
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Our mission is to democratize career success. We believe every professional deserves access to intelligent tools that were previously only available to those with expensive career coaches or exclusive networks. By combining the power of advanced AI with intuitive design, we help job seekers and professionals at every stage of their career take confident, informed steps forward.
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { stat: '10K+', label: 'Resumes Optimized' },
              { stat: '85%', label: 'ATS Pass Rate Improvement' },
              { stat: '3x', label: 'Faster Interview Prep' },
            ].map(({ stat, label }) => (
              <div key={label} className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/60 rounded-xl p-4 text-center">
                <p className="font-black text-2xl text-orange-600 dark:text-orange-400">{stat}</p>
                <p className="text-[11px] text-orange-500 dark:text-orange-355 font-bold mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="space-y-4">
          <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            <FiLayers className="text-orange-500 w-5 h-5" /> Platform Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => (
              <div key={f.title} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-3">
                <div className={`inline-flex p-2.5 rounded-xl ${colorMap[f.color]}`}>{f.icon}</div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-xs">{f.title}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-[#8A9BB5] mt-1 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technology Stack */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-7 shadow-sm space-y-5">
          <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            <FiCode className="text-orange-500 w-5 h-5" /> Technology Stack
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {technologies.map((t) => (
              <div key={t.name} className="border border-slate-100 dark:border-slate-800 rounded-xl p-3 hover:border-orange-200 hover:bg-orange-50/30 transition-colors space-y-1.5">
                <div className={`inline-flex p-1.5 rounded-md ${t.color.replace('bg-', 'dark:bg-').replace('bg-opacity-', '')}`}>{t.icon}</div>
                <p className="font-bold text-xs text-slate-800 dark:text-white">{t.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 leading-tight">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Developer Info */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-900 dark:to-neutral-950 rounded-2xl p-7 shadow-lg text-white space-y-5">
          <h2 className="text-lg font-black flex items-center gap-2">
            <FiGlobe className="text-orange-400 w-5 h-5" /> Developer & Project
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center font-black text-2xl text-white shadow-lg flex-shrink-0">
              C
            </div>
            <div className="space-y-1.5 min-w-0">
              <h3 className="font-black text-lg">Carvion AI Platform</h3>
              <p className="text-slate-300 text-xs leading-relaxed max-w-lg">
                A full-stack AI-powered career platform built with Django and React, integrated with Google Gemini LLM for intelligent AI features including resume analysis, career guidance, skill gap detection, and mock interview simulations.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="bg-white/10 border border-white/10 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white/80">Open Source</span>
                <span className="bg-orange-500/20 border border-orange-400/20 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-orange-300">v1.2.0</span>
                <span className="bg-emerald-500/20 border border-emerald-400/20 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">Production Ready</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2 border-t border-white/10">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-bold text-white transition-colors"
            >
              <FiGithub className="w-3.5 h-3.5" /> GitHub Repository
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/20 rounded-xl text-xs font-bold text-blue-300 transition-colors"
            >
              <FiLinkedin className="w-3.5 h-3.5" /> LinkedIn
            </a>
            <a
              href="mailto:support@carvion.ai"
              className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/20 rounded-xl text-xs font-bold text-orange-300 transition-colors"
            >
              <FiMail className="w-3.5 h-3.5" /> Contact Us
            </a>
          </div>
        </div>

        {/* Version Info */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="font-bold text-slate-600 dark:text-slate-350">Release Notes</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>v1.2.0 — AI Career Insights, Analytics Dashboard, Interview Practice</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              <span>v1.1.0 — Skill Gap Analyzer, Resume Optimizer, Cover Letter Generator</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>v1.0.0 — Core platform launch with Resume Builder & ATS Scoring</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
