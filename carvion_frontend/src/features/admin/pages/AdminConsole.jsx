import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FiActivity, FiSettings, FiUsers, FiFileText, FiBriefcase,
  FiBookOpen, FiAward, FiCpu, FiBarChart2, FiLayers, FiMail,
  FiBell, FiTrash2, FiSearch, FiChevronLeft, FiChevronRight,
  FiCheckCircle, FiAlertCircle, FiDatabase, FiTrendingUp, FiDollarSign, FiX
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

import ApiUsageChart from '../components/ApiUsageChart.jsx';
import SystemConfigForm from '../components/SystemConfigForm.jsx';
import UsersTable from '../components/UsersTable.jsx';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import { confirm } from '../../../utils/confirm.js';
import Toast from '../../../components/feedback/Toast.jsx';

export default function AdminConsole() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeModule = searchParams.get('module') || 'dashboard';

  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
  const [searchVal, setSearchVal] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  // Reset page and search filters whenever active module tab changes
  useEffect(() => {
    setPage(1);
    setSearch('');
    setSearchVal('');
  }, [activeModule]);

  // 1. Fetch system telemetry stats
  const { data: telemetry, isLoading: telemetryLoading, isError: telemetryError, refetch: refetchTelemetry } = useQuery({
    queryKey: ['adminTelemetry'],
    queryFn: async () => {
      const response = await apiClient.get('/api/admin/telemetry/');
      return response.data?.data || response.data;
    },
    refetchInterval: 15000,
  });

  // Fetch user activity feed
  const { data: userActivity = [] } = useQuery({
    queryKey: ['adminUserActivity'],
    queryFn: async () => {
      const response = await apiClient.get('/api/admin/user-activity/');
      return response.data?.data || [];
    },
    refetchInterval: 10000,
    enabled: activeModule === 'dashboard',
  });

  // Fetch admin activity feed
  const { data: adminActivity = [] } = useQuery({
    queryKey: ['adminAdminActivity'],
    queryFn: async () => {
      const response = await apiClient.get('/api/admin/admin-activity/');
      return response.data?.data || [];
    },
    refetchInterval: 15000,
    enabled: activeModule === 'dashboard',
  });


  // 2. Fetch user accounts directory
  const { data: usersData = [], isLoading: usersLoading, isError: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ['adminUsersList', search],
    queryFn: async () => {
      const response = await apiClient.get(`/api/admin/users/?search=${search}`);
      return response.data?.data || response.data || [];
    },
    enabled: activeModule === 'users',
  });

  // 3. Fetch module-specific records
  const isGenericModule = [
    'resumes', 'jobs', 'learning', 'assessments', 
    'contact_messages', 'notifications', 'activity_logs'
  ].includes(activeModule);

  const { data: recordsData, isLoading: recordsLoading, isError: recordsError, refetch: refetchRecords } = useQuery({
    queryKey: ['adminRecords', activeModule, page, search],
    queryFn: async () => {
      const response = await apiClient.get(`/api/admin/records/${activeModule}/?page=${page}&pageSize=${pageSize}&search=${search}`);
      return response.data?.data || response.data;
    },
    enabled: isGenericModule,
    keepPreviousData: true,
  });

  // 4. Cache flush mutation
  const { mutate: clearCache, isLoading: isClearingCache } = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/api/admin/cache/clear/');
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      const jobPurged = data?.deleted?.job_caches || 0;
      const coursePurged = data?.deleted?.course_caches || 0;
      showToast(`Cache cleaned. Purged ${jobPurged} job entries and ${coursePurged} courses.`);
      refetchTelemetry();
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Cache clearing failed.';
      showToast(msg, 'error');
    },
  });

  // 5. Update user status/role mutations
  const { mutate: updateUserInfo } = useMutation({
    mutationFn: async ({ userId, data }) => {
      const response = await apiClient.patch(`/api/admin/users/${userId}/`, data);
      return response.data?.data || response.data;
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['adminUsersList', search], (oldUsers = []) =>
        oldUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      );
      showToast(`User ${updatedUser.name}'s account details saved.`);
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Failed to modify account settings.';
      showToast(msg, 'error');
    },
  });

  // 6. Delete user account mutation
  const { mutate: deleteUser } = useMutation({
    mutationFn: async (userId) => {
      await apiClient.delete(`/api/admin/users/${userId}/`);
      return userId;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(['adminUsersList', search], (oldUsers = []) =>
        oldUsers.filter((u) => u.id !== deletedId)
      );
      showToast('User account successfully purged.');
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Purging user account failed.';
      showToast(msg, 'error');
    },
  });

  const handleUpdateRole = (userId, newRole) => {
    updateUserInfo({ userId, data: { role: newRole } });
  };

  const handleUpdateStatus = (userId, newStatus) => {
    updateUserInfo({ userId, data: { is_active: newStatus } });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchVal);
    setPage(1);
  };

  const renderModuleHeader = (title, subtitle) => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
      <div>
        <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">{title}</h3>
        <p className="text-xs text-slate-400 dark:text-slate-555 font-semibold mt-0.5">{subtitle}</p>
      </div>
      {isGenericModule && (
        <form onSubmit={handleSearchSubmit} className="relative max-w-xs w-full flex gap-2 items-center">
          <div className="relative flex-grow">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <FiSearch className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search records..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-850 dark:text-slate-250 font-semibold shadow-sm"
            />
            {searchVal && (
              <button
                type="button"
                onClick={() => {
                  setSearchVal('');
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button type="submit" className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer">
            Search
          </button>
        </form>
      )}
    </div>
  );

  const renderPagination = () => {
    if (!recordsData) return null;
    const totalCount = recordsData.total_count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    if (totalPages <= 1) return null;

    return (
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span>Showing page {page} of {totalPages} ({totalCount} total records)</span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors disabled:cursor-not-allowed cursor-pointer"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors disabled:cursor-not-allowed cursor-pointer"
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderGenericTable = (headers, rowsMapper) => {
    if (recordsLoading && !recordsData) {
      return <Loader fullScreen={false} skeleton={true} variant="table" />;
    }
    if (recordsError) {
      return (
        <div className="text-center py-12">
          <p className="text-red-500 font-bold">Failed to load records.</p>
          <button onClick={() => refetchRecords()} className="mt-3 px-4 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition cursor-pointer">
            Retry
          </button>
        </div>
      );
    }
    const records = recordsData?.records || [];
    if (records.length === 0) {
      return (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-2">
          <FiLayers className="w-8 h-8 text-slate-300 dark:text-slate-700" />
          <p className="text-slate-400 dark:text-slate-500 font-semibold text-xs">No records found for this section.</p>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="sticky top-0 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md text-slate-400 dark:text-slate-500 font-extrabold uppercase border-b border-slate-150 dark:border-slate-800/80 z-10">
                {headers.map(h => <th key={h} className="px-5 py-4">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-650 dark:text-slate-350">
              {records.map((r, i) => (
                <React.Fragment key={r.id || i}>
                  {rowsMapper(r, i)}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {renderPagination()}
      </div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeModule}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="max-w-6xl mx-auto space-y-6"
      >
        {/* Dynamic Workspace based on active tabs */}
        {activeModule === 'dashboard' && (
          <div className="space-y-6">
            {telemetryLoading && !telemetry ? (
              <Loader fullScreen={false} skeleton={true} variant="grid" />
            ) : telemetryError ? (
              <div className="text-center py-12">
                <p className="text-red-500 font-bold">Failed to connect to telemetry database.</p>
                <button onClick={() => refetchTelemetry()} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition cursor-pointer">
                  Retry
                </button>
              </div>
            ) : (
              <ApiUsageChart telemetry={telemetry} userActivity={userActivity} adminActivity={adminActivity} />
            )}
          </div>
        )}

        {activeModule === 'users' && (
          <div className="space-y-4">
            {renderModuleHeader('User Management', 'View, activate/deactivate user directories and adjust system credentials roles.')}
            <UsersTable
              users={usersData}
              isLoading={usersLoading}
              onUpdateRole={handleUpdateRole}
              onUpdateStatus={handleUpdateStatus}
              onDeleteUser={deleteUser}
            />
          </div>
        )}

        {activeModule === 'resumes' && (
          <div className="space-y-4">
            {renderModuleHeader('Resume Management', 'Track all resumes built or scanned through pyMuPDF parses.')}
            {renderGenericTable(
              ['User Email', 'Resume Name', 'File Name', 'ATS Score', 'Created Date'],
              (r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/10 transition-colors odd:bg-slate-55/10 dark:odd:bg-slate-900/5">
                  <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">{r.user_email}</td>
                  <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-350">{r.name}</td>
                  <td className="px-5 py-3.5 italic text-slate-400 dark:text-slate-500">{r.file_name}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${r.ats_score >= 80 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/40' : 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-100/50 dark:border-orange-900/40'}`}>
                      {r.ats_score} pts
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 font-semibold">{r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}</td>
                </tr>
              )
            )}
          </div>
        )}

        {activeModule === 'jobs' && (
          <div className="space-y-4">
            {renderModuleHeader('Job Application Management', 'Track platform job board application submissions.')}
            {renderGenericTable(
              ['User Email', 'Job Title', 'Company', 'Location', 'Status', 'Date Applied'],
              (j) => (
                <tr key={j.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/10 transition-colors odd:bg-slate-55/10 dark:odd:bg-slate-900/5">
                  <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">{j.user_email}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-350">{j.title}</td>
                  <td className="px-5 py-3.5">{j.company}</td>
                  <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500">{j.location}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] border ${
                      j.status === 'Offered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900' :
                      j.status === 'Rejected' ? 'bg-red-50 text-red-500 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900' :
                      j.status === 'Interviewing' ? 'bg-blue-50 text-blue-500 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900' :
                      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-850 dark:text-slate-400 dark:border-slate-800'
                    }`}>
                      {j.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 font-semibold">{j.applied_at ? new Date(j.applied_at).toLocaleDateString() : 'N/A'}</td>
                </tr>
              )
            )}
          </div>
        )}

        {activeModule === 'learning' && (
          <div className="space-y-4">
            {renderModuleHeader('Learning Management', 'View generated Gemini milestones roadmaps.')}
            {renderGenericTable(
              ['User Email', 'Target Role', 'Milestones Count', 'Created Date'],
              (l) => (
                <tr key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/10 transition-colors odd:bg-slate-55/10 dark:odd:bg-slate-900/5">
                  <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">{l.user_email}</td>
                  <td className="px-5 py-3.5 text-slate-700 dark:text-slate-350 font-bold">{l.target_role}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-500 dark:text-slate-400">{l.milestones_count} units</td>
                  <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 font-semibold">{l.created_at ? new Date(l.created_at).toLocaleDateString() : 'N/A'}</td>
                </tr>
              )
            )}
          </div>
        )}

        {activeModule === 'assessments' && (
          <div className="space-y-4">
            {renderModuleHeader('Assessment Management', 'Chronologically monitor test scorecards.')}
            {renderGenericTable(
              ['User Email', 'Domain', 'Category', 'Difficulty', 'Correct / Total', 'Accuracy', 'Date Taken'],
              (a) => (
                <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/10 transition-colors odd:bg-slate-55/10 dark:odd:bg-slate-900/5">
                  <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">{a.user_email}</td>
                  <td className="px-5 py-3.5 text-slate-700 dark:text-slate-350 font-bold">{a.domain}</td>
                  <td className="px-5 py-3.5 uppercase font-bold text-[9px] text-slate-400">{a.category}</td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-semibold">{a.difficulty}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-300">{a.correct_answers} / {a.total_questions}</td>
                  <td className="px-5 py-3.5 font-extrabold text-orange-500 dark:text-orange-400">{a.score}%</td>
                  <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 font-semibold">{a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A'}</td>
                </tr>
              )
            )}
          </div>
        )}

        {activeModule === 'ai' && (
          <div className="space-y-6">
            {renderModuleHeader('AI Management', 'Monitor calculated Gemini API tokens budget and uptime variables.')}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div whileHover={{ y: -4 }} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-sm">
                <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <FiDollarSign className="text-emerald-500" /> API Budget Used
                </h4>
                <p className="text-3xl font-black text-slate-800 dark:text-white">
                  ${telemetry?.gemini_cost_usd?.toFixed(4) || '0.0000'}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
                  Calculated dynamic usage estimates across parsed resumes, roadmap generations, and mock assessments.
                </p>
              </motion.div>

              <motion.div whileHover={{ y: -4 }} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-sm">
                <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <FiActivity className="text-orange-500" /> AI Transactions
                </h4>
                <p className="text-3xl font-black text-slate-800 dark:text-white">
                  {(telemetry?.total_parsed_records || 0) + (telemetry?.total_roadmaps || 0) + (telemetry?.total_mock_tests || 0)}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
                  Sum count of total document calls processed via generative AI pathways.
                </p>
              </motion.div>

              <motion.div whileHover={{ y: -4 }} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-sm">
                <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <FiCpu className="text-blue-500" /> Backend Engine
                </h4>
                <p className="text-lg font-black text-slate-850 dark:text-white">
                  Google Gemini API
                </p>
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1 border border-emerald-100 dark:border-emerald-900/50 rounded-full text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span>gemini-2.5-flash-latest</span>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {activeModule === 'analytics' && (
          <div className="space-y-4">
            {renderModuleHeader('System Analytics', 'Global charts showing share proportions and transactions trends.')}
            {telemetryLoading ? (
              <Loader fullScreen={false} skeleton={true} variant="grid" />
            ) : (
              <ApiUsageChart telemetry={telemetry} userActivity={userActivity} adminActivity={adminActivity} />
            )}
          </div>
        )}

        {activeModule === 'content' && (
          <div className="space-y-6">
            {renderModuleHeader('Content Management', 'Clear collections and maintain cache databases indexes.')}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm transition-colors animate-fade-in">
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <FiLayers className="text-orange-500" /> Database Collections Purge Controls
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl font-semibold">
                Flushing recommendation cache directories forces the application to pull fresh data from exterior API integrations (like JSearch and Google Search paths) on future career dashboards searches.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Flush Cache',
                      message: 'Are you sure you want to flush all recommended cache collections? This will evict all current job and course queries caches.',
                      type: 'warning',
                      confirmText: 'Flush Cache'
                    });
                    if (ok) {
                      clearCache();
                    }
                  }}
                  disabled={isClearingCache}
                  className="px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-500/10"
                >
                  <FiDatabase /> {isClearingCache ? 'Flushing...' : 'Purge All Recommendations Cache'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeModule === 'contact_messages' && (
          <div className="space-y-4">
            {renderModuleHeader('Contact Messages', 'View message notifications submitted from the Help form.')}
            {renderGenericTable(
              ['Sender Name', 'Email Address', 'Subject', 'Message Body', 'Received Date'],
              (m) => (
                <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/10 transition-colors odd:bg-slate-55/10 dark:odd:bg-slate-900/5">
                  <td className="px-5 py-3.5 font-bold text-slate-850 dark:text-slate-100">{m.name}</td>
                  <td className="px-5 py-3.5 text-orange-600 dark:text-orange-400 font-semibold">{m.email}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-350">{m.subject}</td>
                  <td className="px-5 py-3.5 max-w-xs truncate text-slate-450 dark:text-slate-400 font-semibold" title={m.message}>{m.message}</td>
                  <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 font-semibold">{m.created_at ? new Date(m.created_at).toLocaleDateString() : 'N/A'}</td>
                </tr>
              )
            )}
          </div>
        )}

        {activeModule === 'notifications' && (
          <div className="space-y-4">
            {renderModuleHeader('Sent Notifications Alert Log', 'Track platform notification triggers history.')}
            {renderGenericTable(
              ['User Email', 'Notification Type', 'Title', 'Message Payload', 'Read Status', 'Date Triggered'],
              (n) => (
                <tr key={n.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/10 transition-colors odd:bg-slate-55/10 dark:odd:bg-slate-900/5">
                  <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">{n.user_email}</td>
                  <td className="px-5 py-3.5 uppercase font-bold text-[9px] text-slate-450 dark:text-slate-500">{n.type}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-300">{n.title}</td>
                  <td className="px-5 py-3.5 text-slate-450 dark:text-slate-400 max-w-xs truncate font-semibold" title={n.message}>{n.message}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${n.is_read ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' : 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-100/50 dark:border-orange-900/40'}`}>
                      {n.is_read ? 'Read' : 'Unread'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 font-semibold">{n.created_at ? new Date(n.created_at).toLocaleDateString() : 'N/A'}</td>
                </tr>
              )
            )}
          </div>
        )}

        {activeModule === 'settings' && (
          <div className="space-y-4">
            {renderModuleHeader('System Settings Configuration', 'Update environment keys and setup variables.')}
            <SystemConfigForm onClearCache={clearCache} isClearingCache={isClearingCache} />
          </div>
        )}

        {activeModule === 'activity_logs' && (
          <div className="space-y-4">
            {renderModuleHeader('Active Operator Sessions Logs', 'Analyze active JSON web token entries.')}
            {renderGenericTable(
              ['User Email', 'Security Token Preview', 'Expiration Target', 'Login Timestamp'],
              (t) => (
                <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/10 transition-colors odd:bg-slate-55/10 dark:odd:bg-slate-900/5">
                  <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">{t.user_email}</td>
                  <td className="px-5 py-3.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">{t.token_preview}</td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-semibold">{t.expires_at ? new Date(t.expires_at).toLocaleString() : 'N/A'}</td>
                  <td className="px-5 py-3.5 text-slate-400 dark:text-slate-500 font-semibold">{t.created_at ? new Date(t.created_at).toLocaleString() : 'N/A'}</td>
                </tr>
              )
            )}
          </div>
        )}

        <Toast
          isOpen={toast.isOpen}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
        />
      </motion.div>
    </AnimatePresence>
  );
}
