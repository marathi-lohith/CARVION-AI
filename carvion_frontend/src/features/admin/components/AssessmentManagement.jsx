import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiAward, FiSearch, FiX, FiFilter, FiChevronLeft, FiChevronRight, FiCheckCircle,
  FiAlertCircle, FiDatabase, FiTrendingUp, FiActivity, FiClock, FiEye, FiTrash2,
  FiRefreshCw, FiUser, FiBriefcase, FiLayers, FiCalendar, FiBookOpen, FiClipboard,
  FiCheck, FiPieChart, FiInfo, FiTrendingDown, FiSmile
} from 'react-icons/fi';
import { confirm } from '../../../utils/confirm.js';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import Toast from '../../../components/feedback/Toast.jsx';

export default function AssessmentManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview'); // overview, mock_tests, ai_interviews, performance_reviews, history
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, deleted
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  
  // Tab-specific filters
  const [mockCategory, setMockCategory] = useState('');
  const [mockDifficulty, setMockDifficulty] = useState('');
  const [interviewRole, setInterviewRole] = useState('');
  const [interviewMode, setInterviewMode] = useState('');
  const [reviewType, setReviewType] = useState('all'); // all, mock_test, ai_interview
  const [scoreMin, setScoreMin] = useState('');
  const [scoreMax, setScoreMax] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 8;
  
  // Drawers
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [drawerType, setDrawerType] = useState(null); // mock_test, ai_interview, review, history
  
  // Notification Toast
  const [toast, setToast] = useState(null);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when tab/filters change
  useEffect(() => {
    setPage(1);
  }, [activeTab, statusFilter, dateFilter, mockCategory, mockDifficulty, interviewRole, interviewMode, reviewType, scoreMin, scoreMax]);

  // Fetch Admin Telemetry for Overview KPIs & Analytics
  const { data: telemetry, isLoading: telemetryLoading, refetch: refetchTelemetry } = useQuery({
    queryKey: ['adminTelemetry'],
    queryFn: async () => {
      const response = await apiClient.get('/api/admin/telemetry/');
      return response.data?.data || response.data;
    }
  });

  // Map active Tab to backend module queries
  const backendModule = useMemo(() => {
    if (activeTab === 'mock_tests') return 'mock_tests';
    if (activeTab === 'ai_interviews') return 'ai_interviews';
    if (activeTab === 'performance_reviews') return 'performance_reviews';
    if (activeTab === 'history') return 'assessment_history';
    return null;
  }, [activeTab]);

  // Fetch record list query
  const { data: recordsData, isLoading: recordsLoading, refetch: refetchRecords } = useQuery({
    queryKey: ['adminRecords', backendModule, page, debouncedSearch, statusFilter, dateFilter, mockCategory, mockDifficulty, interviewRole, interviewMode, reviewType, scoreMin, scoreMax],
    queryFn: async () => {
      if (!backendModule) return null;
      const params = {
        page,
        pageSize,
        search: debouncedSearch,
        status: statusFilter,
        date_filter: dateFilter
      };

      if (backendModule === 'mock_tests') {
        if (mockCategory) params.category = mockCategory;
        if (mockDifficulty) params.difficulty = mockDifficulty;
      } else if (backendModule === 'ai_interviews') {
        if (interviewRole) params.role = interviewRole;
        if (interviewMode) params.mode = interviewMode;
        if (scoreMin) params.score_min = scoreMin;
        if (scoreMax) params.score_max = scoreMax;
      } else if (backendModule === 'performance_reviews') {
        if (reviewType !== 'all') params.assessment_type = reviewType;
        if (scoreMin) params.score_min = scoreMin;
        if (scoreMax) params.score_max = scoreMax;
      } else if (backendModule === 'assessment_history') {
        if (reviewType !== 'all') params.assessment_type = reviewType;
      }

      const response = await apiClient.get(`/api/admin/records/${backendModule}/`, { params });
      return response.data?.data || response.data;
    },
    enabled: !!backendModule
  });

  // Soft Delete actions
  const restoreMutation = useMutation({
    mutationFn: async ({ id, customModule }) => {
      const targetModule = customModule || backendModule;
      const response = await apiClient.post(`/api/admin/records/${targetModule}/${id}/restore/`);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminRecords']);
      refetchTelemetry();
      setToast({ type: 'success', message: 'Record successfully restored.' });
      if (selectedRecord) setSelectedRecord(null);
    },
    onError: (err) => {
      setToast({ type: 'error', message: err.response?.data?.error || 'Failed to restore record.' });
    }
  });

  const purgeMutation = useMutation({
    mutationFn: async ({ id, customModule }) => {
      const targetModule = customModule || backendModule;
      const response = await apiClient.delete(`/api/admin/records/${targetModule}/${id}/hard-delete/`);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminRecords']);
      refetchTelemetry();
      setToast({ type: 'success', message: 'Record permanently purged.' });
      if (selectedRecord) setSelectedRecord(null);
    },
    onError: (err) => {
      setToast({ type: 'error', message: err.response?.data?.error || 'Failed to purge record.' });
    }
  });

  const handleRestore = async (id, customModule) => {
    const isConfirmed = await confirm({
      title: 'Restore Record',
      message: 'Are you sure you want to restore this soft-deleted record? It will reappear in standard user workspaces.',
      confirmText: 'Restore',
      cancelText: 'Cancel'
    });
    if (isConfirmed) {
      restoreMutation.mutate({ id, customModule });
    }
  };

  const handlePurge = async (id, customModule) => {
    const isConfirmed = await confirm({
      title: 'Permanently Purge Record',
      message: 'WARNING: This will permanently remove this record from the database. This action is irreversible and violates standard audit trails.',
      confirmText: 'Purge Permanently',
      cancelText: 'Cancel'
    });
    if (isConfirmed) {
      purgeMutation.mutate({ id, customModule });
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const records = recordsData?.records || [];
  const totalCount = recordsData?.total_count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const stats = telemetry?.assessments || {};

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/35 p-1 rounded-xl w-fit">
        {[
          { id: 'overview', name: 'Overview & KPIs', icon: <FiPieChart /> },
          { id: 'mock_tests', name: 'Mock Tests', icon: <FiBookOpen /> },
          { id: 'ai_interviews', name: 'AI Interviews', icon: <FiLayers /> },
          { id: 'performance_reviews', name: 'Performance Scorecards', icon: <FiAward /> },
          { id: 'history', name: 'Unified History', icon: <FiClipboard /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedRecord(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
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

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Overview KPIs */}
            {telemetryLoading ? (
              <Loader fullScreen={false} skeleton={true} variant="grid" />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Mock Tests */}
                  <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-5 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Mock Tests Taken</p>
                      <h3 className="text-2xl font-black text-slate-800 dark:text-white">{stats.total_mock_tests || 0}</h3>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold">Average: <span className="text-emerald-500 font-bold">{stats.average_assessment_score || 0}%</span></p>
                    </div>
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 dark:text-indigo-400 rounded-xl">
                      <FiBookOpen className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Interview Sessions */}
                  <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-5 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">AI Interviews</p>
                      <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                        {stats.completed_interviews || 0} <span className="text-xs text-slate-400">/ {stats.total_interviews || 0}</span>
                      </h3>
                      <p className="text-[10px] text-slate-455 dark:text-slate-500 font-semibold">Average: <span className="text-indigo-500 font-bold">{stats.average_interview_score || 0}%</span></p>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 dark:text-emerald-400 rounded-xl">
                      <FiLayers className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Total Performance Reviews */}
                  <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-5 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Scorecards Generated</p>
                      <h3 className="text-2xl font-black text-slate-800 dark:text-white">{stats.total_scorecards || 0}</h3>
                      <p className="text-[10px] text-slate-455 font-semibold">Completion Rate: <span className="text-indigo-500 font-bold">{stats.completion_rate || 0}%</span></p>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-500 dark:text-amber-400 rounded-xl">
                      <FiAward className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Soft Delete States */}
                  <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-5 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Deleted / Archived</p>
                      <h3 className="text-2xl font-black text-rose-600 dark:text-rose-450">{stats.deleted_records || 0}</h3>
                      <p className="text-[10px] text-slate-455 font-semibold">Active Records: <span className="font-bold text-slate-600 dark:text-slate-300">{stats.active_records || 0}</span></p>
                    </div>
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 rounded-xl">
                      <FiDatabase className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Second Row: Success Rates & Most popular categories */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Distribution Chart and trends */}
                  <div className="lg:col-span-2 bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-450 dark:text-slate-400 flex items-center gap-1.5">
                      <FiTrendingUp className="text-indigo-500" /> Assessment Completion Trends (7 Days)
                    </h4>
                    
                    <div className="h-48 flex items-end justify-between gap-2 pt-6">
                      {stats.assessment_trend?.map((t, idx) => {
                        const maxCount = Math.max(...stats.assessment_trend.map(x => x.total || 0), 1);
                        const pctTotal = ((t.total || 0) / maxCount) * 80;
                        
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute mb-16 bg-slate-850 dark:bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded shadow-md pointer-events-none flex flex-col items-center">
                              <span>Mock Tests: {t.mock_tests || 0}</span>
                              <span>Interviews: {t.interviews || 0}</span>
                            </div>
                            
                            <div className="w-full bg-slate-50 dark:bg-slate-900 rounded-t-lg h-full flex flex-col justify-end overflow-hidden">
                              <div 
                                style={{ height: `${pctTotal}%` }} 
                                className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 dark:from-indigo-600 dark:to-indigo-500 rounded-t-md transition-all duration-500"
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{t.date}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Categorical Breakdowns */}
                  <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-5 shadow-sm">
                    <div className="space-y-1">
                      <h4 className="font-black text-xs uppercase tracking-wider text-slate-455 dark:text-slate-400 flex items-center gap-1.5">
                        <FiBookOpen className="text-amber-500" /> Top Categories & Roles
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold">Distribution profile of parsed tests and interview sessions.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-slate-405 tracking-wider">Top Assessment Domains</span>
                        <div className="space-y-2">
                          {stats.popular_categories?.length ? (
                            stats.popular_categories.map((c, i) => (
                              <div key={i} className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> {c.category}
                                </span>
                                <span className="text-slate-400">{c.count} taken</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-[11px] text-slate-400 font-semibold italic">No data recorded.</div>
                          )}
                        </div>
                      </div>

                      <hr className="border-slate-100 dark:border-slate-900" />

                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-slate-405 tracking-wider">Popular Interview Roles</span>
                        <div className="space-y-2">
                          {stats.common_interview_roles?.length ? (
                            stats.common_interview_roles.map((r, i) => (
                              <div key={i} className="flex items-center justify-between text-xs font-bold">
                                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {r.role}
                                </span>
                                <span className="text-slate-400">{r.count} sessions</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-[11px] text-slate-400 font-semibold italic">No data recorded.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score breakdown metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-5 rounded-2xl space-y-4 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <FiAward className="text-indigo-500" /> Peak Performance
                    </span>
                    <div className="flex items-baseline justify-between">
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 font-bold">Best MCQ Score</p>
                        <h4 className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{stats.highest_assessment_score || 0}%</h4>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[10px] text-slate-400 font-bold">Best Interview Score</p>
                        <h4 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats.highest_interview_score || 0}%</h4>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-5 rounded-2xl space-y-3 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <FiActivity className="text-emerald-500" /> Interview Success Profile
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-2xl font-black text-slate-800 dark:text-white">{stats.interview_success_rate || 0}%</h4>
                      <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                        Percentage of completed sessions scoring 70% or higher overall.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-5 rounded-2xl space-y-3 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-455 tracking-wider flex items-center gap-1.5 text-amber-500">
                      <FiInfo /> System Capability Warning
                    </span>
                    <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                      Bulk operations (Restore / Purge) are currently disabled. The system backend does not natively support batch mutations for security auditing reasons. Run actions individually.
                    </p>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {activeTab !== 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Filter toolbar */}
            <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between shadow-sm">
              <div className="flex flex-wrap gap-3 items-center flex-1">
                <div className="relative w-full max-w-xs">
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={
                      activeTab === 'mock_tests' ? 'Search by Email, Title, Category...' :
                      activeTab === 'ai_interviews' ? 'Search Role...' :
                      'Search by user Name, Email...'
                    }
                    className="w-full pl-10 pr-9 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500/55"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-355"
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="all">All Records</option>
                  <option value="active">Active Only</option>
                  <option value="deleted">Soft Deleted</option>
                </select>

                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="week">Past Week</option>
                  <option value="month">Past Month</option>
                </select>

                {activeTab === 'mock_tests' && (
                  <>
                    <select
                      value={mockCategory}
                      onChange={(e) => setMockCategory(e.target.value)}
                      className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl text-xs font-semibold focus:outline-none"
                    >
                      <option value="">All Categories</option>
                      <option value="MCQ">MCQ</option>
                      <option value="Technical">Technical</option>
                      <option value="Coding">Coding</option>
                      <option value="Aptitude">Aptitude</option>
                      <option value="HR">HR</option>
                    </select>

                    <select
                      value={mockDifficulty}
                      onChange={(e) => setMockDifficulty(e.target.value)}
                      className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl text-xs font-semibold focus:outline-none"
                    >
                      <option value="">All Difficulties</option>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </>
                )}

                {activeTab === 'ai_interviews' && (
                  <>
                    <select
                      value={interviewMode}
                      onChange={(e) => setInterviewMode(e.target.value)}
                      className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl text-xs font-semibold focus:outline-none"
                    >
                      <option value="">All Modes</option>
                      <option value="text">Text Mode</option>
                      <option value="voice">Voice Mode</option>
                    </select>

                    <div className="flex items-center gap-1 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-xl text-xs">
                      <span className="text-[10px] text-slate-400 font-bold">Score Min:</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={scoreMin}
                        onChange={(e) => setScoreMin(e.target.value)}
                        className="w-12 bg-transparent text-center focus:outline-none border-b border-transparent focus:border-indigo-500 text-xs font-bold"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'performance_reviews' && (
                  <>
                    <select
                      value={reviewType}
                      onChange={(e) => setReviewType(e.target.value)}
                      className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl text-xs font-semibold focus:outline-none"
                    >
                      <option value="all">All Scorecards</option>
                      <option value="mock_test">Mock Tests only</option>
                      <option value="ai_interview">AI Interviews only</option>
                    </select>

                    <div className="flex items-center gap-1 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-xl text-xs">
                      <span className="text-[10px] text-slate-400 font-bold">Min Score:</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={scoreMin}
                        onChange={(e) => setScoreMin(e.target.value)}
                        className="w-12 bg-transparent text-center focus:outline-none border-b border-transparent focus:border-indigo-500 text-xs font-bold"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'history' && (
                  <select
                    value={reviewType}
                    onChange={(e) => setReviewType(e.target.value)}
                    className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl text-xs font-semibold focus:outline-none"
                  >
                    <option value="all">All Types</option>
                    <option value="mock_test">Mock Tests</option>
                    <option value="ai_interview">AI Interviews</option>
                  </select>
                )}
              </div>

              <div className="text-[10px] font-bold text-slate-400">
                Found {totalCount} records
              </div>
            </div>

            {/* List Tables */}
            <div className="bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm">
              {recordsLoading ? (
                <div className="p-12">
                  <Loader fullScreen={false} variant="grid" />
                </div>
              ) : records.length === 0 ? (
                <div className="p-16 text-center space-y-2">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <FiDatabase className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">No Assessment Records Found</h4>
                  <p className="text-[10px] text-slate-450 max-w-xs mx-auto">
                    Try adjusting search query filters, tab parameters, or checking soft delete audit switches.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-900/80 sticky top-0">
                      <tr>
                        <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">User</th>
                        {activeTab === 'mock_tests' && (
                          <>
                            <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Assessment Name</th>
                            <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Category</th>
                            <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Difficulty</th>
                            <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Score</th>
                          </>
                        )}
                        {activeTab === 'ai_interviews' && (
                          <>
                            <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Interview Role</th>
                            <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Type</th>
                            <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Duration</th>
                            <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Score</th>
                          </>
                        )}
                        {activeTab === 'performance_reviews' && (
                          <>
                            <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Assessment Type</th>
                            <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Overall</th>
                            <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Tech</th>
                            <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Comm</th>
                            <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Solve</th>
                            <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Confidence</th>
                          </>
                        )}
                        {activeTab === 'history' && (
                          <>
                            <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Assessment Type</th>
                            <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Title</th>
                            <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Score</th>
                            <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Status</th>
                          </>
                        )}
                        <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Completed Date</th>
                        <th className="px-5 py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-900/50">
                      {records.map((r) => {
                        const originalModule = r.assessment_type === 'AI Interview' || activeTab === 'ai_interviews' ? 'interview_sessions' : 'scorecards';
                        const originalId = r.original_id || r.id;

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors odd:bg-slate-50/20">
                            <td className="px-5 py-3">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{r.user_name || 'N/A'}</span>
                                <span className="text-[10px] font-semibold text-slate-400">{r.user_email}</span>
                              </div>
                            </td>

                            {activeTab === 'mock_tests' && (
                              <>
                                <td className="px-5 py-3 text-xs font-bold text-slate-700 dark:text-slate-300">{r.domain}</td>
                                <td className="px-5 py-3">
                                  <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
                                    {r.category}
                                  </span>
                                </td>
                                <td className="px-5 py-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    r.difficulty === 'Easy' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' :
                                    r.difficulty === 'Medium' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600' :
                                    'bg-rose-50 dark:bg-rose-950/20 text-rose-600'
                                  }`}>
                                    {r.difficulty}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-center">
                                  <span className={`text-xs font-extrabold ${r.score >= 70 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {r.score}%
                                  </span>
                                </td>
                              </>
                            )}

                            {activeTab === 'ai_interviews' && (
                              <>
                                <td className="px-5 py-3 text-xs font-bold text-slate-700 dark:text-slate-300">{r.role}</td>
                                <td className="px-5 py-3 text-xs font-semibold capitalize text-slate-500 dark:text-slate-400">{r.mode} Mode</td>
                                <td className="px-5 py-3 text-xs text-slate-450 font-semibold">{Math.floor(r.duration / 60)}m {r.duration % 60}s</td>
                                <td className="px-5 py-3 text-center">
                                  <span className={`text-xs font-extrabold ${r.overall_score >= 70 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {r.overall_score}%
                                  </span>
                                </td>
                              </>
                            )}

                            {activeTab === 'performance_reviews' && (
                              <>
                                <td className="px-5 py-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                    r.assessment_type === 'Mock Test' ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' :
                                    'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                                  }`}>
                                    {r.assessment_type}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-center text-xs font-black text-indigo-600 dark:text-indigo-400">{r.overall_score}%</td>
                                <td className="px-5 py-3 text-center text-xs font-bold text-slate-600 dark:text-slate-400">{r.technical_score ?? 'N/A'}%</td>
                                <td className="px-5 py-3 text-center text-xs font-bold text-slate-600 dark:text-slate-400">{r.communication_score !== null ? `${r.communication_score}%` : 'N/A'}</td>
                                <td className="px-5 py-3 text-center text-xs font-bold text-slate-600 dark:text-slate-400">{r.problem_solving_score ?? 'N/A'}%</td>
                                <td className="px-5 py-3 text-center text-xs font-bold text-slate-600 dark:text-slate-400">{r.confidence_score !== null ? `${r.confidence_score}%` : 'N/A'}</td>
                              </>
                            )}

                            {activeTab === 'history' && (
                              <>
                                <td className="px-5 py-3 text-xs font-bold">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                    r.assessment_type === 'Mock Test' ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400' :
                                    'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                                  }`}>
                                    {r.assessment_type}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-xs font-bold text-slate-700 dark:text-slate-300">{r.title}</td>
                                <td className="px-5 py-3 text-center">
                                  {r.score !== null ? (
                                    <span className={`text-xs font-extrabold ${r.score >= 70 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                      {r.score}%
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-bold italic">N/A</span>
                                  )}
                                </td>
                                <td className="px-5 py-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                    r.status_state === 'Completed' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-400'
                                  }`}>
                                    {r.status_state}
                                  </span>
                                </td>
                              </>
                            )}

                            <td className="px-5 py-3 text-xs font-semibold text-slate-400">
                              {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}
                            </td>

                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => { setSelectedRecord(r); setDrawerType(activeTab === 'history' ? (r.assessment_type === 'AI Interview' ? 'ai_interview' : 'mock_test') : activeTab); }}
                                  className="p-1.5 text-slate-550 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                  title="View Details"
                                >
                                  <FiEye className="w-4 h-4" />
                                </button>

                                {r.is_deleted ? (
                                  <>
                                    <button
                                      onClick={() => handleRestore(originalId, originalModule)}
                                      className="p-1.5 text-slate-450 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-455 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                      title="Restore Record"
                                    >
                                      <FiRefreshCw className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handlePurge(originalId, originalModule)}
                                      className="p-1.5 text-slate-450 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-455 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                      title="Purge Permanently"
                                    >
                                      <FiTrash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handlePurge(originalId, originalModule)}
                                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                    title="Soft Delete"
                                  >
                                    <FiTrash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 px-5 py-4 rounded-2xl shadow-sm">
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  <FiChevronLeft /> Previous
                </button>
                <span className="text-xs font-semibold text-slate-455">
                  Page <strong className="text-slate-700 dark:text-slate-300">{page}</strong> of <strong className="text-slate-700 dark:text-slate-300">{totalPages}</strong>
                </span>
                <button
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Next <FiChevronRight />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Drawer overlay */}
      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRecord(null)}
              className="absolute inset-0 bg-slate-900/60"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-xl bg-white dark:bg-slate-950 h-full shadow-2xl flex flex-col z-10 border-l border-slate-200/50 dark:border-slate-900"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/10">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    {drawerType === 'mock_test' ? 'Mock Test Detail Audit' :
                     drawerType === 'ai_interview' ? 'Interview Log & Transcript' :
                     'Performance review audit'}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <FiUser /> {selectedRecord.user_email}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-1.5 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-700"
                >
                  <FiX className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {drawerType === 'mock_test' && (
                  <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-900/50 p-4 rounded-2xl grid grid-cols-2 gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Topic / Domain</span>
                        <span>{selectedRecord.domain}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Category</span>
                        <span>{selectedRecord.category}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Difficulty</span>
                        <span>{selectedRecord.difficulty}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Duration Taken</span>
                        <span>{selectedRecord.duration ? `${Math.floor(selectedRecord.duration / 60)}m ${selectedRecord.duration % 60}s` : 'N/A'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/35 p-3 rounded-2xl">
                        <span className="text-[8px] font-black uppercase text-emerald-600 block">Graded Score</span>
                        <span className="text-lg font-black text-emerald-600">{selectedRecord.score}%</span>
                      </div>
                      <div className="bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/35 p-3 rounded-2xl">
                        <span className="text-[8px] font-black uppercase text-indigo-600 block">Correct Answers</span>
                        <span className="text-lg font-black text-indigo-600">{selectedRecord.correct_answers}</span>
                      </div>
                      <div className="bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/35 p-3 rounded-2xl">
                        <span className="text-[8px] font-black uppercase text-rose-600 block">Total Questions</span>
                        <span className="text-lg font-black text-rose-600">{selectedRecord.total_questions}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Questions & Graded Audit Logs</h5>
                      <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-900">
                        {selectedRecord.answers_submitted?.map((ans, index) => (
                          <div key={index} className="pt-3 first:pt-0 space-y-2">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Question {index + 1}</span>
                              {ans.question_text || `Question ID: ${ans.question_id}`}
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                              <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400 block uppercase text-[8px] mb-0.5">Selected Option</span>
                                <span className="text-slate-700 dark:text-slate-300">{ans.selected_option_text || `Index ${ans.selected_option}`}</span>
                              </div>
                              <div className={`p-2 rounded-lg border ${
                                ans.is_correct
                                  ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900 text-emerald-600'
                                  : 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900 text-rose-600'
                              }`}>
                                <span className="block uppercase text-[8px] mb-0.5">Graded Status</span>
                                <span className="flex items-center gap-1">
                                  {ans.is_correct ? <FiCheckCircle /> : <FiAlertCircle />}
                                  {ans.is_correct ? 'Correct' : 'Incorrect'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {drawerType === 'ai_interview' && (
                  <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-900/50 p-4 rounded-2xl grid grid-cols-2 gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Interview Role</span>
                        <span>{selectedRecord.role}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Difficulty</span>
                        <span>{selectedRecord.difficulty}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Interview Mode</span>
                        <span className="capitalize">{selectedRecord.mode} Chat</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Status State</span>
                        <span>{selectedRecord.status || 'Completed'}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Scorecard evaluation Breakdown</h5>
                      <div className="grid grid-cols-3 gap-3 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
                        <div className="bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/50 p-3 rounded-2xl col-span-3">
                          <span className="text-[8px] font-black uppercase text-indigo-600 block">Overall Graded Score</span>
                          <span className="text-xl font-black text-indigo-600">{selectedRecord.overall_score}%</span>
                        </div>
                        <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-900 p-2.5 rounded-xl">
                          <span className="text-[8px] text-slate-400 block uppercase">Technical</span>
                          <span className="font-extrabold">{selectedRecord.evaluation?.technical_score ?? 70}%</span>
                        </div>
                        <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-900 p-2.5 rounded-xl">
                          <span className="text-[8px] text-slate-400 block uppercase">Communication</span>
                          <span className="font-extrabold">{selectedRecord.evaluation?.communication_score ?? 70}%</span>
                        </div>
                        <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-900 p-2.5 rounded-xl">
                          <span className="text-[8px] text-slate-400 block uppercase">Confidence</span>
                          <span className="font-extrabold">{selectedRecord.evaluation?.confidence_score ?? 70}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Interview Script & Transcript</h5>
                      <div className="border border-slate-100 dark:border-slate-900 rounded-2xl overflow-hidden p-4 space-y-4 max-h-72 overflow-y-auto bg-slate-50/30 dark:bg-slate-950/20">
                        {selectedRecord.dialog?.length ? (
                          selectedRecord.dialog.map((msg, index) => (
                            <div key={index} className="space-y-2 text-xs leading-relaxed">
                              <div className="bg-indigo-50/40 dark:bg-indigo-950/15 p-3 rounded-2xl border border-indigo-100/30 dark:border-indigo-900/30 mr-12">
                                <span className="text-[8px] font-black uppercase text-indigo-500 block mb-0.5">AI INTERVIEWER</span>
                                <p className="font-bold text-slate-800 dark:text-slate-200">{msg.question}</p>
                              </div>

                              <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800 ml-12">
                                <span className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">CANDIDATE</span>
                                <p className="font-semibold text-slate-700 dark:text-slate-350">{msg.answer || msg.response || 'No response recorded.'}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-[10px] font-bold text-slate-400 italic">No dialog parsed.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {drawerType === 'performance_reviews' && (
                  <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-900/50 p-4 rounded-2xl grid grid-cols-2 gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Assessment Title</span>
                        <span>{selectedRecord.title}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Assessment Type</span>
                        <span>{selectedRecord.assessment_type}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl">
                        <span className="text-[8px] text-slate-400 block uppercase font-bold">Overall</span>
                        <span className="text-lg font-black text-indigo-500">{selectedRecord.overall_score}%</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl">
                        <span className="text-[8px] text-slate-400 block uppercase font-bold">Technical</span>
                        <span className="text-lg font-black text-slate-700 dark:text-slate-300">{selectedRecord.technical_score ?? 'N/A'}%</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl">
                        <span className="text-[8px] text-slate-400 block uppercase font-bold">Communication</span>
                        <span className="text-lg font-black text-slate-700 dark:text-slate-300">
                          {selectedRecord.communication_score !== null ? `${selectedRecord.communication_score}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-2xl">
                        <span className="text-[8px] text-slate-400 block uppercase font-bold">Confidence</span>
                        <span className="text-lg font-black text-slate-700 dark:text-slate-300">
                          {selectedRecord.confidence_score !== null ? `${selectedRecord.confidence_score}%` : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400">AI Coach Evaluation Summary</h5>
                      <div className="bg-slate-50/50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                        {selectedRecord.summary || 'Summary feedback successfully generated by generative AI model algorithms.'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Strengths</span>
                        <div className="space-y-2">
                          {selectedRecord.strengths?.map((str, i) => (
                            <div key={i} className="flex gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              <span className="text-emerald-500 flex-shrink-0 mt-0.5"><FiCheck /></span>
                              <span>{str}</span>
                            </div>
                          )) || <div className="text-[10px] text-slate-400 italic">No metrics parsed.</div>}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Weaknesses</span>
                        <div className="space-y-2">
                          {selectedRecord.weaknesses?.map((wk, i) => (
                            <div key={i} className="flex gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              <span className="text-rose-500 flex-shrink-0 mt-1"><span className="w-1 h-1 rounded-full bg-rose-500 block" /></span>
                              <span>{wk}</span>
                            </div>
                          )) || <div className="text-[10px] text-slate-400 italic">No metrics parsed.</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/10">
                <span className="text-[10px] font-bold text-slate-400">
                  Record ID: {selectedRecord.id}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedRecord(null)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    Close
                  </button>
                  {selectedRecord.is_deleted ? (
                    <button
                      onClick={() => handleRestore(selectedRecord.original_id || selectedRecord.id, selectedRecord.assessment_type === 'AI Interview' || activeTab === 'ai_interviews' ? 'interview_sessions' : 'scorecards')}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                    >
                      Restore Record
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePurge(selectedRecord.original_id || selectedRecord.id, selectedRecord.assessment_type === 'AI Interview' || activeTab === 'ai_interviews' ? 'interview_sessions' : 'scorecards')}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
                    >
                      Soft Delete
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
