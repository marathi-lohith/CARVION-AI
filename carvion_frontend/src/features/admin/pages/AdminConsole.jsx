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

import AnalyticsDashboard from '../components/AnalyticsDashboard.jsx';
import SystemConfigForm from '../components/SystemConfigForm.jsx';
import UsersTable from '../components/UsersTable.jsx';
import ResumesTable from '../components/ResumesTable.jsx';
import CareerManagement from '../components/CareerManagement.jsx';
import LearningManagement from '../components/LearningManagement.jsx';
import AiToolsManagement from '../components/AiToolsManagement.jsx';
import AssessmentManagement from '../components/AssessmentManagement.jsx';
import SystemMaintenance from '../components/SystemMaintenance.jsx';
import ContactMessagesManagement from '../components/ContactMessagesManagement.jsx';
import NotificationsManagement from '../components/NotificationsManagement.jsx';
import AdminActivityLogs from '../components/AdminActivityLogs.jsx';
import DashboardOverview from '../components/DashboardOverview.jsx';
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
    'resumes', 'jobs'
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
          <div className="space-y-4">
            {renderModuleHeader('Administrator Control Center', 'Real-time high-level monitoring, operations, quick alerts, and system telemetry.')}
            <DashboardOverview onNavigate={(moduleName) => setSearchParams({ module: moduleName })} />
          </div>
        )}

        {activeModule === 'analytics' && (
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
              <AnalyticsDashboard />
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
            {renderModuleHeader('Resume Management', 'Inspect, monitor, and manage user resumes and parser databases.')}
            <ResumesTable />
          </div>
        )}

        {activeModule === 'jobs' && (
          <div className="space-y-4">
            {renderModuleHeader('Career Management', 'Audit user saved jobs list, job application details and AI career insights.')}
            <CareerManagement />
          </div>
        )}

        {activeModule === 'learning' && (
          <div className="space-y-4">
            {renderModuleHeader('Learning Management', 'Audit user career roadmaps, saved courses, learning sessions, and video watch progress.')}
            <LearningManagement />
          </div>
        )}

        {activeModule === 'assessments' && (
          <div className="space-y-4">
            {renderModuleHeader('Assessment Management', 'Monitor, audit and manage mock tests, AI interview logs, scorecards and unified histories.')}
            <AssessmentManagement />
          </div>
        )}

        {activeModule === 'ai' && (
          <div className="space-y-4">
            {renderModuleHeader('AI Tools Management', 'Audit user career conversations, optimized resumes, cover letters, and skill gap analyses.')}
            <AiToolsManagement />
          </div>
        )}

        {activeModule === 'analytics' && (
          <div className="space-y-4">
            {renderModuleHeader('Platform Analytics Dashboard', 'Platform-wide executive metrics, platform growth charts, soft-delete logs, and subsystem health status.')}
            <AnalyticsDashboard />
          </div>
        )}

        {activeModule === 'content' && (
          <div className="space-y-4">
            {renderModuleHeader('System Maintenance', 'Operational tools for platform cache, background maintenance, and system health status.')}
            <SystemMaintenance />
          </div>
        )}

        {activeModule === 'contact_messages' && (
          <div className="space-y-4">
            {renderModuleHeader('Support Tickets & CRM Inbox', 'Audit user contact submissions, view details, append admin notes, resolve cases, and archive tickets.')}
            <ContactMessagesManagement />
          </div>
        )}

        {activeModule === 'notifications' && (
          <div className="space-y-4">
            {renderModuleHeader('Enterprise Notification Management Center', 'Consolidated audit log of alert notification events. Perform bulk actions, inspect detailed payloads, and track soft deleted logs.')}
            <NotificationsManagement />
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
            {renderModuleHeader('Administrator Activity Audit Logs', 'Chronological log tracking of administrative updates, configurations, cache purges, and deletes.')}
            <AdminActivityLogs />
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
