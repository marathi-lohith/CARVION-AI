import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { refreshResume, refreshDashboard } from '../../../utils/queryRefresh/index.js';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import ResumeDropzone from '../components/ResumeDropzone.jsx';
import useResumeUpload from '../hooks/useResumeUpload.js';
import Toast from '../../../components/feedback/Toast.jsx';
import { confirm } from '../../../utils/confirm.js';
import { 
  FiFileText, 
  FiAlertCircle, 
  FiUploadCloud, 
  FiStar, 
  FiEye, 
  FiCopy, 
  FiDownload, 
  FiRefreshCw, 
  FiList, 
  FiCornerDownRight,
  FiClock,
  FiTrash2
} from 'react-icons/fi';

export default function CoverLetterGenerator() {
  const queryClient = useQueryClient();
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('Software Engineer');
  const [coverLetter, setCoverLetter] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
  const { uploadResume, uploading, error: uploadError } = useResumeUpload();

  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  // 1. Fetch resumes list
  const { data: resumes = [], isLoading: loadingResumes } = useQuery({
    queryKey: ['resumeList'],
    queryFn: async () => {
      const response = await apiClient.get('/api/resumes/');
      return response.data?.data || [];
    }
  });

  // Set default active resume version to the primary or first one
  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      const primary = resumes.find(r => r.is_primary);
      setSelectedResumeId(primary ? primary.id : resumes[0].id);
    }
  }, [resumes, selectedResumeId]);

  // 2. Fetch cover letter history
  const { 
    data: clHistory = [], 
    isLoading: loadingHistory,
    isError: errorLoadingHistory,
    refetch: refetchHistory
  } = useQuery({
    queryKey: ['coverLetterHistory'],
    queryFn: async () => {
      const response = await apiClient.get('/api/resumes/cover-letter/history/');
      return response.data?.data || [];
    }
  });

  // 3. Generate Mutation
  const generateMutation = useMutation({
    mutationFn: async ({ resumeId, job_description, company_name, target_role }) => {
      const response = await apiClient.post('/api/resumes/cover-letter/', {
        resume_id: resumeId,
        job_description,
        company_name,
        target_role
      });
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      setCoverLetter(data?.cover_letter || '');
      showToast('Cover letter compiled successfully!');
      queryClient.setQueryData(['coverLetterHistory'], (old) => {
        return old ? [data, ...old] : [data];
      });
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to generate cover letter.', 'error');
    }
  });

  // 4. Delete individual cover letter history item
  const deleteClHistoryMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/api/resumes/cover-letter/history/${id}/delete/`);
    },
    onSuccess: (_, deletedId) => {
      showToast('Cover letter deleted from history.');
      queryClient.setQueryData(['coverLetterHistory'], (old) => {
        return old ? old.filter(item => item.id !== deletedId) : [];
      });
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to delete history item.', 'error');
    }
  });

  // 5. Delete all cover letter history items
  const deleteAllClHistoryMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/api/resumes/cover-letter/history/delete-all/');
    },
    onSuccess: () => {
      showToast('All cover letter history wiped.');
      queryClient.setQueryData(['coverLetterHistory'], []);
      setCoverLetter('');
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to wipe history.', 'error');
    }
  });

  // 6. Handle Resume Upload
  const handleUploadSelect = async (file) => {
    try {
      const result = await uploadResume(file);
      showToast('Resume uploaded successfully!');
      queryClient.setQueryData(['resumeList'], (old) => {
        return old ? [result, ...old] : [result];
      });
      refreshDashboard(queryClient);
      setSelectedResumeId(result.id);
    } catch (err) {
      showToast(err.message || 'Upload failed.', 'error');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedResumeId) {
      showToast('Please select or upload a resume.', 'error');
      return;
    }
    generateMutation.mutate({
      resumeId: selectedResumeId,
      job_description: jobDesc,
      company_name: company,
      target_role: role
    });
  };

  const handleCopy = () => {
    if (!coverLetter) return;
    navigator.clipboard.writeText(coverLetter);
    showToast('Copied cover letter text!');
  };

  const handleDownload = () => {
    if (!coverLetter) return;
    const blob = new Blob([coverLetter], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cover_letter_${company.replace(/\s+/g, '_')}_${role.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Cover letter text file downloaded!');
  };

  const handleRegenerate = () => {
    if (!selectedResumeId) return;
    generateMutation.mutate({
      resumeId: selectedResumeId,
      job_description: jobDesc,
      company_name: company,
      target_role: role
    });
  };

  const handleOpenHistoryItem = (h) => {
    setCompany(h.company_name);
    setRole(h.target_role);
    setJobDesc(h.job_description || '');
    setCoverLetter(h.cover_letter_text);
    setShowHistoryPanel(false);
    showToast('Loaded past cover letter!');
  };

  const handleDeleteHistoryItem = async (e, id) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Delete Cover Letter',
      message: 'Wipe this cover letter from history?',
      type: 'delete',
      confirmText: 'Delete'
    });
    if (ok) {
      deleteClHistoryMutation.mutate(id);
    }
  };

  const selectedResume = resumes.find(r => r.id === selectedResumeId);

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-left">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <FiFileText className="text-orange-500" /> Professional Cover Letter Generator
          </h2>
          <p className="text-slate-400 text-xs mt-1">Compose highly tailored, contextual cover letters leveraging your resume details.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Side: Setup Forms */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Select Resume Section */}
          <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <FiFileText className="text-orange-500" /> 1. Select Active Resume
            </h3>

            {resumes.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 italic">No resumes found. Please upload one below.</div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">Choose Resume Version</label>
                <select
                  value={selectedResumeId}
                  onChange={(e) => {
                    setSelectedResumeId(e.target.value);
                    setCoverLetter('');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none bg-white text-slate-755 font-bold"
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.is_primary ? '★ Primary' : ''}
                    </option>
                  ))}
                </select>

                {selectedResume && (
                  <div className="pt-2 flex items-center justify-end border-t border-slate-100 mt-2">
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-650 flex items-center gap-1 focus:outline-none"
                    >
                      <FiEye className="w-3.5 h-3.5" />
                      <span>{showPreview ? 'Hide Preview' : 'Preview Resume Text'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Collapsible preview box */}
            {showPreview && selectedResume && (
              <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-3 rounded-xl max-h-[160px] overflow-y-auto text-[10px] text-slate-500 dark:text-[#8A9BB5] font-medium leading-relaxed whitespace-pre-wrap">
                {selectedResume.extracted_text || 'No text extracted for this resume version.'}
              </div>
            )}
          </div>

          {/* Upload Resume directly */}
          <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm space-y-3">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <FiUploadCloud className="text-orange-500" /> Or Upload New Resume
            </h3>
            <ResumeDropzone onSelect={handleUploadSelect} loading={uploading} />
            {uploadError && <p className="text-[10px] text-red-500 font-medium mt-1">{uploadError}</p>}
          </div>

          {/* Job and Company specs */}
          <form onSubmit={handleSubmit} className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <FiFileText className="text-orange-500" /> 2. Letter Details
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">Company Name</label>
                <input 
                  type="text" 
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 font-bold"
                  placeholder="e.g. Stripe"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">Target Role</label>
                <input 
                  type="text" 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 font-bold"
                  placeholder="e.g. Back-end Developer"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">Job Description (Optional)</label>
              <textarea 
                value={jobDesc}
                onChange={(e) => setJobDesc(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 font-medium"
                placeholder="Paste the job requirements to tailor alignment..."
                rows={4}
              />
            </div>

            <button 
              type="submit"
              disabled={generateMutation.isLoading || !selectedResumeId}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
            >
              {generateMutation.isLoading ? 'Generating Letter...' : 'Compile Cover Letter'}
            </button>
          </form>

        </div>

        {/* Right Side: Generated Cover Letter */}
        <div className="lg:col-span-7 space-y-6">
          {generateMutation.isLoading && (
            <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-8 rounded-2xl shadow-sm flex flex-col items-center justify-center min-h-[400px]">
              <Loader skeleton={false} />
              <p className="text-xs text-slate-400 mt-4 font-semibold">Gemini is drafting your personalized cover letter...</p>
            </div>
          )}

          {!generateMutation.isLoading && !coverLetter && (
            <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] border-dashed p-8 rounded-2xl text-center flex flex-col items-center justify-center min-h-[400px]">
              <FiFileText className="w-12 h-12 text-slate-355 mb-3 animate-pulse" />
              <h4 className="font-extrabold text-slate-700 text-sm">Ready for Compilation</h4>
              <p className="text-xs text-slate-400 dark:text-[#8A9BB5] mt-1 max-w-sm leading-relaxed">
                Choose a saved resume version on the left, fill out the company/role targets, and click submit. 
                Gemini will compose a tailored cover letter demonstrating direct alignment with the job goals.
              </p>
            </div>
          )}

          {coverLetter && (
            <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Compiled Cover Letter</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleCopy}
                    className="p-1.5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-lg hover:bg-slate-100 transition text-slate-555 hover:text-slate-750 flex items-center gap-1 text-[10px] font-bold"
                  >
                    <FiCopy /> Copy Text
                  </button>
                  <button 
                    onClick={handleDownload}
                    className="p-1.5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-lg hover:bg-slate-100 transition text-slate-555 hover:text-slate-755 flex items-center gap-1 text-[10px] font-bold"
                  >
                    <FiDownload /> Download
                  </button>
                  <button 
                    onClick={handleRegenerate}
                    disabled={generateMutation.isLoading}
                    className="p-1.5 bg-orange-50 border border-orange-100 rounded-lg hover:bg-orange-100/50 transition text-orange-500 hover:text-orange-655 flex items-center gap-1 text-[10px] font-bold"
                    title="Regenerate Letter"
                  >
                    <FiRefreshCw className={generateMutation.isLoading ? 'animate-spin' : ''} /> Regenerate
                  </button>
                </div>
              </div>
              
              <div className="text-xs text-slate-650 font-medium leading-relaxed whitespace-pre-line select-all min-h-[360px] bg-slate-50/50 p-5 rounded-xl border border-slate-100">
                {coverLetter}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permanent History Panel */}
      <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <FiClock className="text-orange-500" /> Cover Letter History Logs
          </h3>
          <button
            disabled={clHistory.length === 0 || deleteAllClHistoryMutation.isLoading}
            onClick={async () => {
              const ok = await confirm({
                title: 'Delete All History',
                message: 'Are you sure you want to permanently delete all cover letters for the current user? This action cannot be undone.',
                type: 'delete',
                confirmText: 'Delete All'
              });
              if (ok) {
                deleteAllClHistoryMutation.mutate();
              }
            }}
            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 disabled:bg-slate-100 text-red-655 disabled:text-slate-400 text-xs font-bold rounded-xl transition flex items-center gap-1 focus:outline-none"
          >
            <FiTrash2 className="w-3.5 h-3.5" /> Delete All History
          </button>
        </div>

        {/* Loading state */}
        {loadingHistory && (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="p-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-xl space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                <div className="h-3 bg-slate-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loadingHistory && errorLoadingHistory && (
          <div className="text-center py-6 space-y-3 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-xl">
            <FiAlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-xs font-bold text-slate-700">Unable to load history.</p>
            <button
              onClick={() => refetchHistory()}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition focus:outline-none"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loadingHistory && !errorLoadingHistory && clHistory.length === 0 && (
          <div className="text-center py-8 flex flex-col items-center justify-center space-y-2 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] border-dashed rounded-xl">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
              <FiClock className="w-6 h-6 text-slate-400" />
            </div>
            <h4 className="font-extrabold text-slate-700 text-sm">No history available.</h4>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Generate your first result to see your history here.
            </p>
          </div>
        )}

        {/* History items list */}
        {!loadingHistory && !errorLoadingHistory && clHistory.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
            {clHistory.map((h) => {
              const preview = h.cover_letter_text ? h.cover_letter_text.slice(0, 120) + (h.cover_letter_text.length > 120 ? '...' : '') : 'No description preview.';
              return (
                <div
                  key={h.id}
                  className="p-4 bg-slate-50 border border-slate-255 hover:border-orange-300 rounded-xl transition text-left flex justify-between items-start gap-4"
                >
                  <div className="space-y-1.5 overflow-hidden flex-1">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-xs font-bold text-slate-800 truncate">Cover Letter for {h.company_name}</h4>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 ${
                        h.is_fallback ? 'bg-amber-105 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-250'
                      }`}>
                        {h.is_fallback ? 'Completed (Fallback)' : 'Completed (Gemini AI)'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold space-y-0.5">
                      <p><span className="text-slate-400">Target Role:</span> {h.target_role}</p>
                      <p><span className="text-slate-400">Generated:</span> {new Date(h.created_at).toLocaleString()}</p>
                    </div>
                    <p className="text-[10px] text-slate-455 italic leading-relaxed mt-1 whitespace-pre-line line-clamp-3">
                      {preview}
                    </p>
                    <div className="pt-2 flex items-center gap-3 border-t border-slate-200 mt-2">
                      <button
                        onClick={() => handleOpenHistoryItem(h)}
                        className="text-[10px] font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 focus:outline-none"
                      >
                        👁 View
                      </button>
                      <button
                        onClick={(e) => handleDeleteHistoryItem(e, h.id)}
                        className="text-[10px] font-bold text-red-500 hover:text-red-655 flex items-center gap-1 focus:outline-none"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
