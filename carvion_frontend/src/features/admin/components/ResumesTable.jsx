import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFileText, FiEye, FiDownload, FiRefreshCw, FiTrash2, FiSearch, FiX,
  FiFilter, FiInfo, FiActivity, FiBriefcase, FiAward, FiBookOpen,
  FiMessageSquare, FiCalendar, FiChevronLeft, FiChevronRight, FiPercent,
  FiUser, FiMail, FiCpu, FiPlus, FiAlertCircle, FiCheckCircle
} from 'react-icons/fi';
import { confirm } from '../../../utils/confirm.js';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import Toast from '../../../components/feedback/Toast.jsx';

export default function ResumesTable() {
  const queryClient = useQueryClient();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [primaryFilter, setPrimaryFilter] = useState('all');
  const [atsFilter, setAtsFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [targetRoleFilter, setTargetRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState('-created_at');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Selected resume for Detail Drawer
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState('overview');

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

  // Reset pagination on filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, primaryFilter, atsFilter, dateFilter, targetRoleFilter, sortBy]);

  // Fetch telemetry / summary statistics
  const { data: telemetry, isLoading: telemetryLoading } = useQuery({
    queryKey: ['adminTelemetry'],
    queryFn: async () => {
      const response = await apiClient.get('/api/admin/telemetry/');
      return response.data?.data || response.data;
    }
  });

  // Calculate ATS limits based on selector
  const atsLimits = useMemo(() => {
    if (atsFilter === 'under_50') return { min: 0, max: 49 };
    if (atsFilter === '50_70') return { min: 50, max: 69 };
    if (atsFilter === '70_85') return { min: 70, max: 84 };
    if (atsFilter === 'over_85') return { min: 85, max: 100 };
    return { min: '', max: '' };
  }, [atsFilter]);

  // Fetch paginated resumes list from admin records endpoint
  const { data: recordsData, isLoading: listLoading, isError: listError, refetch } = useQuery({
    queryKey: [
      'adminResumesList',
      page,
      debouncedSearch,
      statusFilter,
      primaryFilter,
      atsLimits,
      dateFilter,
      targetRoleFilter,
      sortBy
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search: debouncedSearch,
        status: statusFilter,
        primary: primaryFilter,
        ats_min: atsLimits.min.toString(),
        ats_max: atsLimits.max.toString(),
        date_filter: dateFilter,
        target_role: targetRoleFilter,
        sort: sortBy
      });
      const response = await apiClient.get(`/api/admin/records/resumes/?${params.toString()}`);
      return response.data?.data || response.data;
    },
    keepPreviousData: true
  });

  // Fetch detailed resume data for the side drawer
  const { data: resumeDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['adminResumeDetail', selectedResumeId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/resumes/${selectedResumeId}/`);
      return response.data?.data || response.data;
    },
    enabled: !!selectedResumeId && isDrawerOpen
  });

  // Show Toast Alert helper
  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  // Restore Resume mutation
  const restoreMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.post(`/api/admin/records/resume/${id}/restore/`);
    },
    onSuccess: () => {
      showToast('Resume restored successfully.');
      queryClient.invalidateQueries(['adminResumesList']);
      queryClient.invalidateQueries(['adminTelemetry']);
      if (selectedResumeId) {
        queryClient.invalidateQueries(['adminResumeDetail', selectedResumeId]);
      }
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to restore resume.', 'error');
    }
  });

  // Hard Delete Resume mutation
  const hardDeleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/api/admin/records/resume/${id}/hard-delete/`);
    },
    onSuccess: () => {
      showToast('Resume permanently deleted.');
      setIsDrawerOpen(false);
      setSelectedResumeId(null);
      queryClient.invalidateQueries(['adminResumesList']);
      queryClient.invalidateQueries(['adminTelemetry']);
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to permanently delete resume.', 'error');
    }
  });

  // Handle Download Resume
  const handleDownload = (id, filename) => {
    // Open in a new tab or trigger download directly
    const url = `${apiClient.defaults.baseURL || ''}/api/resumes/${id}/render-pdf/?original_only=true`;
    window.open(url, '_blank');
    showToast('Download request dispatched.');
  };

  const handleSoftDelete = async (id) => {
    const ok = await confirm({
      title: 'Soft Delete Resume',
      message: 'Are you sure you want to soft delete this resume? It will be archived and hidden from the owner.',
      type: 'delete'
    });
    if (!ok) return;

    try {
      await apiClient.delete(`/api/resumes/${id}/`);
      showToast('Resume soft deleted successfully.');
      queryClient.invalidateQueries(['adminResumesList']);
      queryClient.invalidateQueries(['adminTelemetry']);
      if (selectedResumeId) {
        queryClient.invalidateQueries(['adminResumeDetail', selectedResumeId]);
      }
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to soft delete resume.', 'error');
    }
  };

  const resumeStats = telemetry?.resumes || {};
  const totalResumes = resumeStats.total_resumes || 0;
  const activeResumes = resumeStats.active_resumes || 0;
  const deletedResumes = resumeStats.deleted_resumes || 0;
  const averageAts = resumeStats.average_ats_score || 0;
  const primaryResumes = resumeStats.primary_resumes || 0;
  const coverLetters = resumeStats.cover_letters_generated || 0;
  const optimizedResumes = resumeStats.resume_optimizations || 0;

  const records = recordsData?.records || [];
  const totalRecords = recordsData?.total_count || 0;
  const totalPages = Math.ceil(totalRecords / pageSize);

  const openDrawer = (id) => {
    setSelectedResumeId(id);
    setActiveDrawerTab('overview');
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Resume Analytics KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Resumes', value: totalResumes, icon: FiFileText, color: 'from-orange-500/10 to-amber-500/10 text-orange-500' },
          { label: 'Active Resumes', value: activeResumes, icon: FiCheckCircle, color: 'from-emerald-500/10 to-teal-500/10 text-emerald-500' },
          { label: 'Deleted Resumes', value: deletedResumes, icon: FiTrash2, color: 'from-red-500/10 to-rose-500/10 text-red-500' },
          { label: 'Average ATS Score', value: `${averageAts} pts`, icon: FiPercent, color: 'from-amber-500/10 to-yellow-500/10 text-amber-500' },
          { label: 'Primary Resumes', value: primaryResumes, icon: FiAward, color: 'from-indigo-500/10 to-blue-500/10 text-indigo-500' },
          { label: 'Optimized Resumes', value: optimizedResumes, icon: FiCpu, color: 'from-blue-500/10 to-cyan-500/10 text-blue-500' },
          { label: 'Cover Letters Generated', value: coverLetters, icon: FiBookOpen, color: 'from-purple-500/10 to-pink-500/10 text-purple-500' },
          { label: 'Parsing Success Rate', value: `${resumeStats.parsing_success_rate || 100}%`, icon: FiActivity, color: 'from-teal-500/10 to-emerald-500/10 text-teal-500' }
        ].slice(0, 8).map((kpi, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-550 tracking-wider">{kpi.label}</p>
              <h4 className="text-xl font-black text-slate-850 dark:text-white mt-1">{kpi.value}</h4>
            </div>
            <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${kpi.color}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* 2. Search & Filters Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-grow max-w-md">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              <FiSearch className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by resume name, owner name, email, role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-850 dark:text-slate-200 font-semibold"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-colors p-1"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Soft Delete Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none text-slate-700 dark:text-slate-350 font-semibold"
            >
              <option value="all">All Resumes</option>
              <option value="active">Active Only</option>
              <option value="deleted">Soft Deleted Only</option>
            </select>

            {/* Primary Filter */}
            <select
              value={primaryFilter}
              onChange={(e) => setPrimaryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none text-slate-700 dark:text-slate-350 font-semibold"
            >
              <option value="all">All Primary Status</option>
              <option value="primary">Primary Resumes</option>
              <option value="non_primary">Non-Primary Resumes</option>
            </select>

            {/* ATS Score Filter */}
            <select
              value={atsFilter}
              onChange={(e) => setAtsFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none text-slate-700 dark:text-slate-350 font-semibold"
            >
              <option value="all">All ATS Scores</option>
              <option value="under_50">Low Score (&lt; 50 pts)</option>
              <option value="50_70">Medium (50 - 70 pts)</option>
              <option value="70_85">Good (70 - 85 pts)</option>
              <option value="over_85">Excellent (&gt; 85 pts)</option>
            </select>

            {/* Date filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none text-slate-700 dark:text-slate-350 font-semibold"
            >
              <option value="all">All Time</option>
              <option value="today">Uploaded Today</option>
              <option value="week">Uploaded This Week</option>
              <option value="month">Uploaded This Month</option>
            </select>

            {/* Target Role input */}
            <input
              type="text"
              placeholder="Filter by target role..."
              value={targetRoleFilter}
              onChange={(e) => setTargetRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none text-slate-700 dark:text-slate-350 font-semibold max-w-[150px]"
            />

            {/* Sort Order */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none text-slate-700 dark:text-slate-350 font-semibold"
            >
              <option value="-created_at">Newest Uploaded</option>
              <option value="created_at">Oldest Uploaded</option>
              <option value="-ats_score">ATS Score (High-Low)</option>
              <option value="ats_score">ATS Score (Low-High)</option>
              <option value="name">Resume Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Main Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto max-w-full scrollbar-thin">
          <table className="w-full border-collapse text-left text-xs min-w-[1400px]">
            <thead>
              <tr className="sticky top-0 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200/50 dark:border-slate-800 z-10">
                <th className="px-5 py-4">Resume Name</th>
                <th className="px-5 py-4">Owner Name</th>
                <th className="px-5 py-4">Owner Email</th>
                <th className="px-5 py-4">Target Role</th>
                <th className="px-5 py-4 text-center">ATS Score</th>
                <th className="px-5 py-4">Primary status</th>
                <th className="px-5 py-4">Soft Delete Status</th>
                <th className="px-5 py-4">Upload Date</th>
                <th className="px-5 py-4">Last Updated</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-650 dark:text-slate-350">
              {listLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse odd:bg-slate-50/30 dark:odd:bg-slate-800/10">
                    <td colSpan={10} className="px-5 py-5 text-center">
                      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : listError ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-red-500 font-bold">
                    Failed to retrieve resume records listings from server.
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center text-slate-450 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FiInfo className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                      <span>No matching resume records found in the database.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/10 transition-colors odd:bg-slate-55/10 dark:odd:bg-slate-900/5">
                    {/* Resume Name */}
                    <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        <FiFileText className="text-orange-500 w-4 h-4 flex-shrink-0" />
                        <span>{r.name}</span>
                      </div>
                    </td>

                    {/* Owner Name */}
                    <td className="px-5 py-4 font-bold text-slate-700 dark:text-slate-300">{r.user_name || 'N/A'}</td>

                    {/* Email */}
                    <td className="px-5 py-4 font-semibold text-slate-500 dark:text-slate-400">{r.user_email}</td>

                    {/* Target Role */}
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-100/30 text-orange-600 dark:text-orange-400 font-bold text-[10px]">
                        {r.target_role}
                      </span>
                    </td>

                    {/* ATS Score */}
                    <td className="px-5 py-4 text-center font-extrabold">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] ${r.ats_score >= 80 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100'}`}>
                        {r.ats_score} pts
                      </span>
                    </td>

                    {/* Primary Badge */}
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${r.is_primary ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700'}`}>
                        {r.is_primary ? 'Primary' : 'Secondary'}
                      </span>
                    </td>

                    {/* Soft Delete status */}
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${r.is_deleted ? 'bg-red-50 dark:bg-red-950/20 text-red-500 border border-red-100/50' : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-100/50'}`}>
                        {r.is_deleted ? 'Deleted' : 'Active'}
                      </span>
                    </td>

                    {/* Dates */}
                    <td className="px-5 py-4 text-slate-400 dark:text-slate-500 font-semibold">{r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-5 py-4 text-slate-400 dark:text-slate-500 font-semibold">{r.updated_at ? new Date(r.updated_at).toLocaleDateString() : 'N/A'}</td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDrawer(r.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-all cursor-pointer"
                          title="Inspect Details"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(r.id, r.file_name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all cursor-pointer"
                          title="Download PDF attachment"
                        >
                          <FiDownload className="w-4 h-4" />
                        </button>
                        {r.is_deleted ? (
                          <>
                            <button
                              onClick={() => restoreMutation.mutate(r.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all cursor-pointer"
                              title="Restore soft deleted Resume"
                            >
                              <FiRefreshCw className="w-4 h-4 animate-spin-hover" />
                            </button>
                            <button
                              onClick={async () => {
                                const ok = await confirm({
                                  title: 'Permanently Delete Resume',
                                  message: 'Are you absolutely sure you want to hard delete this resume from Mongo database records? This is permanent!',
                                  type: 'delete'
                                });
                                if (ok) hardDeleteMutation.mutate(r.id);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
                              title="Hard Delete Resume"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleSoftDelete(r.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
                            title="Soft Delete Resume"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/20">
            <span>
              Showing {Math.min(totalRecords, (page - 1) * pageSize + 1)} to {Math.min(totalRecords, page * pageSize)} of {totalRecords} resume records
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors disabled:cursor-not-allowed cursor-pointer"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors disabled:cursor-not-allowed cursor-pointer"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Operations note */}
      <div className="p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center gap-2.5 text-xs text-slate-500 font-semibold leading-relaxed">
        <FiAlertCircle className="text-orange-500 flex-shrink-0 w-4 h-4" />
        <span>
          <strong>Bulk Operations Notice:</strong> Bulk Restore and Bulk Hard Delete are currently not implemented due to lack of corresponding backend batch APIs. Standard administration commands must be run individually per document item.
        </span>
      </div>

      {/* 4. Resume Detail Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Drawer Sheet */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-2xl h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-10"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-850 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <FiFileText className="text-orange-500" /> Resume Profile Audit
                  </h3>
                  <p className="text-xs text-slate-450 dark:text-slate-500 font-semibold mt-0.5">Inspect parser, ATS analysis reports and modification history.</p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition p-1.5 cursor-pointer"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content Body */}
              <div className="flex-grow overflow-y-auto min-h-0">
                {detailLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader fullScreen={false} skeleton={false} />
                  </div>
                ) : !resumeDetail ? (
                  <div className="p-8 text-center text-red-500 font-bold">Failed to fetch detailed resume profile logs.</div>
                ) : (
                  <div className="p-6 space-y-6">
                    {/* Basic Info Header Card */}
                    <div className="bg-slate-50/50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-850 flex items-center justify-between">
                      <div className="space-y-1.5">
                        <h4 className="text-base font-black text-slate-850 dark:text-white flex items-center gap-2">{resumeDetail.name}</h4>
                        <div className="text-xs text-slate-450 dark:text-slate-500 font-semibold space-y-0.5">
                          <p className="flex items-center gap-1.5"><FiUser className="w-3.5 h-3.5" /> Owner: {resumeDetail.user_name || 'N/A'}</p>
                          <p className="flex items-center gap-1.5"><FiMail className="w-3.5 h-3.5" /> Email: {resumeDetail.user_email || resumeDetail.user?.email}</p>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border block ${resumeDetail.is_deleted ? 'bg-red-50 text-red-500 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                          {resumeDetail.is_deleted ? 'Soft Deleted' : 'Active status'}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border block ${resumeDetail.is_primary ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {resumeDetail.is_primary ? 'Primary File' : 'Secondary File'}
                        </span>
                      </div>
                    </div>

                    {/* Drawer Navigation Tabs */}
                    <div className="flex border-b border-slate-150 dark:border-slate-800">
                      {[
                        { id: 'overview', label: 'Resume Info' },
                        { id: 'ats', label: 'ATS Report' },
                        { id: 'metadata', label: 'Parser Metadata' },
                        { id: 'activity', label: 'Activity & History' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveDrawerTab(tab.id)}
                          className={`flex-grow py-2.5 text-center text-xs font-bold transition-all border-b-2 cursor-pointer ${
                            activeDrawerTab === tab.id
                              ? 'border-orange-500 text-orange-500 font-extrabold'
                              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Drawer Panels */}
                    <div className="min-h-[250px]">
                      {activeDrawerTab === 'overview' && (
                        <div className="space-y-4 animate-fade-in text-xs font-semibold">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Document ID</p>
                              <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1 font-mono">{resumeDetail.id}</p>
                            </div>
                            <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Original File Name</p>
                              <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1 italic">{resumeDetail.file_name || 'Builder Document'}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Uploaded Date</p>
                              <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1">{resumeDetail.created_at ? new Date(resumeDetail.created_at).toLocaleString() : 'N/A'}</p>
                            </div>
                            <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Last Updated</p>
                              <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1">{resumeDetail.updated_at ? new Date(resumeDetail.updated_at).toLocaleString() : (resumeDetail.created_at ? new Date(resumeDetail.created_at).toLocaleString() : 'N/A')}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">File Format</p>
                              <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1 uppercase">{resumeDetail.file_name?.split('.').pop() || 'PDF'}</p>
                            </div>
                            <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">File Size</p>
                              <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1">N/A (Database Limitation)</p>
                            </div>
                          </div>

                          {/* Quick Actions in Overview */}
                          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Admin Console Operations</p>
                            <div className="flex flex-wrap items-center gap-3">
                              <button
                                onClick={() => handleDownload(resumeDetail.id, resumeDetail.file_name)}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow"
                              >
                                <FiDownload /> Download Original Resume
                              </button>
                              
                              {resumeDetail.is_deleted ? (
                                <>
                                  <button
                                    onClick={() => restoreMutation.mutate(resumeDetail.id)}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow"
                                  >
                                    <FiRefreshCw /> Restore Resume
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const ok = await confirm({
                                        title: 'Permanently Delete Resume',
                                        message: 'Are you absolutely sure you want to permanently delete this resume? This cannot be undone.',
                                        type: 'delete'
                                      });
                                      if (ok) hardDeleteMutation.mutate(resumeDetail.id);
                                    }}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow"
                                  >
                                    <FiTrash2 /> Hard Delete Resume
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleSoftDelete(resumeDetail.id)}
                                  className="px-4 py-2 bg-red-500 hover:bg-red-650 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow"
                                >
                                  <FiTrash2 /> Soft Delete Resume
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {activeDrawerTab === 'ats' && (
                        <div className="space-y-5 animate-fade-in text-xs font-semibold">
                          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800">
                            <div className="w-16 h-16 rounded-full border-4 border-orange-500 flex items-center justify-center font-black text-lg text-orange-600 dark:text-orange-400 bg-orange-500/5">
                              {resumeDetail.ats_score}
                            </div>
                            <div>
                              <h5 className="font-extrabold text-sm text-slate-850 dark:text-white">ATS Compatibility Quotient</h5>
                              <p className="text-slate-450 dark:text-slate-500 font-semibold leading-relaxed mt-0.5">Calculated based on target keyword alignment and structure parses.</p>
                            </div>
                          </div>

                          {/* Strengths / Weaknesses / Missing Skills lists */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-emerald-50/20 dark:bg-emerald-950/5 border border-emerald-100/50 p-4 rounded-xl space-y-2">
                              <h6 className="font-extrabold uppercase text-[10px] text-emerald-600 flex items-center gap-1">
                                <FiCheckCircle /> Strengths Identified
                              </h6>
                              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400 max-h-[150px] overflow-y-auto">
                                {resumeDetail.analysis_report?.strengths?.length > 0 ? (
                                  resumeDetail.analysis_report.strengths.map((str, idx) => <li key={idx}>{str}</li>)
                                ) : (
                                  <p className="italic text-slate-400">No profile strengths listed.</p>
                                )}
                              </ul>
                            </div>

                            <div className="bg-red-50/20 dark:bg-red-950/5 border border-red-100/50 p-4 rounded-xl space-y-2">
                              <h6 className="font-extrabold uppercase text-[10px] text-red-500 flex items-center gap-1">
                                <FiX /> Weaknesses & Issues
                              </h6>
                              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400 max-h-[150px] overflow-y-auto">
                                {resumeDetail.analysis_report?.weaknesses?.length > 0 ? (
                                  resumeDetail.analysis_report.weaknesses.map((weak, idx) => <li key={idx}>{weak}</li>)
                                ) : (
                                  <p className="italic text-slate-400">No profile weaknesses listed.</p>
                                )}
                              </ul>
                            </div>

                            <div className="col-span-1 md:col-span-2 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl space-y-2 border border-slate-200/50 dark:border-slate-800">
                              <h6 className="font-extrabold uppercase text-[10px] text-slate-500">Missing Key Skills</h6>
                              <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                                {resumeDetail.analysis_report?.missing_skills?.length > 0 ? (
                                  resumeDetail.analysis_report.missing_skills.map((skill, idx) => (
                                    <span key={idx} className="px-2 py-0.5 rounded bg-orange-55 dark:bg-orange-950/20 text-orange-650 dark:text-orange-400 text-[10px] font-bold border border-orange-100/50">
                                      {skill}
                                    </span>
                                  ))
                                ) : (
                                  <p className="italic text-slate-400">No missing skills detected.</p>
                                )}
                              </div>
                            </div>

                            <div className="col-span-1 md:col-span-2 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl space-y-2 border border-slate-200/50 dark:border-slate-800">
                              <h6 className="font-extrabold uppercase text-[10px] text-slate-500">AI Recommendations</h6>
                              <ul className="list-disc pl-4 space-y-1 text-slate-650 dark:text-slate-400 max-h-[150px] overflow-y-auto leading-relaxed">
                                {resumeDetail.analysis_report?.recommendations?.length > 0 ? (
                                  resumeDetail.analysis_report.recommendations.map((rec, idx) => <li key={idx}>{rec}</li>)
                                ) : (
                                  <p className="italic text-slate-400">No specific improvements recommended.</p>
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeDrawerTab === 'metadata' && (
                        <div className="space-y-4 animate-fade-in text-xs font-semibold">
                          <h5 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">Stored Parser Results</h5>
                          
                          {/* Extracted Skills */}
                          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl space-y-2 border border-slate-200/50 dark:border-slate-800">
                            <h6 className="font-extrabold uppercase text-[10px] text-slate-500">Extracted Skills</h6>
                            <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                              {resumeDetail.skills?.length > 0 ? (
                                resumeDetail.skills.map((skill, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200/50">
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <p className="italic text-slate-400">No skills parsed.</p>
                              )}
                            </div>
                          </div>

                          {/* Experience segment */}
                          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl space-y-2 border border-slate-200/50 dark:border-slate-800">
                            <h6 className="font-extrabold uppercase text-[10px] text-slate-500">Work Experience</h6>
                            <div className="space-y-3 max-h-[150px] overflow-y-auto pr-1">
                              {resumeDetail.experience?.length > 0 ? (
                                resumeDetail.experience.map((exp, idx) => (
                                  <div key={idx} className="border-b border-slate-200/50 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
                                    <p className="font-bold text-slate-800 dark:text-white">{exp.role || exp.title} <span className="text-slate-400">at</span> {exp.company || exp.organization}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{exp.duration || exp.dates || 'No dates specified'}</p>
                                    {exp.description && <p className="text-slate-500 dark:text-slate-450 mt-1 leading-relaxed">{exp.description}</p>}
                                  </div>
                                ))
                              ) : (
                                <p className="italic text-slate-400">No work experience parsed.</p>
                              )}
                            </div>
                          </div>

                          {/* Education segment */}
                          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl space-y-2 border border-slate-200/50 dark:border-slate-800">
                            <h6 className="font-extrabold uppercase text-[10px] text-slate-500">Education Details</h6>
                            <div className="space-y-2.5 max-h-[150px] overflow-y-auto pr-1">
                              {resumeDetail.education?.length > 0 ? (
                                resumeDetail.education.map((edu, idx) => (
                                  <div key={idx} className="border-b border-slate-200/50 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
                                    <p className="font-bold text-slate-800 dark:text-white">{edu.degree || edu.qualification} <span className="text-slate-400">from</span> {edu.school || edu.institution}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{edu.year || edu.duration || 'N/A'}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="italic text-slate-400">No education entries parsed.</p>
                              )}
                            </div>
                          </div>

                          {/* Projects/Certifications */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl space-y-2 border border-slate-200/50 dark:border-slate-800">
                              <h6 className="font-extrabold uppercase text-[10px] text-slate-500">Certifications</h6>
                              <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400 max-h-[120px] overflow-y-auto">
                                {resumeDetail.certifications?.length > 0 ? (
                                  resumeDetail.certifications.map((cert, idx) => <li key={idx}>{cert}</li>)
                                ) : (
                                  <p className="italic text-slate-400">No certifications parsed.</p>
                                )}
                              </ul>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl space-y-2 border border-slate-200/50 dark:border-slate-800">
                              <h6 className="font-extrabold uppercase text-[10px] text-slate-500">Projects</h6>
                              <div className="space-y-2 max-h-[120px] overflow-y-auto">
                                {resumeDetail.projects?.length > 0 ? (
                                  resumeDetail.projects.map((proj, idx) => (
                                    <div key={idx}>
                                      <p className="font-bold text-slate-700 dark:text-slate-300">{proj.title || proj.name}</p>
                                      {proj.description && <p className="text-[10px] text-slate-450 mt-0.5">{proj.description}</p>}
                                    </div>
                                  ))
                                ) : (
                                  <p className="italic text-slate-400">No projects parsed.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeDrawerTab === 'activity' && (
                        <div className="space-y-5 animate-fade-in text-xs font-semibold">
                          {/* Resume History */}
                          <div>
                            <h5 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-2">Resume Document History</h5>
                            {resumeDetail.history && resumeDetail.history.length > 0 ? (
                              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                                {resumeDetail.history.map(hist => (
                                  <div key={hist.id} className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/40 dark:border-slate-850 flex items-center justify-between shadow-xs">
                                    <div>
                                      <p className="font-bold text-slate-800 dark:text-slate-200">{hist.name}</p>
                                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Uploaded: {new Date(hist.created_at).toLocaleString()}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${hist.is_deleted ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                      {hist.is_deleted ? 'Deleted' : 'Active'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-450 italic">No historical document logs available.</p>
                            )}
                          </div>

                          {/* Optimizations */}
                          <div>
                            <h5 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-2">Optimizations Generated</h5>
                            {resumeDetail.optimizations && resumeDetail.optimizations.length > 0 ? (
                              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                                {resumeDetail.optimizations.map(opt => (
                                  <div key={opt.id} className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/40 dark:border-slate-850 flex items-center justify-between shadow-xs">
                                    <div>
                                      <p className="font-bold text-slate-800 dark:text-slate-200">Target Role: {opt.target_role}</p>
                                      <p className="text-[9px] text-slate-450 font-semibold mt-0.5">Created: {new Date(opt.created_at).toLocaleString()}</p>
                                    </div>
                                    <span className="font-black text-orange-500 font-semibold">{opt.score}% compatibility</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-450 italic">No optimization runs performed.</p>
                            )}
                          </div>

                          {/* Cover Letters */}
                          <div>
                            <h5 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-2">Cover Letters generated</h5>
                            {resumeDetail.cover_letters && resumeDetail.cover_letters.length > 0 ? (
                              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                                {resumeDetail.cover_letters.map(cl => (
                                  <div key={cl.id} className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/40 dark:border-slate-850 flex items-center justify-between shadow-xs">
                                    <div>
                                      <p className="font-bold text-slate-800 dark:text-slate-200">{cl.job_title}</p>
                                      <p className="text-[9px] text-slate-450 font-semibold mt-0.5">{cl.company} — Generated {new Date(cl.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[9px] text-slate-450 font-bold uppercase">Cover</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-450 italic">No generated cover letters.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
