import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FiActivity, FiCheckCircle, FiAlertTriangle, FiAlertCircle, FiClock,
  FiUsers, FiFileText, FiAward, FiBookOpen, FiBriefcase, FiBell,
  FiMail, FiMessageSquare, FiTrendingUp, FiTrendingDown, FiSettings,
  FiRefreshCw, FiExternalLink, FiHardDrive, FiCpu, FiPlay
} from 'react-icons/fi';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';

export default function DashboardOverview({ onNavigate }) {
  // 1. Fetch unified dashboard stats
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['adminDashboardStats'],
    queryFn: async () => {
      const response = await apiClient.get('/api/admin/dashboard-stats/');
      return response.data?.data || response.data;
    },
    refetchInterval: 30000 // auto-refresh every 30 seconds
  });

  if (isLoading) {
    return <Loader fullScreen={false} skeleton={true} variant="grid" />;
  }

  if (isError || !data) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 rounded-2xl flex flex-col items-center justify-center space-y-3">
        <FiAlertTriangle className="w-8 h-8 text-rose-500 animate-pulse" />
        <h4 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-tight">Failed to load platform dashboard metrics.</h4>
        <p className="text-[10px] text-slate-400 font-bold max-w-xs">Verify database connectivity and check system logs.</p>
        <button
          onClick={() => refetch()}
          className="mt-2 px-4 py-2 bg-indigo-50 text-indigo-650 hover:bg-indigo-100 rounded-xl font-black text-xs transition cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { platform, kpis = [], today_activity = {}, ai_usage = {}, system_health = {}, alerts = [], recent_activity = [], sparklines = {}, distribution = {} } = data;

  // Icons mapper for executive cards
  const getKpiIcon = (id) => {
    const map = {
      users: <FiUsers className="w-4 h-4 text-indigo-600" />, 
      active_users: <FiCheckCircle className="w-4 h-4 text-emerald-600" />, 
      inactive_users: <FiAlertCircle className="w-4 h-4 text-amber-600" />, 
      resumes: <FiFileText className="w-4 h-4 text-sky-600" />, 
      analyses: <FiCpu className="w-4 h-4 text-amber-600" />, 
      interviews: <FiAward className="w-4 h-4 text-pink-600" />, 
      roadmaps: <FiBookOpen className="w-4 h-4 text-violet-600" />, 
      saved_jobs: <FiBriefcase className="w-4 h-4 text-teal-600" />, 
      applications: <FiBriefcase className="w-4 h-4 text-rose-600" />, 
      saved_courses: <FiBookOpen className="w-4 h-4 text-indigo-600" />, 
      notifications: <FiBell className="w-4 h-4 text-orange-600" />,
      chats: <FiMessageSquare className="w-4 h-4 text-sky-600" />,
      tickets: <FiMail className="w-4 h-4 text-red-600" />,
    };
    return map[id] || <FiActivity className="w-4 h-4 text-slate-500" />;
  };

  // Sparkline Chart Component
  const Sparkline = ({ chartData }) => {
    if (!chartData || chartData.length === 0) return null;
    return (
      <ResponsiveContainer width="100%" height={32}>
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="count"
            stroke="#6366f1"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6 text-slate-700 dark:text-slate-300 font-sans">
      {/* SECTION 1 — Platform Status Banner */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${platform.status === 'online' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500 animate-pulse'}`} />
          <div>
            <h2 className="text-xs font-black uppercase text-slate-850 dark:text-white tracking-tight flex items-center gap-1.5">
              Platform Status: <span className={platform.status === 'online' ? 'text-emerald-600' : 'text-amber-600'}>{platform.status}</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Last refresh: {new Date(platform.last_refresh).toLocaleTimeString()}</p>
          </div>
        </div>

        {/* External Connectors */}
        <div className="flex items-center gap-3.5 flex-wrap text-[10px] font-black uppercase tracking-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">MongoDB:</span>
            <span className={`px-2 py-0.5 rounded ${platform.db_conn === 'connected' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20'}`}>
              {platform.db_conn}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Gemini:</span>
            <span className={`px-2 py-0.5 rounded ${platform.services.gemini === 'online' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20'}`}>
              {platform.services.gemini}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">YouTube:</span>
            <span className={`px-2 py-0.5 rounded ${platform.services.youtube === 'online' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20'}`}>
              {platform.services.youtube}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">JSearch:</span>
            <span className={`px-2 py-0.5 rounded ${platform.services.jsearch === 'online' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20'}`}>
              {platform.services.jsearch}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">OAuth:</span>
            <span className={`px-2 py-0.5 rounded ${platform.services.google_oauth === 'online' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20'}`}>
              {platform.services.google_oauth}
            </span>
          </div>

          <button
            onClick={() => refetch()}
            className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition text-slate-500 cursor-pointer"
          >
            <FiRefreshCw className={`w-3.5 h-3.5`} />
          </button>
        </div>
      </div>

      {/* SECTION 6 — Quick Alerts (Highest visibility) */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map((alert, i) => (
            <div key={i} className={`p-4 border rounded-2xl flex items-start gap-3 shadow-sm ${
              alert.type === 'CRITICAL' 
                ? 'bg-rose-50/50 border-rose-200 text-rose-800 dark:bg-rose-950/10 dark:border-rose-900/50 dark:text-rose-400' 
                : alert.type === 'WARNING' 
                  ? 'bg-amber-50/50 border-amber-200 text-amber-800 dark:bg-amber-950/10 dark:border-amber-900/50 dark:text-amber-400'
                  : 'bg-blue-50/50 border-blue-200 text-blue-800 dark:bg-blue-950/10 dark:border-blue-900/50 dark:text-blue-400'
            }`}>
              {alert.type === 'CRITICAL' ? <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <FiAlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
              <div>
                <p className="text-xs font-black uppercase tracking-tight">{alert.type} Alert</p>
                <p className="text-[11px] font-bold mt-1 opacity-90">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECTION 2 — Executive KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.id} className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-4 rounded-2xl shadow-sm flex flex-col justify-between space-y-3 relative group">
            <div className="flex items-center justify-between">
              <span className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-900">
                {getKpiIcon(kpi.id)}
              </span>
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-black uppercase ${
                kpi.trend === 'up' ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {kpi.trend === 'up' ? <FiTrendingUp className="w-3.5 h-3.5" /> : <FiTrendingDown className="w-3.5 h-3.5" />}
                {kpi.trend}
              </span>
            </div>

            <div>
              <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">{kpi.label}</span>
              <h3 className="text-2xl font-black text-slate-850 dark:text-white mt-1">{kpi.val}</h3>
            </div>

            <button
              onClick={() => onNavigate(kpi.path)}
              className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-650 cursor-pointer"
            >
              <FiExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Grid for activity stats & AI Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SECTION 3 — Today's Activity */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-850 dark:text-white tracking-wider flex items-center gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-900">
            <span className="w-1.5 h-3.5 bg-indigo-650 rounded-full" /> Today's Activity
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
            {[
              { label: 'New Users', val: today_activity.new_users },
              { label: 'Resumes Uploaded', val: today_activity.resume_uploads },
              { label: 'AI Recommendations', val: today_activity.ai_analyses },
              { label: 'Interviews Generated', val: today_activity.interviews },
              { label: 'Courses Bookmarked', val: today_activity.courses_saved },
              { label: 'Applications Made', val: today_activity.jobs_applied },
              { label: 'Notifications Broadcast', val: today_activity.notifications_sent },
              { label: 'Support Tickets', val: today_activity.tickets_submitted }
            ].map((act, idx) => (
              <div key={idx} className="bg-slate-50/50 dark:bg-slate-900/20 p-3 rounded-xl border border-slate-100/50 dark:border-slate-900/50 flex flex-col justify-between">
                <span className="text-[10px] text-slate-450 uppercase font-black">{act.label}</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">{act.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4 — AI Usage Overview */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-850 dark:text-white tracking-wider flex items-center gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-900">
            <span className="w-1.5 h-3.5 bg-amber-500 rounded-full" /> AI Usage Overview
          </h3>
          <div className="space-y-3.5 font-bold text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-900/50">
              <span className="text-slate-450">Gemini Requests Today</span>
              <span className="text-slate-850 dark:text-white font-black">{ai_usage.requests_today}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-900/50">
              <span className="text-slate-450">Average Response Time</span>
              <span className="text-slate-850 dark:text-white font-black">{ai_usage.average_response_time}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-900/50">
              <span className="text-slate-450">Failed Requests</span>
              <span className={`font-black ${ai_usage.failed_requests > 0 ? 'text-rose-600' : 'text-slate-850 dark:text-white'}`}>
                {ai_usage.failed_requests}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-900/50">
              <span className="text-slate-450">Success Rate</span>
              <span className="text-emerald-600 font-black">{ai_usage.success_rate}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-900/50">
              <span className="text-slate-450">Current Cache Usage</span>
              <span className="text-slate-850 dark:text-white font-black">{ai_usage.cache_usage}</span>
            </div>
            <div className="flex flex-col gap-1 pt-1">
              <span className="text-slate-400 text-[10px]">Last AI Request Timestamp</span>
              <span className="font-mono text-[9px] text-slate-550 truncate bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-900">
                {ai_usage.last_request ? new Date(ai_usage.last_request).toLocaleString() : 'No recent operations'}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 5 — System Health */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-850 dark:text-white tracking-wider flex items-center gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-900">
            <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full" /> System Health
          </h3>
          <div className="space-y-3.5 font-bold text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-900/50">
              <span className="text-slate-450">MongoDB Connectivity</span>
              <span className="text-emerald-600 font-black">Connected</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-900/50">
              <span className="text-slate-450">Backend API Gateway</span>
              <span className="text-emerald-600 font-black">{system_health.api}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-900/50">
              <span className="text-slate-450">Database Storage Size</span>
              <span className="text-slate-850 dark:text-white font-black">{system_health.storage}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-900/50">
              <span className="text-slate-450">Active Caches documents</span>
              <span className="text-slate-850 dark:text-white font-black">{system_health.cache_docs}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-900/50">
              <span className="text-slate-450">Uptime Duration</span>
              <span className="text-indigo-600 font-black">{system_health.uptime}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-900/50">
              <span className="text-slate-450">Maintenance Lockdown Mode</span>
              <span className={`font-black uppercase text-[10px] ${system_health.maintenance_mode === 'enabled' ? 'text-amber-600 animate-pulse' : 'text-slate-450'}`}>
                {system_health.maintenance_mode}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid for sparkline charts & recent actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SECTION 9 — Mini Analytics (Sparklines) */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-850 dark:text-white tracking-wider flex items-center gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-900">
            <span className="w-1.5 h-3.5 bg-indigo-500 rounded-full" /> Mini Analytics (7d)
          </h3>
          <div className="space-y-4 pt-1">
            {[
              { label: 'User Registration Growth', key: 'users' },
              { label: 'Resume Upload Metrics', key: 'resumes' },
              { label: 'AI Optimization Requests', key: 'ai' }
            ].map((spark, idx) => (
              <div key={idx} className="border border-slate-150/40 dark:border-slate-900 p-3.5 rounded-2xl bg-slate-50/20 dark:bg-slate-900/10">
                <span className="text-[10px] uppercase font-black text-slate-400 block mb-2">{spark.label}</span>
                <Sparkline chartData={sparklines[spark.key]} />
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 10 — Platform Distribution */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-850 dark:text-white tracking-wider flex items-center gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-900">
            <span className="w-1.5 h-3.5 bg-teal-500 rounded-full" /> Platform Distribution
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs font-bold pt-1">
            {[
              { label: 'Users', val: distribution.users, bg: 'bg-indigo-50/60 text-indigo-700 dark:bg-indigo-950/20' },
              { label: 'Resumes', val: distribution.resumes, bg: 'bg-emerald-50/60 text-emerald-700 dark:bg-emerald-950/20' },
              { label: 'Learning', val: distribution.learning, bg: 'bg-purple-50/60 text-purple-700 dark:bg-purple-950/20' },
              { label: 'Jobs', val: distribution.jobs, bg: 'bg-sky-50/60 text-sky-700 dark:bg-sky-950/20' },
              { label: 'Assessments', val: distribution.assessments, bg: 'bg-pink-50/60 text-pink-700 dark:bg-pink-950/20' },
              { label: 'Notifications', val: distribution.notifications, bg: 'bg-rose-50/60 text-rose-700 dark:bg-rose-950/20' },
              { label: 'Chats', val: distribution.chats, bg: 'bg-teal-50/60 text-teal-700 dark:bg-teal-950/20' },
              { label: 'Tickets', val: distribution.tickets, bg: 'bg-red-50/60 text-red-700 dark:bg-red-950/20' }
            ].map((dist, idx) => (
              <div key={idx} className={`p-3 rounded-xl border border-transparent flex flex-col justify-between ${dist.bg}`}>
                <span className="text-[10px] uppercase font-black opacity-80">{dist.label}</span>
                <span className="text-base font-black mt-1">{dist.val}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 8 — Quick Actions */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-850 dark:text-white tracking-wider flex items-center gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-900">
            <span className="w-1.5 h-3.5 bg-purple-500 rounded-full" /> Quick Action Links
          </h3>
          <div className="grid grid-cols-1 gap-2.5 pt-1">
            {[
              { label: '👤 User Directory Manager', target: 'users' },
              { label: '📄 Resume Database Auditor', target: 'resumes' },
              { label: '💼 Career & Jobs Dashboard', target: 'jobs' },
              { label: '🎓 Learning Path Configuration', target: 'learning' },
              { label: '📝 Adaptive Assessments Engine', target: 'assessments' },
              { label: '📊 System Telemetry & Analytics', target: 'analytics' },
              { label: '🔔 Alerts Broadcast Center', target: 'notifications' },
              { label: '📩 Support Inbox CRM', target: 'contact_messages' },
              { label: '⚙️ Maintenance & System Settings', target: 'settings' }
            ].map((act, idx) => (
              <button
                key={idx}
                onClick={() => onNavigate(act.target)}
                className="w-full text-left p-2.5 bg-slate-50 hover:bg-indigo-50/50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl transition text-[11px] font-black cursor-pointer flex items-center justify-between text-slate-800 dark:text-slate-200 hover:text-indigo-650"
              >
                <span>{act.label}</span>
                <FiPlay className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 7 — Recent Platform Activity */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-5 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase text-slate-850 dark:text-white tracking-wider flex items-center gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-900">
          <span className="w-1.5 h-3.5 bg-indigo-650 rounded-full" /> Recent Live Platform Activity Feed
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead>
              <tr className="text-slate-400 uppercase text-[9px] font-black tracking-wider border-b border-slate-100 dark:border-slate-900 pb-2">
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Origin</th>
                <th className="pb-3">Actor Type</th>
                <th className="pb-3">Account Email</th>
                <th className="pb-3">Operation Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-slate-650 dark:text-slate-350">
              {recent_activity.map((evt, idx) => (
                <tr key={idx} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/20 transition">
                  <td className="py-2.5 font-mono text-[10px] text-slate-400">
                    {new Date(evt.time).toLocaleString()}
                  </td>
                  <td className="py-2.5 capitalize font-bold text-slate-500">
                    {evt.module}
                  </td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      evt.type === 'admin' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20' : 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                      {evt.type}
                    </span>
                  </td>
                  <td className="py-2.5 font-bold text-slate-800 dark:text-white">
                    {evt.actor}
                  </td>
                  <td className="py-2.5 font-semibold text-slate-500 truncate max-w-sm">
                    {evt.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
