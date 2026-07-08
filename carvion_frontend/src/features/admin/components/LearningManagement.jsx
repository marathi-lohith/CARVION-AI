import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiBookOpen, FiEye, FiRefreshCw, FiTrash2, FiSearch, FiX, FiFilter,
  FiInfo, FiAward, FiUser, FiMail, FiCalendar, FiChevronLeft,
  FiChevronRight, FiCheckCircle, FiAlertCircle, FiDatabase, FiTrendingUp,
  FiActivity, FiClock, FiCpu, FiPlay, FiList, FiBarChart2, FiPieChart, FiUsers
} from 'react-icons/fi';
import { confirm } from '../../../utils/confirm.js';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import Toast from '../../../components/feedback/Toast.jsx';

export default function LearningManagement() {
  const queryClient = useQueryClient();

  // Active Sub-Tab: 'overview' | 'roadmaps' | 'courses' | 'sessions' | 'progress'
  const [activeTab, setActiveTab] = useState('overview');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('-created_at');

  // Custom filters for different tabs
  const [activeRoadmapFilter, setActiveRoadmapFilter] = useState('all');
  const [targetRoleFilter, setTargetRoleFilter] = useState('');
  const [progressMin, setProgressMin] = useState('');
  const [progressMax, setProgressMax] = useState('');

  const [platformFilter, setPlatformFilter] = useState('');
  const [completionFilter, setCompletionFilter] = useState('all');

  const [durationMin, setDurationMin] = useState('');
  const [durationMax, setDurationMax] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Selected Item details for Drawer
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Toast alert state
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });

  // Debounce search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page and filters when active tab changes
  useEffect(() => {
    setPage(1);
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setDateFilter('all');
    setActiveRoadmapFilter('all');
    setTargetRoleFilter('');
    setProgressMin('');
    setProgressMax('');
    setPlatformFilter('');
    setCompletionFilter('all');
    setDurationMin('');
    setDurationMax('');
    
    if (activeTab === 'sessions') {
      setSortBy('-start_time');
    } else if (activeTab === 'progress') {
      setSortBy('-updated_at');
    } else {
      setSortBy('-created_at');
    }
  }, [activeTab]);

  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  // Fetch telemetry / summary statistics
  const { data: telemetry, isLoading: telemetryLoading } = useQuery({
    queryKey: ['adminTelemetry'],
    queryFn: async () => {
      const response = await apiClient.get('/api/admin/telemetry/');
      return response.data?.data || response.data;
    }
  });

  // Map active tab to backend module parameters
  const moduleParam = useMemo(() => {
    if (activeTab === 'roadmaps') return 'learning_roadmaps';
    if (activeTab === 'courses') return 'saved_courses';
    if (activeTab === 'sessions') return 'learning_sessions';
    if (activeTab === 'progress') return 'learning_progress';
    return null;
  }, [activeTab]);

  // Fetch paginated list
  const { data: recordsData, isLoading: listLoading, isError: listError, refetch } = useQuery({
    queryKey: [
      'adminLearningRecords',
      activeTab,
      page,
      debouncedSearch,
      statusFilter,
      dateFilter,
      activeRoadmapFilter,
      targetRoleFilter,
      progressMin,
      progressMax,
      platformFilter,
      completionFilter,
      durationMin,
      durationMax,
      sortBy
    ],
    queryFn: async () => {
      if (!moduleParam) return null;
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search: debouncedSearch,
        status: statusFilter,
        date_filter: dateFilter,
        active_roadmap: activeRoadmapFilter,
        target_role: targetRoleFilter,
        progress_min: progressMin,
        progress_max: progressMax,
        platform: platformFilter,
        completion_status: completionFilter,
        duration_min: durationMin,
        duration_max: durationMax,
        sort: sortBy
      });
      const response = await apiClient.get(`/api/admin/records/${moduleParam}/?${params.toString()}`);
      return response.data?.data || response.data;
    },
    enabled: !!moduleParam,
    keepPreviousData: true
  });

  // Restore Record mutation
  const restoreMutation = useMutation({
    mutationFn: async ({ id, module }) => {
      await apiClient.post(`/api/admin/records/${module}/${id}/restore/`);
    },
    onSuccess: () => {
      showToast('Record restored successfully.');
      queryClient.invalidateQueries(['adminLearningRecords']);
      queryClient.invalidateQueries(['adminTelemetry']);
      if (selectedItem) {
        setSelectedItem(prev => ({ ...prev, is_deleted: false, status: 'active' }));
      }
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to restore record.', 'error');
    }
  });

  // Hard Delete Record mutation
  const hardDeleteMutation = useMutation({
    mutationFn: async ({ id, module }) => {
      await apiClient.delete(`/api/admin/records/${module}/${id}/hard-delete/`);
    },
    onSuccess: () => {
      showToast('Record permanently deleted.');
      setIsDrawerOpen(false);
      setSelectedItem(null);
      queryClient.invalidateQueries(['adminLearningRecords']);
      queryClient.invalidateQueries(['adminTelemetry']);
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to permanently delete record.', 'error');
    }
  });

  const handleRestore = async (id) => {
    const ok = await confirm({
      title: 'Restore Record',
      message: 'Are you sure you want to restore this soft-deleted record? It will make it active and visible to the user again.',
      type: 'info',
      confirmText: 'Restore Record'
    });
    if (ok) {
      restoreMutation.mutate({ id, module: moduleParam });
    }
  };

  const handleHardDelete = async (id) => {
    const ok = await confirm({
      title: 'Permanently Delete Record',
      message: 'WARNING: This will permanently delete this record from MongoDB. This action is irreversible.',
      type: 'delete',
      confirmText: 'Hard Delete'
    });
    if (ok) {
      hardDeleteMutation.mutate({ id, module: moduleParam });
    }
  };

  const formatDuration = (sec) => {
    if (!sec) return '0s';
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    
    let result = '';
    if (hrs > 0) result += `${hrs}h `;
    if (mins > 0) result += `${mins}m `;
    if (secs > 0 || result === '') result += `${secs}s`;
    return result.trim();
  };

  const learningStats = telemetry?.learning || {};
  
  // Dashboard Overview Stats (Phase 1)
  const totalRoadmaps = learningStats.total_roadmaps || 0;
  const activeRoadmaps = learningStats.active_roadmaps_mgt || 0;
  const deletedRoadmaps = learningStats.deleted_roadmaps_mgt || 0;

  const totalSavedCourses = learningStats.total_saved_courses || 0;
  const activeSavedCourses = learningStats.active_saved_courses || 0;
  const deletedSavedCourses = learningStats.deleted_saved_courses || 0;

  const totalSessions = learningStats.total_learning_sessions || 0;
  const activeSessions = learningStats.active_learning_sessions || 0;
  const deletedSessions = learningStats.deleted_learning_sessions || 0;

  const totalVideoProgress = learningStats.total_video_progress_records || 0;

  const records = recordsData?.records || [];
  const totalRecords = recordsData?.total_count || 0;
  const totalPages = Math.ceil(totalRecords / pageSize);

  const openDrawer = (item) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Navigation Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 rounded-2xl shadow-sm gap-2">
        {[
          { id: 'overview', label: 'Learning Overview', icon: FiActivity },
          { id: 'roadmaps', label: 'Career Roadmaps', icon: FiCpu },
          { id: 'courses', label: 'Saved Courses', icon: FiBookOpen },
          { id: 'sessions', label: 'Learning Sessions', icon: FiClock },
          { id: 'progress', label: 'Learning Progress', icon: FiPlay }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Dashboard Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Phase 1 KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Career Roadmaps', value: totalRoadmaps, sub: `${activeRoadmaps} active / ${deletedRoadmaps} deleted`, color: 'text-orange-500' },
              { label: 'Saved Courses', value: totalSavedCourses, sub: `${activeSavedCourses} active / ${deletedSavedCourses} deleted`, color: 'text-blue-500' },
              { label: 'Learning Sessions', value: totalSessions, sub: `${activeSessions} active / ${deletedSessions} deleted`, color: 'text-purple-500' },
              { label: 'Video Progress Records', value: totalVideoProgress, sub: 'Total parsed progress items', color: 'text-emerald-500' }
            ].map((kpi, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-2">
                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">{kpi.label}</p>
                <h4 className="text-2xl font-black text-slate-850 dark:text-white">{kpi.value}</h4>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold">{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Phase 10 Learning Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Popular Roadmaps & Platform Distribution */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
              <h4 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <FiTrendingUp className="text-orange-500" /> Platform Preferences
              </h4>
              
              <div className="space-y-4">
                {/* Popular Roadmaps */}
                <div>
                  <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Most Popular Target Roles</h5>
                  <div className="space-y-2">
                    {learningStats.most_popular_roadmaps?.length > 0 ? (
                      learningStats.most_popular_roadmaps.map((r, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-700 dark:text-slate-350">{r.role}</span>
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-bold text-slate-500">{r.count} roadmaps</span>
                        </div>
                      ))
                    ) : (
                      <p className="italic text-xs text-slate-450">No roadmaps created yet.</p>
                    )}
                  </div>
                </div>

                {/* Session Type Breakdown */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Platform Session Types</h5>
                  <div className="space-y-2">
                    {learningStats.platform_usage_dist?.length > 0 ? (
                      learningStats.platform_usage_dist.map((u, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-700 dark:text-slate-350">{u.activity_type}</span>
                          <span className="px-2 py-0.5 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 rounded font-extrabold">{u.count} sessions</span>
                        </div>
                      ))
                    ) : (
                      <p className="italic text-xs text-slate-450">No activity logged.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Popular Courses & Completion Rates */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
              <h4 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <FiPieChart className="text-blue-500" /> Metrics & Streaks
              </h4>
              
              <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-1">
                  <p className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">Average Roadmap Completion</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white">{learningStats.roadmap_completion || 0}%</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-1">
                  <p className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">Course Completion Rate</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white">{learningStats.course_completion_rate || 0}%</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-1">
                  <p className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">Total Learning Hours</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white">{learningStats.total_learning_hours || 0} hrs</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-1">
                  <p className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">Average Study Streak</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white">{learningStats.learning_streak || 0} days</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Most Saved Courses */}
                <div>
                  <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Most Saved Courses</h5>
                  <div className="space-y-2">
                    {learningStats.most_saved_courses?.length > 0 ? (
                      learningStats.most_saved_courses.map((c, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-700 dark:text-slate-350 truncate max-w-[280px]">{c.title}</span>
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-bold text-slate-500">{c.count} saves</span>
                        </div>
                      ))
                    ) : (
                      <p className="italic text-xs text-slate-450">No saved courses.</p>
                    )}
                  </div>
                </div>

                {/* Top Performing Users */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Highest Progress Users</h5>
                  <div className="space-y-2">
                    {learningStats.highest_progress_users?.length > 0 ? (
                      learningStats.highest_progress_users.map((u, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-700 dark:text-slate-350">{u.email}</span>
                          <span className="font-extrabold text-orange-500">{u.average_progress}% avg</span>
                        </div>
                      ))
                    ) : (
                      <p className="italic text-xs text-slate-450">No progress data available.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Bulk Action Limitation Disclaimer (Phase 11) */}
          <div className="bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/50 rounded-2xl p-4 flex gap-3 text-xs font-semibold text-orange-700 dark:text-orange-300 leading-relaxed shadow-sm">
            <FiInfo className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-500" />
            <div>
              <p className="font-extrabold">Bulk Operations Limitation Note</p>
              <p className="mt-0.5 opacity-90">
                Bulk Restore and Bulk Hard Delete operations are currently unavailable. The Enterprise Soft Delete backend executes record deletions individually to run audit hooks, cascade triggers, and safety verification cycles.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* Paginated List Tab views */}
      {activeTab !== 'overview' && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Phase 6 & 7 Search and Filters Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-4">
            
            {/* Primary Search bar */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-grow">
                <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                  <FiSearch className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search by User Name, Email, Target Role, Course Title, Platform..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-850 dark:text-slate-250 font-semibold shadow-inner"
                />
                {searchTerm && (
                  <button
                    onClick={() => { setSearchTerm(''); setPage(1); }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 p-0.5"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter grid based on active tab */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              
              {/* Soft Delete Filter (Global across all tabs) */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Archive State</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-700 dark:text-slate-350 cursor-pointer"
                >
                  <option value="all">Active & Deleted Records</option>
                  <option value="active">Active Only</option>
                  <option value="deleted">Deleted / Archived</option>
                </select>
              </div>

              {/* Date Filter (Global across all tabs) */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Created / Logged Date</label>
                <select
                  value={dateFilter}
                  onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-700 dark:text-slate-350 cursor-pointer"
                >
                  <option value="all">Any Date</option>
                  <option value="today">Today</option>
                  <option value="week">Past 7 Days</option>
                  <option value="month">Past 30 Days</option>
                </select>
              </div>

              {/* Tab Specific Filters */}
              {activeTab === 'roadmaps' && (
                <>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Active Status</label>
                    <select
                      value={activeRoadmapFilter}
                      onChange={(e) => { setActiveRoadmapFilter(e.target.value); setPage(1); }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-700 dark:text-slate-350 cursor-pointer"
                    >
                      <option value="all">All Roadmaps</option>
                      <option value="true">Active Roadmap</option>
                      <option value="false">Inactive Roadmap</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Progress range</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min %"
                        value={progressMin}
                        onChange={(e) => { setProgressMin(e.target.value); setPage(1); }}
                        className="w-1/2 px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none text-center"
                      />
                      <input
                        type="number"
                        placeholder="Max %"
                        value={progressMax}
                        onChange={(e) => { setProgressMax(e.target.value); setPage(1); }}
                        className="w-1/2 px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none text-center"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'courses' && (
                <>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Platform Provider</label>
                    <input
                      type="text"
                      placeholder="e.g. YouTube"
                      value={platformFilter}
                      onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Completion Status</label>
                    <select
                      value={completionFilter}
                      onChange={(e) => { setCompletionFilter(e.target.value); setPage(1); }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none text-slate-700 dark:text-slate-350 cursor-pointer"
                    >
                      <option value="all">All States</option>
                      <option value="completed">Completed</option>
                      <option value="in_progress">In Progress</option>
                      <option value="not_started">Not Started</option>
                    </select>
                  </div>
                </>
              )}

              {activeTab === 'sessions' && (
                <>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Duration Range (Mins)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min min"
                        value={durationMin}
                        onChange={(e) => { setDurationMin(e.target.value); setPage(1); }}
                        className="w-1/2 px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none text-center"
                      />
                      <input
                        type="number"
                        placeholder="Max min"
                        value={durationMax}
                        onChange={(e) => { setDurationMax(e.target.value); setPage(1); }}
                        className="w-1/2 px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none text-center"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'progress' && (
                <>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Completion Status</label>
                    <select
                      value={completionFilter}
                      onChange={(e) => { setCompletionFilter(e.target.value); setPage(1); }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none text-slate-700 dark:text-slate-350 cursor-pointer"
                    >
                      <option value="all">All Progress</option>
                      <option value="completed">Completed Only</option>
                      <option value="in_progress">In Progress Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Progress Range %</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min %"
                        value={progressMin}
                        onChange={(e) => { setProgressMin(e.target.value); setPage(1); }}
                        className="w-1/2 px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none text-center"
                      />
                      <input
                        type="number"
                        placeholder="Max %"
                        value={progressMax}
                        onChange={(e) => { setProgressMax(e.target.value); setPage(1); }}
                        className="w-1/2 px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none text-center"
                      />
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>

          {/* Tables and List views */}
          {listLoading && !recordsData ? (
            <Loader fullScreen={false} skeleton={true} variant="table" />
          ) : listError ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <FiAlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-500 font-bold text-sm">Failed to connect to database records.</p>
              <button onClick={() => refetch()} className="mt-3 px-4 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition cursor-pointer">
                Retry Query
              </button>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-2">
              <FiDatabase className="w-8 h-8 text-slate-350 dark:text-slate-650" />
              <p className="text-slate-400 dark:text-slate-500 font-semibold text-xs">No records found matching filters.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
              <div className="overflow-x-auto max-h-[550px] scrollbar-thin">
                <table className="w-full border-collapse text-left text-xs">
                  
                  {/* Table headers */}
                  <thead>
                    <tr className="sticky top-0 bg-slate-50 dark:bg-slate-950 text-slate-450 dark:text-slate-500 font-extrabold uppercase border-b border-slate-150 dark:border-slate-800 z-10">
                      {activeTab === 'roadmaps' && (
                        <>
                          <th className="px-5 py-4">Target Role</th>
                          <th className="px-5 py-4">User</th>
                          <th className="px-5 py-4">Type</th>
                          <th className="px-5 py-4">Active</th>
                          <th className="px-5 py-4">Progress</th>
                          <th className="px-5 py-4">Saved Date</th>
                          <th className="px-5 py-4">Archive Status</th>
                          <th className="px-5 py-4 text-center">Actions</th>
                        </>
                      )}
                      {activeTab === 'courses' && (
                        <>
                          <th className="px-5 py-4">Course Title</th>
                          <th className="px-5 py-4">Platform</th>
                          <th className="px-5 py-4">User</th>
                          <th className="px-5 py-4">Saved Date</th>
                          <th className="px-5 py-4">Completion Status</th>
                          <th className="px-5 py-4">Archive Status</th>
                          <th className="px-5 py-4 text-center">Actions</th>
                        </>
                      )}
                      {activeTab === 'sessions' && (
                        <>
                          <th className="px-5 py-4">User</th>
                          <th className="px-5 py-4">Session Date</th>
                          <th className="px-5 py-4">Learning Time</th>
                          <th className="px-5 py-4">Current Roadmap</th>
                          <th className="px-5 py-4">Current Course</th>
                          <th className="px-5 py-4">Session Status</th>
                          <th className="px-5 py-4">Archive Status</th>
                          <th className="px-5 py-4 text-center">Actions</th>
                        </>
                      )}
                      {activeTab === 'progress' && (
                        <>
                          <th className="px-5 py-4">User</th>
                          <th className="px-5 py-4">Roadmap</th>
                          <th className="px-5 py-4">Course / Video</th>
                          <th className="px-5 py-4">Progress %</th>
                          <th className="px-5 py-4">Completed</th>
                          <th className="px-5 py-4">Last Activity</th>
                          <th className="px-5 py-4">Archive Status</th>
                          <th className="px-5 py-4 text-center">Actions</th>
                        </>
                      )}
                    </tr>
                  </thead>

                  {/* Table rows */}
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-650 dark:text-slate-350">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/10 transition-colors odd:bg-slate-55/10 dark:odd:bg-slate-900/5">
                        
                        {/* Tab-specific table rows */}
                        {activeTab === 'roadmaps' && (
                          <>
                            <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">{r.target_role}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{r.user_name}</span>
                                <span className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold">{r.user_email}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${r.is_system_generated ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-100/50' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100/50'}`}>
                                {r.is_system_generated ? 'System' : 'User'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${r.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-transparent'}`}>
                                {r.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-orange-500" style={{ width: `${r.progress_pct}%` }} />
                                </div>
                                <span className="font-extrabold text-[10px] text-slate-700 dark:text-slate-350">{r.progress_pct}%</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 font-semibold">
                              {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                          </>
                        )}

                        {activeTab === 'courses' && (
                          <>
                            <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200 truncate max-w-xs" title={r.title}>{r.title}</td>
                            <td className="px-5 py-3.5 font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px]">{r.provider}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{r.user_name}</span>
                                <span className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold">{r.user_email}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 font-semibold">
                              {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                                r.completion_status === 'Completed'
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50'
                                  : r.completion_status === 'In Progress'
                                  ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-100/50'
                                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-transparent'
                              }`}>
                                {r.completion_status}
                              </span>
                            </td>
                          </>
                        )}

                        {activeTab === 'sessions' && (
                          <>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{r.user_name}</span>
                                <span className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold">{r.user_email}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-700 dark:text-slate-350 font-semibold">
                              {r.start_time ? new Date(r.start_time).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                            </td>
                            <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                              {formatDuration(r.duration)}
                            </td>
                            <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-bold max-w-[150px] truncate" title={r.roadmap_name}>{r.roadmap_name}</td>
                            <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-bold max-w-[150px] truncate" title={r.course_title}>{r.course_title}</td>
                            <td className="px-5 py-3.5">
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-350 border border-slate-200/50 dark:border-slate-800/50">
                                {r.activity_type}
                              </span>
                            </td>
                          </>
                        )}

                        {activeTab === 'progress' && (
                          <>
                            <td className="px-5 py-3.5">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 dark:text-slate-200">{r.user_name}</span>
                                <span className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold">{r.user_email}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-700 dark:text-slate-350 font-bold truncate max-w-[120px]" title={r.roadmap_name}>{r.roadmap_name}</td>
                            <td className="px-5 py-3.5 text-slate-700 dark:text-slate-350 font-semibold truncate max-w-[150px]" title={r.title}>{r.title}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500" style={{ width: `${r.percentage_watched}%` }} />
                                </div>
                                <span className="font-extrabold text-[10px] text-slate-700 dark:text-slate-350">{r.percentage_watched}%</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${r.completed ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50' : 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-100/50'}`}>
                                {r.completed ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 font-semibold">
                              {r.last_activity ? new Date(r.last_activity).toLocaleDateString() : 'N/A'}
                            </td>
                          </>
                        )}

                        {/* Archive status column (Soft Delete Status) */}
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            r.is_deleted
                              ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-100/50'
                              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50'
                          }`}>
                            {r.is_deleted ? 'Archived' : 'Active'}
                          </span>
                        </td>

                        {/* Actions column */}
                        <td className="px-5 py-3.5 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => openDrawer(r)}
                              title="View details"
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg transition-colors cursor-pointer"
                            >
                              <FiEye className="w-4 h-4" />
                            </button>
                            
                            {r.is_deleted ? (
                              <button
                                onClick={() => handleRestore(r.id)}
                                title="Restore record"
                                className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer"
                              >
                                <FiRefreshCw className="w-4 h-4" />
                              </button>
                            ) : null}

                            <button
                              onClick={() => handleHardDelete(r.id)}
                              title="Permanently hard delete"
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>

              {/* Pagination component */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>Showing page {page} of {totalPages} ({totalRecords} records total)</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-40 transition-colors disabled:cursor-not-allowed cursor-pointer"
                  >
                    <FiChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-40 transition-colors disabled:cursor-not-allowed cursor-pointer"
                  >
                    <FiChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* Detail side drawer (Phase 8) */}
      <AnimatePresence>
        {isDrawerOpen && selectedItem && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black z-45"
            />

            {/* Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-50 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-extrabold text-orange-500 tracking-wider">
                    {activeTab === 'roadmaps' && 'Career Roadmap Details'}
                    {activeTab === 'courses' && 'Saved Course Details'}
                    {activeTab === 'sessions' && 'Learning Session Details'}
                    {activeTab === 'progress' && 'Learning Progress Details'}
                  </span>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white mt-0.5 truncate max-w-[280px]">
                    {activeTab === 'roadmaps' && selectedItem.target_role}
                    {activeTab === 'courses' && selectedItem.title}
                    {activeTab === 'sessions' && `${selectedItem.activity_type} Session`}
                    {activeTab === 'progress' && selectedItem.title}
                  </h4>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-grow overflow-y-auto p-5 space-y-6 scrollbar-thin text-xs">
                
                {/* 1. Archive & Security status */}
                <div className="bg-slate-50 dark:bg-slate-955 p-4 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Database ID</span>
                    <span className="font-mono text-slate-700 dark:text-slate-350 font-bold">{selectedItem.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-400">Archive State</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border border-transparent ${selectedItem.is_deleted ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-100/30' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'}`}>
                      {selectedItem.is_deleted ? 'Archived' : 'Active'}
                    </span>
                  </div>
                  {selectedItem.is_deleted && (
                    <>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-400">Deleted At</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{new Date(selectedItem.deleted_at).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-400">Deleted By</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{selectedItem.deleted_by_email || 'System'}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* 2. User Info */}
                <div className="space-y-3">
                  <h5 className="font-black text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                    <FiUser className="text-orange-500" /> User Information
                  </h5>
                  <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <FiUser className="text-slate-400 w-4 h-4" />
                      <span className="font-bold text-slate-750 dark:text-slate-300">{selectedItem.user_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiMail className="text-slate-400 w-4 h-4" />
                      <span className="font-bold text-slate-750 dark:text-slate-300">{selectedItem.user_email}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Module Specific Details */}
                
                {/* Roadmap Details */}
                {activeTab === 'roadmaps' && (
                  <div className="space-y-4">
                    <h5 className="font-black text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                      <FiCpu className="text-orange-500" /> Roadmap Analytics
                    </h5>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                        <p className="text-[9px] uppercase font-bold text-slate-400">Completion</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{selectedItem.progress_pct}%</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-955 rounded-xl">
                        <p className="text-[9px] uppercase font-bold text-slate-400">Total Milestones</p>
                        <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{selectedItem.milestones_count} units</p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <h6 className="font-bold text-slate-650 dark:text-slate-450 uppercase tracking-wider text-[9px]">Roadmap Milestones List</h6>
                      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1.5 scrollbar-thin">
                        {selectedItem.milestones?.map((m, idx) => (
                          <div key={m.id || idx} className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-bold text-slate-850 dark:text-slate-200">{m.title}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${m.is_completed ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-slate-100 text-slate-400 dark:bg-slate-850 dark:text-slate-500'}`}>
                                {m.is_completed ? 'Done' : 'Pending'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-normal">{m.description}</p>
                            {m.timeframe && (
                              <p className="text-[9px] text-orange-500 font-bold mt-1">Timeline: {m.timeframe}</p>
                            )}
                            {m.skills?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {m.skills.map(s => (
                                  <span key={s} className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-950 text-slate-450 dark:text-slate-500 text-[8px] rounded border border-slate-150/45">{s}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Course Details */}
                {activeTab === 'courses' && (
                  <div className="space-y-4">
                    <h5 className="font-black text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                      <FiBookOpen className="text-orange-500" /> Course Details
                    </h5>
                    
                    {selectedItem.thumbnail && (
                      <img
                        src={selectedItem.thumbnail}
                        alt={selectedItem.title}
                        className="w-full h-36 object-cover rounded-xl border border-slate-100 dark:border-slate-800"
                      />
                    )}

                    <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400">Title</span>
                        <p className="font-bold text-slate-805 dark:text-slate-200 mt-0.5 leading-relaxed">{selectedItem.title}</p>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400">Platform Provider</span>
                        <p className="font-bold text-slate-805 dark:text-slate-200 mt-0.5 uppercase">{selectedItem.provider}</p>
                      </div>
                      {selectedItem.description && (
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400">Description</span>
                          <p className="font-semibold text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{selectedItem.description}</p>
                        </div>
                      )}
                      {selectedItem.url && (
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400">Course URL</span>
                          <a
                            href={selectedItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-500 hover:underline font-bold block mt-0.5 truncate"
                          >
                            {selectedItem.url}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Learning Session Details */}
                {activeTab === 'sessions' && (
                  <div className="space-y-4">
                    <h5 className="font-black text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                      <FiClock className="text-orange-500" /> Session Details
                    </h5>
                    
                    <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Activity Type</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedItem.activity_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Session Date</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedItem.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Total Duration</span>
                        <span className="font-extrabold text-orange-500">{formatDuration(selectedItem.duration)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Start Time</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{new Date(selectedItem.start_time).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">End Time</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{new Date(selectedItem.end_time).toLocaleTimeString()}</span>
                      </div>
                      {selectedItem.completion_percentage > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-semibold">Completion reached</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{selectedItem.completion_percentage}%</span>
                        </div>
                      )}
                      {selectedItem.course_title && (
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400">Course studied</span>
                          <p className="font-bold text-slate-808 dark:text-slate-200 mt-0.5">{selectedItem.course_title}</p>
                        </div>
                      )}
                      {selectedItem.roadmap_name && (
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400">Career Roadmap Target</span>
                          <p className="font-bold text-slate-808 dark:text-slate-200 mt-0.5">{selectedItem.roadmap_name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Learning Progress Details */}
                {activeTab === 'progress' && (
                  <div className="space-y-4">
                    <h5 className="font-black text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                      <FiPlay className="text-orange-500" /> Watch Progress Analytics
                    </h5>

                    {selectedItem.thumbnail && (
                      <img
                        src={selectedItem.thumbnail}
                        alt={selectedItem.title}
                        className="w-full h-36 object-cover rounded-xl border border-slate-100 dark:border-slate-800"
                      />
                    )}

                    <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-3.5 space-y-3">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400">Video Title</span>
                        <p className="font-bold text-slate-805 dark:text-slate-200 mt-0.5">{selectedItem.title}</p>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Creator Channel</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedItem.channel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Video Duration</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatDuration(selectedItem.duration)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Time Watched</span>
                        <span className="font-extrabold text-orange-500">{selectedItem.total_minutes_watched.toFixed(1)} minutes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Progress Percentage</span>
                        <span className="font-extrabold text-blue-500">{selectedItem.percentage_watched}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-semibold">Completed status</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${selectedItem.completed ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                          {selectedItem.completed ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                      {selectedItem.completed && selectedItem.completion_date && (
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-semibold">Completion Date</span>
                          <span className="font-bold text-slate-850 dark:text-slate-200">{new Date(selectedItem.completion_date).toLocaleString()}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400">Roadmap Milestone Link</span>
                        <p className="font-bold text-slate-805 dark:text-slate-200 mt-0.5">{selectedItem.roadmap_name} (Milestone: {selectedItem.milestone_title})</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Action Footer */}
              <div className="p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3">
                {selectedItem.is_deleted ? (
                  <button
                    onClick={() => handleRestore(selectedItem.id)}
                    className="flex-grow py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-extrabold transition shadow-md shadow-emerald-500/10 text-center cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <FiRefreshCw className="w-4 h-4" /> Restore Active State
                  </button>
                ) : null}

                <button
                  onClick={() => handleHardDelete(selectedItem.id)}
                  className={`${selectedItem.is_deleted ? 'w-1/3 border border-red-200 bg-white dark:bg-slate-900 text-red-500 hover:bg-red-50' : 'flex-grow bg-red-500 text-white hover:bg-red-600'} py-2.5 rounded-xl font-extrabold transition text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-sm`}
                >
                  <FiTrash2 className="w-4 h-4" /> {selectedItem.is_deleted ? 'Hard Delete' : 'Permanently Delete'}
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast system alerts */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
}
