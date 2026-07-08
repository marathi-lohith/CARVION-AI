import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiActivity, FiSearch, FiCalendar, FiChevronLeft, FiChevronRight,
  FiX, FiCheckCircle, FiAlertCircle, FiSettings, FiUsers, FiLayers, FiRefreshCw,
  FiInfo, FiDownload, FiUser, FiFileText, FiBookOpen, FiBriefcase, FiAward,
  FiMail, FiBell, FiTrash2, FiTool, FiDatabase, FiAlertTriangle
} from 'react-icons/fi';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';

export default function AdminActivityLogs() {
  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [adminFilter, setAdminFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Log Drawer state
  const [selectedLog, setSelectedLog] = useState(null);

  // 1. Fetch Admin Users list to populate Administrator filter dropdown
  const { data: adminsList = [] } = useQuery({
    queryKey: ['adminUsersDropdown'],
    queryFn: async () => {
      const response = await apiClient.get('/api/admin/users/?role=admin');
      return response.data?.data || response.data || [];
    }
  });

  // 2. Fetch Paginated Audit Logs & KPI Summary stats
  const { data: responseData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['adminActivityLogs', page, search, moduleFilter, statusFilter, actionFilter, severityFilter, adminFilter, startDate, endDate],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/admin/admin-activity/?page=${page}&page_size=${pageSize}&search=${search}&module=${moduleFilter}&status=${statusFilter}&action=${actionFilter}&severity=${severityFilter}&admin=${adminFilter}&start_date=${startDate}&end_date=${endDate}`
      );
      return response.data?.data || response.data;
    },
    keepPreviousData: true
  });

  const logs = responseData?.logs || [];
  const totalCount = responseData?.total_count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const summary = responseData?.summary || {
    total_today: 0,
    users_count: 0,
    restore_count: 0,
    hard_delete_count: 0,
    cache_count: 0,
    settings_count: 0
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchVal);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchVal('');
    setSearch('');
    setModuleFilter('all');
    setStatusFilter('all');
    setActionFilter('all');
    setSeverityFilter('all');
    setAdminFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Helper to render module icons
  const getModuleBadge = (module) => {
    const mods = {
      users: { label: 'User Management', icon: <FiUser className="w-3.5 h-3.5 inline mr-1" />, color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400' },
      resumes: { label: 'Resume', icon: <FiFileText className="w-3.5 h-3.5 inline mr-1" />, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' },
      learning: { label: 'Learning', icon: <FiBookOpen className="w-3.5 h-3.5 inline mr-1" />, color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400' },
      jobs: { label: 'Career', icon: <FiBriefcase className="w-3.5 h-3.5 inline mr-1" />, color: 'bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400' },
      assessments: { label: 'Assessment', icon: <FiAward className="w-3.5 h-3.5 inline mr-1" />, color: 'bg-pink-50 text-pink-700 dark:bg-pink-950/20 dark:text-pink-400' },
      contact_messages: { label: 'Contact Reply', icon: <FiMail className="w-3.5 h-3.5 inline mr-1" />, color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400' },
      notifications: { label: 'Notification', icon: <FiBell className="w-3.5 h-3.5 inline mr-1" />, color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400' },
      system: { label: 'Settings', icon: <FiSettings className="w-3.5 h-3.5 inline mr-1" />, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' }
    };
    const key = module.toLowerCase();
    const config = mods[key] || { label: module, icon: <FiActivity className="w-3.5 h-3.5 inline mr-1" />, color: 'bg-slate-50 text-slate-600' };
    return (
      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${config.color} border border-transparent`}>
        {config.icon} {config.label}
      </span>
    );
  };

  // Helper to get action icon
  const getActionBadge = (action) => {
    const act = action.toLowerCase();
    let icon = <FiActivity className="w-3.5 h-3.5 inline mr-1" />;
    let color = 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-400';
    
    if (act.includes('cache')) {
      icon = <FiDatabase className="w-3.5 h-3.5 inline mr-1" />;
      color = 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400';
    } else if (act.includes('restore')) {
      icon = <FiRefreshCw className="w-3.5 h-3.5 inline mr-1" />;
      color = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400';
    } else if (act.includes('delete') || act.includes('remove')) {
      icon = <FiTrash2 className="w-3.5 h-3.5 inline mr-1" />;
      color = 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400';
    } else if (act.includes('maintenance')) {
      icon = <FiTool className="w-3.5 h-3.5 inline mr-1" />;
      color = 'bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400';
    } else if (act.includes('suspended') || act.includes('deactivate')) {
      icon = <FiAlertTriangle className="w-3.5 h-3.5 inline mr-1" />;
      color = 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400';
    } else if (act.includes('activated') || act.includes('enable')) {
      icon = <FiCheckCircle className="w-3.5 h-3.5 inline mr-1" />;
      color = 'bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400';
    } else if (act.includes('login') || act.includes('logout')) {
      icon = <FiUsers className="w-3.5 h-3.5 inline mr-1" />;
      color = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400';
    }
    
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${color}`}>
        {icon}{action.replace(/_/g, ' ')}
      </span>
    );
  };

  // Helper to get Severity level badge
  const getSeverityBadge = (severity) => {
    const sev = (severity || 'INFO').toUpperCase();
    const colors = {
      INFO: 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200/30',
      WARNING: 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200/30',
      CRITICAL: 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200/30 font-black animate-pulse'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${colors[sev] || colors.INFO}`}>
        {sev}
      </span>
    );
  };

  // Export Filtered logs to CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return;
    
    // Header Row
    const headers = ['Timestamp', 'Admin Name', 'Admin Email', 'Action', 'Module', 'Target Record ID', 'Description', 'Status', 'Severity', 'IP Address', 'User Agent', 'Request ID'];
    
    // Convert lines
    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.admin_name,
      log.admin_email,
      log.action,
      log.module,
      log.target_record || '',
      log.description.replace(/"/g, '""'), // escape quotes
      log.status,
      log.severity || 'INFO',
      log.ip_address || '',
      log.user_agent || '',
      log.request_id || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `admin_audit_trail_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Filtered logs to Excel (formatted CSV)
  const handleExportExcel = () => {
    // Similar formatted XLS Tab separated string
    if (logs.length === 0) return;
    
    const headers = ['Timestamp', 'Admin Name', 'Admin Email', 'Action', 'Module', 'Target Record ID', 'Description', 'Status', 'Severity', 'IP Address', 'User Agent', 'Request ID'];
    const rows = logs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.admin_name,
      log.admin_email,
      log.action,
      log.module,
      log.target_record || '',
      log.description.replace(/\t/g, ' '),
      log.status,
      log.severity || 'INFO',
      log.ip_address || '',
      log.user_agent || '',
      log.request_id || ''
    ]);

    const xlsContent = "data:application/vnd.ms-excel;charset=utf-8,"
      + [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
      
    const encodedUri = encodeURI(xlsContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `admin_audit_trail_export_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 relative min-h-[500px]">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Admin Actions Today', val: summary.total_today, color: 'text-indigo-600', bg: 'bg-indigo-50/50 dark:bg-indigo-950/10' },
          { label: 'User Mgt Actions', val: summary.users_count, color: 'text-sky-600', bg: 'bg-sky-50/50 dark:bg-sky-950/10' },
          { label: 'Restore Operations', val: summary.restore_count, color: 'text-emerald-600', bg: 'bg-emerald-50/50 dark:bg-emerald-950/10' },
          { label: 'Hard Delete Ops', val: summary.hard_delete_count, color: 'text-rose-600', bg: 'bg-rose-50/50 dark:bg-rose-950/10' },
          { label: 'Cache Operations', val: summary.cache_count, color: 'text-amber-600', bg: 'bg-amber-50/50 dark:bg-amber-950/10' },
          { label: 'Settings Changes', val: summary.settings_count, color: 'text-purple-600', bg: 'bg-purple-50/50 dark:bg-purple-950/10' }
        ].map((card, i) => (
          <div key={i} className={`p-4 border border-slate-200/60 dark:border-slate-850 rounded-2xl ${card.bg} shadow-sm`}>
            <span className="text-[9px] uppercase font-black text-slate-400 block mb-1">{card.label}</span>
            <p className={`text-xl font-black ${card.color}`}>{card.val}</p>
          </div>
        ))}
      </div>

      {/* Filters & Export Bar */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-4 rounded-2xl space-y-4 shadow-sm text-xs font-bold text-slate-700 dark:text-slate-350">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-grow max-w-md flex gap-2">
            <div className="relative flex-grow">
              <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                <FiSearch className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search administrator name, email, action term..."
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-semibold"
              />
              {searchVal && (
                <button
                  type="button"
                  onClick={() => { setSearchVal(''); setSearch(''); setPage(1); }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button type="submit" className="px-4 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl font-black transition cursor-pointer">
              Search
            </button>
          </form>

          {/* Date range picker & Export Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-900">
              <FiCalendar className="text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="bg-transparent border-none text-slate-700 dark:text-slate-350 focus:outline-none text-[11px] font-bold"
              />
            </div>
            <span className="text-slate-400">to</span>
            <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-900">
              <FiCalendar className="text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="bg-transparent border-none text-slate-700 dark:text-slate-350 focus:outline-none text-[11px] font-bold"
              />
            </div>

            <button
              onClick={handleExportCSV}
              disabled={logs.length === 0}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-350 border border-slate-200 dark:border-slate-800 rounded-xl font-extrabold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiDownload /> CSV
            </button>

            <button
              onClick={handleExportExcel}
              disabled={logs.length === 0}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-350 border border-slate-200 dark:border-slate-800 rounded-xl font-extrabold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiDownload /> Excel
            </button>

            <button
              onClick={handleClearFilters}
              className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition text-slate-500 font-extrabold cursor-pointer"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2 border-t border-slate-100 dark:border-slate-900">
          <div>
            <span className="text-[10px] text-slate-400 block mb-1">Module Area</span>
            <select
              value={moduleFilter}
              onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl focus:outline-none text-[11px] font-bold"
            >
              <option value="all">All Modules</option>
              <option value="users">User Directory</option>
              <option value="resumes">Resumes Database</option>
              <option value="contact_messages">CRM / Support</option>
              <option value="system">System Maintenance</option>
              <option value="notifications">Alert Notifications</option>
            </select>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block mb-1">Action Type</span>
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl focus:outline-none text-[11px] font-bold"
            >
              <option value="all">All Action Types</option>
              <option value="cache_flushed">Cache Flushed</option>
              <option value="user_suspended">User Suspended</option>
              <option value="user_activated">User Activated</option>
              <option value="user_deleted">User Deleted</option>
              <option value="resume_restored">Resume Restored</option>
              <option value="resume_hard_deleted">Resume Hard Deleted</option>
              <option value="contact_ticket_replied">Support Replied</option>
              <option value="settings_updated">Settings Updated</option>
              <option value="admin_login">Admin Logins</option>
              <option value="admin_logout">Admin Logouts</option>
              <option value="bulk_action_executed">Bulk Action</option>
            </select>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block mb-1">Severity</span>
            <select
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl focus:outline-none text-[11px] font-bold"
            >
              <option value="all">All Severities</option>
              <option value="info">INFO</option>
              <option value="warning">WARNING</option>
              <option value="critical">CRITICAL</option>
            </select>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block mb-1">Administrator</span>
            <select
              value={adminFilter}
              onChange={(e) => { setAdminFilter(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl focus:outline-none text-[11px] font-bold"
            >
              <option value="all">All Admins</option>
              {adminsList.map(admin => (
                <option key={admin.id} value={admin.id}>{admin.name} ({admin.email})</option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block mb-1">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl focus:outline-none text-[11px] font-bold"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Listing Table */}
      {isLoading ? (
        <Loader fullScreen={false} skeleton={true} variant="table" />
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 rounded-2xl flex flex-col items-center justify-center space-y-3">
          <FiActivity className="w-8 h-8 text-slate-350 animate-bounce" />
          <h4 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-tight">No administrator activity has been recorded yet.</h4>
          <p className="text-[10px] text-slate-400 font-bold max-w-xs">Administrative actions will automatically appear here once operators interact with settings, modules, or collections.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse text-left text-xs font-semibold">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-400 border-b border-slate-200/50 dark:border-slate-800 uppercase text-[9px] font-black tracking-wider">
                  <th className="px-5 py-4">Timestamp</th>
                  <th className="px-5 py-4">Severity</th>
                  <th className="px-5 py-4">Administrator</th>
                  <th className="px-5 py-4">Action</th>
                  <th className="px-5 py-4">Module</th>
                  <th className="px-5 py-4">Target ID</th>
                  <th className="px-5 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-slate-700 dark:text-slate-350">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition">
                    <td className="px-5 py-3.5 font-mono text-[10px] text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      {getSeverityBadge(log.severity)}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-black text-slate-850 dark:text-white">{log.admin_name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{log.admin_email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-5 py-3.5">
                      {getModuleBadge(log.module)}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[10px] text-slate-400">
                      {log.target_record || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl transition text-[10px] font-black cursor-pointer text-slate-800 dark:text-slate-200"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Numbered Pagination Selector */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>
              Showing {Math.min((page - 1) * pageSize + 1, totalCount)}–{Math.min(page * pageSize, totalCount)} of {totalCount} records
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              
              {/* Numbered buttons */}
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pNum = idx + 1;
                return (
                  <button
                    key={pNum}
                    onClick={() => setPage(pNum)}
                    className={`w-8 h-8 rounded-xl font-bold transition ${
                      page === pNum
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-650'
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right Side sliding drawer for Details */}
      <AnimatePresence>
        {selectedLog && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="fixed inset-0 bg-black z-40"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-850 p-6 z-50 shadow-2xl flex flex-col justify-between overflow-y-auto scrollbar-thin text-xs font-bold text-slate-700 dark:text-slate-350"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-tight">Audit Log Details</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Full metadata of the registered operation.</p>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition text-slate-500 cursor-pointer"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>

                {/* Audit Fields */}
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] uppercase text-slate-400 block mb-1">Administrator ID</span>
                    <p className="font-mono text-[10px] text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                      {selectedLog.admin_id || 'N/A'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 block mb-1">Admin Name</span>
                      <p className="text-slate-800 dark:text-slate-200">{selectedLog.admin_name}</p>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 block mb-1">Admin Email</span>
                      <p className="text-slate-850 dark:text-white truncate">{selectedLog.admin_email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 block mb-1">Module Area</span>
                      <div className="mt-1">{getModuleBadge(selectedLog.module)}</div>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 block mb-1">Action Type</span>
                      <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 block mb-1">Severity</span>
                      <div className="mt-1">{getSeverityBadge(selectedLog.severity)}</div>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 block mb-1">Execution Status</span>
                      <div className="mt-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          selectedLog.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {selectedLog.status === 'success' ? <FiCheckCircle /> : <FiAlertCircle />} {selectedLog.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase text-slate-400 block mb-1">Target Record ID</span>
                    <p className="font-mono text-[10px] text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                      {selectedLog.target_record || 'None Specified'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase text-slate-400 block mb-1">Description</span>
                    <p className="text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/80 leading-relaxed font-semibold">
                      {selectedLog.description}
                    </p>
                  </div>

                  {/* Network Metadata */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-900 space-y-3">
                    <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block">Network & Device Telemetry</span>
                    
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 block mb-1">IP Address</span>
                      <p className="font-mono text-[10px] text-slate-850 dark:text-white">
                        {selectedLog.ip_address || 'Unavailable'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] uppercase text-slate-400 block mb-1">Request Trace ID</span>
                      <p className="font-mono text-[10px] text-slate-850 dark:text-white">
                        {selectedLog.request_id || 'Unavailable'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] uppercase text-slate-400 block mb-1">Browser User Agent</span>
                      <p className="text-[10px] text-slate-500 leading-normal font-semibold bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/80 font-mono">
                        {selectedLog.user_agent || 'Unavailable'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-900 mt-6">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl font-black text-center transition cursor-pointer"
                >
                  Close Detail Panel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
