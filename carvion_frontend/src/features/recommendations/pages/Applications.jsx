import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import Toast from '../../../components/feedback/Toast.jsx';
import { FiActivity, FiMapPin, FiTrash2, FiEdit2, FiAlertCircle } from 'react-icons/fi';

export default function Applications() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };
  const [notes, setNotes] = useState('');
  const [statusVal, setStatusVal] = useState('Applied');

  const { data: apps, isLoading, isError, refetch } = useQuery({
    queryKey: ['jobApplications'],
    queryFn: async () => {
      const response = await apiClient.get('/api/recommendations/applications/');
      return response.data?.data || response.data || [];
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ job_id, status, notes }) => {
      await apiClient.put('/api/recommendations/applications/', { job_id, status, notes });
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData(['jobApplications'], (old) => {
        return old ? old.map(app => app.job_id === variables.job_id ? { ...app, status: variables.status, notes: variables.notes } : app) : [];
      });
      setEditingId(null);
      showToast('Application updated successfully.');
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to update application.', 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (jobId) => {
      await apiClient.delete('/api/recommendations/applications/', { data: { job_id: jobId } });
    },
    onSuccess: (_, deletedJobId) => {
      queryClient.setQueryData(['jobApplications'], (old) => {
        return old ? old.filter(app => app.job_id !== deletedJobId) : [];
      });
      showToast('Application record deleted.');
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to delete application.', 'error');
    }
  });

  const handleEdit = (app) => {
    setEditingId(app.job_id);
    setStatusVal(app.status);
    setNotes(app.notes || '');
  };

  const handleSave = (job_id) => {
    updateMutation.mutate({ job_id, status: statusVal, notes });
  };

  if (isLoading && !apps) {
    return <Loader skeleton={true} variant="grid" />;
  }

  if (isError) {
    return (
      <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-8 rounded-2xl text-center max-w-md mx-auto my-12 shadow-sm">
        <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="font-extrabold text-slate-800 text-lg">Failed to retrieve job applications</h3>
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
          <FiActivity className="text-orange-500" /> Job Application Pipeline
        </h2>
        <p className="text-slate-400 text-xs mt-1">Track and manage statuses, offers, and schedules for your job applications.</p>
      </div>

      <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl p-6 shadow-sm shadow-slate-100/50">
        {apps.length === 0 ? (
          <div className="text-center py-16 text-slate-450 italic text-xs">
            No tracked applications found. Save jobs and track applications from the Job Board!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {apps.map((app) => (
              <div key={app.id} className="py-5 first:pt-0 last:pb-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-850 text-xs">{app.title}</h4>
                    <p className="text-[11px] text-slate-650 font-semibold mt-0.5">{app.company}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <FiMapPin /> {app.location || 'Remote'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {editingId === app.job_id ? (
                      <div className="flex items-center gap-2">
                        <select 
                          value={statusVal} 
                          onChange={(e) => setStatusVal(e.target.value)}
                          className="px-2 py-1 text-xs border border-slate-200 rounded-xl"
                        >
                          <option value="Applied">Applied</option>
                          <option value="Interviewing">Interviewing</option>
                          <option value="Offered">Offered</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                        <button 
                          onClick={() => handleSave(app.job_id)}
                          className="px-2.5 py-1 bg-emerald-500 text-white rounded-xl text-[10px] font-bold"
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${
                          app.status === 'Offered' ? 'bg-emerald-50 text-emerald-600' :
                          app.status === 'Interviewing' ? 'bg-blue-50 text-blue-600' :
                          app.status === 'Rejected' ? 'bg-red-50 text-red-550' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {app.status}
                        </span>
                        <button 
                          onClick={() => handleEdit(app)}
                          className="p-1.5 text-slate-450 hover:bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-xl transition"
                          title="Edit application"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => deleteMutation.mutate(app.job_id)}
                          className="p-1.5 text-red-500 hover:bg-red-55/10 border border-red-100 rounded-xl transition"
                          title="Delete application"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editingId === app.job_id ? (
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add interview notes, follow-up dates, etc."
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                    rows={2}
                  />
                ) : (
                  app.notes && (
                    <p className="text-[10px] text-slate-500 bg-slate-50 p-2.5 border border-slate-150 rounded-xl leading-relaxed">
                      <span className="font-bold">Notes:</span> {app.notes}
                    </p>
                  )
                )}
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
