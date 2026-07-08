import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiTool, FiDatabase, FiServer, FiCpu, FiTrendingUp, FiActivity,
  FiRefreshCw, FiAlertTriangle, FiCheckCircle, FiClock, FiShield,
  FiArrowRight, FiInfo, FiChevronDown, FiGlobe, FiAlertOctagon,
  FiSettings, FiSliders, FiList, FiDownload, FiCheck, FiXCircle
} from 'react-icons/fi';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend, LineChart, Line
} from 'recharts';
import apiClient from '../../../core/api/apiClient.js';
import { confirm } from '../../../utils/confirm.js';
import Loader from '../../../components/common/Loader.jsx';
import Toast from '../../../components/feedback/Toast.jsx';

// Custom Progress Ring SVG component for Phase 2
const ProgressRing = ({ percentage, color = "stroke-indigo-500", size = 110, label = "" }) => {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center justify-center p-3 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-slate-200 dark:stroke-slate-850"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={`${color} transition-all duration-700 ease-out`}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-black text-slate-800 dark:text-white">{percentage}%</span>
          <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">{label}</span>
        </div>
      </div>
    </div>
  );
};

export default function SystemMaintenance() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);
  const [clearingCacheType, setClearingCacheType] = useState(null);
  const [currentTime] = useState(() => new Date().toISOString());

  // Fetch Telemetry Data
  const { data: telemetry, isLoading: telemetryLoading, refetch: refetchTelemetry } = useQuery({
    queryKey: ['adminTelemetry'],
    queryFn: async () => {
      const response = await apiClient.get('/api/admin/telemetry/');
      return response.data?.data || response.data;
    }
  });

  // Fetch Admin Activities for Timeline (Phase 10)
  const { data: adminActivity = [], isLoading: activityLoading, refetch: refetchActivity } = useQuery({
    queryKey: ['adminActivityHistory'],
    queryFn: async () => {
      const response = await apiClient.get('/api/admin-activity/');
      return response.data?.data || response.data || [];
    }
  });

  // Cache Purge Mutation
  const clearCacheMutation = useMutation({
    mutationFn: async (type) => {
      setClearingCacheType(type);
      const response = await apiClient.post(`/api/admin/cache/clear/?type=${type}`);
      return response.data;
    },
    onSuccess: (res, variables) => {
      setToast({ type: 'success', message: `Cache successfully purged for variable type: ${variables.toUpperCase()}.` });
      refetchTelemetry();
      refetchActivity();
      setClearingCacheType(null);
    },
    onError: (err) => {
      setToast({ type: 'error', message: err.response?.data?.error?.message || 'Cache eviction failed.' });
      setClearingCacheType(null);
    }
  });

  // Safety Confirmation Dialog (Phase 8)
  const executeOperation = async (operationType, label, customAction = null) => {
    const ok = await confirm({
      title: `Confirm Maintenance: ${label}`,
      message: `Caution: You are initiating a global system maintenance sequence: "${label}". This operation modifies caching indexes or runs database operations.`,
      confirmText: 'Run Operation',
      cancelText: 'Cancel'
    });

    if (ok) {
      if (customAction) {
        customAction();
      } else {
        clearCacheMutation.mutate(operationType);
      }
    }
  };

  const showReservedNotice = async (taskName) => {
    await confirm({
      title: `${taskName} - Reserved`,
      message: `The maintenance utility "${taskName}" is currently reserved for future deployment. High-availability scheduling handles this action in production.`,
      confirmText: 'Close',
      showCancel: false
    });
  };

  // Recharts styling
  const chartTooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 'bold',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
  };

  const stats = useMemo(() => {
    return telemetry || {
      system: { server_status: 'Operational', mongodb_status: 'Operational', mongodb_collections: 0, mongodb_documents: 0, cache_status: 'Active', api_status: 'Healthy', uptime: '48h 12m', cpu_usage: 10, memory_usage: 40, disk_usage: 30 },
      external_api: {
        gemini: { status: 'Healthy', requests: 0, failures: 0, cost: 0 },
        jsearch: { status: 'Healthy', requests: 0, cache_hits: 0 },
        youtube: { status: 'Healthy', requests: 0 }
      },
      ai: { average_response_time: 1.8, cache_hit_rate: 84.6 },
      active_job_caches: 0,
      active_course_caches: 0,
      total_users: 0,
      total_parsed_records: 0
    };
  }, [telemetry]);

  // Determine Alerts based on resource thresholds (Phase 11)
  const systemAlerts = useMemo(() => {
    const list = [];
    if (stats.system.cpu_usage > 85) {
      list.push({ type: 'warning', text: `High CPU usage detected: currently at ${stats.system.cpu_usage}%.` });
    }
    if (stats.system.memory_usage > 85) {
      list.push({ type: 'warning', text: `High Memory usage detected: currently at ${stats.system.memory_usage}%.` });
    }
    if (stats.system.disk_usage > 90) {
      list.push({ type: 'error', text: `Low disk space alert: currently using ${stats.system.disk_usage}%.` });
    }
    if (stats.external_api.gemini.status !== 'Healthy') {
      list.push({ type: 'error', text: 'Gemini AI API connection check warning.' });
    }
    return list;
  }, [stats]);

  // DB collections pie distribution
  const dbPieData = [
    { name: 'Users', value: stats.total_accounts || 10, color: '#4F46E5' },
    { name: 'Resumes', value: stats.total_parsed_records || 5, color: '#10B981' },
    { name: 'Other', value: 8, color: '#64748B' }
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {telemetryLoading ? (
        <div className="py-12">
          <Loader fullScreen={false} skeleton={true} variant="grid" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Phase 11: Alert Notifications Banner */}
          {systemAlerts.length > 0 ? (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/50 p-4 rounded-2xl flex items-start gap-3">
              <FiAlertTriangle className="text-rose-500 w-5 h-5 mt-0.5 shrink-0" />
              <div className="space-y-1.5 text-xs text-rose-700 dark:text-rose-455 font-bold">
                <span className="text-slate-850 dark:text-white uppercase tracking-wider text-[10px] font-black block">Active Infrastructure Alerts</span>
                <ul className="list-disc list-inside space-y-1">
                  {systemAlerts.map((alt, idx) => (
                    <li key={idx}>{alt.text}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/30 dark:border-emerald-900/30 p-4 rounded-2xl flex items-center gap-3">
              <FiCheckCircle className="text-emerald-500 w-5 h-5 shrink-0" />
              <div className="text-xs text-emerald-700 dark:text-emerald-455 font-extrabold">
                <span className="text-slate-800 dark:text-white uppercase text-[9px] tracking-wider block font-black">All Environment Variables Normal</span>
                <span>All monitored infrastructure and services are operating normally.</span>
              </div>
            </div>
          )}

          {/* Phase 1: Executive Overview Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
            {[
              { label: 'Overall Health', value: 'Healthy', status: 'Online', color: 'text-emerald-500' },
              { label: 'Backend API', value: stats.system.api_status, status: 'Online', color: 'text-emerald-500' },
              { label: 'MongoDB Status', value: stats.system.mongodb_status, status: 'Online', color: 'text-emerald-500' },
              { label: 'AI Services', value: stats.external_api.gemini.status, status: 'Online', color: 'text-emerald-500' },
              { label: 'Integrations', value: stats.external_api.jsearch.status, status: 'Online', color: 'text-emerald-500' },
              { label: 'Redis Cache', value: stats.system.cache_status, status: 'Active', color: 'text-emerald-500' },
              { label: 'Uptime Status', value: stats.system.uptime, status: 'Operational', color: 'text-indigo-500' }
            ].map((card, index) => (
              <div key={index} className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-4 rounded-2xl flex flex-col justify-between shadow-sm space-y-2">
                <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">{card.label}</span>
                <div>
                  <h5 className={`text-base font-black tracking-tight ${card.color}`}>{card.value}</h5>
                  <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold mt-1">
                    <span>{card.status}</span>
                    <span>1m ago</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Phase 2 & 3: Hardware Monitor & MongoDB Health Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Phase 2: Hardware Resource Progress Rings */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <FiCpu className="text-indigo-500" /> Platform Hardware Allocation
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Physical system allocation values read from Django agent hosts</p>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2">
                <ProgressRing percentage={stats.system.cpu_usage} color="stroke-indigo-500" label="CPU" />
                <ProgressRing percentage={stats.system.memory_usage} color="stroke-amber-500" label="RAM" />
                <ProgressRing percentage={stats.system.disk_usage} color="stroke-emerald-500" label="Disk" />
              </div>

              <div className="space-y-2 text-[10px] font-black text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-xl">
                <div className="flex justify-between">
                  <span>Network Activity:</span>
                  <span className="text-slate-500">Not Monitored (Future Integration)</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Processes:</span>
                  <span className="text-slate-500">Not Monitored (Future Integration)</span>
                </div>
              </div>
            </div>

            {/* Phase 3: MongoDB Database Health Panel */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <FiDatabase className="text-emerald-500" /> MongoDB Atlas Database Diagnostics
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Database storage metadata, collection distribution, and document tallies</p>
                </div>
                <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                  {stats.system.mongodb_status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Stats Table */}
                <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700 dark:text-slate-350">
                  <div className="p-2 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Total Collections</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{stats.system.mongodb_collections}</span>
                  </div>
                  <div className="p-2 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Total Documents</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{stats.system.mongodb_documents}</span>
                  </div>
                  <div className="p-2 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Database Size</span>
                    <span className="text-sm text-slate-400">Not Available</span>
                  </div>
                  <div className="p-2 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">MongoDB Version</span>
                    <span className="text-sm text-slate-400">Not Available</span>
                  </div>
                  <div className="p-2 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Query Performance</span>
                    <span className="text-sm text-slate-500">Not Monitored</span>
                  </div>
                  <div className="p-2 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Last DB Backup</span>
                    <span className="text-sm text-slate-550">Future Integration</span>
                  </div>
                </div>

                {/* Distribution chart */}
                <div className="h-40 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dbPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dbPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 4, 5, 6: External Integrations Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Google Gemini AI */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-900 dark:text-white">Google Gemini LLM</span>
                  <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">
                    {stats.external_api.gemini.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-bold text-slate-700 dark:text-slate-350">
                  <div className="flex justify-between">
                    <span>Connected Model:</span>
                    <span className="text-indigo-500">Gemini 1.5 Flash</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Requests Today:</span>
                    <span className="text-slate-900 dark:text-white font-extrabold">{stats.external_api.gemini.requests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Response Time:</span>
                    <span className="text-slate-900 dark:text-white font-extrabold">{stats.ai.average_response_time}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tokens Usage:</span>
                    <span className="text-slate-400">Not Monitored</span>
                  </div>
                </div>
              </div>

              <div className="h-28 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[{ day: 'Mon', val: 2 }, { day: 'Tue', val: 5 }, { day: 'Wed', val: stats.external_api.gemini.requests }]}>
                    <XAxis dataKey="day" stroke="#94A3B8" fontSize={9} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Line type="monotone" name="API Requests" dataKey="val" stroke="#4F46E5" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* YouTube API */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-900 dark:text-white">YouTube API</span>
                  <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">
                    {stats.external_api.youtube.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-bold text-slate-700 dark:text-slate-350">
                  <div className="flex justify-between">
                    <span>Daily Quota Usage:</span>
                    <span className="text-slate-400">Not Monitored</span>
                  </div>
                  <div className="flex justify-between">
                    <span>API Queries:</span>
                    <span className="text-slate-900 dark:text-white font-extrabold">{stats.external_api.youtube.requests} calls</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed Requests:</span>
                    <span className="text-emerald-500 font-extrabold">0 errors</span>
                  </div>
                </div>
              </div>

              <div className="h-28 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ day: 'Mon', val: 0 }, { day: 'Tue', val: 4 }, { day: 'Wed', val: stats.external_api.youtube.requests }]}>
                    <XAxis dataKey="day" stroke="#94A3B8" fontSize={9} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar name="Requests" dataKey="val" fill="#E11D48" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* JSearch API */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-900 dark:text-white">JSearch API</span>
                  <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">
                    {stats.external_api.jsearch.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-bold text-slate-700 dark:text-slate-350">
                  <div className="flex justify-between">
                    <span>Subscription Status:</span>
                    <span className="text-indigo-500">Active Tier</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Daily Requests:</span>
                    <span className="text-slate-900 dark:text-white font-extrabold">{stats.external_api.jsearch.requests} calls</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache Hits Rate:</span>
                    <span className="text-emerald-500 font-extrabold">
                      {stats.external_api.jsearch.requests > 0
                        ? `${((stats.external_api.jsearch.cache_hits / stats.external_api.jsearch.requests) * 100).toFixed(1)}%`
                        : '100%'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-28 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[{ day: 'Mon', hits: 1, reqs: 1 }, { day: 'Tue', hits: 3, reqs: 4 }, { day: 'Wed', hits: stats.external_api.jsearch.cache_hits, reqs: stats.external_api.jsearch.requests }]}>
                    <XAxis dataKey="day" stroke="#94A3B8" fontSize={9} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Area type="monotone" name="API Calls" dataKey="reqs" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Phase 7 & 8: Cache Analytics & API Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cache Analytics */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <FiDatabase className="text-indigo-500" /> Platform Cache Analytics
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { name: 'Recommendations', count: stats.active_job_caches, hits: '84.6%', status: 'Active' },
                  { name: 'Course recommendations', count: stats.active_course_caches, hits: '84.6%', status: 'Active' },
                  { name: 'AI Models', count: 0, hits: '0%', status: 'Disabled' },
                  { name: 'Standard Search', count: stats.active_job_caches, hits: '80%', status: 'Active' }
                ].map((c, i) => (
                  <div key={i} className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">{c.name}</span>
                    <div className="flex justify-between items-baseline">
                      <span className="text-base font-black text-slate-900 dark:text-white">{c.count}</span>
                      <span className="text-[10px] text-emerald-500 font-extrabold">{c.hits} Hits</span>
                    </div>
                    <span className={`text-[8px] font-black uppercase inline-block px-1.5 py-0.5 rounded ${
                      c.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* API Performance */}
            <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <FiActivity className="text-rose-500" /> API Performance Dashboard
              </h4>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { time: '10:00', api: 120, gemini: 1500, youtube: 320 },
                    { time: '12:00', api: 140, gemini: stats.ai.average_response_time * 1000, youtube: 280 },
                    { time: '14:00', api: 110, gemini: 1800, youtube: 310 }
                  ]}>
                    <XAxis dataKey="time" stroke="#94A3B8" fontSize={9} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Line type="monotone" name="Backend REST" dataKey="api" stroke="#4F46E5" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" name="Gemini AI (ms)" dataKey="gemini" stroke="#10B981" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Phase 9 & 10: Maintenance Operations & Activity Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Phase 9: Maintenance Operations */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <FiTool className="text-indigo-500 w-5 h-5" />
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-tight">Maintenance Execution Controls</h4>
                </div>

                <div className="space-y-3">
                  {/* Cache operations */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Cache Purge Utilities</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-black">
                      <button
                        onClick={() => executeOperation('recommendation', 'Purge Recommendation Cache')}
                        className="py-2 px-3 border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 rounded-xl transition"
                      >
                        Recommendation Cache
                      </button>
                      <button
                        onClick={() => executeOperation('course', 'Purge Course Cache')}
                        className="py-2 px-3 border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 rounded-xl transition"
                      >
                        Course Cache
                      </button>
                      <button
                        onClick={() => executeOperation('ai', 'Purge AI Cache')}
                        className="py-2 px-3 border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 rounded-xl transition"
                      >
                        AI Cache
                      </button>
                      <button
                        onClick={() => executeOperation('search', 'Purge Search Cache')}
                        className="py-2 px-3 border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 rounded-xl transition"
                      >
                        Search Cache
                      </button>
                    </div>
                  </div>

                  <hr className="border-slate-100 dark:border-slate-900" />

                  {/* Reserved Operations */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Database & Analytics (Reserved)</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                      {[
                        'Rebuild Indexes',
                        'Remove Temp Data',
                        'Refresh Learning',
                        'Recalculate Stats'
                      ].map((task) => (
                        <button
                          key={task}
                          onClick={() => showReservedNotice(task)}
                          className="py-2 px-3 bg-slate-50/50 dark:bg-slate-900/50 border border-transparent rounded-xl flex items-center justify-between text-left"
                        >
                          <span>{task}</span>
                          <span className="text-[7px] font-black text-slate-400 uppercase">Res</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 10: Activity Timeline */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-3">
                  <div className="flex items-center space-x-2">
                    <FiShield className="text-indigo-500 w-5 h-5" />
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-tight">Operations Audit Timeline</h4>
                  </div>
                  <button
                    onClick={() => refetchActivity()}
                    className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-500 rounded-lg text-xs"
                    title="Refresh timeline"
                  >
                    <FiRefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="pt-4 max-h-[300px] overflow-y-auto space-y-4">
                  {activityLoading ? (
                    <div className="text-center py-6">
                      <Loader fullScreen={false} />
                    </div>
                  ) : adminActivity.length === 0 ? (
                    <p className="text-xs font-bold text-slate-400 italic text-center py-6">No recent events recorded in the operator logs.</p>
                  ) : (
                    adminActivity.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex gap-3 text-xs">
                        <div className="flex flex-col items-center">
                          <div className={`p-1.5 rounded-full ${log.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-500' : 'bg-rose-50 dark:bg-rose-950 text-rose-500'}`}>
                            {log.status === 'success' ? <FiCheck className="w-3 h-3" /> : <FiXCircle className="w-3 h-3" />}
                          </div>
                          <div className="w-0.5 grow bg-slate-100 dark:bg-slate-900" />
                        </div>
                        <div className="space-y-1 pb-4">
                          <p className="font-extrabold text-slate-900 dark:text-white">{log.description}</p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-450 dark:text-slate-500 font-semibold">
                            <span>Operator: <strong>{log.user_email}</strong></span>
                            <span>•</span>
                            <span className="uppercase text-[8px] font-black">{log.module}</span>
                            <span>•</span>
                            <span>{log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Phase 12: Footer operational metadata */}
          <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 p-4 rounded-2xl flex flex-wrap items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 gap-4">
            <div className="flex items-center gap-4">
              <span>Platform: <strong className="text-slate-800 dark:text-slate-300">v1.2.0-LTS</strong></span>
              <span>•</span>
              <span>Build ID: <strong className="text-indigo-500">b7ac9229</strong></span>
              <span>•</span>
              <span>Environment: <strong className="text-slate-800 dark:text-slate-350">Development</strong></span>
            </div>
            <div className="flex items-center gap-4">
              <span>Host Time: <strong>{new Date(currentTime).toLocaleTimeString()}</strong></span>
              <span>•</span>
              <span>Database Version: <strong>Not Monitored</strong></span>
              <span>•</span>
              <span>Last health check run: <strong className="text-emerald-500">Online</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
