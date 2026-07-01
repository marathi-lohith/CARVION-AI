import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FiUser, 
  FiFileText, 
  FiActivity, 
  FiTrendingUp, 
  FiAward, 
  FiEdit3, 
  FiMap 
} from 'react-icons/fi';
import apiClient from '../../../core/api/apiClient.js';

function CountUp({ end, suffix = "" }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const numericEnd = Number(end) || 0;
    if (numericEnd === 0) {
      setCount(0);
      return;
    }
    
    let startTime = null;
    const duration = 1200; // ms
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing: easeOutQuad
      const easeProgress = progress * (2 - progress);
      const currentCount = Math.floor(easeProgress * numericEnd);
      
      setCount(currentCount);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [end]);

  return <span>{count}{suffix}</span>;
}

export default function PlatformStats() {
  const { data: response, isLoading } = useQuery({
    queryKey: ['platformStats'],
    queryFn: async () => {
      const res = await apiClient.get('/api/recommendations/platform-stats/');
      return res.data;
    },
  });

  const stats = response?.success ? response.data : null;

  const statItems = [
    {
      title: 'Registered Users',
      value: stats?.registered_users || 0,
      subtitle: 'Active platform candidates',
      icon: <FiUser className="w-4 h-4 text-orange-500" />,
      suffix: '',
    },
    {
      title: 'Resume Uploads',
      value: stats?.resume_analyses || 0,
      subtitle: 'Total resumes ever uploaded',
      icon: <FiFileText className="w-4 h-4 text-orange-500" />,
      suffix: '',
    },
    {
      title: 'ATS Reports Generated',
      value: stats?.ats_reports_generated || 0,
      subtitle: 'Total ATS reports ever generated',
      icon: <FiActivity className="w-4 h-4 text-orange-500" />,
      suffix: '',
    },
    {
      title: 'Career Insights Generated',
      value: stats?.career_insights_generated || 0,
      subtitle: 'Lifetime AI market analyses',
      icon: <FiTrendingUp className="w-4 h-4 text-orange-500" />,
      suffix: '',
    },
    {
      title: 'AI Interview Sessions',
      value: stats?.ai_interview_sessions || 0,
      subtitle: 'Lifetime mock interviews completed',
      icon: <FiUser className="w-4 h-4 text-orange-500" />,
      suffix: '',
    },
    {
      title: 'Cover Letters Generated',
      value: stats?.cover_letters_generated || 0,
      subtitle: 'Lifetime cover letters generated',
      icon: <FiEdit3 className="w-4 h-4 text-orange-500" />,
      suffix: '',
    },
    {
      title: 'Learning Roadmaps Created',
      value: stats?.learning_roadmaps || 0,
      subtitle: 'Lifetime learning roadmaps created',
      icon: <FiMap className="w-4 h-4 text-orange-500" />,
      suffix: '',
    },
    {
      title: 'Average ATS Score',
      value: stats?.avg_ats_score || 0,
      subtitle: 'Average resume match score',
      icon: <FiAward className="w-4 h-4 text-orange-500" />,
      suffix: '%',
    },
  ];

  return (
    <section className="py-20 bg-slate-50/60 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 px-4 sm:px-6 lg:px-8 relative border-t border-slate-100 dark:border-slate-850">
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Platform Statistics
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-4 text-sm sm:text-base leading-relaxed font-medium">
            Live metrics and interactions powered by our intelligent AI career pipelines.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statItems.map((item, idx) => (
            <div
              key={idx}
              className="group border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-4 rounded-xl flex flex-col justify-between hover:shadow-md hover:border-orange-500/60 dark:hover:border-orange-500/60 transition-all duration-200 text-left shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    {item.icon}
                  </div>
                </div>
                <h4 className="font-bold text-[10px] text-slate-450 dark:text-slate-500 dark:text-[#6B7FA3] uppercase tracking-wider block">
                  {item.title}
                </h4>
                {isLoading ? (
                  <div className="w-12 h-6 bg-slate-100 dark:bg-slate-800 animate-pulse rounded mt-1.5" />
                ) : (
                  <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1.5">
                    <CountUp end={item.value} suffix={item.suffix} />
                  </div>
                )}
              </div>
              <div className="text-[9px] text-slate-400 dark:text-slate-500 mt-3 font-medium truncate">
                {item.subtitle}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
