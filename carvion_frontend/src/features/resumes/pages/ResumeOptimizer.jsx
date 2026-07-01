import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { refreshResume, refreshDashboard, refreshProfile } from '../../../utils/queryRefresh/index.js';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import ResumeDropzone from '../components/ResumeDropzone.jsx';
import useResumeUpload from '../hooks/useResumeUpload.js';
import Toast from '../../../components/feedback/Toast.jsx';
import { confirm } from '../../../utils/confirm.js';
import { 
  FiCpu, 
  FiCheck, 
  FiCornerDownRight, 
  FiAlertCircle, 
  FiFileText, 
  FiUploadCloud, 
  FiStar, 
  FiCopy, 
  FiDownload, 
  FiEye,
  FiBookOpen,
  FiAward,
  FiActivity,
  FiList,
  FiTrash2,
  FiClock
} from 'react-icons/fi';

export default function ResumeOptimizer() {
  const queryClient = useQueryClient();
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [role, setRole] = useState('Software Engineer');
  const [result, setResult] = useState(null);
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

  // Set default selected resume to primary or first one
  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      const primary = resumes.find(r => r.is_primary);
      setSelectedResumeId(primary ? primary.id : resumes[0].id);
    }
  }, [resumes, selectedResumeId]);

  // 2. Fetch optimization history
  const { 
    data: optHistory = [], 
    isLoading: loadingHistory,
    isError: errorLoadingHistory,
    refetch: refetchHistory
  } = useQuery({
    queryKey: ['optimizeHistory'],
    queryFn: async () => {
      const response = await apiClient.get('/api/resumes/optimize/history/');
      return response.data?.data || [];
    }
  });

  // 3. Optimize Mutation
  const optimizeMutation = useMutation({
    mutationFn: async ({ resumeId, targetRole }) => {
      const response = await apiClient.post('/api/resumes/optimize/', { 
        resume_id: resumeId, 
        target_role: targetRole 
      });
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      setResult(data);
      showToast('Resume optimized successfully.');
      queryClient.setQueryData(['optimizeHistory'], (old) => {
        return old ? [data, ...old] : [data];
      });
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to optimize resume.', 'error');
    }
  });

  // 4. Delete individual optimization item
  const deleteOptHistoryMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/api/resumes/optimize/history/${id}/delete/`);
    },
    onSuccess: (_, deletedId) => {
      showToast('Optimization history deleted successfully.');
      queryClient.setQueryData(['optimizeHistory'], (old) => {
        return old ? old.filter(item => item.id !== deletedId) : [];
      });
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to delete optimization history.', 'error');
    }
  });

  // 5. Delete all optimization items
  const deleteAllOptHistoryMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/api/resumes/optimize/history/delete-all/');
    },
    onSuccess: () => {
      showToast('Optimization history cleared successfully.');
      queryClient.setQueryData(['optimizeHistory'], []);
      setResult(null);
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to clear optimization history.', 'error');
    }
  });

  // 6. Set Selected as Primary Mutation
  const setPrimaryMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.post(`/api/resumes/${id}/set-primary/`);
    },
    onSuccess: (_, variables) => {
      showToast('Primary optimized version updated successfully.');
      queryClient.setQueryData(['resumeList'], (old) => {
        return old ? old.map(r => ({ ...r, is_primary: r.id === variables })) : [];
      });
      refreshDashboard(queryClient);
      refreshProfile(queryClient);
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to update primary optimized version.', 'error');
    }
  });

  // 7. Handle Upload
  const handleUploadSelect = async (file) => {
    try {
      const result = await uploadResume(file);
      queryClient.setQueryData(['resumeList'], (old) => {
        return old ? [result, ...old] : [result];
      });
      refreshDashboard(queryClient);
      refreshProfile(queryClient);
      setSelectedResumeId(result.id);
    } catch (err) {
      showToast(err.message || 'Failed to upload resume.', 'error');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedResumeId) {
      showToast('Please select or upload a resume first.', 'error');
      return;
    }
    optimizeMutation.mutate({ resumeId: selectedResumeId, targetRole: role });
  };

  const handleCopyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Optimized resume copied successfully.');
    } catch (err) {
      showToast('Failed to copy optimized resume.', 'error');
    }
  };

  const handleDownloadText = (text) => {
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `optimized_resume_${role.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Optimized resume downloaded successfully.');
    } catch (err) {
      showToast('Failed to download optimized resume.', 'error');
    }
  };

  const handleOpenHistoryItem = (h) => {
    setRole(h.target_role);
    setResult({
      optimized_text: h.optimized_text,
      ats_improvements: h.ats_improvements,
      formatting_suggestions: h.formatting_suggestions,
      grammar_improvements: h.grammar_improvements,
      skill_recommendations: h.skill_recommendations,
      missing_keywords: h.missing_keywords,
      action_verb_suggestions: h.action_verb_suggestions,
      industry_recommendations: h.industry_recommendations
    });
    setShowHistoryPanel(false);
    showToast('Loaded past optimization audit!');
  };

  const handleDeleteHistoryItem = async (e, id) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Delete Optimization Run',
      message: 'Are you sure you want to delete this optimization run?',
      type: 'delete',
      confirmText: 'Delete'
    });
    if (ok) {
      deleteOptHistoryMutation.mutate(id);
    }
  };

  const selectedResume = resumes.find(r => r.id === selectedResumeId);

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-left">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <FiCpu className="text-orange-500" /> AI Resume Optimizer & Auditor
          </h2>
          <p className="text-slate-400 text-xs mt-1">Select an uploaded resume, review target role criteria, and generate detailed ATS re-writes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Side: Controls & Resume Selectors */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Select Resume Card */}
          <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <FiFileText className="text-orange-500" /> 1. Select Resume
            </h3>

            {resumes.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 italic">No resumes found. Please upload one below.</div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">Choose Active Version</label>
                <select
                  value={selectedResumeId}
                  onChange={(e) => {
                    setSelectedResumeId(e.target.value);
                    setResult(null);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none bg-white text-slate-750 font-bold"
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.is_primary ? '★ Primary' : ''}
                    </option>
                  ))}
                </select>

                {selectedResume && (
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 mt-2">
                    <button
                      onClick={() => setPrimaryMutation.mutate(selectedResumeId)}
                      disabled={selectedResume.is_primary || setPrimaryMutation.isLoading}
                      className="text-[10px] font-bold text-orange-500 hover:text-orange-600 disabled:text-slate-400 flex items-center gap-1 focus:outline-none"
                    >
                      <FiStar className="w-3.5 h-3.5" />
                      <span>{selectedResume.is_primary ? 'Primary Resume' : 'Make Primary'}</span>
                    </button>

                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-655 flex items-center gap-1 focus:outline-none"
                    >
                      <FiEye className="w-3.5 h-3.5" />
                      <span>{showPreview ? 'Hide Preview' : 'Preview Text'}</span>
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

          {/* Upload New Resume Directly */}
          <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm space-y-3">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <FiUploadCloud className="text-orange-500" /> Or Upload New Resume
            </h3>
            <ResumeDropzone onSelect={handleUploadSelect} loading={uploading} />
            {uploadError && <p className="text-[10px] text-red-500 font-medium mt-1">{uploadError}</p>}
          </div>

          {/* Target Role Form */}
          <form onSubmit={handleSubmit} className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <FiActivity className="text-orange-500" /> 2. Run Optimization
            </h3>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">Target Career Role</label>
              <input 
                type="text" 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none font-bold"
                placeholder="e.g. Senior Product Developer"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={optimizeMutation.isLoading || !selectedResumeId}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
            >
              {optimizeMutation.isLoading ? 'Optimizing with Gemini...' : 'Analyze & Optimize Resume'}
            </button>
          </form>

        </div>

        {/* Right Side: Gemini Evaluation Results */}
        <div className="lg:col-span-7 space-y-6">
          {optimizeMutation.isLoading && (
            <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-8 rounded-2xl shadow-sm flex flex-col items-center justify-center min-h-[400px]">
              <Loader skeleton={false} />
              <p className="text-xs text-slate-400 mt-4 font-semibold">Gemini is auditing and rewriting your resume details...</p>
            </div>
          )}

          {!optimizeMutation.isLoading && !result && (
            <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] border-dashed p-8 rounded-2xl text-center flex flex-col items-center justify-center min-h-[400px]">
              <FiCpu className="w-12 h-12 text-slate-355 mb-3 animate-pulse" />
              <h4 className="font-extrabold text-slate-700 text-sm">Ready for Optimization</h4>
              <p className="text-xs text-slate-400 dark:text-[#8A9BB5] mt-1 max-w-sm leading-relaxed">
                Choose one of your saved resumes on the left, enter your target role, and submit. 
                Gemini will scan the text and suggest comprehensive, ATS-optimized suggestions.
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              
              {/* AI Optimized Rewrite */}
              <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">AI Optimized Rewrite</h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleCopyText(result.optimized_text)}
                      className="p-1.5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-lg hover:bg-slate-100 transition text-slate-500 hover:text-slate-750 flex items-center gap-1 text-[10px] font-bold"
                    >
                      <FiCopy /> Copy
                    </button>
                    <button 
                      onClick={() => handleDownloadText(result.optimized_text)}
                      className="p-1.5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-lg hover:bg-slate-100 transition text-slate-500 hover:text-slate-750 flex items-center gap-1 text-[10px] font-bold"
                    >
                      <FiDownload /> Download
                    </button>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl text-xs text-slate-650 font-medium leading-relaxed whitespace-pre-line select-all">
                  {result.optimized_text}
                </div>
              </div>

              {/* Critiques Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* ATS & Formatting */}
                <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-xl space-y-2">
                  <h4 className="font-extrabold text-slate-850 text-xs flex items-center gap-1">
                    <FiActivity className="text-orange-500" /> ATS Improvements
                  </h4>
                  <ul className="space-y-1.5">
                    {result.ats_improvements?.map((s, i) => (
                      <li key={i} className="text-[10px] text-slate-505 flex items-start gap-1 leading-relaxed">
                        <FiCornerDownRight className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-xl space-y-2">
                  <h4 className="font-extrabold text-slate-850 text-xs flex items-center gap-1">
                    <FiFileText className="text-orange-500" /> Formatting Suggestions
                  </h4>
                  <ul className="space-y-1.5">
                    {result.formatting_suggestions?.map((s, i) => (
                      <li key={i} className="text-[10px] text-slate-505 flex items-start gap-1 leading-relaxed">
                        <FiCornerDownRight className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Grammar & Skills */}
                <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-xl space-y-2">
                  <h4 className="font-extrabold text-slate-850 text-xs flex items-center gap-1">
                    <FiBookOpen className="text-orange-500" /> Grammar Improvements
                  </h4>
                  <ul className="space-y-1.5">
                    {result.grammar_improvements?.map((s, i) => (
                      <li key={i} className="text-[10px] text-slate-505 flex items-start gap-1 leading-relaxed">
                        <FiCornerDownRight className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-xl space-y-2">
                  <h4 className="font-extrabold text-slate-850 text-xs flex items-center gap-1">
                    <FiAward className="text-orange-500" /> Skill Recommendations
                  </h4>
                  <ul className="space-y-1.5">
                    {result.skill_recommendations?.map((s, i) => (
                      <li key={i} className="text-[10px] text-slate-505 flex items-start gap-1 leading-relaxed">
                        <FiCornerDownRight className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Keywords & Action Verbs */}
                <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-xl space-y-2">
                  <h4 className="font-extrabold text-slate-850 text-xs flex items-center gap-1">
                    <FiAward className="text-orange-500" /> Missing Keywords
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {result.missing_keywords?.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-red-50 text-red-650 text-[9px] rounded font-bold border border-red-100">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-xl space-y-2">
                  <h4 className="font-extrabold text-slate-850 text-xs flex items-center gap-1">
                    <FiActivity className="text-orange-500" /> Action Verbs
                  </h4>
                  <ul className="space-y-1.5">
                    {result.action_verb_suggestions?.map((s, i) => (
                      <li key={i} className="text-[10px] text-slate-505 flex items-start gap-1 leading-relaxed">
                        <FiCornerDownRight className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Industry Recommendation */}
                <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-xl space-y-2 md:col-span-2">
                  <h4 className="font-extrabold text-slate-850 text-xs flex items-center gap-1">
                    <FiCpu className="text-orange-500" /> Industry Recommendations
                  </h4>
                  <ul className="space-y-1.5">
                    {result.industry_recommendations?.map((s, i) => (
                      <li key={i} className="text-[10px] text-slate-505 flex items-start gap-1 leading-relaxed">
                        <FiCornerDownRight className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
              
            </div>
          )}
        </div>
      </div>

      {/* Permanent History Panel */}
      <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <FiClock className="text-orange-500" /> Optimization History Logs
          </h3>
          <button
            disabled={optHistory.length === 0 || deleteAllOptHistoryMutation.isLoading}
            onClick={async () => {
              const ok = await confirm({
                title: 'Delete All History',
                message: 'Are you sure you want to permanently delete all optimization history items for the current user? This action cannot be undone.',
                type: 'delete',
                confirmText: 'Delete All'
              });
              if (ok) {
                deleteAllOptHistoryMutation.mutate();
              }
            }}
            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 disabled:bg-slate-100 text-red-650 disabled:text-slate-400 text-xs font-bold rounded-xl transition flex items-center gap-1 focus:outline-none"
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
        {!loadingHistory && !errorLoadingHistory && optHistory.length === 0 && (
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
        {!loadingHistory && !errorLoadingHistory && optHistory.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
            {optHistory.map((h) => {
              const preview = h.optimized_text ? h.optimized_text.slice(0, 120) + (h.optimized_text.length > 120 ? '...' : '') : 'No description preview.';
              return (
                <div
                  key={h.id}
                  className="p-4 bg-slate-50 border border-slate-250 hover:border-orange-300 rounded-xl transition text-left flex justify-between items-start gap-4"
                >
                  <div className="space-y-1.5 overflow-hidden flex-1">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-xs font-bold text-slate-800 truncate">Resume Optimization Audit</h4>
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
                    <p className="text-[10px] text-slate-450 italic leading-relaxed mt-1 whitespace-pre-line line-clamp-3">
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
