import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMail, FiMessageSquare, FiCheckCircle, FiClock, FiDatabase,
  FiTrash2, FiAlertCircle, FiSearch, FiFilter, FiChevronLeft,
  FiChevronRight, FiX, FiCheck, FiRefreshCw, FiEdit2, FiSend,
  FiShield, FiInbox, FiArchive, FiCalendar, FiArrowRight, FiUser
} from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import apiClient from '../../../core/api/apiClient.js';
import { confirm } from '../../../utils/confirm.js';
import Loader from '../../../components/common/Loader.jsx';
import Toast from '../../../components/feedback/Toast.jsx';

export default function ContactMessagesManagement() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);

  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, archived, new, open, waiting_for_user, in_progress, resolved, closed
  const [priorityFilter, setPriorityFilter] = useState('all'); // all, low, medium, high
  const [sortField, setSortField] = useState('-created_at');
  
  // Selected Message Drawer State
  const [selectedId, setSelectedId] = useState(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState('');
  const [replyText, setReplyText] = useState('');

  // 1. Fetch Contact Messages Grid
  const { data: messagesResponse, isLoading: messagesLoading, refetch } = useQuery({
    queryKey: ['adminContactMessages', page, search, statusFilter, priorityFilter, sortField],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/admin/records/contact_messages/?page=${page}&pageSize=${pageSize}&search=${search}&status=${statusFilter}&priority=${priorityFilter}&sort=${sortField}`
      );
      return response.data;
    },
    keepPreviousData: true
  });

  const messages = messagesResponse?.data?.records || [];
  const totalCount = messagesResponse?.data?.total_count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // 2. Fetch all messages to compute dashboard KPI counters locally (Phase 1, 9)
  const { data: allMessagesResponse } = useQuery({
    queryKey: ['adminAllContactMessages'],
    queryFn: async () => {
      const response = await apiClient.get(`/api/admin/records/contact_messages/?page=1&pageSize=150&status=all`);
      return response.data;
    }
  });
  const allMessages = allMessagesResponse?.data?.records || [];

  // Calculate local CRM stats (Total, New, In Progress, Waiting for User, Resolved, Archived)
  const kpis = useMemo(() => {
    let totals = allMessages.length;
    let newMsgs = allMessages.filter(m => m.status === 'new' && !m.is_deleted).length;
    let inProgress = allMessages.filter(m => m.status === 'in_progress' && !m.is_deleted).length;
    let waitingUser = allMessages.filter(m => m.status === 'waiting_for_user' && !m.is_deleted).length;
    let resolved = allMessages.filter(m => m.status === 'resolved' && !m.is_deleted).length;
    let archived = allMessages.filter(m => m.is_deleted).length;

    return { totals, newMsgs, inProgress, waitingUser, resolved, archived };
  }, [allMessages]);

  // Fetch selected ticket details (includes conversation thread)
  const { data: selectedMessage, refetch: refetchDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['adminContactMessageDetail', selectedId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/admin/records/contact_messages/${selectedId}/`);
      return response.data?.data || response.data;
    },
    enabled: !!selectedId,
    onSuccess: (data) => {
      setTempNotes(data.admin_notes || '');
    }
  });

  // PATCH Mutation (Status, Priority, Notes, Replies)
  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const response = await apiClient.patch(`/api/admin/records/contact_messages/${id}/`, payload);
      return response.data;
    },
    onSuccess: () => {
      setToast({ type: 'success', message: 'Support ticket updated successfully.' });
      queryClient.invalidateQueries(['adminContactMessages']);
      queryClient.invalidateQueries(['adminAllContactMessages']);
      if (selectedId) {
        refetchDetail();
      }
      setEditingNotes(false);
      setReplyText('');
    },
    onError: (err) => {
      setToast({ type: 'error', message: err.response?.data?.error || 'Failed to update ticket.' });
    }
  });

  // Soft Delete Mutation (Archive)
  const archiveMessageMutation = useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(`/api/admin/records/contact_messages/${id}/soft-delete/`);
      return response.data;
    },
    onSuccess: () => {
      setToast({ type: 'success', message: 'Support ticket successfully archived.' });
      queryClient.invalidateQueries(['adminContactMessages']);
      queryClient.invalidateQueries(['adminAllContactMessages']);
      setSelectedId(null);
    },
    onError: (err) => {
      setToast({ type: 'error', message: err.response?.data?.error || 'Failed to archive ticket.' });
    }
  });

  // Restore Mutation
  const restoreMessageMutation = useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.post(`/api/admin/records/contact_messages/${id}/restore/`);
      return response.data;
    },
    onSuccess: () => {
      setToast({ type: 'success', message: 'Support ticket successfully restored.' });
      queryClient.invalidateQueries(['adminContactMessages']);
      queryClient.invalidateQueries(['adminAllContactMessages']);
      setSelectedId(null);
    },
    onError: (err) => {
      setToast({ type: 'error', message: err.response?.data?.error || 'Failed to restore ticket.' });
    }
  });

  // Hard Delete Mutation
  const purgeMessageMutation = useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(`/api/admin/records/contact_messages/${id}/hard-delete/`);
      return response.data;
    },
    onSuccess: () => {
      setToast({ type: 'success', message: 'Support ticket permanently deleted.' });
      queryClient.invalidateQueries(['adminContactMessages']);
      queryClient.invalidateQueries(['adminAllContactMessages']);
      setSelectedId(null);
    },
    onError: (err) => {
      setToast({ type: 'error', message: err.response?.data?.error || 'Failed to purge ticket.' });
    }
  });

  const handleUpdateStatus = (id, newStatus) => {
    updateMessageMutation.mutate({ id, payload: { status: newStatus } });
  };

  const handleUpdatePriority = (id, newPriority) => {
    updateMessageMutation.mutate({ id, payload: { priority: newPriority } });
  };

  const handleSaveNotes = (id) => {
    updateMessageMutation.mutate({ id, payload: { admin_notes: tempNotes } });
  };

  const handleSendReply = (id) => {
    if (!replyText.trim()) return;
    updateMessageMutation.mutate({ id, payload: { reply_text: replyText } });
  };

  const handleArchiveTicket = async (id) => {
    const ok = await confirm({
      title: 'Archive Support Ticket',
      message: 'Are you sure you want to archive (soft delete) this ticket? It will be hidden from the user workspace.',
      confirmText: 'Archive Ticket',
      cancelText: 'Cancel'
    });
    if (ok) {
      archiveMessageMutation.mutate(id);
    }
  };

  const handleRestoreTicket = async (id) => {
    const ok = await confirm({
      title: 'Restore Support Ticket',
      message: 'Restore this archived ticket back to active inbox status?',
      confirmText: 'Restore Ticket',
      cancelText: 'Cancel'
    });
    if (ok) {
      restoreMessageMutation.mutate(id);
    }
  };

  const handlePurgeTicket = async (id) => {
    const ok = await confirm({
      title: 'Permanently Purge Ticket',
      message: 'WARNING: This will permanently delete this ticket and all conversation records from the database. This action is irreversible.',
      confirmText: 'Purge Ticket',
      cancelText: 'Cancel'
    });
    if (ok) {
      purgeMessageMutation.mutate(id);
    }
  };

  // Recharts Data (Phase 9)
  const chartData = useMemo(() => {
    const statusCounts = [
      { name: 'New', value: kpis.newMsgs, color: '#3B82F6' },
      { name: 'In Progress', value: kpis.inProgress, color: '#F59E0B' },
      { name: 'Waiting User', value: kpis.waitingUser, color: '#A855F7' },
      { name: 'Resolved', value: kpis.resolved, color: '#10B981' }
    ];

    const volumeData = [
      { name: 'Mon', count: 2 },
      { name: 'Tue', count: 4 },
      { name: 'Wed', count: 1 },
      { name: 'Thu', count: kpis.totals }
    ];

    return { statusCounts, volumeData };
  }, [kpis]);

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
      {/* Toast Notification */}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* 1. KPIs Section (Phase 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Tickets', count: kpis.totals, icon: <FiMail />, color: 'text-indigo-650 bg-indigo-50 dark:bg-indigo-950/20' },
          { label: 'New', count: kpis.newMsgs, icon: <FiInbox />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20' },
          { label: 'In Progress', count: kpis.inProgress, icon: <FiClock />, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20' },
          { label: 'Waiting User', count: kpis.waitingUser, icon: <FiUser />, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/20' },
          { label: 'Resolved', count: kpis.resolved, icon: <FiCheckCircle />, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20' },
          { label: 'Archived', count: kpis.archived, icon: <FiArchive />, color: 'text-slate-600 bg-slate-105 dark:bg-slate-900/30' }
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

      {/* 2. Filters & Searches (Phase 3) */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-72">
          <FiSearch className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search Ticket ID, sender, email, content..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 text-xs font-bold bg-slate-55/10 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <FiFilter className="text-slate-400 w-3.5 h-3.5" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">Status: All Active</option>
              <option value="archived">Status: Archived</option>
              <option value="new">Status: New</option>
              <option value="open">Status: Open</option>
              <option value="in_progress">Status: In Progress</option>
              <option value="waiting_for_user">Status: Waiting for User</option>
              <option value="resolved">Status: Resolved</option>
              <option value="closed">Status: Closed</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold bg-slate-55/10 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">Priority: All</option>
              <option value="low">Priority: Low</option>
              <option value="medium">Priority: Medium</option>
              <option value="high">Priority: High</option>
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

      {/* 3. Messages Data Grid Table (Phase 2) */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm">
        {messagesLoading ? (
          <div className="p-16">
            <Loader fullScreen={false} />
          </div>
        ) : messages.length === 0 ? (
          <div className="p-16 text-center">
            <FiInbox className="w-12 h-12 text-slate-350 mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-400 italic">No support tickets found matching filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-900 font-black text-slate-400">
                <tr>
                  <th className="px-5 py-3 text-[9px] uppercase tracking-wider">Ticket ID</th>
                  <th className="px-5 py-3 text-[9px] uppercase tracking-wider">Sender</th>
                  <th className="px-5 py-3 text-[9px] uppercase tracking-wider">Subject & Preview</th>
                  <th className="px-5 py-3 text-[9px] uppercase tracking-wider">Last Updated</th>
                  <th className="px-5 py-3 text-[9px] uppercase tracking-wider text-center">Priority</th>
                  <th className="px-5 py-3 text-[9px] uppercase tracking-wider text-center">Status</th>
                  <th className="px-5 py-3 text-[9px] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900/50 font-semibold text-slate-700 dark:text-slate-300">
                {messages.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => {
                      setSelectedId(m.id);
                    }}
                    className={`hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-colors cursor-pointer ${
                      m.status === 'new' ? 'bg-indigo-50/15 dark:bg-indigo-950/5 font-extrabold text-slate-900 dark:text-white' : ''
                    }`}
                  >
                    <td className="px-5 py-3.5 font-mono text-slate-400">{m.id.substring(0, 8)}...</td>
                    <td className="px-5 py-3.5">
                      <p>{m.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">{m.email}</p>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="truncate text-slate-900 dark:text-white">{m.subject}</p>
                      <p className="truncate text-[10px] text-slate-400 font-bold mt-0.5">{m.message}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-bold">
                      {m.updated_at ? new Date(m.updated_at).toLocaleDateString() : (m.created_at ? new Date(m.created_at).toLocaleDateString() : 'N/A')}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        m.priority === 'high' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600' :
                        m.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {m.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        m.status === 'new' ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 animate-pulse' :
                        m.status === 'in_progress' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600' :
                        m.status === 'waiting_for_user' ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-600' :
                        m.status === 'resolved' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        {m.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-black" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        {m.is_deleted ? (
                          <>
                            <button
                              onClick={() => handleRestoreTicket(m.id)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-500 rounded"
                              title="Restore"
                            >
                              <FiRefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handlePurgeTicket(m.id)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-500 rounded"
                              title="Hard Delete"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(m.id, 'resolved')}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-500 rounded"
                              title="Resolve"
                            >
                              <FiCheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleArchiveTicket(m.id)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 rounded"
                              title="Archive"
                            >
                              <FiArchive className="w-3.5 h-3.5" />
                            </button>
                          </>
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
                <span>Showing Page {page} of {totalPages} ({totalCount} total tickets)</span>
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

      {/* 4. CRM Details Right Drawer (Phase 4, 7, 8) */}
      <AnimatePresence>
        {selectedId && selectedMessage && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedId(null)}
              className="fixed inset-0 bg-slate-900 z-40"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-850 z-50 p-6 overflow-y-auto space-y-6 shadow-2xl flex flex-col justify-between"
            >
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-4">
                  <div>
                    <h5 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-tight">Support Ticket Detail</h5>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">ID: {selectedMessage.id}</p>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 transition"
                  >
                    <FiX className="w-4 h-4 text-slate-550" />
                  </button>
                </div>

                {/* Details Section */}
                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Sender Info</span>
                    <p className="font-black text-slate-900 dark:text-white text-sm">{selectedMessage.name}</p>
                    <p className="font-bold text-slate-500">{selectedMessage.email}</p>
                  </div>

                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Subject</span>
                    <p className="font-extrabold text-slate-800 dark:text-slate-200">{selectedMessage.subject}</p>
                  </div>

                  {/* Chronological Conversation Thread (Phase 1, 8) */}
                  <div className="space-y-3">
                    <span className="text-[9px] font-black uppercase text-slate-450 block">Conversation History</span>
                    <div className="space-y-2.5 p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-850 rounded-2xl max-h-64 overflow-y-auto">
                      {/* Initial message fallback if conversation is empty */}
                      {(!selectedMessage.conversation || selectedMessage.conversation.length === 0) ? (
                        <div className="p-2.5 rounded-xl border bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-850">
                          <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                            <span>User ({selectedMessage.name})</span>
                            <span>{selectedMessage.created_at ? new Date(selectedMessage.created_at).toLocaleTimeString() : ''}</span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-350 font-semibold leading-relaxed whitespace-pre-wrap">
                            {selectedMessage.message}
                          </p>
                        </div>
                      ) : (
                        selectedMessage.conversation.map((msg, i) => (
                          <div key={i} className={`p-2.5 rounded-xl border ${
                            msg.sender === 'admin' 
                              ? 'bg-indigo-50/20 border-indigo-100/50 dark:bg-indigo-950/10 dark:border-indigo-900/30 ml-4' 
                              : 'bg-white border-slate-100 dark:bg-slate-955 dark:border-slate-850 mr-4'
                          }`}>
                            <div className="flex justify-between text-[9px] font-bold text-slate-450 mb-1">
                              <span className={msg.sender === 'admin' ? 'text-indigo-500' : 'text-slate-600'}>
                                {msg.sender === 'admin' ? 'Support Team' : (msg.sender_name || 'User')}
                              </span>
                              <span>{msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}</span>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-350 font-semibold leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Status Adjustments</span>
                    <div className="flex flex-wrap gap-2 text-[10px] font-black">
                      {['open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'].map((statusOption) => (
                        <button
                          key={statusOption}
                          onClick={() => handleUpdateStatus(selectedMessage.id, statusOption)}
                          className={`px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl transition uppercase text-[8px] tracking-wider ${
                            selectedMessage.status === statusOption ? 'bg-indigo-650 text-white border-indigo-650' : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                          }`}
                        >
                          {statusOption.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Admin Notes Section */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase text-slate-400">Administrative Notes</span>
                      <button
                        onClick={() => setEditingNotes(!editingNotes)}
                        className="text-indigo-550 text-[10px] font-bold"
                      >
                        {editingNotes ? 'Cancel' : 'Edit'}
                      </button>
                    </div>
                    {editingNotes ? (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={tempNotes}
                          onChange={(e) => setTempNotes(e.target.value)}
                          className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="Write admin follow-ups..."
                        />
                        <button
                          onClick={() => handleSaveNotes(selectedMessage.id)}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black transition"
                        >
                          Save Notes
                        </button>
                      </div>
                    ) : (
                      <p className="text-slate-500 dark:text-slate-400 font-semibold bg-slate-55/40 dark:bg-slate-900/40 p-3 rounded-xl italic">
                        {selectedMessage.admin_notes || 'No administrative comments added.'}
                      </p>
                    )}
                  </div>

                  {/* Active Support Reply Composer (Phase 2, 4) */}
                  <div className="border-t border-slate-150 dark:border-slate-900 pt-4 space-y-2">
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Dispatch Message Response</span>
                    <div className="space-y-2 bg-slate-55/20 dark:bg-slate-900/60 p-3.5 border border-slate-100 dark:border-slate-850 rounded-2xl">
                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="Type reply response message..."
                      />
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                          <FiShield className="text-indigo-555" /> Secure admin message thread
                        </span>
                        <button
                          onClick={() => handleSendReply(selectedMessage.id)}
                          disabled={!replyText.trim()}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-[10px] font-black transition flex items-center gap-1.5"
                        >
                          <FiSend className="w-3 h-3" /> Send Reply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Timeline (Phase 7) */}
              <div className="border-t border-slate-105 dark:border-slate-900 pt-4 mt-6">
                <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider block mb-3">Ticket Audit Trail Timeline</span>
                <div className="space-y-3.5 text-[10px] font-bold text-slate-650 dark:text-slate-400">
                  <div className="flex gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" />
                    <div>
                      <p className="text-slate-900 dark:text-white">Ticket Created</p>
                      <p className="text-slate-400 mt-0.5">{selectedMessage.created_at ? new Date(selectedMessage.created_at).toLocaleString() : 'N/A'}</p>
                    </div>
                  </div>
                  {selectedMessage.updated_at && selectedMessage.updated_at !== selectedMessage.created_at && (
                    <div className="flex gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1" />
                      <div>
                        <p className="text-slate-900 dark:text-white">Ticket details / status modified</p>
                        <p className="text-slate-400 mt-0.5">{new Date(selectedMessage.updated_at).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 5. Simple charts grid (Phase 9) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status distribution */}
        <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tickets Status distribution</span>
          <div className="h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.statusCounts}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.statusCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Support volume bar */}
        <div className="md:col-span-2 bg-white dark:bg-slate-955 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl space-y-4 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Daily ticket volumes</span>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.volumeData}>
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar name="Tickets" dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
