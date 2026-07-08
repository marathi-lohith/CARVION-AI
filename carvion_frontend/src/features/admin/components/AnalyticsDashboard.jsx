import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUsers, FiFileText, FiBriefcase, FiBookOpen, FiCpu, FiAward, FiServer,
  FiTrendingUp, FiActivity, FiDownload, FiCalendar, FiCheckCircle, FiDatabase,
  FiAlertCircle, FiClock, FiActivity as FiPulse, FiPieChart, FiGlobe, FiLayers,
  FiList, FiShield, FiInbox
} from 'react-icons/fi';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('overview'); // overview, users, resumes, career, learning, ai, assessments, system, soft_delete
  
  // Filters
  const [dateRange, setDateRange] = useState('30days'); // 7days, 30days, 90days, 1year, custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [searchUser, setSearchUser] = useState('');
  
  // Growth chart granularity (Phase 2)
  const [growthPeriod, setGrowthPeriod] = useState('weekly'); // daily, weekly, monthly, yearly

  // Fetch Telemetry Data
  const { data: telemetry, isLoading: telemetryLoading } = useQuery({
    queryKey: ['adminTelemetry'],
    queryFn: async () => {
      const response = await apiClient.get('/api/admin/telemetry/');
      return response.data?.data || response.data;
    }
  });

  // Recharts styling tokens
  const chartTooltipStyle = {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 'bold',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
  };

  const stats = useMemo(() => {
    return telemetry || {
      platform: { total_users: 0, active_users_today: 0, new_users: 0, admin_accounts: 0, user_growth: [], profile_completion: 0 },
      resumes: { total_resumes: 0, uploaded_today: 0, average_ats_score: 0, resume_optimizations: 0, resume_downloads: 0, parsing_success_rate: 100, upload_trend: [], ats_trend: [] },
      career: { job_searches: 0, auto_recommendations: 0, total_saved_jobs: 0, active_saved_jobs: 0, deleted_saved_jobs: 0, total_applications: 0, active_applications: 0, deleted_applications: 0, total_career_insights: 0, active_career_insights: 0, deleted_career_insights: 0, application_success_rate: 0, most_searched_roles: 'N/A', most_viewed_jobs: 'N/A', daily_job_searches: [], application_trends: [], most_saved_companies: [], most_applied_companies: [], most_common_target_roles: [], top_users_by_applications: [], top_users_by_saved_jobs: [] },
      learning: { course_searches: 0, active_roadmaps: 0, completed_courses: 0, study_hours: 0, learning_streak: 0, weekly_learning: [], monthly_learning: [], roadmap_completion: 0, most_popular_roadmaps: [], most_saved_courses: [], most_completed_courses: [], highest_progress_users: [], total_learning_hours: 0, platform_usage_dist: [], course_completion_rate: 0 },
      ai: { gemini_requests: 0, gemini_cost: 0, tokens_used: 0, failed_requests: 0, rate_limit_errors: 0, average_response_time: 1.8, ai_usage_trend: [], daily_ai_requests: [], cache_hit_rate: 84.6, most_used_ai_tool: 'None', resume_optimizations_count: 0, cover_letters_count: 0, skill_gap_analyses_count: 0, chatbot_conversations_count: 0, active_ai_records: 0, deleted_ai_records: 0 },
      assessments: { mock_tests_created: 0, interviews_completed: 0, average_score: 0, performance_reviews: 0, pass_rate: 0, assessment_trend: [], score_distribution: [], highest_assessment_score: 0, highest_interview_score: 0, popular_categories: [], common_interview_roles: [], interview_success_rate: 0 },
      soft_delete: {
        users: { active: 0, deleted: 0, restored: 0, hard_deleted: 0 },
        resumes: { active: 0, deleted: 0, restored: 0, hard_deleted: 0 },
        jobs: { active: 0, deleted: 0, restored: 0, hard_deleted: 0 },
        learning: { active: 0, deleted: 0, restored: 0, hard_deleted: 0 },
        ai: { active: 0, deleted: 0, restored: 0, hard_deleted: 0 },
        assessments: { active: 0, deleted: 0, restored: 0, hard_deleted: 0 }
      },
      system: { server_status: 'Operational', mongodb_status: 'Operational', cache_status: 'Active', api_status: 'Healthy', uptime: '48h 12m', cpu_usage: 10, memory_usage: 40, disk_usage: 30 }
    };
  }, [telemetry]);

  // Export utility (Phase 12)
  const exportData = (format) => {
    if (format === 'csv') {
      const csvRows = [
        ['Metric Category', 'Key Stat', 'Value'],
        ['Users', 'Total Users', stats.platform.total_users],
        ['Users', 'Active Today', stats.platform.active_users_today],
        ['Users', 'New Users Today', stats.platform.new_users],
        ['Resumes', 'Total Resumes', stats.resumes.total_resumes],
        ['Resumes', 'Average ATS Score', stats.resumes.average_ats_score],
        ['Career', 'Applications Submitted', stats.career.total_applications],
        ['Career', 'Insights Generated', stats.career.total_career_insights],
        ['Learning', 'Active Roadmaps', stats.learning.active_roadmaps],
        ['Learning', 'Learning Hours', stats.learning.total_learning_hours],
        ['AI Tools', 'AI Requests', stats.ai.gemini_requests],
        ['AI Tools', 'Gemini Cost', `$${stats.ai.gemini_cost}`],
        ['Assessments', 'Mock Tests Completed', stats.assessments.mock_tests_created],
        ['Assessments', 'AI Interviews Completed', stats.assessments.interviews_completed],
        ['Assessments', 'Average Score', `${stats.assessments.average_score}%`],
      ];
      
      const csvContent = "data:text/csv;charset=utf-8," 
        + csvRows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `carvion_analytics_${dateRange}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'excel') {
      // Basic formatted HTML that Excel opens cleanly
      let html = '<table><tr><th>Metric Category</th><th>Key Stat</th><th>Value</th></tr>';
      html += `<tr><td>Users</td><td>Total Users</td><td>${stats.platform.total_users}</td></tr>`;
      html += `<tr><td>Users</td><td>Active Today</td><td>${stats.platform.active_users_today}</td></tr>`;
      html += `<tr><td>Resumes</td><td>Average ATS Score</td><td>${stats.resumes.average_ats_score}</td></tr>`;
      html += `<tr><td>AI Tools</td><td>Gemini Cost</td><td>$${stats.ai.gemini_cost}</td></tr>`;
      html += `</table>`;
      
      const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `carvion_analytics_${dateRange}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'pdf') {
      // Triggers browser standard print dialog optimized for reporting
      window.print();
    }
  };

  // User Performers List calculations (Phase 3)
  const userActivityTally = useMemo(() => {
    // Unifies top users from various sub-telemetry sets
    const list = {};
    stats.career.top_users_by_applications?.forEach(u => {
      list[u.email] = { ...(list[u.email] || { email: u.email }), apps: u.count };
    });
    stats.career.top_users_by_saved_jobs?.forEach(u => {
      list[u.email] = { ...(list[u.email] || { email: u.email }), saved: u.count };
    });
    stats.learning.highest_progress_users?.forEach(u => {
      list[u.email] = { ...(list[u.email] || { email: u.email }), progress: u.average_progress };
    });
    return Object.values(list).slice(0, 5);
  }, [stats]);

  return (
    <div className="space-y-6 print:p-8 print:bg-white print:text-black">
      {/* Top Header controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Executive Analytics Control Center</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Real-time statistics, platform growth logs, and system metrics</p>
        </div>

        {/* Global Date & Export Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Selector (Phase 11) */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl">
            <FiCalendar className="text-slate-400 w-4 h-4" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-350 focus:outline-none cursor-pointer"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="1year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="border border-slate-200 dark:border-slate-800 px-2 py-1 bg-white dark:bg-slate-900 rounded-xl"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="border border-slate-200 dark:border-slate-800 px-2 py-1 bg-white dark:bg-slate-900 rounded-xl"
              />
            </div>
          )}

          {/* Export Toggles (Phase 12) */}
          <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <button
              onClick={() => exportData('csv')}
              className="px-2.5 py-1.5 text-[10px] font-black border-r border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              CSV
            </button>
            <button
              onClick={() => exportData('excel')}
              className="px-2.5 py-1.5 text-[10px] font-black border-r border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              EXCEL
            </button>
            <button
              onClick={() => exportData('pdf')}
              className="px-2.5 py-1.5 text-[10px] font-black text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              PDF
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Sub-Navigation */}
      <div className="flex flex-wrap gap-1 bg-slate-50/50 dark:bg-slate-900/35 p-1 rounded-xl w-fit print:hidden">
        {[
          { id: 'overview', name: 'Overview', icon: <FiPieChart /> },
          { id: 'users', name: 'Users Profile', icon: <FiUsers /> },
          { id: 'resumes', name: 'Resumes', icon: <FiFileText /> },
          { id: 'career', name: 'Career & Jobs', icon: <FiBriefcase /> },
          { id: 'learning', name: 'Learning Space', icon: <FiBookOpen /> },
          { id: 'ai', name: 'AI & Cache', icon: <FiCpu /> },
          { id: 'assessments', name: 'Assessments', icon: <FiAward /> },
          { id: 'soft_delete', name: 'Soft Delete Audit', icon: <FiDatabase /> },
          { id: 'system', name: 'System Status', icon: <FiServer /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            {tab.icon}
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Main Content Areas */}
      {telemetryLoading ? (
        <div className="py-16">
          <Loader fullScreen={false} skeleton={true} variant="grid" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* TAB 1: EXECUTIVE OVERVIEW (Phases 1 & 2) */}
            {activeTab === 'overview' && (
              <>
                {/* KPI Metrics Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                  {/* Users */}
                  <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-4 rounded-2xl flex flex-col justify-between shadow-sm space-y-4">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Users</span>
                    <div>
                      <h4 className="text-xl font-black text-slate-800 dark:text-white">{stats.platform.total_users}</h4>
                      <p className="text-[9px] text-emerald-500 font-bold mt-0.5">{stats.platform.new_users} new today</p>
                    </div>
                  </div>

                  {/* Resumes */}
                  <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-4 rounded-2xl flex flex-col justify-between shadow-sm space-y-4">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Resumes Tally</span>
                    <div>
                      <h4 className="text-xl font-black text-slate-800 dark:text-white">{stats.resumes.total_resumes}</h4>
                      <p className="text-[9px] text-indigo-500 font-bold mt-0.5">{stats.resumes.average_ats_score} Avg Score</p>
                    </div>
                  </div>

                  {/* Career */}
                  <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-4 rounded-2xl flex flex-col justify-between shadow-sm space-y-4">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Jobs activity</span>
                    <div>
                      <h4 className="text-xl font-black text-slate-800 dark:text-white">{stats.career.total_applications}</h4>
                      <p className="text-[9px] text-amber-500 font-bold mt-0.5">{stats.career.total_saved_jobs} saved jobs</p>
                    </div>
                  </div>

                  {/* Learning */}
                  <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-4 rounded-2xl flex flex-col justify-between shadow-sm space-y-4">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Learning Streaks</span>
                    <div>
                      <h4 className="text-xl font-black text-slate-800 dark:text-white">{stats.learning.total_learning_hours} hrs</h4>
                      <p className="text-[9px] text-emerald-500 font-bold mt-0.5">{stats.learning.active_roadmaps} roadmaps</p>
                    </div>
                  </div>

                  {/* AI Tools */}
                  <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-4 rounded-2xl flex flex-col justify-between shadow-sm space-y-4">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">AI Transactions</span>
                    <div>
                      <h4 className="text-xl font-black text-slate-800 dark:text-white">{stats.ai.gemini_requests}</h4>
                      <p className="text-[9px] text-rose-500 font-bold mt-0.5">${stats.ai.gemini_cost.toFixed(4)} cost</p>
                    </div>
                  </div>

                  {/* Assessments */}
                  <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-4 rounded-2xl flex flex-col justify-between shadow-sm space-y-4">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Assessments</span>
                    <div>
                      <h4 className="text-xl font-black text-slate-800 dark:text-white">
                        {stats.assessments.mock_tests_created + stats.assessments.interviews_completed}
                      </h4>
                      <p className="text-[9px] text-emerald-500 font-bold mt-0.5">{stats.assessments.average_score}% Avg Score</p>
                    </div>
                  </div>
                </div>

                {/* Platform Growth Activity Trend (Phase 2) */}
                <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-wider text-slate-450 dark:text-slate-400 flex items-center gap-1.5">
                        <FiTrendingUp className="text-indigo-500" /> Platform Transaction Trends
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold">Activity curves for user registrations, uploads, and AI usage.</p>
                    </div>

                    <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs bg-white dark:bg-slate-900 font-bold text-slate-500">
                      {['daily', 'weekly', 'monthly'].map((gran) => (
                        <button
                          key={gran}
                          onClick={() => setGrowthPeriod(gran)}
                          className={`px-3 py-1 border-r last:border-r-0 border-slate-200 dark:border-slate-800 capitalize transition-colors ${
                            growthPeriod === gran ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white' : ''
                          }`}
                        >
                          {gran}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Growth Area Chart */}
                  <div className="h-64 pt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={stats.platform.user_growth?.map((item, idx) => ({
                          date: item.date,
                          registrations: item.count || 0,
                          resumes: stats.resumes.upload_trend?.[idx]?.count || 0,
                          searches: stats.career.daily_job_searches?.[idx]?.count || 0
                        })) || []}
                      >
                        <defs>
                          <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="date" stroke="#94A3B8" fontSize={9} fontWeight="bold" />
                        <YAxis stroke="#94A3B8" fontSize={9} fontWeight="bold" />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                        <Area type="monotone" name="Registrations" dataKey="registrations" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#colorReg)" />
                        <Area type="monotone" name="Resumes Uploaded" dataKey="resumes" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRes)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: USER ANALYTICS (Phase 3) */}
            {activeTab === 'users' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-450 dark:text-slate-400">Most Engaged User Profiles</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-900 pb-2">
                          <th className="pb-3 text-slate-400 font-bold">User Email</th>
                          <th className="pb-3 text-slate-400 font-bold text-center">Applications</th>
                          <th className="pb-3 text-slate-400 font-bold text-center">Saved Jobs</th>
                          <th className="pb-3 text-slate-400 font-bold text-center">Avg Progress</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-900/60 font-semibold text-slate-700 dark:text-slate-350">
                        {userActivityTally.map((u, i) => (
                          <tr key={i} className="hover:bg-slate-50/20">
                            <td className="py-3 text-slate-900 dark:text-white font-bold">{u.email}</td>
                            <td className="py-3 text-center">{u.apps || 0}</td>
                            <td className="py-3 text-center">{u.saved || 0}</td>
                            <td className="py-3 text-center text-emerald-500 font-extrabold">{u.progress || 0}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-450 dark:text-slate-400">User Growth Breakdown</h4>
                  <div className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between items-center">
                      <span>Total Accounts</span>
                      <span className="text-slate-900 dark:text-white">{stats.platform.total_users}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Verified Accounts</span>
                      <span className="text-slate-900 dark:text-white">{stats.platform.total_users - stats.platform.admin_accounts}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Active Operators (Admin)</span>
                      <span className="text-indigo-500">{stats.platform.admin_accounts}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: RESUME ANALYTICS (Phase 4) */}
            {activeTab === 'resumes' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-450 dark:text-slate-400">ATS Score Segment Distribution</h4>
                  <div className="h-56 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.assessments.score_distribution || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="range" stroke="#94A3B8" fontSize={9} fontWeight="bold" />
                        <YAxis stroke="#94A3B8" fontSize={9} fontWeight="bold" />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Bar name="Resumes count" dataKey="count" fill="#4F46E5" radius={[6, 6, 0, 0]}>
                          {stats.assessments.score_distribution?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4F46E5' : '#10B981'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-450 dark:text-slate-400">Resume stats</h4>
                  <div className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between items-center">
                      <span>Total Resumes Uploaded</span>
                      <span className="text-slate-900 dark:text-white">{stats.resumes.total_resumes}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Average ATS Grade Score</span>
                      <span className="text-emerald-500 font-extrabold">{stats.resumes.average_ats_score} pts</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Resume Optimizations Runs</span>
                      <span className="text-slate-900 dark:text-white">{stats.resumes.resume_optimizations}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Parsing Engine Success Rate</span>
                      <span className="text-indigo-500 font-extrabold">{stats.resumes.parsing_success_rate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CAREER & JOBS (Phase 5) */}
            {activeTab === 'career' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Companies lists */}
                <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-450 dark:text-slate-400 flex items-center gap-1.5">
                    <FiBriefcase className="text-indigo-500" /> Top Saved & Applied Companies
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Top Saved Companies</span>
                      <div className="space-y-2">
                        {stats.career.most_saved_companies?.slice(0, 4).map((c, i) => (
                          <div key={i} className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                            <span>{c.name || 'Unknown'}</span>
                            <span className="text-slate-400">{c.count} saved</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <hr className="border-slate-100 dark:border-slate-900" />
                    
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Top Applied Companies</span>
                      <div className="space-y-2">
                        {stats.career.most_applied_companies?.slice(0, 4).map((c, i) => (
                          <div key={i} className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                            <span>{c.name || 'Unknown'}</span>
                            <span className="text-slate-400">{c.count} applications</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-450 dark:text-slate-400">Career telemetry Overview</h4>
                  <div className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between items-center">
                      <span>Total Applications Submitted</span>
                      <span className="text-slate-900 dark:text-white">{stats.career.total_applications}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Saved Jobs Count</span>
                      <span className="text-slate-900 dark:text-white">{stats.career.total_saved_jobs}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Career Insights Created</span>
                      <span className="text-slate-900 dark:text-white">{stats.career.total_career_insights}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Application Success Rate</span>
                      <span className="text-emerald-500 font-extrabold">{stats.career.application_success_rate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: LEARNING SPACE (Phase 6) */}
            {activeTab === 'learning' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-450 dark:text-slate-400">Popular roadmaps domains</h4>
                  <div className="space-y-3">
                    {stats.learning.most_popular_roadmaps?.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>{r.role}</span>
                        <span className="text-slate-400">{r.count} users</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-450 dark:text-slate-400">Learning statistics</h4>
                  <div className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between items-center">
                      <span>Active Career Roadmaps</span>
                      <span className="text-slate-900 dark:text-white">{stats.learning.active_roadmaps}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Average Roadmap Completion</span>
                      <span className="text-indigo-500 font-extrabold">{stats.learning.roadmap_completion}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Saved Courses Tally</span>
                      <span className="text-slate-900 dark:text-white">{stats.learning.total_saved_courses_mgt}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Total Learning hours</span>
                      <span className="text-emerald-500 font-extrabold">{stats.learning.total_learning_hours} hours</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: AI & CACHE (Phase 7) */}
            {activeTab === 'ai' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-455 dark:text-slate-400 flex items-center gap-1.5">
                    <FiCpu className="text-indigo-500" /> AI Tool popularity distribution
                  </h4>
                  <div className="space-y-3 font-bold text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between items-center">
                      <span>Resume Optimizer runs</span>
                      <span>{stats.ai.resume_optimizations_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Cover Letters Generated</span>
                      <span>{stats.ai.cover_letters_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Skill Gap Analysis Runs</span>
                      <span>{stats.ai.skill_gap_analyses_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Chatbot logs conversations</span>
                      <span>{stats.ai.chatbot_conversations_count}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-450 dark:text-slate-400">AI Tokens & Caching telemetry</h4>
                  <div className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between items-center">
                      <span>Total API Requests</span>
                      <span className="text-slate-900 dark:text-white">{stats.ai.gemini_requests}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Estimated API Cost (Gemini)</span>
                      <span className="text-emerald-500 font-extrabold">${stats.ai.gemini_cost.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Average API response time</span>
                      <span className="text-indigo-500 font-extrabold">{stats.ai.average_response_time} seconds</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Cache Footprint Hits Rate</span>
                      <span className="text-slate-900 dark:text-white">{stats.ai.cache_hit_rate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: ASSESSMENTS (Phase 8) */}
            {activeTab === 'assessments' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-450 dark:text-slate-400">Categories Performance</h4>
                  <div className="space-y-3">
                    {stats.assessments.popular_categories?.map((cat, idx) => (
                      <div key={idx} className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>{cat.category}</span>
                        <span className="text-slate-400">{cat.count} taken</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-450 dark:text-slate-400">Assessments success metrics</h4>
                  <div className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between items-center">
                      <span>Completed MCQ Mock Tests</span>
                      <span className="text-slate-900 dark:text-white">{stats.assessments.mock_tests_created}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Completed AI Interview Sessions</span>
                      <span className="text-slate-900 dark:text-white">{stats.assessments.interviews_completed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Average score scorecard</span>
                      <span className="text-emerald-500 font-extrabold">{stats.assessments.average_score}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Interview Success Rate</span>
                      <span className="text-indigo-500 font-extrabold">{stats.assessments.interview_success_rate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 8: SOFT DELETE AUDIT (Phase 10) */}
            {activeTab === 'soft_delete' && (
              <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-450 dark:text-slate-400">
                  Enterprise Soft Delete Auditing Breakdown
                </h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-5 py-3 text-slate-400 font-bold uppercase text-[9px] tracking-wider">Module Layer</th>
                        <th className="px-5 py-3 text-slate-400 font-bold uppercase text-[9px] tracking-wider text-center">Active Records</th>
                        <th className="px-5 py-3 text-slate-400 font-bold uppercase text-[9px] tracking-wider text-center">Soft Deleted</th>
                        <th className="px-5 py-3 text-slate-400 font-bold uppercase text-[9px] tracking-wider text-center">Restored Logs</th>
                        <th className="px-5 py-3 text-slate-400 font-bold uppercase text-[9px] tracking-wider text-center">Permanently Purged</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900/60 font-semibold text-slate-700 dark:text-slate-300">
                      {Object.keys(stats.soft_delete || {}).map((modKey) => {
                        const cell = stats.soft_delete[modKey];
                        
                        return (
                          <tr key={modKey} className="hover:bg-slate-50/20">
                            <td className="px-5 py-3.5 capitalize text-slate-900 dark:text-white font-bold">{modKey}</td>
                            <td className="px-5 py-3.5 text-center font-bold text-slate-800 dark:text-slate-200">{cell.active}</td>
                            <td className="px-5 py-3.5 text-center font-bold text-rose-500">{cell.deleted}</td>
                            <td className="px-5 py-3.5 text-center font-bold text-emerald-500">{cell.restored}</td>
                            <td className="px-5 py-3.5 text-center font-bold text-indigo-500">{cell.hard_deleted}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 9: SYSTEM HEALTH (Phase 9) */}
            {activeTab === 'system' && (
              <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-xl">
                    <FiServer className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-tight">Platform Sub-system Health Monitor</h4>
                    <p className="text-[10px] text-slate-400 font-semibold">Live status reports computed directly from daemon system telemetry calls.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { title: 'Server Uptime', value: stats.system.uptime },
                    { title: 'CPU Resource Usage', value: `${stats.system.cpu_usage}%` },
                    { title: 'Memory Virtual Usage', value: `${stats.system.memory_usage}%` },
                    { title: 'Disk Usage Fraction', value: `${stats.system.disk_usage}%` }
                  ].map((it, idx) => (
                    <div key={idx} className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                      <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">{it.title}</span>
                      <span className="text-lg font-black text-slate-800 dark:text-white">{it.value}</span>
                    </div>
                  ))}
                </div>

                <hr className="border-slate-100 dark:border-slate-900" />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-black">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-slate-450">MongoDB Server:</span>
                    <span className="text-emerald-500">{stats.system.mongodb_status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-slate-455">Redis Cache Client:</span>
                    <span className="text-emerald-500">{stats.system.cache_status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-slate-455">Backend Node endpoints:</span>
                    <span className="text-emerald-500">{stats.system.api_status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-slate-455">Server Daemon:</span>
                    <span className="text-emerald-500">{stats.system.server_status}</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
