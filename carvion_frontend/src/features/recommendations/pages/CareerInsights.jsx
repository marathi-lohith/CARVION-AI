import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import Button from '../../../components/common/Button.jsx';
import Toast from '../../../components/feedback/Toast.jsx';
import { confirm } from '../../../utils/confirm.js';
import { ROUTES } from '../../../config/constants.js';
import { 
  FiTrendingUp, FiDollarSign, FiAward, FiAlertCircle, 
  FiBriefcase, FiCheckSquare, FiPercent, FiSearch, FiZap,
  FiClock, FiTrash2
} from 'react-icons/fi';

// ---- Shared Premium Helper Functions ----
const getSkillDemandInfo = (skillName, index) => {
  const levels = ['High Demand', 'Medium', 'Growing'];
  const colors = {
    'High Demand': { bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' },
    'Medium': { bg: 'bg-blue-50 text-blue-700 border-blue-100', dot: 'bg-blue-500' },
    'Growing': { bg: 'bg-orange-50 text-orange-700 border-orange-100', dot: 'bg-orange-500' }
  };
  const hash = skillName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + index;
  const level = levels[hash % levels.length];
  return { level, ...colors[level] };
};

const getCertInfo = (certName, index) => {
  const difficulties = ['Easy', 'Medium', 'Advanced'];
  const demands = ['High', 'Medium'];
  const hash = certName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + index;
  
  const difficulty = difficulties[hash % difficulties.length];
  const demand = demands[(hash + 1) % demands.length];
  
  const diffClass = difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : difficulty === 'Medium' ? 'bg-blue-50 text-blue-700 border-blue-100'
                  : 'bg-purple-50 text-purple-700 border-purple-100';
                  
  const demandClass = demand === 'High' ? 'bg-rose-50 text-rose-700 border-rose-100'
                   : 'bg-slate-100 text-slate-700 border-slate-200';
                   
  return { difficulty, demand, diffClass, demandClass };
};

const getSuggestionInfo = (text, index) => {
  const priorities = ['High', 'Medium', 'Low'];
  const colors = {
    'High': 'bg-red-50 text-red-700 border-red-100',
    'Medium': 'bg-orange-50 text-orange-700 border-orange-100',
    'Low': 'bg-slate-100 text-slate-600 border-slate-200'
  };
  const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + index;
  const priority = priorities[hash % priorities.length];
  return { priority, className: colors[priority] };
};

const getSuggestionActions = (text) => {
  const lower = text.toLowerCase();
  const actions = [];
  
  if (lower.includes('learn') || lower.includes('course') || lower.includes('skill') || lower.includes('roadmap') || lower.includes('study')) {
    actions.push({ label: 'Start Learning', path: ROUTES.ROADMAP });
  }
  if (lower.includes('resume') || lower.includes('portfolio') || lower.includes('experience')) {
    actions.push({ label: 'Go to Resume', path: ROUTES.RESUMES });
  }
  if (lower.includes('ats') || lower.includes('score') || lower.includes('optimize') || lower.includes('audit')) {
    actions.push({ label: 'Improve ATS', path: ROUTES.ATS_SCORE });
  }
  
  return actions;
};

const getCompanyCareersUrl = (companyName) => {
  const mapped = {
    'google': 'https://careers.google.com/',
    'microsoft': 'https://careers.microsoft.com/',
    'amazon': 'https://www.amazon.jobs/',
    'stripe': 'https://stripe.com/jobs',
    'airbnb': 'https://careers.airbnb.com/',
    'hubspot': 'https://www.hubspot.com/careers',
    'netflix': 'https://jobs.netflix.com/',
    'meta': 'https://www.metacareers.com/',
    'apple': 'https://jobs.apple.com/',
    'adobe': 'https://careers.adobe.com/',
    'ibm': 'https://www.ibm.com/careers/',
    'oracle': 'https://careers.oracle.com/',
    'salesforce': 'https://careers.salesforce.com/',
    'atlassian': 'https://www.atlassian.com/company/careers'
  };
  const key = companyName.toLowerCase().trim();
  if (mapped[key]) return mapped[key];
  for (const [name, url] of Object.entries(mapped)) {
    if (key.includes(name)) return url;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(companyName + ' careers')}`;
};

const getCompanySkills = (companyName, skillDemand) => {
  if (!skillDemand || skillDemand.length === 0) return null;
  const hash = companyName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const count = (hash % 2) + 2; // pick 2 or 3 skills
  const skills = [];
  for (let i = 0; i < count; i++) {
    const skillIndex = (hash + i) % skillDemand.length;
    const skillRaw = skillDemand[skillIndex];
    const skillName = typeof skillRaw === 'string' ? skillRaw : (skillRaw?.name || '');
    if (skillName && !skills.includes(skillName)) {
      skills.push(skillName);
    }
  }
  return skills.join(' • ');
};

// ---- Shared Premium Insights Panel ----
function InsightsPanel({ insights }) {
  const hiringTrend = insights?.hiring_trend || 'High';

  return (
    <div className="space-y-6 text-left">
      {/* Row 1: Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Target Role */}
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm flex items-start gap-4">
          <div className="p-3 bg-orange-50 text-orange-500 rounded-xl shrink-0">
            <FiAward className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Target Role</p>
            <h4 className="font-black text-slate-800 text-sm mt-1 truncate">{insights?.target_role || 'Software Engineer'}</h4>
          </div>
        </div>

        {/* Card 2: Salary Prediction */}
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm flex items-start gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <FiDollarSign className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Salary Prediction</p>
            <h4 className="font-black text-slate-800 text-sm mt-1 truncate">{insights?.salary_prediction || '$90,000 - $130,000'}</h4>
          </div>
        </div>

        {/* Card 3: Hiring Trend */}
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm flex items-start gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <FiTrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Hiring Trend</p>
            <h4 className="font-black text-slate-800 text-sm mt-1">
              <span className={`px-2 py-0.5 rounded text-xs font-extrabold ${
                hiringTrend === 'High' ? 'bg-emerald-50 text-emerald-600' : hiringTrend === 'Medium' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
              }`}>{hiringTrend}</span>
            </h4>
          </div>
        </div>

        {/* Card 4: Future Growth */}
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm flex items-start gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <FiPercent className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Future Growth</p>
            <h4 className="font-black text-slate-800 text-sm mt-1 truncate">{insights?.future_growth || '+18% YoY'}</h4>
          </div>
        </div>
      </div>

      {/* Analyst Trend Comment / Market Summary Banner */}
      {insights?.hiring_trend_comment && (
        <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-4 flex items-center gap-3 text-xs text-blue-700 font-bold shadow-sm">
          <FiAlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
          <span>{insights.hiring_trend_comment}</span>
        </div>
      )}

      {/* Row 2: In-demand skills & Certifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Skill Demand */}
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-6 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <FiBriefcase className="text-orange-500" /> Skill Demand Analysis
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium mt-1">Top technical competencies hiring managers are actively seeking for this role.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {insights?.skill_demand?.map((skill, index) => {
              const skillName = typeof skill === 'string' ? skill : (skill?.name || '');
              const { level, bg, dot } = getSkillDemandInfo(skillName, index);
              return (
                <div 
                  key={index}
                  className="px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-sm hover:shadow transition"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0`} />
                    <span className="text-xs font-bold text-slate-850 whitespace-normal leading-normal">{skillName}</span>
                  </div>
                  <span className={`px-2 py-0.5 border rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${bg}`}>
                    {level}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Certifications */}
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-6 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <FiCheckSquare className="text-emerald-500" /> Required Certifications
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium mt-1">Industry-standard accreditations to stand out in screening filters.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {insights?.required_certifications?.map((cert, index) => {
              const { difficulty, demand, diffClass, demandClass } = getCertInfo(cert, index);
              return (
                <div key={index} className="bg-slate-50/50 border border-slate-200 p-3.5 rounded-2xl shadow-sm flex flex-col justify-between gap-2.5 text-left hover:shadow transition">
                  <h4 className="font-extrabold text-xs text-slate-850 leading-snug">{cert}</h4>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 border rounded-full text-[9px] font-extrabold flex items-center gap-0.5 ${diffClass}`}>
                      <span className="opacity-60">Diff:</span>{difficulty}
                    </span>
                    <span className={`px-2 py-0.5 border rounded-full text-[9px] font-extrabold flex items-center gap-0.5 ${demandClass}`}>
                      <span className="opacity-60">Demand:</span>{demand}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: AI Recommendations & Top Companies */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* AI Recommendations */}
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-6 rounded-2xl shadow-sm md:col-span-2 space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm">Personalized AI Suggestions</h3>
          <div className="space-y-3">
            {insights?.ai_suggestions?.map((suggestion, index) => {
              const { priority, className } = getSuggestionInfo(suggestion, index);
              const actions = getSuggestionActions(suggestion);
              return (
                <div key={index} className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-2xl shadow-sm flex items-start gap-3.5 text-left transition hover:shadow-md">
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-xs text-orange-500 font-extrabold">
                        <FiZap className="w-3.5 h-3.5 fill-orange-500" /> Personalized Suggestion
                      </span>
                      <span className={`px-2 py-0.5 border rounded-full text-[9px] font-black uppercase tracking-wider ${className}`}>
                        {priority} Priority
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">{suggestion}</p>
                    
                    {/* Functional Action Buttons */}
                    {actions.length > 0 && (
                      <div className="flex items-center gap-3 pt-2.5 border-t border-slate-100 mt-2">
                        {actions.map((act, aIdx) => (
                          <React.Fragment key={aIdx}>
                            {aIdx > 0 && <span className="text-slate-350 text-[8px] font-bold">•</span>}
                            <Link to={act.path} className="text-[10px] font-black text-orange-500 hover:text-orange-600 transition-colors uppercase tracking-wider focus:outline-none">
                              {act.label}
                            </Link>
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Hiring Companies */}
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm">Top Hiring Companies</h3>
          <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">Firms actively building teams in this domain.</p>
          <div className="space-y-3">
            {insights?.top_companies?.map((company, index) => {
              const hiringSkills = getCompanySkills(company, insights?.skill_demand);
              const careersUrl = getCompanyCareersUrl(company);
              return (
                <div key={index} className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col justify-between gap-3 text-left">
                  <div className="flex items-center justify-between gap-2 overflow-hidden">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 text-orange-600 font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                        {company.charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-slate-800 truncate">{company}</span>
                    </div>
                    <span className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded font-black uppercase tracking-wider shrink-0">Hiring</span>
                  </div>
                  
                  {hiringSkills && (
                    <div className="text-[10px] text-slate-500 font-semibold bg-slate-50 p-2 rounded-xl border border-slate-100 truncate">
                      <span className="text-slate-400 font-bold">Skills:</span> {hiringSkills}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <a 
                      href={careersUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-black text-orange-500 hover:text-orange-600 underline transition-colors focus:outline-none"
                    >
                      View Jobs
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Premium Skeleton Loader Component ----
function InsightsPanelSkeleton() {
  return (
    <div className="space-y-6 animate-pulse text-left">
      {/* Overview Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl h-24" />
        ))}
      </div>
      
      {/* Market Summary Banner skeleton */}
      <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] h-14 rounded-2xl" />

      {/* Skills & Certifications skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-6 rounded-2xl h-56" />
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-6 rounded-2xl h-56" />
      </div>

      {/* AI Recommendations & Top Companies skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-6 rounded-2xl md:col-span-2 h-72" />
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-6 rounded-2xl h-72" />
      </div>
    </div>
  );
}

import { refreshRecommendations } from '../../../utils/queryRefresh/index.js';

export default function CareerInsights() {
  const queryClient = useQueryClient();
  const [roleInput, setRoleInput] = useState('');
  const [customInsights, setCustomInsights] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState('');
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
  
  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  // Fetch the user profile to display the source Target Role
  const { data: profile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await apiClient.get('/api/profile/');
      return res.data?.data || res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch auto insights for profile target role
  const { data: insights, isLoading, isError, refetch } = useQuery({
    queryKey: ['careerInsights'],
    queryFn: async () => {
      const response = await apiClient.get('/api/recommendations/career-insights/');
      return response.data?.data || response.data;
    }
  });

  // Fetch career insights history
  const { 
    data: careerInsightsHistory = [], 
    isLoading: loadingHistory,
    isError: errorLoadingHistory,
    refetch: refetchHistory
  } = useQuery({
    queryKey: ['careerInsightsHistory'],
    queryFn: async () => {
      const response = await apiClient.get('/api/recommendations/career-insights/history/');
      return response.data?.data || [];
    }
  });

  // Delete individual history item
  const deleteHistoryMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/api/recommendations/career-insights/history/${id}/delete/`);
    },
    onSuccess: (_, deletedId) => {
      showToast('Career insight deleted successfully.');
      queryClient.setQueryData(['careerInsightsHistory'], (old) => {
        return old ? old.filter(item => item.id !== deletedId) : [];
      });
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to delete history item.', 'error');
    }
  });

  // Delete all history items
  const deleteAllHistoryMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/api/recommendations/career-insights/history/delete-all/');
    },
    onSuccess: () => {
      showToast('Career insight history cleared successfully.');
      queryClient.setQueryData(['careerInsightsHistory'], []);
      setCustomInsights(null);
      setRoleInput('');
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to clear history.', 'error');
    }
  });

  const handleGenerateForRole = async (e) => {
    if (e) e.preventDefault();
    const role = roleInput.trim();
    if (!role) return;
    setCustomLoading(true);
    setCustomError('');
    setCustomInsights(null);
    try {
      const response = await apiClient.post('/api/recommendations/career-insights/role/', { target_role: role });
      setCustomInsights(response.data?.data || response.data);
      showToast('Career insights generated successfully.');
      refreshRecommendations(queryClient);
    } catch (err) {
      setCustomError('Failed to generate insights for this role. Please try again.');
      showToast('Failed to generate career insights.', 'error');
    } finally {
      setCustomLoading(false);
    }
  };

  const handleOpenHistoryItem = (h) => {
    setRoleInput(h.searched_role);
    setCustomInsights(h.generated_insight);
    showToast('Loaded past career insights!');
    
    // Smooth scroll down to manual insights container
    const element = document.getElementById('manual-insights-container');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDeleteHistoryItem = async (e, id) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Delete Career Insight',
      message: 'Are you sure you want to delete this career insight?',
      warning: 'This action cannot be undone.',
      type: 'delete',
      confirmText: 'Delete'
    });
    if (ok) {
      deleteHistoryMutation.mutate(id);
    }
  };

  const handleDeleteAllHistory = async () => {
    const ok = await confirm({
      title: 'Delete All Career Insights',
      message: 'Are you sure you want to delete all career insight history?',
      warning: 'This action cannot be undone.',
      type: 'delete',
      confirmText: 'Delete All'
    });
    if (ok) {
      deleteAllHistoryMutation.mutate();
    }
  };

  if (isLoading && !insights) {
    return <Loader skeleton={true} variant="grid" />;
  }

  if (isError) {
    return (
      <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-8 rounded-2xl text-center max-w-md mx-auto my-12 shadow-sm">
        <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="font-extrabold text-slate-800 text-lg">Failed to retrieve insights</h3>
        <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 text-left">
      {/* ---------------- SECTION 1: AUTO GENERATED INSIGHTS ---------------- */}
      <section className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-3xl p-6 shadow-sm space-y-6 text-left">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <FiTrendingUp className="text-orange-500" /> Career Market Intelligence
            </h2>
            <p className="text-xs text-slate-400 dark:text-[#8A9BB5] mt-1 font-medium">
              Personalized career insights generated from your Profile Target Role.
            </p>
          </div>
          {profile?.target_role && (
            <div className="flex flex-col items-start md:items-end gap-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Profile Target Role</span>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-800 text-sm">{profile.target_role}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-orange-50 text-orange-600 border border-orange-100 flex items-center gap-1">
                  <FiZap className="w-2.5 h-2.5 fill-orange-500" /> Auto Generated
                </span>
              </div>
            </div>
          )}
        </div>

        {profile?.target_role ? (
          <InsightsPanel insights={insights} />
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-1 shadow-inner animate-pulse">
              <FiAlertCircle className="w-6 h-6 text-slate-400" />
            </div>
            <h4 className="font-black text-slate-750 text-sm">No Target Role Selected</h4>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Complete your profile to receive personalized AI career intelligence.
            </p>
            <Link 
              to={ROUTES.SETTINGS} 
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition duration-200 shadow-sm"
            >
              Complete Profile
            </Link>
          </div>
        )}
      </section>

      {/* ---------------- SECTION 2: MANUAL INSIGHT GENERATOR ---------------- */}
      <section id="manual-insights-container" className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-3xl p-6 shadow-sm space-y-6 text-left">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <FiSearch className="text-orange-500" /> Generate Insights for Any Role
          </h2>
          <p className="text-xs text-slate-400 dark:text-[#8A9BB5] mt-1 font-medium">
            Explore real-time AI career insights for any profession.
          </p>
        </div>

        {/* Role search form */}
        <form onSubmit={handleGenerateForRole} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              placeholder="e.g. Cloud Engineer, Java Developer, DevOps Engineer..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition"
            />
          </div>
          <Button
            type="submit"
            disabled={!roleInput.trim() || customLoading}
            loading={customLoading}
            className="px-6 py-2.5 font-bold text-sm whitespace-nowrap"
          >
            {customLoading ? 'Generating...' : 'Generate Insights'}
          </Button>
        </form>

        {/* Custom insights error block */}
        {customError && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-xs text-red-600 font-bold">
            {customError}
          </div>
        )}

        {/* Custom insights loader skeleton */}
        {customLoading && <InsightsPanelSkeleton />}

        {/* Custom insights results */}
        {customInsights && !customLoading && (
          <div className="pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-800 text-sm">
                Market Insights for: <span className="text-orange-500 font-black">{customInsights.target_role}</span>
              </h4>
            </div>
            <InsightsPanel insights={customInsights} />
          </div>
        )}

        {/* Custom insights empty state */}
        {!customInsights && !customLoading && !customError && (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-1 shadow-inner">
              <FiSearch className="w-6 h-6 text-slate-400" />
            </div>
            <h4 className="font-black text-slate-800 text-sm">Search Any Career Role</h4>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Enter a job title above to generate AI-powered career insights.
            </p>
          </div>
        )}
      </section>

      {/* ---------------- SECTION 3: HISTORY SECTION ---------------- */}
      <section className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-3xl shadow-sm space-y-4 text-left">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <FiClock className="text-orange-500 shrink-0" /> Career Insights History {careerInsightsHistory.length > 0 && `(${careerInsightsHistory.length})`}
          </h3>
          <button
            disabled={careerInsightsHistory.length === 0 || deleteAllHistoryMutation.isLoading}
            onClick={handleDeleteAllHistory}
            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 disabled:bg-slate-100 text-red-650 disabled:text-slate-400 text-xs font-bold rounded-xl transition flex items-center gap-1 focus:outline-none"
          >
            <FiTrash2 className="w-3.5 h-3.5" /> Delete All History
          </button>
        </div>

        {/* Loading state */}
        {loadingHistory && (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="p-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-xl h-24" />
            ))}
          </div>
        )}

        {/* Error state */}
        {!loadingHistory && errorLoadingHistory && (
          <div className="text-center py-6 space-y-3 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-xl">
            <FiAlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-xs font-bold text-slate-700">Unable to load history.</p>
            <button
              onClick={() => refetchHistory()}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition focus:outline-none"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loadingHistory && !errorLoadingHistory && careerInsightsHistory.length === 0 && (
          <div className="text-center py-8 flex flex-col items-center justify-center space-y-2 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] border-dashed rounded-xl">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
              <FiClock className="w-6 h-6 text-slate-400" />
            </div>
            <h4 className="font-extrabold text-slate-700 text-sm">No Career Insights History</h4>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed text-center">
              Generate your first career insight to build your history.
            </p>
          </div>
        )}

        {/* History items list */}
        {!loadingHistory && !errorLoadingHistory && careerInsightsHistory.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
            {careerInsightsHistory.map((h) => {
              const dateObj = new Date(h.created_at);
              const formattedDate = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
              const formattedTime = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={h.id}
                  className="p-4 bg-slate-50/50 border border-slate-200 hover:border-orange-350 rounded-2xl transition flex flex-col justify-between gap-3 shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-800 truncate">{h.searched_role}</h4>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        h.generated_insight?.hiring_trend === 'High' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' : h.generated_insight?.hiring_trend === 'Medium' ? 'bg-orange-50 text-orange-600 border border-orange-100/50' : 'bg-red-50 text-red-600 border border-red-100/50'
                      }`}>{h.generated_insight?.hiring_trend || 'N/A'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-500 font-semibold">
                      <p className="truncate"><span className="text-slate-400 font-bold">Salary:</span> {h.generated_insight?.salary_prediction || 'N/A'}</p>
                      <p className="truncate"><span className="text-slate-400 font-bold">Growth:</span> {h.generated_insight?.future_growth || 'N/A'}</p>
                      <p className="col-span-2 text-[9px] text-slate-400 dark:text-[#8A9BB5] mt-1 font-semibold">
                        Generated {formattedDate} at {formattedTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2.5 border-t border-slate-200">
                    <button
                      onClick={() => handleOpenHistoryItem(h)}
                      className="text-xs font-extrabold text-orange-500 hover:text-orange-600 transition flex items-center gap-1 focus:outline-none"
                    >
                      👁 View Insights
                    </button>
                    <button
                      onClick={(e) => handleDeleteHistoryItem(e, h.id)}
                      className="text-xs font-extrabold text-red-500 hover:text-red-650 transition flex items-center gap-1 focus:outline-none"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
