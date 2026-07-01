import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  FiActivity,
  FiCalendar,
  FiSearch,
  FiFilter,
  FiDownload,
  FiFileText,
  FiCpu,
  FiAlertCircle,
  FiBriefcase,
  FiBookOpen,
  FiUser,
  FiAward,
  FiBell,
  FiMail,
  FiChevronLeft,
  FiChevronRight,
  FiTrendingUp,
  FiRefreshCw
} from 'react-icons/fi';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import Card from '../../../components/common/Card.jsx';
import { formatDate } from '../../../utils/formatters.js';

// HSL theme tailored color variables
const COLORS = {
  auth: '#3B82F6',
  profile: '#10B981',
  resumes: '#F97316',
  jobs: '#8B5CF6',
  learning: '#EC4899',
  ai_tools: '#F59E0B',
  assessments: '#06B6D4',
  notifications: '#6366F1',
  contact_support: '#14B8A6',
  system: '#64748B'
};

export default function History() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedActivityType, setSelectedActivityType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedResume, setSelectedResume] = useState('all');
  const [selectedJob, setSelectedJob] = useState('all');
  const [selectedTargetRole, setSelectedTargetRole] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [trendMetric, setTrendMetric] = useState('all');
  const [trendGranularity, setTrendGranularity] = useState('daily');

  // Load unified activity logs and database history
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['userActivityHistoryLogs'],
    queryFn: async () => {
      const res = await apiClient.get('/api/profile/activity/logs/');
      return res.data?.data || res.data;
    }
  });

  const events = data?.events || [];
  const stats = data?.stats || {};

  // Dynamic lists from events
  const uniqueActivityTypes = useMemo(() => {
    const types = new Set();
    events.forEach(e => {
      if (selectedModule === 'all' || e.module === selectedModule) {
        types.add(e.type);
      }
    });
    return Array.from(types);
  }, [events, selectedModule]);

  const uniqueResumes = useMemo(() => {
    const set = new Set();
    events.forEach(e => {
      if (e.module === 'resumes' && e.resource?.name) {
        set.add(e.resource.name);
      }
    });
    return Array.from(set);
  }, [events]);

  const uniqueJobs = useMemo(() => {
    const set = new Set();
    events.forEach(e => {
      if (e.module === 'jobs' && e.resource?.title) {
        set.add(e.resource.title);
      }
    });
    return Array.from(set);
  }, [events]);

  const uniqueTargetRoles = useMemo(() => {
    const set = new Set();
    events.forEach(e => {
      const role = e.resource?.target_role || e.resource?.role;
      if (role) {
        set.add(role);
      }
    });
    return Array.from(set);
  }, [events]);

  // Filters & Search processing
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesModule = selectedModule === 'all' || e.module === selectedModule;
      const matchesStatus = selectedStatus === 'all' || e.status === selectedStatus;
      const matchesActivityType = selectedActivityType === 'all' || e.type === selectedActivityType;
      
      let matchesDate = true;
      if (startDate) {
        const start = new Date(startDate).getTime();
        const ts = e.timestamp ? new Date(e.timestamp).getTime() : 0;
        if (ts < start) matchesDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const endTs = end.getTime();
        const ts = e.timestamp ? new Date(e.timestamp).getTime() : 0;
        if (ts > endTs) matchesDate = false;
      }

      const matchesResume = selectedResume === 'all' || (e.resource && (e.resource.name === selectedResume || e.resource.file_name === selectedResume));
      const matchesJob = selectedJob === 'all' || (e.resource && e.resource.title === selectedJob);
      const matchesTargetRole = selectedTargetRole === 'all' || (e.resource && (e.resource.target_role === selectedTargetRole || e.resource.role === selectedTargetRole));

      // Search matching keyword
      let matchesSearch = true;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const res = e.resource || {};
        const resumeName = (res.name || res.file_name || '').toLowerCase();
        const targetRoleStr = (res.target_role || res.role || '').toLowerCase();
        const companyStr = (res.company || res.company_name || '').toLowerCase();
        const courseStr = (res.subject || res.domain || '').toLowerCase();
        const assessmentStr = (res.domain || res.role || '').toLowerCase();
        
        const desc = e.description.toLowerCase();
        const type = e.type.toLowerCase();
        const mod = e.module.toLowerCase();
        
        matchesSearch = (
          resumeName.includes(term) ||
          targetRoleStr.includes(term) ||
          companyStr.includes(term) ||
          courseStr.includes(term) ||
          assessmentStr.includes(term) ||
          desc.includes(term) ||
          type.includes(term) ||
          mod.includes(term)
        );
      }

      return matchesModule && matchesStatus && matchesActivityType && matchesDate && matchesResume && matchesJob && matchesTargetRole && matchesSearch;
    });
  }, [events, selectedModule, selectedStatus, selectedActivityType, startDate, endDate, selectedResume, selectedJob, selectedTargetRole, searchTerm]);

  // Pagination processing
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage) || 1;
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEvents.slice(start, start + itemsPerPage);
  }, [filteredEvents, currentPage]);

  // Chart 1: Dynamic Activity Trend
  const trendChartData = useMemo(() => {
    const filteredForTrend = events.filter(e => {
      if (trendMetric === 'all') return true;
      if (trendMetric === 'ai_tools') return ['ai_tools', 'chatbot', 'skill_gap'].includes(e.module);
      return e.module === trendMetric;
    });

    if (trendGranularity === 'daily') {
      const dayCounts = {};
      for (let i = 14; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dayCounts[key] = 0;
      }
      filteredForTrend.forEach(e => {
        if (e.timestamp) {
          const key = e.timestamp.slice(0, 10);
          if (dayCounts[key] !== undefined) {
            dayCounts[key]++;
          }
        }
      });
      return Object.keys(dayCounts).map(k => ({
        label: formatDate(k).split(',')[0],
        count: dayCounts[k]
      }));
    } else if (trendGranularity === 'weekly') {
      const weekCounts = {};
      const weekKeys = [];
      for (let i = 7; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i * 7);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(d.setDate(diff));
        const key = startOfWeek.toISOString().slice(0, 10);
        weekCounts[key] = 0;
        weekKeys.push(key);
      }
      filteredForTrend.forEach(e => {
        if (e.timestamp) {
          const eDate = new Date(e.timestamp);
          for (let i = 0; i < weekKeys.length; i++) {
            const startStr = weekKeys[i];
            const start = new Date(startStr);
            const end = new Date(start);
            end.setDate(end.getDate() + 7);
            if (eDate >= start && eDate < end) {
              weekCounts[startStr]++;
              break;
            }
          }
        }
      });
      return weekKeys.map(k => ({
        label: `Wk of ${formatDate(k).split(',')[0]}`,
        count: weekCounts[k]
      }));
    } else {
      const monthCounts = {};
      const monthKeys = [];
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const year = d.getFullYear();
        const month = d.getMonth();
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        monthCounts[key] = 0;
        monthKeys.push({ key, label: `${monthNames[month]} ${year}` });
      }
      filteredForTrend.forEach(e => {
        if (e.timestamp) {
          const key = e.timestamp.slice(0, 7);
          if (monthCounts[key] !== undefined) {
            monthCounts[key]++;
          }
        }
      });
      return monthKeys.map(item => ({
        label: item.label,
        count: monthCounts[item.key]
      }));
    }
  }, [events, trendMetric, trendGranularity]);

  // Chart 2: Module Engagement Distribution
  const moduleEngagementData = useMemo(() => {
    const counts = {};
    events.forEach(e => {
      counts[e.module] = (counts[e.module] || 0) + 1;
    });
    return Object.keys(counts).map(m => ({
      name: m.charAt(0).toUpperCase() + m.slice(1).replace('_', ' '),
      value: counts[m],
      color: COLORS[m] || '#64748B'
    }));
  }, [events]);

  // Export report to CSV
  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Module', 'Activity Type', 'Description', 'Status', 'Resource/Details'];
    const rows = filteredEvents.map(e => [
      e.timestamp || '',
      e.module,
      e.type,
      e.description.replace(/"/g, '""'),
      e.status,
      e.resource ? JSON.stringify(e.resource).replace(/"/g, '""') : ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `user_activity_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable Report trigger (styled print layout)
  const handleExportPDF = () => {
    window.print();
  };

  if (isLoading && !data) {
    return <Loader skeleton={true} variant="grid" className="max-w-5xl mx-auto" />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-left print:p-0">
      
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 print:hidden">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <FiActivity className="text-orange-500" /> History Analytics
          </h2>
          <p className="text-slate-400 text-xs mt-1">Unified analytics timeline logging operations across all services.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-455 hover:text-slate-700 dark:hover:text-white transition-all disabled:opacity-50"
            title="Refresh history logs"
          >
            <FiRefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-150 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all shadow-sm"
          >
            <FiDownload className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition-all shadow-sm shadow-orange-200"
          >
            <FiFileText className="w-3.5 h-3.5" /> PDF Report
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 print:hidden">
        {/* Total Activities */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total Activities</span>
            <FiActivity className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <span className="text-2xl font-black text-slate-855 dark:text-white mt-2 block">{stats.total_activities || 0}</span>
        </div>

        {/* Active Days */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Active Days</span>
            <FiCalendar className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2 block">{stats.active_days || 0}</span>
        </div>

        {/* AI Tool Requests */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">AI Tool Requests</span>
            <FiCpu className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <span className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-2 block">{stats.total_ai_requests || 0}</span>
        </div>

        {/* Resumes Uploaded */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Resumes Uploaded</span>
            <FiFileText className="w-3.5 h-3.5 text-blue-550" />
          </div>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2 block">{stats.total_resumes || 0}</span>
        </div>

        {/* Job Searches */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Job Searches</span>
            <FiSearch className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <span className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2 block">{stats.total_searches || 0}</span>
        </div>

        {/* Job Applications */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Applications</span>
            <FiBriefcase className="w-3.5 h-3.5 text-pink-500" />
          </div>
          <span className="text-2xl font-black text-pink-600 dark:text-pink-400 mt-2 block">{stats.total_apps || 0}</span>
        </div>

        {/* Mock Interviews */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Interviews</span>
            <FiUser className="w-3.5 h-3.5 text-cyan-500" />
          </div>
          <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-2 block">{stats.total_interviews || 0}</span>
        </div>

        {/* MCQ Assessments */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Assessments</span>
            <FiAward className="w-3.5 h-3.5 text-yellow-500" />
          </div>
          <span className="text-2xl font-black text-yellow-600 dark:text-yellow-450 mt-2 block">{stats.total_assessments || 0}</span>
        </div>

        {/* Courses Viewed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Courses Viewed</span>
            <FiBookOpen className="w-3.5 h-3.5 text-teal-500" />
          </div>
          <span className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-2 block">{stats.total_courses || 0}</span>
        </div>

        {/* Notifications Received */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Notifications</span>
            <FiBell className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2 block">{stats.total_notifications || 0}</span>
        </div>
      </div>

      {/* Visualizations Charts Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        
        {/* Trend Area Chart */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Activity Frequency Trend</h3>
              <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">Aggregated historical progress audit metrics.</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={trendMetric}
                onChange={(e) => setTrendMetric(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">All Subsystems</option>
                <option value="ai_tools">AI Tool Actions</option>
                <option value="jobs">Job Tracking</option>
                <option value="resumes">Resume Actions</option>
                <option value="assessments">Mock Test & Interview</option>
                <option value="learning">Learning Progress</option>
              </select>
              <select
                value={trendGranularity}
                onChange={(e) => setTrendGranularity(e.target.value)}
                className="bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-200 focus:outline-none"
              >
                <option value="daily">Daily Horizon</option>
                <option value="weekly">Weekly Horizon</option>
                <option value="monthly">Monthly Horizon</option>
              </select>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAct" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" className="dark:stroke-slate-800" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: '#94A3B8' }} />
                <ChartTooltip
                  contentStyle={{ background: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '10px' }}
                />
                <Area type="monotone" dataKey="count" stroke="#F97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAct)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feature Distribution Pie Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Engagement Share</h3>
            <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">Activity share across subsystems.</p>
          </div>
          {moduleEngagementData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-slate-400">No data</div>
          ) : (
            <div className="h-44 flex flex-col justify-center items-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={moduleEngagementData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {moduleEngagementData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    contentStyle={{ background: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex flex-wrap gap-2 justify-center max-h-20 overflow-y-auto pr-1 text-[9px] text-slate-500 font-bold border-t border-slate-100 dark:border-slate-800 pt-3">
            {moduleEngagementData.map(item => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Control Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col gap-4 print:hidden">
        {/* Row 1: Search keyword */}
        <div className="relative w-full">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Search logs by resume, target role, company, course, assessment or keyword..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50/50 dark:bg-slate-955 focus:outline-none focus:border-orange-500/60 dark:text-white"
          />
        </div>

        {/* Row 2: Module, Activity Type, Status, Date Picker range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Module Select */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 pl-1">Subsystem Module</span>
            <select
              value={selectedModule}
              onChange={(e) => { setSelectedModule(e.target.value); setSelectedActivityType('all'); setCurrentPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-655 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Modules</option>
              <option value="auth">Auth & Registration</option>
              <option value="profile">Profile Updates</option>
              <option value="resumes">Resumes Workspace</option>
              <option value="jobs">Job Pipeline</option>
              <option value="learning">Learning Progress</option>
              <option value="ai_tools">AI Tools</option>
              <option value="chatbot">Career Assistant</option>
              <option value="skill_gap">Skill Gap</option>
              <option value="assessments">Assessments</option>
              <option value="notifications">Notifications</option>
              <option value="contact_support">Contact Support</option>
            </select>
          </div>

          {/* Activity Type Select */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 pl-1">Activity Type</span>
            <select
              value={selectedActivityType}
              onChange={(e) => { setSelectedActivityType(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-655 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              {uniqueActivityTypes.map(t => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Status Select */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 pl-1">Status</span>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-655 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="warning">Warning</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 pl-1">Start Date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-200 focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 pl-1">End Date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-200 focus:outline-none"
            />
          </div>
        </div>

        {/* Row 3: Target Role, Resume, Job selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-slate-100 dark:border-slate-850 pt-3">
          {/* Resume Name */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 pl-1">Resume File</span>
            <select
              value={selectedResume}
              onChange={(e) => { setSelectedResume(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-655 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Resumes</option>
              {uniqueResumes.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Job title */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 pl-1">Job Title</span>
            <select
              value={selectedJob}
              onChange={(e) => { setSelectedJob(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-655 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Jobs</option>
              {uniqueJobs.map(j => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>

          {/* Target Role */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 pl-1">Target Career Role</span>
            <select
              value={selectedTargetRole}
              onChange={(e) => { setSelectedTargetRole(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-655 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Target Roles</option>
              {uniqueTargetRoles.map(tr => (
                <option key={tr} value={tr}>{tr}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Activities Timeline Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Table header */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-955 border-b border-slate-150 dark:border-slate-850 text-[10px] font-bold text-slate-400 dark:text-slate-500 dark:text-[#6B7FA3] uppercase tracking-wider">
                <th className="py-3 px-4 w-40">Date & Time</th>
                <th className="py-3 px-4 w-28">Module</th>
                <th className="py-3 px-4 w-28">Activity</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 w-24">Status</th>
                <th className="py-3 px-4 w-32 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
              {paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 dark:text-slate-500 dark:text-[#8A9BB5] font-medium">
                    No matching activity log events found.
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((e, index) => {
                  const moduleColor = COLORS[e.module] || '#64748B';
                  return (
                    <tr key={e.id || index} className="hover:bg-slate-55/40 dark:hover:bg-slate-800/10 transition-colors text-slate-600 dark:text-slate-300">
                      
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 font-medium text-slate-500 dark:text-slate-455 whitespace-nowrap">
                        {e.timestamp ? new Date(e.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </td>

                      {/* Module Badge */}
                      <td className="py-3.5 px-4 font-bold">
                        <span 
                          className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase"
                          style={{ backgroundColor: `${moduleColor}15`, color: moduleColor }}
                        >
                          {e.module.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Action Type */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-250 truncate max-w-[110px]">
                        {e.type.replace(/_/g, ' ')}
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 font-medium max-w-sm truncate text-slate-800 dark:text-slate-200" title={e.description}>
                        {e.description}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                          e.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' :
                          e.status === 'failed' ? 'bg-red-50 dark:bg-red-950/20 text-red-650' :
                          'bg-amber-50 dark:bg-amber-950/20 text-amber-600'
                        }`}>
                          {e.status}
                        </span>
                      </td>

                      {/* Details / Action */}
                      <td className="py-3.5 px-4 text-right">
                        {e.resource && Object.keys(e.resource).length > 0 ? (
                          <span 
                            className="text-[9px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-955 px-1.5 py-0.5 rounded max-w-[120px] truncate inline-block"
                            title={JSON.stringify(e.resource)}
                          >
                            {e.resource.name || e.resource.title || e.resource.target_role || e.resource.domain || e.resource.subject || Object.keys(e.resource)[0]}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-350 dark:text-slate-600">-</span>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="bg-slate-50 dark:bg-slate-955 border-t border-slate-150 dark:border-slate-850 px-4 py-3 flex items-center justify-between print:hidden">
            <span className="text-[10px] text-slate-400 font-bold">
              Showing Page {currentPage} of {totalPages} ({filteredEvents.length} total events)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-40"
              >
                <FiChevronLeft className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-40"
              >
                <FiChevronRight className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
