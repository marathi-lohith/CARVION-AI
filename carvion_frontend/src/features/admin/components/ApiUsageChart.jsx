import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line, PieChart, Pie
} from 'recharts';
import {
  FiTrendingUp, FiActivity, FiDollarSign, FiDatabase,
  FiDownload, FiCalendar, FiCheckCircle, FiUsers, FiFileText,
  FiBriefcase, FiBookOpen, FiAward, FiCpu, FiMail, FiLayers,
  FiShield, FiAlertCircle, FiClock, FiServer, FiHardDrive, FiCheck
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

export default function ApiUsageChart({ telemetry, userActivity = [], adminActivity = [] }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showExportToast, setShowExportToast] = useState(false);

  // Safe fallbacks if telemetry is not yet loaded
  const stats = telemetry || {
    platform: { total_users: 0, active_users_today: 0, new_users: 0, admin_accounts: 0, user_growth: [], profile_completion: 0 },
    resumes: { total_resumes: 0, uploaded_today: 0, average_ats_score: 0, resume_optimizations: 0, resume_downloads: 0, parsing_success_rate: 100, upload_trend: [], ats_trend: [] },
    career: { job_searches: 0, auto_recommendations: 0, saved_jobs: 0, applications_submitted: 0, application_success_rate: 0, most_searched_roles: 'N/A', most_viewed_jobs: 'N/A', daily_job_searches: [], application_trends: [] },
    learning: { course_searches: 0, active_roadmaps: 0, completed_courses: 0, study_hours: 0, learning_streak: 0, weekly_learning: [], monthly_learning: [], roadmap_completion: 0 },
    ai: { gemini_requests: 0, gemini_cost: 0, tokens_used: 0, failed_requests: 0, rate_limit_errors: 0, average_response_time: 1.8, ai_usage_trend: [], daily_ai_requests: [] },
    assessments: { mock_tests_created: 0, interviews_completed: 0, average_score: 0, performance_reviews: 0, pass_rate: 0, assessment_trend: [], score_distribution: [] },
    contact: { total_messages: 0, pending_messages: 0, replied_messages: 0, unread_messages: 0 },
    content: { faq_count: 6, announcements: 0, guides: 4, blog_posts: 8 },
    system: { server_status: 'Operational', mongodb_status: 'Operational', cache_status: 'Active', api_status: 'Healthy', uptime: '0h 0m', cpu_usage: 0, memory_usage: 0, disk_usage: 0 },
    external_api: {
      gemini: { status: 'Healthy', requests: 0, failures: 0, tokens_used: 0, cost: 0, remaining_quota: 100 },
      jsearch: { status: 'Healthy', requests: 0, cache_hits: 0, cache_misses: 0, failures: 0 },
      youtube: { status: 'Healthy', requests: 0, errors: 0 }
    }
  };

  const handleExport = () => {
    setShowExportToast(true);
    setTimeout(() => setShowExportToast(false), 3000);
  };

  const chartTooltipStyle = {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 'bold',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
  };

  const formatActivityType = (type) => {
    return type.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Top Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Admin Control Center</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Real-time statistics, micro-services monitoring, and live events feeds</p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center space-x-1.5 px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400 font-bold transition-all text-xs"
        >
          <FiDownload className="w-3.5 h-3.5" />
          <span>Export Analytics</span>
        </button>
      </div>

      {/* Tabs Sub-Navigation */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-950/60 rounded-2xl border border-slate-200/50 dark:border-slate-850">
        {[
          { id: 'overview', name: 'Overview', icon: <FiActivity className="w-3.5 h-3.5" /> },
          { id: 'resumes', name: 'Resumes & Career', icon: <FiFileText className="w-3.5 h-3.5" /> },
          { id: 'learning', name: 'Learning & Tests', icon: <FiBookOpen className="w-3.5 h-3.5" /> },
          { id: 'ai', name: 'AI & Services Monitor', icon: <FiCpu className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-800 text-orange-500 shadow-md shadow-slate-200/40 dark:shadow-none'
                : 'text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon}
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* TAB 1: CONSOLE OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* Platform overview metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                {[
                  { title: 'Total Users', val: stats.platform.total_users, desc: 'Registered accounts', color: 'orange', icon: <FiUsers /> },
                  { title: 'Active Today', val: stats.platform.active_users_today, desc: 'Engaged users', color: 'emerald', icon: <FiActivity /> },
                  { title: 'New Users Today', val: stats.platform.new_users, desc: 'Past 24 hours', color: 'blue', icon: <FiTrendingUp /> },
                  { title: 'Admin Accounts', val: stats.platform.admin_accounts, desc: 'Staff operators', color: 'violet', icon: <FiShield /> },
                  { title: 'Profile Completion', val: `${stats.platform.profile_completion}%`, desc: 'Average user profile', color: 'amber', icon: <FiCheckCircle /> },
                ].map((c) => (
                  <motion.div
                    key={c.title}
                    whileHover={{ y: -3 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5 shadow-sm space-y-2.5 relative overflow-hidden transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">{c.title}</p>
                        <p className="text-2xl font-black text-slate-850 dark:text-white mt-1">{c.val}</p>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${
                        c.color === 'orange' ? 'bg-orange-50/50 dark:bg-orange-950/20 text-orange-500 border-orange-100/50 dark:border-orange-900/40' :
                        c.color === 'emerald' ? 'bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-500 border-emerald-100/50 dark:border-emerald-900/40' :
                        c.color === 'blue' ? 'bg-blue-50/50 dark:bg-blue-950/20 text-blue-500 border-blue-100/50 dark:border-blue-900/40' :
                        c.color === 'violet' ? 'bg-violet-50/50 dark:bg-violet-950/20 text-violet-500 border-violet-100/50 dark:border-violet-900/40' :
                        'bg-amber-50/50 dark:bg-amber-950/20 text-amber-500 border-amber-100/50 dark:border-amber-900/40'
                      }`}>
                        {c.icon}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-550 font-bold">{c.desc}</p>
                  </motion.div>
                ))}
              </div>

              {/* Uptime and Server Status (System Monitor) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-950 text-slate-650 dark:text-slate-400 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                    <FiServer className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-slate-800 dark:text-white uppercase tracking-tight">System Status & Environment Monitor</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Live server resource scans and daemon statuses</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Uptime', value: stats.system.uptime, sub: 'Server Availability' },
                    { label: 'CPU Usage', value: `${stats.system.cpu_usage}%`, sub: 'Processor Workload' },
                    { label: 'Memory Allocation', value: `${stats.system.memory_usage}%`, sub: 'RAM Utilized' },
                    { label: 'Disk Allocation', value: `${stats.system.disk_usage}%`, sub: 'Hard drive footprint' },
                  ].map((sys) => (
                    <div key={sys.label} className="p-4 bg-slate-50/40 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-850 rounded-xl space-y-1">
                      <p className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider">{sys.label}</p>
                      <p className="text-xl font-black text-slate-800 dark:text-white">{sys.value}</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-600 font-semibold">{sys.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Subsystem Health Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2 text-xs font-extrabold">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-slate-500">MongoDB:</span>
                    <span className="text-emerald-500">{stats.system.mongodb_status}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-extrabold">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-slate-500">Redis Cache:</span>
                    <span className="text-emerald-500">{stats.system.cache_status}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-extrabold">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-slate-500">Node API:</span>
                    <span className="text-emerald-500">{stats.system.api_status}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-extrabold">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-slate-500">Server Health:</span>
                    <span className="text-emerald-500">{stats.system.server_status}</span>
                  </div>
                </div>
              </div>

              {/* Real-time Feeds (Recent Activity Logs) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Activity Feed */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col h-[500px]">
                  <div className="pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                      Recent User Activity Feed
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-550 font-bold mt-0.5">Real-time trace of user operations and transactions</p>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin">
                    {userActivity.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-550 font-bold text-center pt-20">No recent user activities recorded.</p>
                    ) : (
                      userActivity.map((log) => (
                        <div key={log.id} className="p-3 bg-slate-50/40 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-xl flex items-start space-x-3.5">
                          <div className={`mt-0.5 w-6 h-6 rounded-lg text-xs font-extrabold flex items-center justify-center shrink-0 ${
                            log.status === 'failed' ? 'bg-red-50 text-red-500 dark:bg-red-950/20' : 'bg-slate-100 text-slate-650 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {log.module.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-black text-slate-800 dark:text-slate-250 truncate">{log.user_name || log.user_email}</p>
                              <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-550 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {formatActivityType(log.activity_type)}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-[#8A9BB5] mt-1 leading-relaxed">{log.description}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <FiClock className="w-3 h-3 text-slate-350" />
                              <span className="text-[8px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-tight">
                                {new Date(log.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Admin Activity Feed */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col h-[500px]">
                  <div className="pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                      <FiShield className="text-violet-500" />
                      Staff Operator Action Audit
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-550 font-bold mt-0.5">Chronological record of administrative operations</p>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin">
                    {adminActivity.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-550 font-bold text-center pt-20">No administrative logs recorded.</p>
                    ) : (
                      adminActivity.map((log) => (
                        <div key={log.id} className="p-3 bg-slate-50/40 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-xl flex items-start space-x-3.5 border-l-2 border-l-violet-500">
                          <div className="w-6 h-6 rounded-lg bg-violet-50 text-violet-500 dark:bg-violet-950/20 text-xs font-black flex items-center justify-center shrink-0">
                            AD
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-black text-slate-800 dark:text-slate-250 truncate">{log.user_name || log.user_email}</p>
                              <span className="text-[8px] font-black uppercase text-violet-500 bg-violet-50 dark:bg-violet-950/20 px-1.5 py-0.5 rounded">
                                {formatActivityType(log.activity_type)}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-550 dark:text-slate-450 mt-1 leading-relaxed font-semibold">{log.description}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <FiClock className="w-3 h-3 text-slate-350" />
                              <span className="text-[8px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-tight">
                                {new Date(log.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: RESUME & CAREER ANALYTICS */}
          {activeTab === 'resumes' && (
            <div className="space-y-6">
              {/* Resumes Stats */}
              <div>
                <h4 className="font-extrabold text-sm text-slate-400 dark:text-slate-500 dark:text-[#6B7FA3] uppercase tracking-widest mb-3">Resume Builders Analytics</h4>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
                  {[
                    { label: 'Total Resumes', val: stats.resumes.total_resumes },
                    { label: 'Uploaded Today', val: stats.resumes.uploaded_today },
                    { label: 'Average ATS Score', val: `${stats.resumes.average_ats_score} pts` },
                    { label: 'Optimizations', val: stats.resumes.resume_optimizations },
                    { label: 'Downloads', val: stats.resumes.resume_downloads },
                    { label: 'Parsing Success Rate', val: `${stats.resumes.parsing_success_rate}%` },
                  ].map((resCard) => (
                    <div key={resCard.label} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm text-center">
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">{resCard.label}</p>
                      <p className="text-xl font-black text-slate-850 dark:text-white mt-1">{resCard.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resume Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <h5 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase mb-4 tracking-wider">Resume Uploads Trend</h5>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.resumes.upload_trend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800/40" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Area type="monotone" name="Uploads" dataKey="count" stroke="#f97316" fill="#ffedd5" className="dark:fill-orange-950/20" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <h5 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase mb-4 tracking-wider">Average ATS score development</h5>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.resumes.ats_trend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800/40" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Line type="monotone" name="ATS Score" dataKey="score" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Career Analytics */}
              <div>
                <h4 className="font-extrabold text-sm text-slate-400 dark:text-slate-500 dark:text-[#6B7FA3] uppercase tracking-widest mb-3 mt-4">Jobs & Recommendations Analytics</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                  {[
                    { label: 'Job Searches', val: stats.career.job_searches },
                    { label: 'Auto Recommendations', val: stats.career.auto_recommendations },
                    { label: 'Bookmarked Jobs', val: stats.career.saved_jobs },
                    { label: 'Applications Submitted', val: stats.career.applications_submitted },
                    { label: 'App Success Rate', val: `${stats.career.application_success_rate}%` },
                  ].map((carCard) => (
                    <div key={carCard.label} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm text-center">
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">{carCard.label}</p>
                      <p className="text-xl font-black text-slate-850 dark:text-white mt-1">{carCard.val}</p>
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs font-semibold text-slate-650 dark:text-slate-350">
                    <span className="font-black text-[10px] uppercase text-slate-400 tracking-wider">Top Searched Roles: </span>
                    <span className="ml-1 text-slate-800 dark:text-white font-extrabold">{stats.career.most_searched_roles}</span>
                  </div>
                  <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs font-semibold text-slate-650 dark:text-slate-350">
                    <span className="font-black text-[10px] uppercase text-slate-400 tracking-wider">Most Viewed Jobs: </span>
                    <span className="ml-1 text-slate-800 dark:text-white font-extrabold">{stats.career.most_viewed_jobs}</span>
                  </div>
                </div>
              </div>

              {/* Career Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <h5 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase mb-4 tracking-wider">Daily Job Searches</h5>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.career.daily_job_searches}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800/40" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Bar dataKey="count" name="Searches" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <h5 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase mb-4 tracking-wider">Applications Submitted Trend</h5>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.career.application_trends}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800/40" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Line type="monotone" name="Applications" dataKey="count" stroke="#a855f7" strokeWidth={2.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LEARNING & ASSESSMENTS */}
          {activeTab === 'learning' && (
            <div className="space-y-6">
              {/* Learning Analytics */}
              <div>
                <h4 className="font-extrabold text-sm text-slate-400 dark:text-slate-500 dark:text-[#6B7FA3] uppercase tracking-widest mb-3">Course Navigator & Roadmaps</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                  {[
                    { label: 'Course Searches', val: stats.learning.course_searches },
                    { label: 'Active Roadmaps', val: stats.learning.active_roadmaps },
                    { label: 'Completed Courses', val: stats.learning.completed_courses },
                    { label: 'Study Hours', val: `${stats.learning.study_hours}h` },
                    { label: 'Learning Streak', val: `${stats.learning.learning_streak} days` },
                  ].map((lCard) => (
                    <div key={lCard.label} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm text-center">
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">{lCard.label}</p>
                      <p className="text-xl font-black text-slate-850 dark:text-white mt-1">{lCard.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Learning Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <h5 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase mb-4 tracking-wider">Weekly Study Hours</h5>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.learning.weekly_learning}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800/40" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Bar dataKey="hours" name="Study Hours" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <h5 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase mb-4 tracking-wider">Monthly Study Hours</h5>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.learning.monthly_learning}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800/40" />
                        <XAxis dataKey="week" stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Area type="monotone" name="Study Hours" dataKey="hours" stroke="#6366f1" fill="#e0e7ff" className="dark:fill-indigo-950/20" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase mb-4 tracking-wider">Roadmap Milestones Progress</h5>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mb-6">Aggregate percentage completion of active milestones</p>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center space-y-4 pb-4">
                    <div className="relative w-28 h-28 flex items-center justify-center rounded-full border-8 border-slate-100 dark:border-slate-800/60">
                      <span className="text-xl font-black text-slate-800 dark:text-white">{stats.learning.roadmap_completion}%</span>
                      {/* Sub progress circle simulation */}
                      <svg className="absolute w-28 h-28 transform -rotate-90">
                        <circle
                          cx="56"
                          cy="56"
                          r="48"
                          stroke="#f97316"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={301.6}
                          strokeDashoffset={301.6 - (301.6 * stats.learning.roadmap_completion) / 100}
                        />
                      </svg>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase text-orange-500 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900 px-3 py-1 rounded-full">
                      Avg Milestone Rate
                    </span>
                  </div>
                </div>
              </div>

              {/* Assessments Analytics */}
              <div>
                <h4 className="font-extrabold text-sm text-slate-400 dark:text-slate-500 dark:text-[#6B7FA3] uppercase tracking-widest mb-3 mt-4">Mock Assessments & Interviews</h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                  {[
                    { label: 'Mock Tests Created', val: stats.assessments.mock_tests_created },
                    { label: 'Interviews Completed', val: stats.assessments.interviews_completed },
                    { label: 'Average Score', val: `${stats.assessments.average_score}%` },
                    { label: 'Performance Reviews', val: stats.assessments.performance_reviews },
                    { label: 'Pass Rate (>=70%)', val: `${stats.assessments.pass_rate}%` },
                  ].map((aCard) => (
                    <div key={aCard.label} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm text-center">
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">{aCard.label}</p>
                      <p className="text-xl font-black text-slate-850 dark:text-white mt-1">{aCard.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assessment Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <h5 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase mb-4 tracking-wider">Assessment Generations Trend</h5>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.assessments.assessment_trend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800/40" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Area type="monotone" name="Tests Created" dataKey="count" stroke="#ec4899" fill="#fce7f3" className="dark:fill-pink-950/20" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <h5 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase mb-4 tracking-wider">Score Distribution Density</h5>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.assessments.score_distribution}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800/40" />
                        <XAxis dataKey="range" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Bar dataKey="count" name="Scorecards" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AI & API MONITOR */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              {/* AI Analytics */}
              <div>
                <h4 className="font-extrabold text-sm text-slate-400 dark:text-slate-500 dark:text-[#6B7FA3] uppercase tracking-widest mb-3">Google Gemini Telemetry</h4>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
                  {[
                    { label: 'Gemini Requests', val: stats.ai.gemini_requests },
                    { label: 'Gemini Cost', val: `$${stats.ai.gemini_cost.toFixed(4)}` },
                    { label: 'Tokens Used', val: stats.ai.tokens_used.toLocaleString() },
                    { label: 'Failed Requests', val: stats.ai.failed_requests },
                    { label: 'Rate Limits', val: stats.ai.rate_limit_errors },
                    { label: 'Avg Latency', val: `${stats.ai.average_response_time}s` },
                  ].map((aiCard) => (
                    <div key={aiCard.label} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm text-center">
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">{aiCard.label}</p>
                      <p className="text-xl font-black text-slate-850 dark:text-white mt-1">{aiCard.val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Usage Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <h5 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase mb-4 tracking-wider">AI Costs Trend (USD)</h5>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.ai.ai_usage_trend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800/40" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Area type="monotone" name="Cost ($)" dataKey="cost" stroke="#10b981" fill="#ecfdf5" className="dark:fill-emerald-950/20" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <h5 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase mb-4 tracking-wider">Daily AI Queries Count</h5>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.ai.daily_ai_requests}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800/40" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Bar dataKey="requests" name="Requests" fill="#f97316" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* External API monitoring cards */}
              <div>
                <h4 className="font-extrabold text-sm text-slate-400 dark:text-slate-500 dark:text-[#6B7FA3] uppercase tracking-widest mb-3 mt-4">External Integrations Health</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Gemini API */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-white">Google Gemini</h5>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                        {stats.external_api.gemini.status}
                      </span>
                    </div>
                    
                    <div className="text-xs space-y-2 font-semibold text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>API Queries:</span>
                        <span className="text-slate-800 dark:text-white">{stats.external_api.gemini.requests}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Failures Log:</span>
                        <span className="text-slate-800 dark:text-white">{stats.external_api.gemini.failures}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gemini Cost:</span>
                        <span className="text-slate-800 dark:text-white">${stats.external_api.gemini.cost.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Remaining Quota:</span>
                        <span className="text-slate-800 dark:text-white">{stats.external_api.gemini.remaining_quota}%</span>
                      </div>
                    </div>
                  </div>

                  {/* JSearch API */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-white">Rapid JSearch</h5>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                        {stats.external_api.jsearch.status}
                      </span>
                    </div>
                    
                    <div className="text-xs space-y-2 font-semibold text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Rapid API Requests:</span>
                        <span className="text-slate-800 dark:text-white">{stats.external_api.jsearch.requests}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cache Hits (TTL):</span>
                        <span className="text-slate-800 dark:text-white">{stats.external_api.jsearch.cache_hits}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cache Misses:</span>
                        <span className="text-slate-800 dark:text-white">{stats.external_api.jsearch.cache_misses}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Failures Log:</span>
                        <span className="text-slate-800 dark:text-white">{stats.external_api.jsearch.failures}</span>
                      </div>
                    </div>
                  </div>

                  {/* YouTube Data API */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-white">YouTube Data v3</h5>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                        {stats.external_api.youtube.status}
                      </span>
                    </div>
                    
                    <div className="text-xs space-y-2 font-semibold text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Google API Queries:</span>
                        <span className="text-slate-800 dark:text-white">{stats.external_api.youtube.requests}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>API Error Logs:</span>
                        <span className="text-slate-800 dark:text-white">{stats.external_api.youtube.errors}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dynamic Report Export Success Toast Notification */}
      <AnimatePresence>
        {showExportToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-2xl flex items-center space-x-3 shadow-2xl border border-slate-800 z-50 text-xs font-bold"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FiCheckCircle className="w-4 h-4" />
            </div>
            <span>Control Center Analytics exported successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
