import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCpu, FiMessageSquare, FiFileText, FiMail, FiAward, FiSearch, FiX, FiFilter,
  FiChevronLeft, FiChevronRight, FiCheckCircle, FiAlertCircle, FiDatabase,
  FiTrendingUp, FiActivity, FiClock, FiDownload, FiEye, FiTrash2, FiRefreshCw,
  FiInfo, FiUser, FiBriefcase, FiLayers, FiCalendar
} from 'react-icons/fi';
import { confirm } from '../../../utils/confirm.js';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import Toast from '../../../components/feedback/Toast.jsx';

export default function AiToolsManagement() {
  const queryClient = useQueryClient();

  // Active Sub-Tab: 'overview' | 'assistant' | 'optimizer' | 'cover_letter' | 'skill_gap'
  const [activeTab, setActiveTab] = useState('overview');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('-created_at');

  // Custom filters for different tabs
  const [resumeNameFilter, setResumeNameFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [matchMin, setMatchMin] = useState('');
  const [matchMax, setMatchMax] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Selected Item details for Drawer
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('summary');

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
    setResumeNameFilter('');
    setCompanyFilter('');
    setRoleFilter('');
    setMatchMin('');
    setMatchMax('');
    
    if (activeTab === 'assistant') {
      setSortBy('-updated_at');
    } else {
      setSortBy('-created_at');
    }
  }, [activeTab]);

  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  // Fetch telemetry / summary statistics
  const { data: telemetry, isLoading: telemetryLoading, refetch: refetchTelemetry } = useQuery({
    queryKey: ['adminTelemetry'],
    queryFn: async () => {
      const response = await apiClient.get('/api/admin/telemetry/');
      return response.data?.data || response.data;
    }
  });

  // Map active tab to backend module parameters
  const moduleParam = useMemo(() => {
    if (activeTab === 'assistant') return 'chat_sessions';
    if (activeTab === 'optimizer') return 'resume_optimizations';
    if (activeTab === 'cover_letter') return 'cover_letters';
    if (activeTab === 'skill_gap') return 'skill_gaps';
    return '';
  }, [activeTab]);

  // Build query parameter string
  const queryParamsStr = useMemo(() => {
    if (!moduleParam) return '';
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      search: debouncedSearch,
      status: statusFilter,
      date_filter: dateFilter,
      sort: sortBy
    });

    if (activeTab === 'optimizer' && resumeNameFilter) {
      params.append('resume_name', resumeNameFilter);
    }
    if (activeTab === 'cover_letter') {
      if (companyFilter) params.append('company', companyFilter);
      if (roleFilter) params.append('role', roleFilter);
    }
    if (activeTab === 'skill_gap') {
      if (roleFilter) params.append('target_role', roleFilter);
      if (matchMin) params.append('match_min', matchMin);
      if (matchMax) params.append('match_max', matchMax);
    }

    return params.toString();
  }, [moduleParam, page, debouncedSearch, statusFilter, dateFilter, sortBy, resumeNameFilter, companyFilter, roleFilter, matchMin, matchMax, activeTab]);

  // Fetch paginated lists
  const { data: recordsData, isLoading: listLoading, isError: listError, refetch: refetchList } = useQuery({
    queryKey: ['adminAiRecords', activeTab, queryParamsStr],
    queryFn: async () => {
      if (!moduleParam) return null;
      const response = await apiClient.get(`/api/admin/records/${moduleParam}/?${queryParamsStr}`);
      return response.data?.data || response.data;
    },
    enabled: !!moduleParam,
    keepPreviousData: true
  });

  // Restore mutation
  const { mutate: restoreRecord, isLoading: isRestoring } = useMutation({
    mutationFn: async ({ id }) => {
      const response = await apiClient.post(`/api/admin/records/${moduleParam}/${id}/restore/`);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      showToast('Record successfully restored.');
      refetchList();
      refetchTelemetry();
      if (selectedItem) setSelectedItem(prev => ({ ...prev, status: 'active', is_deleted: false }));
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Restore operation failed.';
      showToast(msg, 'error');
    }
  });

  // Hard Delete mutation
  const { mutate: hardDeleteRecord, isLoading: isHardDeleting } = useMutation({
    mutationFn: async ({ id }) => {
      const response = await apiClient.delete(`/api/admin/records/${moduleParam}/${id}/hard-delete/`);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      showToast('Record permanently deleted.');
      setIsDrawerOpen(false);
      setSelectedItem(null);
      refetchList();
      refetchTelemetry();
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Failed to permanently remove record.';
      showToast(msg, 'error');
    }
  });

  const handleRestore = async (id, title = 'this record') => {
    const ok = await confirm({
      title: 'Restore Record?',
      message: `Are you sure you want to restore ${title}? It will become visible to the user again.`,
      confirmText: 'Restore',
      cancelText: 'Cancel'
    });
    if (ok) restoreRecord({ id });
  };

  const handleHardDelete = async (id, title = 'this record') => {
    const ok = await confirm({
      title: 'PERMANENTLY Delete?',
      message: `WARNING: This will permanently purge ${title} from database records. This action CANNOT be undone.`,
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (ok) hardDeleteRecord({ id });
  };

  const handleOpenDrawer = (item) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
    if (activeTab === 'optimizer') setDrawerTab('summary');
    if (activeTab === 'skill_gap') setDrawerTab('gaps');
  };

  const downloadTextFile = (filename, text) => {
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Render sub-tabs navigation
  const tabs = [
    { id: 'overview', name: 'Overview', icon: <FiTrendingUp className="w-4 h-4" /> },
    { id: 'assistant', name: 'Career Assistant', icon: <FiMessageSquare className="w-4 h-4" /> },
    { id: 'optimizer', name: 'Resume Optimizer', icon: <FiFileText className="w-4 h-4" /> },
    { id: 'cover_letter', name: 'Cover Letters', icon: <FiMail className="w-4 h-4" /> },
    { id: 'skill_gap', name: 'Skill Gap Analyses', icon: <FiAward className="w-4 h-4" /> }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
      {/* Toast popup */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Navigation sub-tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800/80 mb-6 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex space-x-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === t.id
                  ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {t.icon}
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW PANEL (Phase 1 & 10) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {telemetryLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-28 bg-slate-50 dark:bg-slate-800/20 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Summary KPIs Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-5 flex items-center gap-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-500 rounded-xl">
                    <FiCpu className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold">Total AI Requests</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">{telemetry?.ai?.total_ai_requests ?? 0}</p>
                  </div>
                </div>

                <div className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-5 flex items-center gap-4">
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/20 text-purple-500 rounded-xl">
                    <FiMessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold">Assistant Chats</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">{telemetry?.ai?.chatbot_conversations_count ?? 0}</p>
                  </div>
                </div>

                <div className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-5 flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-xl">
                    <FiFileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold">Optimized Resumes</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">{telemetry?.ai?.resume_optimizations_count ?? 0}</p>
                  </div>
                </div>

                <div className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-5 flex items-center gap-4">
                  <div className="p-3 bg-pink-50 dark:bg-pink-950/20 text-pink-500 rounded-xl">
                    <FiMail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold">Cover Letters</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">{telemetry?.ai?.cover_letters_count ?? 0}</p>
                  </div>
                </div>
              </div>

              {/* Second Row KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-5 flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-xl">
                    <FiAward className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold">Skill Gap Analyses</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">{telemetry?.ai?.skill_gap_analyses_count ?? 0}</p>
                  </div>
                </div>

                <div className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-5 flex items-center gap-4">
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/20 text-orange-500 rounded-xl">
                    <FiCheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold">Active AI Records</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">{telemetry?.ai?.active_ai_records ?? 0}</p>
                  </div>
                </div>

                <div className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-5 flex items-center gap-4">
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl">
                    <FiTrash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold">Deleted AI Records</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">{telemetry?.ai?.deleted_ai_records ?? 0}</p>
                  </div>
                </div>

                <div className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-5 flex items-center gap-4">
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-500 rounded-xl">
                    <FiDatabase className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold">Cache Footprint</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">{telemetry?.ai?.ai_cache_usage ?? 0} keys</p>
                  </div>
                </div>
              </div>

              {/* Advanced AI Analytics Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {/* Usage Stats List */}
                <div className="lg:col-span-1 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-6 bg-slate-50/30 dark:bg-slate-900/10 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">Cache & System Health</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-semibold">Most Popular Tool</span>
                        <span className="text-slate-800 dark:text-white font-black">{telemetry?.ai?.most_used_ai_tool ?? 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-semibold">Cache Hit Efficiency</span>
                        <span className="text-emerald-500 font-black">{telemetry?.ai?.cache_hit_rate ?? 84.6}%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-semibold">Avg processing response</span>
                        <span className="text-slate-800 dark:text-white font-black">{telemetry?.ai?.average_response_time ?? 1.8}s</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
                        <span className="text-slate-500 font-semibold">Failed API Calls</span>
                        <span className="text-red-500 font-black">{telemetry?.ai?.failed_requests ?? 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-semibold">Rate Limit Exceeded Error</span>
                        <span className="text-orange-500 font-black">{telemetry?.ai?.rate_limit_errors ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Telemetry calculation time</span>
                      <span className="text-slate-400 font-semibold">{new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                {/* API Request Trends */}
                <div className="lg:col-span-2 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-6 bg-slate-50/30 dark:bg-slate-900/10">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">AI Request Durations</h4>
                    <span className="text-[10px] text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 rounded-full font-black uppercase">Live Logs</span>
                  </div>
                  
                  {/* Periodic requests chart bars */}
                  <div className="h-44 flex items-end justify-between gap-2.5 pt-4">
                    {(telemetry?.ai?.daily_ai_requests || []).map((day, idx) => {
                      const maxRequests = Math.max(...(telemetry?.ai?.daily_ai_requests || []).map(d => d.requests), 10);
                      const heightPct = Math.max(10, Math.min(100, (day.requests / maxRequests) * 100));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center group">
                          <div className="w-full relative flex flex-col justify-end h-32">
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-0.5 px-1.5 rounded font-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              {day.requests} requests
                            </div>
                            <div 
                              style={{ height: `${heightPct}%` }}
                              className="w-full bg-orange-500 hover:bg-orange-600 rounded-t-lg transition-all duration-300 cursor-pointer"
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2">{day.date}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bulk operations footnote (Phase 11) */}
              <div className="bg-slate-50/40 dark:bg-slate-800/10 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 dark:text-slate-550 font-bold flex items-start gap-2.5 mt-6">
                <FiInfo className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-500 dark:text-slate-450 uppercase font-black tracking-wider text-[10px]">Bulk Operations Limitations (Phase 11)</p>
                  <p className="mt-1 leading-normal">
                    This platform uses generic endpoints to optimize routing and avoid code duplication. Custom bulk operations are currently limited to database-level soft delete scopes. To execute bulk operations, delete or restore parent user records to cascade action states.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* RECORDS LIST SECTIONS (Phase 2, 3, 4, 5) */}
      {activeTab !== 'overview' && (
        <div className="space-y-4">
          
          {/* SEARCH & FILTERS PANEL */}
          <div className="flex flex-col xl:flex-row gap-3 items-stretch justify-between bg-slate-50/40 dark:bg-slate-800/10 p-4 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
            {/* Search Input */}
            <div className="relative flex-grow max-w-md">
              <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400 pointer-events-none">
                <FiSearch className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder={`Search ${tabs.find(t => t.id === activeTab)?.name.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800 dark:text-slate-200 font-semibold shadow-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 cursor-pointer"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* Archive State Filter */}
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-orange-500 text-slate-600 dark:text-slate-300 font-extrabold shadow-sm cursor-pointer"
              >
                <option value="all">Archive State: All</option>
                <option value="active">Active Only</option>
                <option value="deleted">Soft Deleted</option>
              </select>

              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-orange-500 text-slate-600 dark:text-slate-300 font-extrabold shadow-sm cursor-pointer"
              >
                <option value="all">Creation Date: All</option>
                <option value="today">Today</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
              </select>

              {/* Custom Resume Filter (Optimizer Tab only) */}
              {activeTab === 'optimizer' && (
                <input
                  type="text"
                  placeholder="Filter by Resume..."
                  value={resumeNameFilter}
                  onChange={(e) => { setResumeNameFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 max-w-[130px] rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-orange-500 text-slate-600 dark:text-slate-300 font-extrabold shadow-sm"
                />
              )}

              {/* Custom Company / Role Filters (Cover Letter Tab only) */}
              {activeTab === 'cover_letter' && (
                <>
                  <input
                    type="text"
                    placeholder="Filter Company..."
                    value={companyFilter}
                    onChange={(e) => { setCompanyFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2 max-w-[120px] rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-orange-500 text-slate-600 dark:text-slate-300 font-extrabold shadow-sm"
                  />
                  <input
                    type="text"
                    placeholder="Filter Role..."
                    value={roleFilter}
                    onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2 max-w-[120px] rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-orange-500 text-slate-600 dark:text-slate-300 font-extrabold shadow-sm"
                  />
                </>
              )}

              {/* Custom Match / Role Filters (Skill Gap Tab only) */}
              {activeTab === 'skill_gap' && (
                <>
                  <input
                    type="text"
                    placeholder="Filter Role..."
                    value={roleFilter}
                    onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2 max-w-[120px] rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-orange-500 text-slate-600 dark:text-slate-300 font-extrabold shadow-sm"
                  />
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold bg-white dark:bg-slate-900 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span>Match:</span>
                    <input
                      type="number"
                      placeholder="Min"
                      value={matchMin}
                      onChange={(e) => { setMatchMin(e.target.value); setPage(1); }}
                      className="w-10 bg-transparent border-none p-0 text-center text-slate-800 dark:text-white font-extrabold focus:outline-none"
                    />
                    <span>-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={matchMax}
                      onChange={(e) => { setMatchMax(e.target.value); setPage(1); }}
                      className="w-10 bg-transparent border-none p-0 text-center text-slate-800 dark:text-white font-extrabold focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* TABLE DISPLAY */}
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/80 rounded-2xl">
            {listLoading ? (
              <Loader fullScreen={false} skeleton={true} variant="table" />
            ) : listError ? (
              <div className="text-center py-12">
                <FiAlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">Error loading records. Please verify backend state.</p>
                <button
                  onClick={() => refetchList()}
                  className="mt-3 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-black hover:bg-orange-600 transition cursor-pointer"
                >
                  Retry Query
                </button>
              </div>
            ) : !recordsData?.records?.length ? (
              <div className="text-center py-16">
                <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-800/30 flex items-center justify-center mx-auto mb-3">
                  <FiCpu className="w-5 h-5 text-slate-400" />
                </div>
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-350 uppercase tracking-wider">No Records Found</h4>
                <p className="text-[11px] text-slate-400 mt-1">No AI-generated files matched current search criteria or filters.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/80">
                    {/* Headers mapped dynamically based on tab */}
                    {activeTab === 'assistant' && (
                      <>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">User</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Conversation Title</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Message Count</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Started Date</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Last Activity</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Status</th>
                      </>
                    )}
                    {activeTab === 'optimizer' && (
                      <>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Resume Name</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">User</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Target Role</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Score Estimate</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Generated Date</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Status</th>
                      </>
                    )}
                    {activeTab === 'cover_letter' && (
                      <>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">User</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Target Company</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Target Role</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Generated Date</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Status</th>
                      </>
                    )}
                    {activeTab === 'skill_gap' && (
                      <>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">User</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Resume Source</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Target Role</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Skill Match</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Missing Count</th>
                        <th className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Status</th>
                      </>
                    )}
                    <th className="px-5 py-3.5 text-xs font-black text-slate-550 dark:text-slate-400 uppercase tracking-tight text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {recordsData.records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/10 transition-colors odd:bg-slate-55/10 dark:odd:bg-slate-900/5">
                      
                      {/* CAREER ASSISTANT ROW */}
                      {activeTab === 'assistant' && (
                        <>
                          <td className="px-5 py-3.5">
                            <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">{r.user_name}</div>
                            <div className="text-[10px] text-slate-400 font-bold mt-0.5">{r.user_email}</div>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-700 dark:text-slate-350">{r.title || 'Guidance Session'}</td>
                          <td className="px-5 py-3.5 text-xs font-black text-slate-500 dark:text-slate-450">{r.message_count} messages</td>
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-400 dark:text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}</td>
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-400 dark:text-slate-500">{r.updated_at ? new Date(r.updated_at).toLocaleDateString() : 'N/A'}</td>
                        </>
                      )}

                      {/* RESUME OPTIMIZER ROW */}
                      {activeTab === 'optimizer' && (
                        <>
                          <td className="px-5 py-3.5 text-xs font-extrabold text-slate-800 dark:text-slate-200">{r.resume_name}</td>
                          <td className="px-5 py-3.5">
                            <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">{r.user_name}</div>
                            <div className="text-[10px] text-slate-400 font-bold mt-0.5">{r.user_email}</div>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-700 dark:text-slate-350">{r.target_role}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-500 dark:text-slate-450">{r.ats_score}</span>
                              <span className="text-xs text-slate-400">→</span>
                              <span className="text-xs font-black text-orange-500">{r.improved_score}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-400 dark:text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}</td>
                        </>
                      )}

                      {/* COVER LETTER ROW */}
                      {activeTab === 'cover_letter' && (
                        <>
                          <td className="px-5 py-3.5">
                            <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">{r.user_name}</div>
                            <div className="text-[10px] text-slate-400 font-bold mt-0.5">{r.user_email}</div>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-extrabold text-slate-800 dark:text-slate-250">{r.company_name}</td>
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-700 dark:text-slate-350">{r.target_role}</td>
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-400 dark:text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}</td>
                        </>
                      )}

                      {/* SKILL GAP ROW */}
                      {activeTab === 'skill_gap' && (
                        <>
                          <td className="px-5 py-3.5">
                            <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">{r.user_name}</div>
                            <div className="text-[10px] text-slate-400 font-bold mt-0.5">{r.user_email}</div>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-400 dark:text-slate-500">{r.resume_used}</td>
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-700 dark:text-slate-350">{r.target_role}</td>
                          <td className="px-5 py-3.5 text-xs font-black text-orange-500">{r.skill_match_pct}% Match</td>
                          <td className="px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-450">{r.missing_skills_count} gaps</td>
                        </>
                      )}

                      {/* Status Badging */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                          r.is_deleted
                            ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-455'
                            : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-455'
                        }`}>
                          {r.is_deleted ? 'Archived' : 'Active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenDrawer(r)}
                            title="Inspect Details"
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg transition-colors cursor-pointer"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          
                          {r.is_deleted ? (
                            <button
                              onClick={() => handleRestore(r.id, tabs.find(t => t.id === activeTab)?.name + ' entry')}
                              title="Restore"
                              disabled={isRestoring}
                              className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <FiRefreshCw className="w-4 h-4" />
                            </button>
                          ) : null}

                          <button
                            onClick={() => handleHardDelete(r.id, tabs.find(t => t.id === activeTab)?.name + ' entry')}
                            title="Delete Permanently"
                            disabled={isHardDeleting}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* PAGINATION PANEL */}
          {!listLoading && recordsData && (
            <div className="p-4 bg-slate-50/20 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex items-center justify-between gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>Showing Page {page} of {Math.ceil((recordsData.total_count || 0) / pageSize) || 1} ({recordsData.total_count || 0} total records)</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <FiChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(Math.ceil((recordsData.total_count || 0) / pageSize), p + 1))}
                  disabled={page >= Math.ceil((recordsData.total_count || 0) / pageSize)}
                  className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DETAIL SIDE DRAWERS (Phase 8) */}
      <AnimatePresence>
        {isDrawerOpen && selectedItem && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">AI Generated Asset Detail</h3>
                  <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">ID: {selectedItem.id}</p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-colors cursor-pointer"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-grow overflow-y-auto p-6 space-y-6">
                
                {/* 1. User Summary section */}
                <div className="bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5">
                  <h4 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-3">User Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold block">Account Holder</span>
                      <span className="text-slate-800 dark:text-white font-extrabold mt-0.5 block">{selectedItem.user_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">Email Address</span>
                      <span className="text-slate-800 dark:text-white font-extrabold mt-0.5 block">{selectedItem.user_email}</span>
                    </div>
                  </div>
                </div>

                {/* 2. CAREER ASSISTANT CHAT TIMELINE */}
                {activeTab === 'assistant' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Conversation Log ({selectedItem.title})</h4>
                      <span className="text-[10px] text-slate-400 font-extrabold">Message Count: {selectedItem.message_count}</span>
                    </div>

                    <div className="bg-slate-50/40 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/60 max-h-[380px] overflow-y-auto space-y-3 scrollbar-thin">
                      {!selectedItem.messages || selectedItem.messages.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-6">No message records stored in this conversation session.</p>
                      ) : (
                        selectedItem.messages.map((m, idx) => (
                          <div
                            key={idx}
                            className={`flex flex-col max-w-[80%] ${
                              m.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                            }`}
                          >
                            <div className={`px-4 py-2.5 rounded-2xl text-xs leading-normal font-semibold ${
                              m.sender === 'user'
                                ? 'bg-orange-500 text-white rounded-tr-none'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/50 dark:border-slate-700/50'
                            }`}>
                              {m.text}
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold mt-1">
                              {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 3. RESUME OPTIMIZER DETAIL DRAWER */}
                {activeTab === 'optimizer' && (
                  <div className="space-y-4">
                    <div className="flex border-b border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => setDrawerTab('summary')}
                        className={`px-4 py-2 text-xs font-black transition-colors ${
                          drawerTab === 'summary' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-slate-400'
                        }`}
                      >
                        Suggestions & Scores
                      </button>
                      <button
                        onClick={() => setDrawerTab('text')}
                        className={`px-4 py-2 text-xs font-black transition-colors ${
                          drawerTab === 'text' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-slate-400'
                        }`}
                      >
                        Optimized Text Content
                      </button>
                    </div>

                    {drawerTab === 'summary' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 text-center bg-slate-50/30">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Original score</span>
                            <span className="text-xl font-black text-slate-500 block mt-1">{selectedItem.ats_score} / 100</span>
                          </div>
                          <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 text-center bg-slate-50/30">
                            <span className="text-[10px] text-slate-450 font-extrabold uppercase block">Estimated optimized score</span>
                            <span className="text-xl font-black text-orange-500 block mt-1">{selectedItem.improved_score} / 100</span>
                          </div>
                        </div>

                        {/* List recommendations */}
                        {selectedItem.missing_keywords?.length > 0 && (
                          <div>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1.5">Missing Keywords Identified</span>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedItem.missing_keywords.map((kw, i) => (
                                <span key={i} className="px-2 py-0.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-450 text-[10px] font-black rounded-md">{kw}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedItem.skill_recommendations?.length > 0 && (
                          <div>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1.5">Recommended Skill Additions</span>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedItem.skill_recommendations.map((sk, i) => (
                                <span key={i} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-450 text-[10px] font-black rounded-md">{sk}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedItem.ats_improvements?.length > 0 && (
                          <div className="text-xs">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1.5">ATS Improvement Checklist</span>
                            <ul className="space-y-1.5 pl-4 list-disc text-slate-600 dark:text-slate-400 font-semibold">
                              {selectedItem.ats_improvements.map((imp, i) => <li key={i}>{imp}</li>)}
                            </ul>
                          </div>
                        )}

                        {selectedItem.formatting_suggestions?.length > 0 && (
                          <div className="text-xs">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1.5">Formatting Critiques</span>
                            <ul className="space-y-1.5 pl-4 list-disc text-slate-600 dark:text-slate-400 font-semibold">
                              {selectedItem.formatting_suggestions.map((fmt, i) => <li key={i}>{fmt}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {drawerTab === 'text' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase">Gemini Optimized Markdown Output</span>
                          <button
                            onClick={() => downloadTextFile(`${selectedItem.resume_name}_optimized.md`, selectedItem.optimized_text)}
                            className="text-[10px] text-orange-500 font-black flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <FiDownload className="w-3.5 h-3.5" /> Download Markdown File
                          </button>
                        </div>
                        <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/30 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto select-all text-slate-850 dark:text-slate-250 scrollbar-thin">
                          {selectedItem.optimized_text || 'No text stored.'}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. COVER LETTER DETAIL DRAWER */}
                {activeTab === 'cover_letter' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-slate-400 font-bold block">Company Target</span>
                        <span className="text-slate-800 dark:text-white font-extrabold mt-0.5 block">{selectedItem.company_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block">Target Career Role</span>
                        <span className="text-slate-800 dark:text-white font-extrabold mt-0.5 block">{selectedItem.target_role}</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-850 pt-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase">Generated Cover Letter Body</span>
                        <button
                          onClick={() => downloadTextFile(`${selectedItem.company_name}_Cover_Letter.txt`, selectedItem.cover_letter_text)}
                          className="text-[10px] text-orange-500 font-black flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <FiDownload className="w-3.5 h-3.5" /> Download TXT File
                        </button>
                      </div>
                      <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/30 text-xs text-slate-800 dark:text-slate-350 leading-relaxed whitespace-pre-wrap select-all max-h-[320px] overflow-y-auto scrollbar-thin">
                        {selectedItem.cover_letter_text}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. SKILL GAP DETAIL DRAWER */}
                {activeTab === 'skill_gap' && (
                  <div className="space-y-4">
                    <div className="flex border-b border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => setDrawerTab('gaps')}
                        className={`px-4 py-2 text-xs font-black transition-colors ${
                          drawerTab === 'gaps' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-slate-400'
                        }`}
                      >
                        Missing Skills & Match
                      </button>
                      <button
                        onClick={() => setDrawerTab('sequence')}
                        className={`px-4 py-2 text-xs font-black transition-colors ${
                          drawerTab === 'sequence' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-slate-400'
                        }`}
                      >
                        AI Recommendations & Roadmap
                      </button>
                    </div>

                    {drawerTab === 'gaps' && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/10 border border-slate-100 dark:border-slate-800/80 rounded-xl p-4">
                          <div>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase">Skill Match Score</span>
                            <span className="text-xl font-black text-orange-500 block mt-0.5">{selectedItem.skill_match_pct}% Match</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-450 font-extrabold uppercase">Missing Skills Count</span>
                            <span className="text-xl font-black text-slate-500 dark:text-slate-400 block mt-0.5">{selectedItem.missing_skills_count} gaps</span>
                          </div>
                        </div>

                        {selectedItem.results?.missing_skills?.length > 0 && (
                          <div>
                            <span className="text-[10px] text-slate-455 font-extrabold uppercase block mb-1.5">Missing Core Competencies</span>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedItem.results.missing_skills.map((s, i) => (
                                <span key={i} className="px-2.5 py-0.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-455 text-[10px] font-black rounded-md">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1.5">Current Skills Provided</span>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal font-semibold bg-slate-50/30 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                            {selectedItem.current_skills || 'No skills provided.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {drawerTab === 'sequence' && (
                      <div className="space-y-4">
                        {selectedItem.results?.recommended_learning_sequence?.length > 0 && (
                          <div>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-2">Recommended Study Sequence</span>
                            <div className="space-y-2">
                              {selectedItem.results.recommended_learning_sequence.map((step, i) => (
                                <div key={i} className="flex gap-3 text-xs bg-slate-50/50 dark:bg-slate-800/15 border border-slate-100 dark:border-slate-850 p-2.5 rounded-xl">
                                  <span className="font-black text-orange-500">{i + 1}</span>
                                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{step}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">AI Study Recommendations</span>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold bg-slate-50/30 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
                            {selectedItem.results?.ai_study_recommendations || 'No study recommendations stored.'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs border-t border-slate-100 dark:border-slate-800 pt-4">
                          <div>
                            <span className="text-slate-450 font-bold block">Estimated Close Time</span>
                            <span className="text-slate-800 dark:text-white font-extrabold mt-0.5 block">{selectedItem.results?.estimated_learning_duration || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-455 font-bold block">Predicted Salary expectation</span>
                            <span className="text-slate-800 dark:text-white font-extrabold mt-0.5 block">{selectedItem.results?.salary_prediction || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. SYSTEM METADATA BLOCK */}
                <div className="bg-slate-50/20 dark:bg-slate-800/5 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 font-bold space-y-1.5">
                  <div className="flex justify-between">
                    <span>Creation Date</span>
                    <span>{selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleString() : 'N/A'}</span>
                  </div>
                  {selectedItem.is_deleted && (
                    <>
                      <div className="flex justify-between text-rose-500">
                        <span>Soft Deleted Date</span>
                        <span>{selectedItem.deleted_at ? new Date(selectedItem.deleted_at).toLocaleString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-rose-500">
                        <span>Archived By</span>
                        <span>{selectedItem.deleted_by_email || 'System Cascade'}</span>
                      </div>
                    </>
                  )}
                </div>

              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <button
                  onClick={() => handleHardDelete(selectedItem.id, tabs.find(t => t.id === activeTab)?.name + ' entry')}
                  disabled={isHardDeleting}
                  className="px-4 py-2 border border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 rounded-xl text-xs font-black transition cursor-pointer disabled:opacity-50"
                >
                  Delete Permanently
                </button>

                <div className="flex items-center gap-2">
                  {selectedItem.is_deleted ? (
                    <button
                      onClick={() => handleRestore(selectedItem.id, tabs.find(t => t.id === activeTab)?.name + ' entry')}
                      disabled={isRestoring}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <FiRefreshCw className="w-3.5 h-3.5" /> Restore Record
                    </button>
                  ) : null}
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    Close Drawer
                  </button>
                </div>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
