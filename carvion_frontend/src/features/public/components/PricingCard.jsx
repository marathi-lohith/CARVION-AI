import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  FiFileText, 
  FiCheckCircle, 
  FiEdit3, 
  FiTarget, 
  FiUser, 
  FiCpu, 
  FiMap, 
  FiTrendingUp,
  FiChevronRight
} from 'react-icons/fi';

export default function PricingCard() {
  const workflowSteps = [
    {
      number: '01',
      title: 'Upload Resume',
      desc: 'Upload your resume or create one from the Resume Builder.',
    },
    {
      number: '02',
      title: 'AI Analysis',
      desc: 'Our AI extracts skills, calculates ATS score, identifies missing keywords, and analyzes your profile.',
    },
    {
      number: '03',
      title: 'Improve Skills',
      desc: 'Receive personalized recommendations, learning roadmaps, resume optimization, and cover letter assistance.',
    },
    {
      number: '04',
      title: 'Get Career Ready',
      desc: 'Practice interviews, complete mock assessments, explore career insights, and discover job opportunities.',
    },
  ];

  const highlights = [
    {
      title: 'AI Resume Analyzer',
      desc: 'ATS scoring, keyword extraction, resume analysis.',
      icon: <FiFileText className="w-5 h-5 text-orange-500" />,
    },
    {
      title: 'Resume Optimizer',
      desc: 'Improve ATS compatibility and resume quality.',
      icon: <FiCheckCircle className="w-5 h-5 text-orange-500" />,
    },
    {
      title: 'Cover Letter Generator',
      desc: 'Generate personalized AI-powered cover letters.',
      icon: <FiEdit3 className="w-5 h-5 text-orange-500" />,
    },
    {
      title: 'Skill Gap Analyzer',
      desc: 'Discover missing skills and receive improvement recommendations.',
      icon: <FiTarget className="w-5 h-5 text-orange-500" />,
    },
    {
      title: 'AI Interview Practice',
      desc: 'Practice interviews with intelligent AI feedback.',
      icon: <FiUser className="w-5 h-5 text-orange-500" />,
    },
    {
      title: 'Career Assistant',
      desc: 'Get instant AI career guidance and mentoring.',
      icon: <FiCpu className="w-5 h-5 text-orange-500" />,
    },
    {
      title: 'Learning Roadmaps',
      desc: 'Personalized learning paths and course recommendations.',
      icon: <FiMap className="w-5 h-5 text-orange-500" />,
    },
    {
      title: 'Career Insights',
      desc: 'Generate market insights, salary trends, required skills, and career outlook for any role.',
      icon: <FiTrendingUp className="w-5 h-5 text-orange-500" />,
    },
  ];

  return (
    <div className="space-y-24 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 py-24 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-orange-500/5 rounded-full blur-[160px] pointer-events-none" />

      {/* SECTION 1 — HOW CARVION AI WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            How Carvion AI Works
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-4 text-sm sm:text-base leading-relaxed font-medium">
            Transform your career with an AI-powered workflow designed to help you build, improve, and grow.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-6 relative">
          {workflowSteps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className="relative group border border-slate-200/60 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-950 p-6 rounded-2xl flex flex-col justify-between hover:shadow-xl hover:border-orange-500/50 dark:hover:border-orange-500/50 transition-all duration-300 text-left"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs font-black text-orange-500/10 dark:text-orange-500/5 bg-orange-500/10 dark:bg-orange-500/20 w-8 h-8 rounded-lg flex items-center justify-center font-mono">
                    <span className="text-orange-600 dark:text-orange-400 font-extrabold text-[10px]">{step.number}</span>
                  </span>
                  {idx < 3 && (
                    <FiChevronRight className="hidden lg:block w-5 h-5 text-slate-350 group-hover:text-orange-500 transition-colors" />
                  )}
                </div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mb-2 group-hover:text-orange-500 transition-colors">{step.title}</h3>
                <p className="text-xs sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SECTION 2 — PLATFORM HIGHLIGHTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative border-t border-slate-100 dark:border-slate-900 pt-24">
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Everything You Need for Career Growth
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-4 text-sm sm:text-base leading-relaxed font-medium">
            Powerful AI tools designed to support every stage of your professional journey.
          </p>
        </div>

        {/* Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
            >
              <Link
                to="/login"
                className="group h-full border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-6 rounded-2xl flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1.5 hover:border-orange-500/80 dark:hover:border-orange-500/80 transition-all duration-300 cursor-pointer shadow-sm text-left"
              >
                <div>
                  <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                    {item.icon}
                  </div>
                  <h3 className="font-extrabold text-xs text-slate-850 dark:text-slate-200 mb-2 group-hover:text-orange-500 transition-colors">{item.title}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{item.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
