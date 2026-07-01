import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { refreshResume, refreshDashboard, refreshProfile } from '../../../utils/queryRefresh/index.js';
import { 
  FiClock, 
  FiFileText, 
  FiDownload, 
  FiTrash2, 
  FiStar,
  FiRefreshCw
} from 'react-icons/fi';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import Toast from '../../../components/feedback/Toast.jsx';
import { confirm } from '../../../utils/confirm.js';

export default function ResumeVersions() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  // Fetch resumes using same mapping as ResumeWorkspace
  const { data: resumes, isLoading: loadingResumes, refetch: refetchResumes } = useQuery({
    queryKey: ['resumeList'],
    queryFn: async () => {
      const response = await apiClient.get('/api/resumes/');
      return response.data?.data || response.data || [];
    }
  });

  // Set as Primary Mutation
  const setPrimaryMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.post(`/api/resumes/${id}/set-primary/`);
    },
    onSuccess: (_, variables) => {
      showToast('Primary resume updated successfully!');
      queryClient.setQueryData(['resumeList'], (old) => {
        return old ? old.map(r => ({ ...r, is_primary: r.id === variables })) : [];
      });
      refreshDashboard(queryClient);
      refreshProfile(queryClient);
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to update primary resume.', 'error');
    }
  });

  // Delete Resume Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/api/resumes/${id}/`);
    },
    onSuccess: (_, deletedId) => {
      showToast('Resume deleted successfully!');
      queryClient.setQueryData(['resumeList'], (old) => {
        return old ? old.filter(r => r.id !== deletedId) : [];
      });
      refreshDashboard(queryClient);
      refreshProfile(queryClient);
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to delete resume.', 'error');
    }
  });

  const handleSetPrimary = (id) => {
    setPrimaryMutation.mutate(id);
  };

  const handleDelete = async (id) => {
    const resume = resumes?.find(r => r.id === id);
    await confirm({
      title: 'Delete Resume',
      message: 'Are you sure you want to permanently delete this resume version?',
      type: 'delete',
      confirmText: 'Delete Resume',
      details: resume ? {
        'Resume Name': resume.name || resume.file_name || 'Untitled',
        'ATS Score': `${resume.ats_score}%`,
        'Uploaded': resume.created_at ? new Date(resume.created_at).toLocaleDateString() : 'N/A'
      } : null,
      onConfirm: async () => {
        await deleteMutation.mutateAsync(id);
      }
    });
  };

  const handleDownload = (id) => {
    window.open(`http://localhost:8000/api/resumes/${id}/render-pdf/`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-[#F1F5F9] flex items-center gap-2">
            <FiClock className="text-orange-500" /> Resume History
          </h2>
          <p className="text-slate-400 dark:text-[#8A9BB5] text-xs mt-1">
            View, download, and manage your historical resume versions.
          </p>
        </div>
        <button
          onClick={() => refetchResumes()}
          className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Refresh History"
        >
          <FiRefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loadingResumes ? (
        <div className="py-12"><Loader skeleton={true} variant="list" /></div>
      ) : !resumes || resumes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto w-16 h-16 bg-orange-50 dark:bg-orange-950/20 rounded-full flex items-center justify-center text-orange-500">
            <FiFileText className="w-8 h-8" />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">No historical versions found</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed font-semibold">
              You haven't uploaded or built any resumes yet. Go to the Workspace to get started!
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Resume Details</th>
                  <th className="py-3.5 px-5">ATS Score</th>
                  <th className="py-3.5 px-5">Created Date</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {resumes.map((resume) => (
                  <tr key={resume.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                    {/* Resume Details */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-50 dark:bg-orange-950/20 text-orange-500 rounded-lg">
                          <FiFileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-white">{resume.name}</h4>
                          <span className="text-[10px] text-slate-400 dark:text-[#6B7FA3]">
                            {resume.file_name ? `File: ${resume.file_name}` : 'Built via Form'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* ATS Score */}
                    <td className="py-4 px-5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                        resume.ats_score >= 80 
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400'
                      }`}>
                        {resume.ats_score}%
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="py-4 px-5 text-slate-500 dark:text-slate-400 font-medium">
                      {resume.created_at ? new Date(resume.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }) : 'N/A'}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5">
                      {resume.is_primary ? (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 px-2 py-0.5 rounded-lg inline-flex items-center gap-1">
                          <FiStar className="fill-emerald-500 w-3 h-3" /> Primary
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetPrimary(resume.id)}
                          className="text-[9px] font-bold text-slate-500 hover:text-orange-500 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg transition-colors"
                        >
                          Set Primary
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownload(resume.id)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-sm transition-all"
                          title="Download PDF"
                        >
                          <FiDownload className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(resume.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-lg hover:shadow-sm transition-all"
                          title="Delete Resume"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
