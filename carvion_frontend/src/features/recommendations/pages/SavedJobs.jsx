import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { refreshJobs } from '../../../utils/queryRefresh/index.js';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import Toast from '../../../components/feedback/Toast.jsx';
import { FiBookmark, FiMapPin, FiBriefcase, FiTrash2, FiExternalLink, FiAlertCircle } from 'react-icons/fi';

export default function SavedJobs() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const { data: savedJobs, isLoading, isError, refetch } = useQuery({
    queryKey: ['savedJobs'],
    queryFn: async () => {
      const response = await apiClient.get('/api/recommendations/jobs/saved/');
      return response.data?.data || response.data || [];
    }
  });

  const unsaveMutation = useMutation({
    mutationFn: async (jobId) => {
      await apiClient.delete('/api/recommendations/jobs/saved/', { data: { job_id: jobId } });
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData(['savedJobs'], (old) => {
        return old ? old.filter(j => j.id !== variables && j.job_id !== variables) : [];
      });
      showToast('Job removed from saved list.');
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to remove job.', 'error');
    }
  });

  const handleUnsave = (jobId) => {
    unsaveMutation.mutate(jobId);
  };

  const applyMutation = useMutation({
    mutationFn: async (job) => {
      await apiClient.post('/api/recommendations/applications/', {
        job_id: job.job_id,
        title: job.title,
        company: job.company,
        location: job.location,
        status: 'Applied'
      });
    },
    onSuccess: () => {
      showToast('Job application tracked successfully!');
      refreshJobs(queryClient);
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to track job application.', 'error');
    }
  });

  if (isLoading && !savedJobs) {
    return <Loader skeleton={true} variant="grid" />;
  }

  if (isError) {
    return (
      <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-8 rounded-2xl text-center max-w-md mx-auto my-12 shadow-sm">
        <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="font-extrabold text-slate-800 text-lg">Failed to retrieve bookmarked jobs</h3>
        <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-left">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <FiBookmark className="text-orange-500" /> Saved Job Positions
        </h2>
        <p className="text-slate-400 text-xs mt-1">Review bookmarks of jobs you are interested in applying for.</p>
      </div>

      <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl p-6 shadow-sm shadow-slate-100/50">
        {savedJobs.length === 0 ? (
          <div className="text-center py-16 text-slate-450 italic text-xs">
            No saved jobs found. Search and bookmark jobs in the Job Board!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {savedJobs.map((job) => (
              <div key={job.id} className="py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 first:pt-0 last:pb-0">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-850 text-xs flex items-center gap-2">
                    <FiBriefcase className="text-slate-400" /> {job.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 font-semibold">{job.company}</p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <FiMapPin /> {job.location || 'Remote'}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  {job.url && (
                    <a 
                      href={job.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 transition"
                    >
                      <FiExternalLink /> View Post
                    </a>
                  )}
                  <button
                    onClick={() => applyMutation.mutate(job)}
                    className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[10px] font-bold transition"
                  >
                    Track App
                  </button>
                  <button 
                    onClick={() => handleUnsave(job.job_id)}
                    className="p-2 text-red-500 hover:bg-red-50 border border-red-100 rounded-xl transition-all"
                    title="Remove Bookmark"
                    disabled={unsaveMutation.isLoading}
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
