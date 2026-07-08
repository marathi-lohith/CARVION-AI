import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FiSettings, FiSliders, FiCpu, FiShield, FiDatabase, FiAlertTriangle,
  FiCheck, FiX, FiRefreshCw, FiGrid, FiBell, FiPlay, FiServer,
  FiLock, FiHardDrive, FiFolder, FiActivity, FiTrash2, FiInfo, FiLink
} from 'react-icons/fi';
import apiClient from '../../../core/api/apiClient.js';
import { confirm } from '../../../utils/confirm.js';
import Loader from '../../../components/common/Loader.jsx';
import Toast from '../../../components/feedback/Toast.jsx';

export default function SystemConfigForm() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('user');

  // Form local state
  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // 1. Query current configurations, database info, API key statuses
  const { data: responseData, isLoading, refetch } = useQuery({
    queryKey: ['adminConfig'],
    queryFn: async () => {
      const response = await apiClient.get('/api/admin/config/');
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      if (data?.config) {
        setFormData(data.config);
        setOriginalData(data.config);
        setHasChanges(false);
      }
    }
  });

  // Track changes
  useEffect(() => {
    if (responseData?.config) {
      const changed = Object.keys(formData).some(
        key => formData[key] !== originalData[key]
      );
      setHasChanges(changed);
    }
  }, [formData, originalData, responseData]);

  // 2. Mutation to save configurations
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.patch('/api/admin/config/', payload);
      return response.data;
    },
    onSuccess: () => {
      setToast({ type: 'success', message: 'System configuration saved successfully!' });
      queryClient.invalidateQueries(['adminConfig']);
      refetch();
    },
    onError: (err) => {
      setToast({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to save configuration.'
      });
    }
  });

  // 3. Cache flushing mutations
  const [flushingCache, setFlushingCache] = useState(null);
  const handleFlushCache = async (type) => {
    const isOk = await confirm({
      title: 'Clear Cache Collection',
      message: `Are you sure you want to flush the ${type.toUpperCase()} cache? This will temporarily latency response rates during queries generation.`
    });
    if (!isOk) return;

    setFlushingCache(type);
    try {
      await apiClient.post(`/api/admin/cache/clear/?type=${type}`);
      setToast({ type: 'success', message: `${type.toUpperCase()} cache flushed successfully.` });
      queryClient.invalidateQueries(['adminConfig']);
      refetch();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to clear cache.' });
    } finally {
      setFlushingCache(null);
    }
  };

  const handleInputChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleCancel = () => {
    setFormData(originalData);
    setHasChanges(false);
    setToast({ type: 'info', message: 'Changes discarded.' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!hasChanges) return;

    // Detect critical changes for confirmation prompt
    const criticalPromptRequired =
      (formData.enable_maintenance_mode !== originalData.enable_maintenance_mode && formData.enable_maintenance_mode) ||
      (formData.enable_public_registration !== originalData.enable_public_registration && !formData.enable_public_registration);

    if (criticalPromptRequired) {
      const ok = await confirm({
        title: 'Critical Settings Change',
        message: 'You are enabling Maintenance Mode or disabling public registration. Are you sure you want to proceed?'
      });
      if (!ok) return;
    }

    // Build diff payload
    const payload = {};
    Object.keys(formData).forEach(key => {
      if (formData[key] !== originalData[key]) {
        payload[key] = formData[key];
      }
    });

    saveMutation.mutate(payload);
  };

  if (isLoading || !formData) {
    return <Loader fullScreen={false} />;
  }

  const { api_status = {}, db_info = {}, cache_info = {}, versions = {} } = responseData || {};

  return (
    <div className="space-y-6">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-56 bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-855 p-4 rounded-2xl space-y-1 shadow-sm shrink-0">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block px-3 mb-2">Configuration Groups</span>
          {[
            { id: 'user', label: 'User Registration', icon: <FiSliders /> },
            { id: 'cache', label: 'Cache Control', icon: <FiDatabase /> },
            { id: 'maintenance', label: 'Maintenance Mode', icon: <FiLock /> },
            { id: 'dbinfo', label: 'Database Health', icon: <FiServer /> },
            { id: 'sysinfo', label: 'System Information', icon: <FiInfo /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                activeTab === tab.id
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400'
                  : 'text-slate-550 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <span className="text-sm">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Main Settings Card */}
        <div className="flex-grow bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 rounded-2xl p-6 shadow-sm min-h-[420px] flex flex-col justify-between">
          <form onSubmit={handleSave} className="space-y-6 text-xs font-bold text-slate-700 dark:text-slate-350">
            
            {/* User Registration Tab */}
            {activeTab === 'user' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-900 pb-3">
                  <h4 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-tight">User Registration Controls</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Toggle signups and review external authentication keys connection health.</p>
                </div>
                <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900 p-4 border border-slate-150 dark:border-slate-800 rounded-2xl max-w-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p>Public Registrations</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">Allow public user signups</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInputChange('enable_public_registration', !formData.enable_public_registration)}
                      className={`w-11 h-6 rounded-full relative flex items-center transition-colors cursor-pointer ${
                        formData.enable_public_registration ? 'bg-indigo-650' : 'bg-slate-250 dark:bg-slate-800'
                      }`}
                    >
                      <span className={`w-4 h-4 bg-white rounded-full absolute shadow transition-transform ${
                        formData.enable_public_registration ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p>Google OAuth Integration Status</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">Social Google login connectivity</p>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                      api_status.google_oauth === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {api_status.google_oauth === 'connected' ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Cache Control Tab */}
            {activeTab === 'cache' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-900 pb-3">
                  <h4 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-tight">System Cache Management</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Monitor cached counts and purge documents to refresh external recommendations.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { type: 'recommendation', label: 'Job Cache Collection', count: cache_info.job_count || 0 },
                    { type: 'course', label: 'Course Cache Collection', count: cache_info.course_count || 0 },
                    { type: 'ai', label: 'AI Cache Collection', count: cache_info.ai_count || 0 }
                  ].map(c => (
                    <div key={c.type} className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between space-y-4">
                      <div>
                        <p className="text-slate-850 dark:text-white">{c.label}</p>
                        <span className="font-mono text-indigo-650 block mt-2 text-base">{c.count} documents</span>
                      </div>
                      <button
                        type="button"
                        disabled={flushingCache === c.type}
                        onClick={() => handleFlushCache(c.type)}
                        className="py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-black rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" /> {flushingCache === c.type ? 'Flushing...' : 'Flush Cache'}
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleFlushCache('all')}
                  className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-black transition cursor-pointer"
                >
                  Flush All Cached Collections
                </button>
              </div>
            )}

            {/* Maintenance Mode Tab */}
            {activeTab === 'maintenance' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-900 pb-3">
                  <h4 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-tight">Maintenance Mode Control</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Toggle site lockdown, blocking workspace routing for standard users.</p>
                </div>
                
                <div className="flex items-center justify-between max-w-md bg-slate-50/50 dark:bg-slate-900 p-4 border border-slate-150 dark:border-slate-800 rounded-2xl">
                  <div>
                    <p>Maintenance Mode Status</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Toggles 503 status redirects on public routes</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInputChange('enable_maintenance_mode', !formData.enable_maintenance_mode)}
                    className={`w-11 h-6 rounded-full relative flex items-center transition-colors cursor-pointer ${
                      formData.enable_maintenance_mode ? 'bg-orange-500 animate-pulse' : 'bg-slate-250 dark:bg-slate-800'
                    }`}
                  >
                    <span className={`w-4 h-4 bg-white rounded-full absolute shadow transition-transform ${
                      formData.enable_maintenance_mode ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            )}

            {/* Database Health Tab */}
            {activeTab === 'dbinfo' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-900 pb-3">
                  <h4 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-tight">Database Health & Analytics</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Live read-only diagnostics for platform database storage volume.</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'MongoDB Status', val: db_info.status || 'connected', color: 'text-emerald-600' },
                    { label: 'Database Size', val: `${((db_info.size_bytes || 0) / (1024 * 1024)).toFixed(2)} MB` },
                    { label: 'Collections Count', val: db_info.collections || 0 },
                    { label: 'Total Users Count', val: db_info.users || 0 },
                    { label: 'Active Users Count', val: db_info.active_users || 0 },
                    { label: 'Total Resumes Scans', val: db_info.resumes || 0 },
                    { label: 'Total Saved Jobs', val: db_info.jobs || 0 },
                    { label: 'Total Saved Courses', val: db_info.courses || 0 },
                    { label: 'Total Roadmaps Generated', val: db_info.roadmaps || 0 },
                    { label: 'Total Assessments', val: db_info.assessments || 0 },
                    { label: 'Total Notifications Audit', val: db_info.notifications || 0 },
                    { label: 'Total Chatbot Sessions', val: db_info.chatbot_sessions || 0 }
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl">
                      <span className="text-[9px] uppercase text-slate-400 font-bold block mb-1">{stat.label}</span>
                      <p className={`text-sm font-black uppercase ${stat.color || 'text-slate-850 dark:text-white'}`}>{stat.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Information Tab */}
            {activeTab === 'sysinfo' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 dark:border-slate-900 pb-3">
                  <h4 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-tight">System Information</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Diagnose library compiles and API key connections.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Versions Table */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                    <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block mb-1">Library & App Versions</span>
                    {[
                      { label: 'Backend Version', val: versions.backend },
                      { label: 'Frontend Version', val: versions.frontend },
                      { label: 'Django Version', val: versions.django },
                      { label: 'MongoEngine Version', val: versions.mongoengine }
                    ].map(v => (
                      <div key={v.label} className="flex justify-between border-b border-slate-200/40 dark:border-slate-800 pb-1 text-[11px]">
                        <span className="text-slate-400">{v.label}</span>
                        <span className="text-slate-800 dark:text-slate-200 font-mono">{v.val}</span>
                      </div>
                    ))}
                  </div>

                  {/* API Key Connection Indicators */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                    <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider block mb-1">API Key Connectivity Status</span>
                    {[
                      { label: 'Gemini AI API', status: api_status.gemini },
                      { label: 'YouTube Search API', status: api_status.youtube },
                      { name: 'JSearch API', status: api_status.jsearch },
                      { name: 'Google OAuth Client', status: api_status.google_oauth }
                    ].map((api, idx) => {
                      const name = api.label || api.name;
                      const connected = api.status === 'connected';
                      return (
                        <div key={idx} className="flex justify-between border-b border-slate-200/40 dark:border-slate-800 pb-1 text-[11px]">
                          <span className="text-slate-400">{name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                            connected ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {connected ? 'CONNECTED' : 'MISSING'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Action buttons (Save Protection!) */}
          {hasChanges && (
            <div className="border-t border-slate-100 dark:border-slate-900 pt-4 flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition text-xs cursor-pointer"
              >
                Cancel Changes
              </button>
              <button
                type="submit"
                onClick={handleSave}
                disabled={saveMutation.isLoading}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-black transition text-xs shadow-md shadow-indigo-650/15 cursor-pointer"
              >
                {saveMutation.isLoading ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
