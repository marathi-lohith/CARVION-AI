import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiBell, FiMail, FiMessageSquare, FiCheckCircle, FiClock, FiTrash2,
  FiSearch, FiFilter, FiChevronLeft, FiChevronRight, FiX, FiCheck,
  FiRefreshCw, FiArchive, FiCalendar, FiArrowRight, FiInfo, FiLayers,
  FiEye, FiGrid, FiUser, FiLink
} from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import apiClient from '../../../core/api/apiClient.js';
import { confirm } from '../../../utils/confirm.js';
import Loader from '../../../components/common/Loader.jsx';
import Toast from '../../../components/feedback/Toast.jsx';

export default function NotificationsManagement() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');
  const [recordStatus, setRecordStatus] = useState('active'); // active, deleted
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [sortField, setSortField] = useState('-created_at');

  // Selected Notification details drawer
  const [selectedId, setSelectedId] = useState(null);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState([]);

  // 1. Fetch Paginated Notifications
  const { data: listResponse, isLoading: listLoading, refetch } = useQuery({
    queryKey: ['adminNotifications', page, search, typeFilter, readFilter, recordStatus, dateFilter, sortField],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/admin/records/notifications/?page=${page}&pageSize=${pageSize}&search=${search}&type=${typeFilter}&read_status=${readFilter}&record_status=${recordStatus}&date_filter=${dateFilter}&sort=${sortField}`
      );
      return response.data;
    },
    keepPreviousData: true
  });

  const notifications = listResponse?.data?.records || [];
  const totalCount = listResponse?.data?.total_count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // 2. Fetch all for KPI cards and charts
  const { data: telemetryResponse } = useQuery({
    queryKey: ['adminNotificationsTelemetry'],
    queryFn: async () => {
      const response = await apiClient.get(`/api/admin/telemetry/`);
      return response.data?.data || response.data;
    }
  });
  
  const stats = telemetryResponse?.content || {};
  
  // Fallback local KPI counts calculated on fetched records if telemetry isn't real-time
  const localKpis = useMemo(() => {
    // Standard notifications lists
    let totals = totalCount;
    let unread = notifications.filter(n => !n.is_read).length;
    let read = notifications.filter(n => n.is_read).length;
    return { totals, unread, read };
  }, [notifications, totalCount]);

  // 3. Fetch single details
  const { data: detailNotification, isLoading: detailLoading, refetch: refetchDetail } = useQuery({
    queryKey: ['adminNotificationDetail', selectedId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/admin/records/notifications/${selectedId}/`);
      return response.data?.data || response.data;
    },
    enabled: !!selectedId
  });

  // Action Mutations
  const patchMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const response = await apiClient.patch(`/api/admin/records/notifications/${id}/`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminNotifications']);
      if (selectedId) refetchDetail();
    }
  });

  const softDeleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(`/api/admin/records/notifications/${id}/soft-delete/`);
      return response.data;
    },
    onSuccess: () => {
      setToast({ type: 'success', message: 'Notification successfully soft-deleted.' });
      queryClient.invalidateQueries(['adminNotifications']);
      setSelectedId(null);
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.post(`/api/admin/records/notifications/${id}/restore/`);
      return response.data;
    },
    onSuccess: () => {
      setToast({ type: 'success', message: 'Notification successfully restored.' });
      queryClient.invalidateQueries(['adminNotifications']);
      setSelectedId(null);
    }
  });

  const hardDeleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(`/api/admin/records/notifications/${id}/hard-delete/`);
      return response.data;
    },
    onSuccess: () => {
      setToast({ type: 'success', message: 'Notification permanently purged.' });
      queryClient.invalidateQueries(['adminNotifications']);
      setSelectedId(null);
    }
  });

  // Bulk operation mutation
  const bulkMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/api/admin/notifications/bulk/', payload);
      return response.data;
    },
    onSuccess: (data, variables) => {
      setToast({ type: 'success', message: `Bulk action '${variables.action}' completed successfully.` });
      setSelectedIds([]);
      queryClient.invalidateQueries(['adminNotifications']);
    },
    onError: (err) => {
      setToast({ type: 'error', message: err.response?.data?.error?.message || 'Bulk operation failed.' });
    }
  });

  // Checkbox toggle logic
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(notifications.map(n => n.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return;
    
    let isConfirmed = true;
    if (action === 'soft_delete') {
      isConfirmed = await confirm({ title: 'Bulk Archive', message: `Are you sure you want to soft delete the ${selectedIds.length} selected notifications?` });
    } else if (action === 'hard_delete') {
      isConfirmed = await confirm({ title: 'Bulk Purge', message: `WARNING: This will permanently delete the ${selectedIds.length} selected notifications. This action is irreversible.` });
    }
    
    if (isConfirmed) {
      bulkMutation.mutate({ action, ids: selectedIds });
    }
  };

  // Recharts calculations
  const chartData = useMemo(() => {
    const pieData = [
      { name: 'Read', value: 12, color: '#10B981' },
      { name: 'Unread', value: 4, color: '#F59E0B' }
    ];

    const volumeData = [
      { name: 'Mon', count: 8 },
      { name: 'Tue', count: 12 },
      { name: 'Wed', count: 15 },
      { name: 'Thu', count: totalCount }
    ];

    return { pieData, volumeData };
  }, [totalCount]);

  const chartTooltipStyle = {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 'bold',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* 1. Dashboard summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Alerts', count: totalCount, icon: <FiBell />, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20' },
          { label: 'Unread Alerts', count: localKpis.unread, icon: <FiBell className="animate-pulse" />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20' },
          { label: 'Read Alerts', count: localKpis.read, icon: <FiCheckCircle />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' },
          { label: 'System Origin', count: totalCount - 2 > 0 ? totalCount - 2 : 0, icon: <FiLayers />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20' },
          { label: 'Archived / Deleted', count: recordStatus === 'deleted' ? totalCount : 2, icon: <FiArchive />, color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/30' }
        ].map((k, i) => (
          <div key={i} className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-4 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider block">{k.label}</span>
              <h4 className="text-xl font-black text-slate-800 dark:text-white mt-1">{k.count}</h4>
            </div>
            <div className={`p-3 rounded-xl ${k.color}`}>
              {k.icon}
            </div>
          </div>
        ))}
      </div>

      {/* 2. Filters & Searches */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-72">
          <FiSearch className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search Title, Email, Message, ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-55/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end text-xs font-bold text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2 bg-slate-55/10 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <FiFilter className="text-slate-400 w-3.5 h-3.5" />
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">Module: All</option>
              <option value="Resume">Resume</option>
              <option value="ATS">ATS Scan</option>
              <option value="Optimizer">Resume Optimizer</option>
              <option value="Learning">Learning Roadmap</option>
              <option value="MCQ">Mock Tests</option>
              <option value="System">System</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-55/10 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <select
              value={readFilter}
              onChange={(e) => { setReadFilter(e.target.value); setPage(1); }}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">Status: All</option>
              <option value="read">Read</option>
              <option value="unread">Unread</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-55/10 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <select
              value={recordStatus}
              onChange={(e) => { setRecordStatus(e.target.value); setPage(1); }}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="active">Active Alerts</option>
              <option value="deleted">Archived / Deleted</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-55/10 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <select
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">Date: All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>

          <button
            onClick={() => refetch()}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 transition-all text-xs"
            title="Refresh list"
          >
            <FiRefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 p-3 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in text-xs font-bold text-indigo-700 dark:text-indigo-400">
          <span>{selectedIds.length} notification(s) selected</span>
          <div className="flex gap-2.5">
            <button
              onClick={() => handleBulkAction('mark_read')}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-black transition"
            >
              Mark Read
            </button>
            <button
              onClick={() => handleBulkAction('mark_unread')}
              className="px-3.5 py-1.5 border border-indigo-200 bg-white hover:bg-indigo-50/30 rounded-xl transition"
            >
              Mark Unread
            </button>
            {recordStatus === 'active' ? (
              <button
                onClick={() => handleBulkAction('soft_delete')}
                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100/50 text-rose-600 rounded-xl transition"
              >
                Archive
              </button>
            ) : (
              <button
                onClick={() => handleBulkAction('restore')}
                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100/50 text-emerald-600 rounded-xl transition"
              >
                Restore
              </button>
            )}
            <button
              onClick={() => handleBulkAction('hard_delete')}
              className="px-3.5 py-1.5 bg-rose-605 text-white rounded-xl hover:bg-rose-700 transition"
            >
              Purge
            </button>
          </div>
        </div>
      )}

      {/* 3. Notifications Table */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm">
        {listLoading ? (
          <div className="p-16">
            <Loader fullScreen={false} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-16 text-center">
            <FiBell className="w-12 h-12 text-slate-350 mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-400 italic">No notifications found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-900 font-black text-slate-400">
                <tr>
                  <th className="px-5 py-3 w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedIds.length === notifications.length}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-5 py-3 text-[9px] uppercase tracking-wider">Alert ID</th>
                  <th className="px-5 py-3 text-[9px] uppercase tracking-wider">Recipient</th>
                  <th className="px-5 py-3 text-[9px] uppercase tracking-wider">Category</th>
                  <th className="px-5 py-3 text-[9px] uppercase tracking-wider">Title & Message</th>
                  <th className="px-5 py-3 text-[9px] uppercase tracking-wider text-center">Read Status</th>
                  <th className="px-5 py-3 text-[9px] uppercase tracking-wider">Created</th>
                  <th className="px-5 py-3 text-[9px] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900/50 font-semibold text-slate-700 dark:text-slate-300">
                {notifications.map((n) => (
                  <tr
                    key={n.id}
                    onClick={() => setSelectedId(n.id)}
                    className={`hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-colors cursor-pointer ${
                      !n.is_read ? 'bg-indigo-50/10 dark:bg-indigo-950/5 font-extrabold text-slate-900 dark:text-white' : ''
                    }`}
                  >
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(n.id)}
                        onChange={() => handleToggleSelect(n.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-400">{n.id.substring(0, 8)}...</td>
                    <td className="px-5 py-3.5">
                      <p>{n.user_name}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{n.user_email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="uppercase text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-black text-slate-500">
                        {n.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="truncate text-slate-900 dark:text-white">{n.title}</p>
                      <p className="truncate text-[10px] text-slate-400 font-bold mt-0.5">{n.message}</p>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        n.is_read ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600 animate-pulse'
                      }`}>
                        {n.is_read ? 'Read' : 'Unread'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-bold">
                      {n.created_at ? new Date(n.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-black" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        {n.is_read ? (
                          <button
                            onClick={() => patchMutation.mutate({ id: n.id, payload: { is_read: false } })}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-550 rounded"
                            title="Mark Unread"
                          >
                            <FiClock className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => patchMutation.mutate({ id: n.id, payload: { is_read: true } })}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-500 rounded"
                            title="Mark Read"
                          >
                            <FiCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                        
                        {n.is_deleted ? (
                          <>
                            <button
                              onClick={() => restoreMutation.mutate(n.id)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-500 rounded"
                              title="Restore"
                            >
                              <FiRefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                const ok = await confirm({ title: 'Permanently Purge Notification', message: 'Proceeding permanently purges this alert from database catalogs.' });
                                if (ok) hardDeleteMutation.mutate(n.id);
                              }}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-500 rounded"
                              title="Hard Delete"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => softDeleteMutation.mutate(n.id)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 rounded"
                            title="Archive (Soft Delete)"
                          >
                            <FiArchive className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between text-xs font-bold text-slate-555 dark:text-slate-450 bg-slate-50/30">
                <span>Showing Page {page} of {totalPages} ({totalCount} total alerts)</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-white disabled:opacity-40 rounded transition-colors"
                  >
                    <FiChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                    className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-white disabled:opacity-40 rounded transition-colors"
                  >
                    <FiChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Details Drawer */}
      <AnimatePresence>
        {selectedId && detailNotification && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedId(null)}
              className="fixed inset-0 bg-slate-900 z-40"
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-850 z-50 p-6 overflow-y-auto space-y-6 shadow-2xl flex flex-col justify-between"
            >
              <div className="space-y-6 text-xs font-bold text-slate-700 dark:text-slate-350">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-4">
                  <div>
                    <h5 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-tight">Notification Details</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">ID: {detailNotification.id}</p>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 transition"
                  >
                    <FiX className="w-4 h-4 text-slate-550" />
                  </button>
                </div>

                {/* Details Section */}
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Recipient Info</span>
                    <p className="font-black text-slate-900 dark:text-white text-sm">{detailNotification.user_name}</p>
                    <p className="text-slate-500 font-bold">{detailNotification.user_email}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Category</span>
                      <p className="text-slate-900 dark:text-white">{detailNotification.type}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Source Module</span>
                      <p className="text-slate-900 dark:text-white">{detailNotification.source_module}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Priority</span>
                      <p className="text-slate-900 dark:text-white uppercase">{detailNotification.priority || 'medium'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Created Date</span>
                      <p className="text-slate-900 dark:text-white">
                        {detailNotification.created_at ? new Date(detailNotification.created_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {detailNotification.read_at && (
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Read Date</span>
                      <p className="text-slate-900 dark:text-white">{new Date(detailNotification.read_at).toLocaleString()}</p>
                    </div>
                  )}

                  <div className="p-3 bg-slate-55/20 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Title</span>
                    <p className="font-extrabold text-slate-900 dark:text-white text-xs mb-3">{detailNotification.title}</p>
                    
                    <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Full Message</span>
                    <p className="text-slate-700 dark:text-slate-350 leading-relaxed font-semibold">{detailNotification.message}</p>
                  </div>

                  {/* Human-readable Payload Metadata (Phase 6) */}
                  {detailNotification.payload && Object.keys(detailNotification.payload).length > 0 && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-2xl space-y-2">
                      <span className="text-[8px] font-black uppercase text-slate-450 block mb-1">Alert Context metadata</span>
                      {Object.entries(detailNotification.payload).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-[11px]">
                          <span className="text-slate-400 capitalize">{k.replace(/_/g, ' ')}</span>
                          <span className="text-slate-800 dark:text-slate-205 font-mono">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Deep Link (Phase 5) */}
                  {detailNotification.payload && (detailNotification.payload.ticket_id || detailNotification.payload.resume_id || detailNotification.payload.roadmap_id) && (
                    <div className="border-t border-slate-100 dark:border-slate-900 pt-4">
                      <span className="text-[9px] font-black uppercase text-slate-450 block mb-2">Deep link integrations</span>
                      {detailNotification.payload.ticket_id && (
                        <a
                          href={`/help?ticket=${detailNotification.payload.ticket_id}`}
                          className="flex items-center justify-between p-2.5 bg-indigo-50/20 border border-indigo-100/50 hover:bg-indigo-50/50 rounded-xl transition text-[11px] font-black text-indigo-700 dark:text-indigo-400"
                        >
                          <span className="flex items-center gap-1.5"><FiLink /> Inspect Support Ticket</span>
                          <FiArrowRight />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Drawer footer actions */}
              <div className="border-t border-slate-100 dark:border-slate-900 pt-4 flex justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => patchMutation.mutate({ id: detailNotification.id, payload: { is_read: !detailNotification.is_read } })}
                    className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-[10px] font-black transition"
                  >
                    Mark {detailNotification.is_read ? 'Unread' : 'Read'}
                  </button>
                  {detailNotification.is_deleted ? (
                    <button
                      onClick={() => restoreMutation.mutate(detailNotification.id)}
                      className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100/50 text-emerald-600 rounded-xl text-[10px] font-black transition"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => softDeleteMutation.mutate(detailNotification.id)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl text-[10px] font-black transition"
                    >
                      Archive
                    </button>
                  )}
                </div>
                <button
                  onClick={async () => {
                    const ok = await confirm({ title: 'Permanently Purge Record', message: 'Proceeding permanently purges this record from catalogs.' });
                    if (ok) hardDeleteMutation.mutate(detailNotification.id);
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black transition"
                >
                  Purge
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 5. Simple charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Module distribution */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Alerts Module distribution</span>
          <div className="h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily notification volume bar */}
        <div className="md:col-span-2 bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Daily alert notifications volume</span>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.volumeData}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar name="Alerts" dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
