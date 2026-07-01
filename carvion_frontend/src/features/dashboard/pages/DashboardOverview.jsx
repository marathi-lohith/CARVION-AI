import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { 
  FiFileText, 
  FiMap, 
  FiCheckSquare, 
  FiMessageSquare, 
  FiPlus, 
  FiSettings, 
  FiArrowRight,
  FiBriefcase,
  FiClock,
  FiBookOpen,
  FiMessageCircle,
  FiAward,
  FiDownload,
  FiTarget,
  FiAlertCircle,
  FiUser
} from 'react-icons/fi';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';

import AnalyticsSummaryCard from '../components/AnalyticsSummaryCard.jsx';
import ActivityTimeline from '../components/ActivityTimeline.jsx';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import { ROUTES } from '../../../config/constants.js';

export default function DashboardOverview() {
  const { user } = useSelector((state) => state.auth);

  // 1. Fetch consolidated dashboard details
  const { data: dashboardData, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: async () => {
      const response = await apiClient.get('/api/profile/dashboard/');
      return response.data?.data || response.data;
    },
  });

  // 2. Fetch skill gap data (reuse existing endpoint — same queryKey as SkillGapAnalyzer, deduped by React Query)
  const { data: skillGapData } = useQuery({
    queryKey: ['skillGapAnalysis'],
    queryFn: async () => {
      const response = await apiClient.get('/api/profile/skill-gap/');
      return response.data?.data || response.data;
    },
    staleTime: 0,            // Always fresh — reflects latest resume/profile changes
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  if (isLoading && !dashboardData) {
    return <Loader skeleton={true} variant="grid" className="max-w-6xl mx-auto" />;
  }

  if (isError) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-150 shadow-sm max-w-lg mx-auto">
        <p className="text-red-500 font-semibold text-lg">Failed to retrieve dashboard summaries.</p>
        <p className="text-xs text-slate-400 dark:text-[#8A9BB5] mt-2">Verify that the API server is operational.</p>
        <button 
          onClick={() => refetch()} 
          className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const metrics = dashboardData || {
    skills_count: 0,
    target_role: 'Not specified',
    resumes_count: 0,
    mock_tests_count: 0,
    roadmaps_count: 0,
    latest_ats_score: 0,
    skills: [],
    bio: '',
    saved_jobs_count: 0,
    applied_jobs_count: 0,
    learning_hours: 0,
    completed_courses_count: 0,
    ai_conversations_count: 0,
    interview_score_average: 0,
    resume_downloads_count: 0,
    resume_score_trend: [],
    career_growth: [],
    skills_progress: [],
    weekly_activity: []
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      {/* Welcome banner */}
      <div className="text-left space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-[#F1F5F9]">
          Welcome back, {user?.name || 'Developer'}!
        </h2>
        <p className="text-sm text-slate-400 dark:text-[#8A9BB5] font-medium">
          Review your career milestones, document analytics, and active assessments.
        </p>
      </div>

      {/* ── Skill Overview Cards (reuse skill gap API) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Target Role */}
        <div className="bg-[#fafbfd] dark:bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-2xl shadow-sm space-y-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
              <FiTarget className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <h4 className="text-[10px] font-black text-slate-500 dark:text-[#6B7FA3] uppercase tracking-wider">Target Role</h4>
          </div>
          <p className="text-sm font-extrabold text-slate-800 leading-tight">
            {skillGapData?.target_role || metrics.target_role || 'Not set'}
          </p>
          <p className="text-[9px] text-slate-400 dark:text-[#6B7FA3] font-medium">Source: User Profile</p>
        </div>

        {/* Card 2: Resume Extracted Skills */}
        <div className="bg-[#fafbfd] dark:bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-2xl shadow-sm space-y-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FiFileText className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <h4 className="text-[10px] font-black text-slate-500 dark:text-[#6B7FA3] uppercase tracking-wider">Resume Skills</h4>
          </div>
          {skillGapData?.resume_skills?.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {skillGapData.resume_skills.slice(0, 5).map((s, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] text-slate-600 rounded text-[9px] font-bold">{s}</span>
              ))}
              {skillGapData.resume_skills.length > 5 && (
                <span className="text-[9px] text-slate-400 font-bold">+{skillGapData.resume_skills.length - 5} more</span>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 italic">No resume skills yet.</p>
          )}
          <p className="text-[9px] text-slate-400 dark:text-[#6B7FA3] font-medium">
            Source: {metrics.resumes_count > 0 ? (skillGapData?.is_primary_resume ? "Primary Resume" : "Latest Resume") : "No Resume"}
          </p>
        </div>

        {/* Card 3: Missing Skills */}
        <div className="bg-[#fafbfd] dark:bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-2xl shadow-sm space-y-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
              <FiAlertCircle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <h4 className="text-[10px] font-black text-slate-500 dark:text-[#6B7FA3] uppercase tracking-wider">Missing Skills</h4>
          </div>
          {skillGapData?.missing_skills?.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {skillGapData.missing_skills.slice(0, 5).map((s, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-rose-50 border border-rose-100 text-rose-600 rounded text-[9px] font-bold">{s}</span>
              ))}
              {skillGapData.missing_skills.length > 5 && (
                <span className="text-[9px] text-rose-400 font-bold">+{skillGapData.missing_skills.length - 5} more</span>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-emerald-600 font-bold">No gaps detected!</p>
          )}
          <p className="text-[9px] text-slate-400 dark:text-[#6B7FA3] font-medium">Source: Skill Gap Analyzer</p>
        </div>

        {/* Card 4: Skill Inventory */}
        <div className="bg-[#fafbfd] dark:bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-2xl shadow-sm space-y-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <FiUser className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <h4 className="text-[10px] font-black text-slate-500 dark:text-[#6B7FA3] uppercase tracking-wider">Skill Inventory</h4>
          </div>
          {skillGapData?.active_skills?.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {skillGapData.active_skills.slice(0, 5).map((s, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded text-[9px] font-bold">{s}</span>
              ))}
              {skillGapData.active_skills.length > 5 && (
                <span className="text-[9px] text-emerald-400 font-bold">+{skillGapData.active_skills.length - 5} more</span>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 italic">No manually added skills available.</p>
          )}
          <p className="text-[9px] text-slate-400 dark:text-[#6B7FA3] font-medium">Source: Profile Inventory</p>
        </div>
      </div>
      {/* ── End Skill Overview Cards ── */}

      {/* Analytics Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnalyticsSummaryCard
          title="ATS Quality Score"
          value={metrics.resumes_count > 0 ? `${metrics.latest_ats_score}%` : '—'}
          subtitle={metrics.resumes_count > 0 
            ? (metrics.is_primary_resume ? "Primary Resume Score" : "Latest Resume Score")
            : "No resume uploaded yet."}
          icon={<FiFileText className="w-6 h-6" />}
          colorClass="from-orange-500/10 to-amber-500/10 text-orange-500"
          progress={metrics.resumes_count > 0 ? (metrics.latest_ats_score || 0) : 0}
        />
        <AnalyticsSummaryCard
          title="Parsed Resumes"
          value={metrics.resumes_count}
          subtitle="Document versions analyzed"
          icon={<FiFileText className="w-6 h-6" />}
          colorClass="from-orange-500/10 to-orange-500/20 text-orange-555"
          trend={metrics.resumes_count > 0 ? `+${metrics.resumes_count}` : undefined}
        />
        <AnalyticsSummaryCard
          title="Active Roadmaps"
          value={metrics.roadmaps_count}
          subtitle="Roadmap paths generated"
          icon={<FiMap className="w-6 h-6" />}
          colorClass="from-emerald-500/10 to-emerald-500/20 text-emerald-600"
          trend={metrics.roadmaps_count > 0 ? `+${metrics.roadmaps_count}` : undefined}
        />
        <AnalyticsSummaryCard
          title="Mock Assessments"
          value={metrics.mock_tests_count}
          subtitle="MCQ & Coding tests taken"
          icon={<FiCheckSquare className="w-6 h-6" />}
          colorClass="from-emerald-500/10 to-teal-500/10 text-emerald-600"
          trend={metrics.mock_tests_count > 0 ? `+${metrics.mock_tests_count}` : undefined}
        />
      </div>

      {/* Additional Stats Section */}
      <div className="bg-[#fafbfd] dark:bg-[#fafbfd] p-5 rounded-2xl border border-[rgba(15,23,42,0.08)] shadow-sm space-y-4">
        <h3 className="font-extrabold text-[10px] text-slate-400 dark:text-slate-400 dark:text-[#6B7FA3] uppercase tracking-widest text-left">
          Workspace Activity Stats
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white dark:bg-white border border-[rgba(15,23,42,0.08)] p-4 rounded-xl shadow-sm flex flex-col justify-between text-left transition-all duration-200 hover:-translate-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><FiBriefcase /> Saved Jobs</span>
            <span className="text-xl font-black text-slate-800 mt-2">{metrics.saved_jobs_count || 0}</span>
          </div>
          <div className="bg-white dark:bg-white border border-[rgba(15,23,42,0.08)] p-4 rounded-xl shadow-sm flex flex-col justify-between text-left transition-all duration-200 hover:-translate-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><FiBriefcase /> Applied Jobs</span>
            <span className="text-xl font-black text-slate-800 mt-2">{metrics.applied_jobs_count || 0}</span>
          </div>
          <div className="bg-white dark:bg-white border border-[rgba(15,23,42,0.08)] p-4 rounded-xl shadow-sm flex flex-col justify-between text-left transition-all duration-200 hover:-translate-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><FiClock /> Study Hours</span>
            <span className="text-xl font-black text-slate-800 mt-2">{metrics.learning_hours || 0}h</span>
          </div>
          <div className="bg-white dark:bg-white border border-[rgba(15,23,42,0.08)] p-4 rounded-xl shadow-sm flex flex-col justify-between text-left transition-all duration-200 hover:-translate-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><FiBookOpen /> Courses Done</span>
            <span className="text-xl font-black text-slate-800 mt-2">{metrics.completed_courses_count || 0}</span>
          </div>
          <div className="bg-white dark:bg-white border border-[rgba(15,23,42,0.08)] p-4 rounded-xl shadow-sm flex flex-col justify-between text-left transition-all duration-200 hover:-translate-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><FiMessageCircle /> AI Chats</span>
            <span className="text-xl font-black text-slate-800 mt-2">{metrics.ai_conversations_count || 0}</span>
          </div>
          <div className="bg-white dark:bg-white border border-[rgba(15,23,42,0.08)] p-4 rounded-xl shadow-sm flex flex-col justify-between text-left transition-all duration-200 hover:-translate-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><FiAward /> Interview Avg</span>
            <span className="text-xl font-black text-slate-800 mt-2">{metrics.interview_score_average || 0}%</span>
          </div>
          <div className="bg-white dark:bg-white border border-[rgba(15,23,42,0.08)] p-4 rounded-xl shadow-sm flex flex-col justify-between text-left transition-all duration-200 hover:-translate-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><FiDownload /> Downloads</span>
            <span className="text-xl font-black text-slate-800 mt-2">{metrics.resume_downloads_count || 0}</span>
          </div>
        </div>
      </div>

      {/* Growth & Activity Analytics Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        {/* Career Growth Graph */}
        <div className="bg-[#fafbfd] dark:bg-[#fafbfd] p-6 rounded-2xl border border-[rgba(15,23,42,0.08)] shadow-sm space-y-4">
          <div>
            <h4 className="font-bold text-sm text-slate-700 tracking-tight">Career Growth</h4>
            <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium mt-0.5">Mock test score progression over time</p>
          </div>
          <div className="h-56 w-full">
            {metrics.career_growth && metrics.career_growth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.career_growth} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} domain={[0, 100]} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 10, borderRadius: 10, border: '1px solid rgba(15,23,42,0.08)', boxShadow: 'none' }} />
                  <Area type="monotone" name="Test Score" dataKey="score" stroke="#10b981" fill="rgba(16,185,129,0.08)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No mock test scores available.</div>
            )}
          </div>
        </div>

        {/* Resume Score Trend Graph */}
        <div className="bg-[#fafbfd] dark:bg-[#fafbfd] p-6 rounded-2xl border border-[rgba(15,23,42,0.08)] shadow-sm space-y-4">
          <div>
            <h4 className="font-bold text-sm text-slate-700 tracking-tight">Resume Score Trend</h4>
            <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium mt-0.5">ATS score trends matching resume versions</p>
          </div>
          <div className="h-56 w-full">
            {metrics.resume_score_trend && metrics.resume_score_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.resume_score_trend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} domain={[0, 100]} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 10, borderRadius: 10, border: '1px solid rgba(15,23,42,0.08)', boxShadow: 'none' }} />
                  <Area type="monotone" name="ATS Score" dataKey="score" stroke="#f97316" fill="rgba(249,115,22,0.08)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No resume scores available.</div>
            )}
          </div>
        </div>

        {/* Skills Progress Graph */}
        <div className="bg-[#fafbfd] dark:bg-[#fafbfd] p-6 rounded-2xl border border-[rgba(15,23,42,0.08)] shadow-sm space-y-4">
          <div>
            <h4 className="font-bold text-sm text-slate-700 tracking-tight">Skills Progress</h4>
            <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium mt-0.5">Active skills proficiency vs target career path</p>
          </div>
          <div className="h-56 overflow-y-auto pr-2 space-y-3.5">
            {metrics.skills_progress && metrics.skills_progress.length > 0 ? (
              metrics.skills_progress.map((s, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>{s.skill}</span>
                    <span className="text-orange-500">{s.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${s.progress >= 80 ? 'bg-emerald-500' : s.progress >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${s.progress}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No skills listed in profile inventory.</div>
            )}
          </div>
        </div>

        {/* Weekly Activity Graph */}
        <div className="bg-[#fafbfd] dark:bg-[#fafbfd] p-6 rounded-2xl border border-[rgba(15,23,42,0.08)] shadow-sm space-y-4">
          <div>
            <h4 className="font-bold text-sm text-slate-700 tracking-tight">Weekly Activity</h4>
            <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium mt-0.5">Workspace interactions per weekday</p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.weekly_activity} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.05)" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: 10, border: '1px solid rgba(15,23,42,0.08)', boxShadow: 'none' }} />
                <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={20} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Dashboard layout split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3 width) - Activity log & Skills summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active target profile & Skills list */}
          <div className="bg-[#fafbfd] dark:bg-[#fafbfd] rounded-2xl border border-[rgba(15,23,42,0.08)] p-6 shadow-sm space-y-4 text-left">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div>
                <h3 className="font-bold text-base text-slate-800">Profile Summary</h3>
                <p className="text-xs text-slate-450 mt-1 font-semibold">
                  Target Role: <span className="text-orange-500 font-bold">{metrics.target_role}</span>
                </p>
              </div>
              <Link 
                to={ROUTES.PROFILE}
                className="text-xs font-bold text-orange-500 hover:text-orange-600 flex items-center space-x-1"
              >
                <span>Edit Profile</span>
                <FiArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Skills chips */}
            <div className="pt-2">
              <p className="text-[10px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider mb-2.5">
                Your Skill Inventory
              </p>
              {metrics.skills.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No skills listed in profile inventory.{' '}
                  <Link to={ROUTES.PROFILE} className="text-orange-500 font-semibold underline">Add skills</Link>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {metrics.skills.map((skill, index) => (
                    <span 
                      key={index}
                      className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold border border-slate-100"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Activity Timeline log */}
          <ActivityTimeline
            resumesCount={metrics.resumes_count}
            roadmapsCount={metrics.roadmaps_count}
            mockTestsCount={metrics.mock_tests_count}
          />
        </div>

        {/* Right column (1/3 width) - Quick Actions Panel */}
        <div className="space-y-6">
          <div className="bg-[#fafbfd] dark:bg-[#fafbfd] rounded-2xl border border-[rgba(15,23,42,0.08)] p-6 shadow-sm">
            <h3 className="font-bold text-sm text-slate-700 mb-4 text-left">Quick Workspace Actions</h3>
            
            <div className="space-y-3">
              {/* Action 1: Upload resume */}
              <Link
                to={ROUTES.RESUMES}
                className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-orange-500/5 border border-slate-150 hover:border-orange-500/20 rounded-xl group transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-orange-500/10 text-orange-500 rounded-lg group-hover:scale-105 transition-transform">
                    <FiPlus className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-700">Parse Resume</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Evaluate ATS quality scores</p>
                  </div>
                </div>
                <FiArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-orange-500 transition-all" />
              </Link>

              {/* Action 2: Chat AI */}
              <Link
                to={ROUTES.CHAT}
                className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-orange-500/5 border border-slate-150 hover:border-orange-500/20 rounded-xl group transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-orange-500/10 text-orange-500 rounded-lg group-hover:scale-105 transition-transform">
                    <FiMessageSquare className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-700">Career Assistant</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Consult with Gemini AI chatbot</p>
                  </div>
                </div>
                <FiArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-orange-500 transition-all" />
              </Link>

              {/* Action 3: Build Roadmap */}
              <Link
                to={ROUTES.ROADMAP}
                className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-orange-500/5 border border-slate-150 hover:border-orange-500/20 rounded-xl group transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-lg group-hover:scale-105 transition-transform">
                    <FiMap className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-700">Interactive Roadmap</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Track study milestones</p>
                  </div>
                </div>
                <FiArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-orange-500 transition-all" />
              </Link>

              {/* Action 4: Profile Config */}
              <Link
                to={ROUTES.PROFILE}
                className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-orange-500/5 border border-slate-150 hover:border-orange-500/20 rounded-xl group transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-slate-100 text-slate-500 rounded-lg group-hover:scale-105 transition-transform">
                    <FiSettings className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-700">Workspace Settings</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Configure personal options</p>
                  </div>
                </div>
                <FiArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-orange-500 transition-all" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
