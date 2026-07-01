import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCpu, FiTrendingUp } from 'react-icons/fi';

export default function HeroSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  return (
    <section className="relative min-h-screen pt-32 pb-20 flex flex-col justify-center items-center overflow-hidden bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 px-4 sm:px-6 lg:px-8">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-60 dark:opacity-20" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto text-center z-10 flex flex-col items-center"
      >
        {/* Top Mini Pill Badge */}
        <motion.div
          variants={itemVariants}
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm shadow-orange-50/50 dark:shadow-none animate-float"
        >
          <FiCpu className="w-3.5 h-3.5" />
          <span>AI-Powered Career Intelligence Console</span>
        </motion.div>

        {/* Big Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 max-w-4xl text-slate-900 dark:text-white"
        >
          Sculpt Your Career Path With{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-500">
            Intelligent AI Precision
          </span>
        </motion.h1>

        {/* Description Text */}
        <motion.p
          variants={itemVariants}
          className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mb-10 leading-relaxed font-medium"
        >
          Upload your resume for automated ATS analytics, build dynamic Gemini milestones roadmaps, practice coding mock tests, and get real-time recommendations.
        </motion.p>

        {/* Action CTAs */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-16"
        >
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-105 text-white rounded-xl font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition duration-200 flex items-center justify-center space-x-2 text-xs"
          >
            <span>Login</span>
            <FiArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white rounded-xl font-bold uppercase tracking-wider transition duration-200 flex items-center justify-center space-x-2 text-xs"
          >
            <span>Get Started</span>
          </Link>
        </motion.div>

        {/* Product Visual Mockup */}
        <motion.div
          variants={itemVariants}
          className="w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 p-4 shadow-xl shadow-slate-100/50 dark:shadow-none relative"
        >
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-850">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono ml-4 select-none">https://carvion.ai/dashboard</span>
          </div>
          
          {/* Mock Dashboard Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 text-left">
            {/* Sidebar */}
            <div className="md:col-span-3 border border-slate-150 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 rounded-xl p-4 space-y-4">
              <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-150 dark:border-slate-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs font-black shadow-sm">JD</div>
                <div>
                  <div className="font-extrabold text-[10px] text-slate-800 dark:text-slate-200">John Doe</div>
                  <div className="text-[8px] text-slate-400 font-semibold">Developer</div>
                </div>
              </div>
              <div className="space-y-1">
                {['Dashboard', 'Resume Workspace', 'ATS Score Card', 'Learning Roadmaps', 'Interview Practice', 'Career Assistant'].map((item, idx) => (
                  <div
                    key={idx}
                    className={`px-2 py-1.5 rounded-lg text-[9px] font-bold flex items-center space-x-1.5 transition ${
                      idx === 2
                        ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Main Area */}
            <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* ATS Score Circular Widget */}
              <div className="border border-slate-150 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 rounded-xl p-4 flex flex-col justify-between space-y-4 relative overflow-hidden">
                <div className="absolute right-3 top-3 text-orange-500/10 dark:text-orange-500/5">
                  <FiTrendingUp className="w-12 h-12" />
                </div>
                <div>
                  <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 dark:text-[#6B7FA3] uppercase tracking-widest block">ATS Evaluation</span>
                  <h4 className="font-extrabold text-xs text-slate-850 dark:text-slate-200 mt-1">Overall Parsing Score</h4>
                </div>
                <div className="flex items-center space-x-4 py-2">
                  <div className="w-14 h-14 rounded-full border-4 border-orange-500 border-t-slate-200 dark:border-t-slate-800 flex items-center justify-center text-xs font-black text-slate-800 dark:text-white shadow-sm shadow-orange-500/10">
                    87%
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-emerald-650 dark:text-emerald-400">Strong Alignment</div>
                    <div className="text-[8px] text-slate-400 font-semibold">9/10 match core competencies</div>
                  </div>
                </div>
              </div>

              {/* Missing Keywords Tag Cloud */}
              <div className="border border-slate-150 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 dark:text-[#6B7FA3] uppercase tracking-widest block">Keyword Optimization</span>
                  <h4 className="font-extrabold text-xs text-slate-850 dark:text-slate-200 mt-1">Suggested Skill Inclusions</h4>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['Docker', 'TypeScript', 'Kubernetes', 'GraphQL', 'AWS', 'Next.js'].map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 text-[8px] font-extrabold border border-orange-100 dark:border-orange-950/30"
                    >
                      +{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Assistant Critique Card */}
              <div className="sm:col-span-2 border border-orange-100 dark:border-orange-950/20 bg-gradient-to-r from-orange-50/10 to-amber-50/5 dark:from-orange-950/5 dark:to-transparent rounded-xl p-4 space-y-2">
                <div className="flex items-center space-x-1.5 text-orange-600 text-[9px] font-black uppercase tracking-wider">
                  <FiCpu className="animate-pulse" />
                  <span>AI Real-time Critique</span>
                </div>
                <p className="text-[10px] text-slate-650 dark:text-slate-350 leading-relaxed font-semibold italic">
                  "Your profile has an outstanding structure. However, experience metrics are passive. Suggest replacing 'Responsible for building APIs' with 'Engineered high-throughput Django REST endpoints, reducing query latency by 35%.'"
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
