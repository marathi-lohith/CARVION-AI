import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Loader from '../../components/common/Loader.jsx';
import { routePreloadMap } from '../lazyRoutes.js';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_NAME } from '../../config/constants.js';

export default function AuthLayout() {
  const handlePreload = (path) => {
    const routeComp = routePreloadMap[path];
    if (routeComp && typeof routeComp.preload === 'function') {
      routeComp.preload();
    }
  };

  const features = [
    {
      title: 'Resume Analyzer',
      description: 'Parsed profiles matching deep semantic intelligence indexes.',
      badge: 'Optimized',
      color: 'border-orange-500',
      metric: 'Score: 92/100',
      details: 'Extracted: React, Python, AWS, Docker'
    },
    {
      title: 'ATS Match Score',
      description: 'Review resume match ratios against target job roles.',
      badge: 'Match High',
      color: 'border-emerald-500',
      metric: 'ATS Score: 88%',
      details: 'Matched: CI/CD, Kubernetes, Terraform'
    },
    {
      title: 'AI Mock Assessment',
      description: 'MCQ assessment tests tailored for target engineering tracks.',
      badge: 'Evaluation Done',
      color: 'border-blue-500',
      metric: 'Grade: A',
      details: 'Topic: System Design & Scaling'
    },
    {
      title: 'AI Interview Practice',
      description: 'Vocal simulation analyzing pacing and response accuracies.',
      badge: 'Live Session',
      color: 'border-indigo-500',
      metric: 'Score: 84%',
      details: 'Confidence: High | Technical: Strong'
    },
    {
      title: 'Career Roadmap',
      description: 'Milestone tracking matching customized study modules.',
      badge: 'Interactive',
      color: 'border-purple-500',
      metric: '7 Milestones',
      details: 'Next: Advanced Docker Systems'
    },
    {
      title: 'Job Recommendations',
      description: 'Curated vacancies matching parsed skills compatibility.',
      badge: '18 New Jobs',
      color: 'border-pink-500',
      metric: '95% Match',
      details: 'Lead Fullstack at Stripe'
    },
    {
      title: 'Learning Progress',
      description: 'Automated study curriculum tracker logging milestones.',
      badge: 'Active Study',
      color: 'border-amber-500',
      metric: 'Progress: 68%',
      details: 'Course: Advanced React Systems'
    },
    {
      title: 'Career Insights',
      description: 'Interactive gaps reports tracing tech changes.',
      badge: 'Analysis Complete',
      color: 'border-teal-500',
      metric: '3 Skill Gaps',
      details: 'Suggested: Redis, GraphQL'
    }
  ];

  const trustBadges = [
    'AI Resume Analysis',
    'ATS Optimization',
    'AI Interviews',
    'Career Roadmaps',
    'Mock Assessments',
    'Job Matching',
    'Skill Gap Analysis',
    'Learning Recommendations'
  ];

  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Brand Side (Visible on large viewports) */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12 select-none border-r border-slate-800/20"
        style={{ background: 'linear-gradient(135deg, #172033 0%, #1A2238 50%, #1F2937 100%)' }}
      >
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

        {/* Background glowing decorations */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-orange-500/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[110px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />

        <div className="relative max-w-lg text-white z-10 space-y-12 my-auto flex flex-col py-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <h1 className="text-4xl font-black tracking-tight text-white uppercase bg-gradient-to-r from-white to-slate-350 bg-clip-text text-transparent">
              {APP_NAME}
            </h1>
            <p className="text-xs uppercase font-extrabold tracking-widest text-orange-400">
              Intelligent Career Development Platform
            </p>
            <p className="text-sm text-slate-300 leading-relaxed font-semibold">
              Build your resume, optimize your ATS score, practice AI interviews, generate personalized career roadmaps, and discover the right opportunities—all in one platform.
            </p>
          </motion.div>

          {/* Interactive rotating feature preview card */}
          <motion.div
            className="relative w-full max-w-sm mx-auto"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.98 }}
                transition={{ duration: 0.4 }}
                className="p-6 rounded-2xl bg-white/35 dark:bg-slate-900/40 backdrop-blur-lg border border-white/20 shadow-2xl text-left"
              >
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-[10px] font-black uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-md border border-orange-500/20`}>
                    {features[activeFeature].badge}
                  </span>
                  <span className="text-[10px] font-black text-white/80 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">
                    {features[activeFeature].metric}
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-white">
                  {features[activeFeature].title}
                </h3>
                <p className="text-[11px] text-slate-200 mt-1 font-semibold leading-relaxed">
                  {features[activeFeature].description}
                </p>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-white/60 font-mono font-medium truncate">
                    {features[activeFeature].details}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Trust Badges Grid */}
          <div className="pt-6 border-t border-white/10 space-y-4">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest text-center">Core Modules Included</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {trustBadges.map((badge, idx) => (
                <span
                  key={idx}
                  className="text-[9px] font-extrabold bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-slate-300 px-2.5 py-1 rounded-lg"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between items-center p-6 sm:p-12 bg-white dark:bg-slate-950">
        {/* Mobile Branded Header */}
        <div className="lg:hidden w-full text-center py-4 space-y-1 select-none flex flex-col items-center">
          <span className="font-black text-xl bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent tracking-tight">
            CARVION<span className="text-orange-500 bg-orange-100 dark:bg-orange-950 text-[10px] px-1.5 py-0.5 rounded-md ml-1 font-black">AI</span>
          </span>
          <p className="text-[10px] text-slate-455 dark:text-slate-400 font-extrabold uppercase tracking-wider">
            Intelligent Career Development Platform
          </p>
        </div>

        {/* Auth form card container */}
        <div className="w-full flex-1 flex items-center justify-center my-auto">
          <motion.div 
            className="w-full max-w-md"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Suspense fallback={<Loader className="mt-8" />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </div>

        {/* Minimal Footer */}
        <footer className="w-full border-t border-slate-100 dark:border-slate-850 pt-4 mt-6 text-center text-[10px] text-slate-400 dark:text-slate-500 font-extrabold">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>© 2026 Carvion AI</span>
            <div className="flex gap-3">
              <Link 
                to="/privacy" 
                onMouseEnter={() => handlePreload('/privacy')}
                onFocus={() => handlePreload('/privacy')}
                className="hover:text-orange-500 transition-colors"
              >
                Privacy
              </Link>
              <span>•</span>
              <Link 
                to="/terms" 
                onMouseEnter={() => handlePreload('/terms')}
                onFocus={() => handlePreload('/terms')}
                className="hover:text-orange-500 transition-colors"
              >
                Terms
              </Link>
              <span>•</span>
              <Link 
                to="/help" 
                onMouseEnter={() => handlePreload('/help')}
                onFocus={() => handlePreload('/help')}
                className="hover:text-orange-500 transition-colors"
              >
                Support
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
