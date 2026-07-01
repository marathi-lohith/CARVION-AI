import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiFileText, FiEdit3, FiUser, FiTrendingUp, FiMap, FiCpu } from 'react-icons/fi';

export default function FeatureGrid() {
  const features = [
    {
      icon: <FiFileText className="w-6 h-6 text-orange-500" />,
      title: 'AI Resume Analyzer',
      desc: 'Upload your resume and receive ATS score, keyword analysis, and improvement suggestions.',
    },
    {
      icon: <FiEdit3 className="w-6 h-6 text-orange-500" />,
      title: 'AI Resume Builder',
      desc: 'Build a professional ATS-friendly resume from scratch with live AI assistance.',
    },
    {
      icon: <FiUser className="w-6 h-6 text-orange-500" />,
      title: 'AI Interview Practice',
      desc: 'Practice HR and technical interviews with instant AI-powered feedback and scoring.',
    },
    {
      icon: <FiTrendingUp className="w-6 h-6 text-orange-500" />,
      title: 'Career Insights',
      desc: 'Generate AI-powered market insights, salary trends, required skills, and future opportunities for any role.',
    },
    {
      icon: <FiMap className="w-6 h-6 text-orange-500" />,
      title: 'Learning Roadmaps',
      desc: 'Receive personalized learning paths, recommended courses, and career milestones.',
    },
    {
      icon: <FiCpu className="w-6 h-6 text-orange-500" />,
      title: 'Career Assistant',
      desc: 'Chat with an AI mentor for resume advice, interview guidance, career planning, and skill development.',
    },
  ];

  return (
    <section id="features" className="py-24 bg-slate-50/60 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 px-4 sm:px-6 lg:px-8 relative border-t border-b border-slate-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto">
        
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Designed for Modern Career Transitioning
          </h2>
          <p className="text-slate-500 dark:text-slate-450 mt-4 text-sm sm:text-base leading-relaxed font-medium">
            Every component is fully connected to backend pipelines, eliminating mocks and hardcoded placeholders.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Link
                to="/login"
                className="group h-full border border-slate-200/50 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-6 rounded-2xl flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1.5 hover:border-orange-500/80 dark:hover:border-orange-500/80 transition-all duration-300 cursor-pointer shadow-sm text-left"
              >
                <div>
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                    {feature.icon}
                  </div>
                  <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-200 mb-3 group-hover:text-orange-500 transition-colors">{feature.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{feature.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
