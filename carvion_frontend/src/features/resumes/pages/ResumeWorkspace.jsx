import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { refreshResume, refreshDashboard, refreshProfile } from '../../../utils/queryRefresh/index.js';
import { 
  FiUpload, 
  FiEdit, 
  FiFileText, 
  FiDownload, 
  FiTrash2, 
  FiCheckCircle, 
  FiStar,
  FiUser,
  FiBriefcase,
  FiBookOpen,
  FiCheckSquare,
  FiAlertTriangle,
  FiTarget,
  FiGrid,
  FiEye
} from 'react-icons/fi';
import ResumeDropzone from '../components/ResumeDropzone.jsx';
import BuilderForm from '../components/BuilderForm.jsx';
import useResumeUpload from '../hooks/useResumeUpload.js';
import apiClient from '../../../core/api/apiClient.js';
import Button from '../../../components/common/Button.jsx';
import Toast from '../../../components/feedback/Toast.jsx';
import Loader from '../../../components/common/Loader.jsx';
import { ROUTES } from '../../../config/constants.js';
import { confirm } from '../../../utils/confirm.js';

export default function ResumeWorkspace() {
  const [mode, setMode] = useState('upload'); // 'upload' or 'build'
  const { uploadResume, uploading, progressText, error: uploadError } = useResumeUpload();
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const queryClient = useQueryClient();

  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  // Fetch resumes
  const { data: resumes, isLoading: loadingResumes, refetch: refetchResumes } = useQuery({
    queryKey: ['resumeList'],
    queryFn: async () => {
      const response = await apiClient.get('/api/resumes/');
      return response.data?.data || response.data || [];
    }
  });

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await apiClient.get('/api/profile/');
      return response.data?.data || response.data;
    }
  });

  // Fetch skill gap data (same queryKey as dashboard, synced)
  const { data: skillGapData } = useQuery({
    queryKey: ['skillGapAnalysis'],
    queryFn: async () => {
      const response = await apiClient.get('/api/profile/skill-gap/');
      return response.data?.data || response.data;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
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
      // Update cache immediately to avoid DB commit race conditions
      queryClient.setQueryData(['resumeList'], (old) => {
        return old ? old.filter(r => r.id !== deletedId) : [];
      });
      refreshDashboard(queryClient);
      refreshProfile(queryClient);
      if (selectedResumeId === deletedId) {
        setSelectedResumeId(null);
      }
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to delete resume.', 'error');
    }
  });

  const handleUploadSelect = async (file) => {
    try {
      const result = await uploadResume(file);
      showToast('Resume uploaded and audited successfully!');
      
      // Update cache immediately to avoid DB commit race conditions
      queryClient.setQueryData(['resumeList'], (old) => {
        return old ? [result, ...old] : [result];
      });

      // Update skillGapAnalysis query data immediately to prevent the UI from looking outdated or loading
      queryClient.setQueryData(['skillGapAnalysis'], (old) => {
        return {
          ...old,
          target_role: result.structured_data?.target_role || result.analysis_report?.target_role || old?.target_role || '',
          resume_skills: result.structured_data?.technical_skills || [],
          missing_skills: result.analysis_report?.missing_keywords || []
        };
      });

      // Invalidate queries in the background without blocking the UI
      refreshDashboard(queryClient);
      refreshProfile(queryClient);
      
      setSelectedResumeId(result.id);
    } catch (err) {
      showToast(err.message || 'Failed to upload and parse resume file.', 'error');
    }
  };

  // Build resume mutation
  const { mutate: buildResume, isLoading: building } = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/api/resumes/build/', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (result) => {
      showToast('Resume compiled and scored successfully!');
      // Update cache immediately to avoid DB commit race conditions
      queryClient.setQueryData(['resumeList'], (old) => {
        return old ? [result, ...old] : [result];
      });
      refreshDashboard(queryClient);
      setSelectedResumeId(result.id);
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Failed to compile and score builder details.';
      showToast(msg, 'error');
    },
  });

  const activeResume = resumes?.find(r => r.id === selectedResumeId) || resumes?.find(r => r.is_primary) || resumes?.[0];

  const handleSetPrimary = (id, e) => {
    e.stopPropagation();
    setPrimaryMutation.mutate(id);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    const resume = resumes?.find(r => r.id === id);
    await confirm({
      title: 'Delete Resume',
      message: 'Are you sure you want to permanently delete this resume?',
      type: 'delete',
      confirmText: 'Delete Resume',
      details: resume ? {
        'Resume Name': resume.name || resume.file_name || 'Untitled',
        'Version': resume.version ? `v${resume.version}` : 'v1.0',
        'Uploaded': resume.created_at ? new Date(resume.created_at).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }) : 'N/A'
      } : null,
      onConfirm: async () => {
        await deleteMutation.mutateAsync(id);
      }
    });
  };

  const handleDownload = (id, e) => {
    e.stopPropagation();
    window.open(`http://localhost:8000/api/resumes/${id}/render-pdf/`, '_blank');
  };

  const handleViewOriginal = async (e) => {
    e.stopPropagation();
    if (!activeResume) return;
    const url = `/api/resumes/${activeResume.id}/render-pdf/?original_only=true&inline=true`;
    try {
      const response = await apiClient.get(url, { responseType: 'blob' });
      
      const fileType = activeResume.file_name?.toLowerCase();
      if (fileType && fileType.endsWith('.pdf')) {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } else {
        const blob = new Blob([response.data], { type: response.headers['content-type'] });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = activeResume.file_name || 'resume';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      showToast('Original resume file could not be found.', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">Resume Workspace</h2>
          <p className="text-sm text-slate-400 dark:text-[#8A9BB5] mt-1 font-medium">
            Build a profile from scratch or parse an existing document file
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form/Dropzone and List of Resumes */}
        <div className="lg:col-span-1 space-y-6">
          {/* Mode Selectors */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-full gap-1 border border-slate-200/50">
            <button
              onClick={() => setMode('upload')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                mode === 'upload'
                  ? 'bg-white shadow-sm border border-slate-200/40 text-orange-500 scale-[1.01]'
                  : 'text-slate-555 hover:text-slate-800'
              }`}
            >
              <FiUpload className="w-4.5 h-4.5" />
              <span>Upload File</span>
            </button>
            <button
              onClick={() => setMode('build')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                mode === 'build'
                  ? 'bg-white shadow-sm border border-slate-200/40 text-orange-500 scale-[1.01]'
                  : 'text-slate-555 hover:text-slate-800'
              }`}
            >
              <FiEdit className="w-4.5 h-4.5" />
              <span>Form Builder</span>
            </button>
          </div>

          {/* Action Input Area */}
          <div className="bg-[#fafbfd] p-5 rounded-2xl border border-slate-150 shadow-sm">
            {mode === 'upload' ? (
              <div>
                <ResumeDropzone
                  onFileSelect={handleUploadSelect}
                  loading={uploading}
                  progressText={progressText}
                />
                {uploadError && (
                  <p className="text-xs text-red-500 font-medium text-center mt-3">{uploadError}</p>
                )}
              </div>
            ) : (
              <BuilderForm
                onSubmit={buildResume}
                loading={building}
              />
            )}
          </div>

          {/* Resumes List */}
          <div className="bg-[#fafbfd] p-5 rounded-2xl border border-slate-150 shadow-sm space-y-3">
            <h3 className="font-extrabold text-sm text-slate-800">Your Resumes</h3>
            
            {loadingResumes && !resumes ? (
              <div className="py-8"><Loader skeleton={true} variant="list" /></div>
            ) : !resumes || resumes.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No resumes found. Upload or build one above!</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {resumes.map((resume) => {
                  const isSelected = activeResume?.id === resume.id;
                  return (
                    <div
                      key={resume.id}
                      onClick={() => setSelectedResumeId(resume.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 text-left ${
                        isSelected 
                          ? 'border-orange-500/50 bg-orange-500/5 shadow-sm'
                          : 'border-slate-200 hover:border-slate-350 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="truncate pr-2">
                          <h4 className="font-bold text-xs text-slate-800 truncate">{resume.name}</h4>
                          <span className="text-[9px] text-slate-400 dark:text-[#6B7FA3] font-medium">
                            {resume.file_name ? `File: ${resume.file_name}` : 'Built via Form'}
                          </span>
                        </div>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                          resume.ats_score >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                          {resume.ats_score}%
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/50">
                        <div className="flex items-center gap-1">
                          {resume.is_primary ? (
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100/50 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              <FiStar className="fill-emerald-500" /> Primary
                            </span>
                          ) : (
                            <button
                              onClick={(e) => handleSetPrimary(resume.id, e)}
                              className="text-[9px] font-bold text-slate-500 hover:text-orange-500 border border-slate-200 bg-white px-1.5 py-0.5 rounded-md transition-colors"
                              title="Set as Primary"
                            >
                              Set Primary
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleDownload(resume.id, e)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-lg hover:shadow-sm transition-all"
                            title="Download PDF"
                          >
                            <FiDownload className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(resume.id, e)}
                            className="p-1.5 text-red-500 hover:bg-red-50 border border-red-100 rounded-lg hover:shadow-sm transition-all"
                            title="Delete"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detailed Workspace Cards */}
        <div className="lg:col-span-2 space-y-6">
          {!activeResume ? (
            <div className="bg-slate-50/50 rounded-2xl border border-slate-200 border-dashed p-12 text-center flex flex-col items-center justify-center space-y-3 h-80">
              <FiFileText className="w-12 h-12 text-slate-300" />
              <h3 className="font-extrabold text-slate-800 text-base">Workspace Preview</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Upload a resume document or build one via form to view extracted sections, ATS audit cards, and match scores.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header card */}
              <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-800 text-lg">{activeResume.name}</h3>
                    {activeResume.is_primary && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <FiStar className="fill-emerald-500" /> Primary
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-[#8A9BB5] mt-1 font-medium">
                    Created on {new Date(activeResume.created_at).toLocaleDateString()} • {activeResume.file_name ? 'PDF Upload' : 'Builder Template'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {activeResume.file_name && (
                    <Button 
                      variant="secondary"
                      onClick={(e) => handleViewOriginal(e)}
                      className="flex items-center space-x-1.5 text-xs px-3.5 py-2 font-bold"
                    >
                      <FiEye className="w-4 h-4" />
                      <span>View Original</span>
                    </Button>
                  )}
                  <Button 
                    variant="primary"
                    onClick={(e) => handleDownload(activeResume.id, e)}
                    className="flex items-center space-x-1.5 text-xs px-3.5 py-2 font-bold"
                  >
                    <FiDownload className="w-4 h-4 text-white" />
                    <span>Download PDF</span>
                  </Button>
                </div>
              </div>

              {/* Dynamic cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. ATS Score Card */}
                <div className="bg-[#fafbfd] p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                  <h4 className="font-extrabold text-xs text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">ATS Score Card</h4>
                  <div className="flex items-center space-x-4">
                    <div className="relative w-20 h-20 flex items-center justify-center">
                      {/* Circular meter */}
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-100"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className={activeResume.ats_score >= 80 ? 'text-emerald-500' : 'text-orange-500'}
                          strokeWidth="3.5"
                          strokeDasharray={`${activeResume.ats_score}, 100`}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute font-black text-slate-800 text-base">{activeResume.ats_score}%</div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">Audit Benchmark Rating</p>
                      <p className="text-[11px] text-slate-400 dark:text-[#8A9BB5] mt-1">
                        {activeResume.ats_score >= 80 
                          ? 'Excellent quality score. Optimized for screening gateways.'
                          : 'Needs improvement. Incorporate missing keywords.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Target Role Card */}
                <div className="bg-[#fafbfd] p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
                  <h4 className="font-extrabold text-xs text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider flex items-center gap-1.5"><FiTarget className="text-orange-500" /> Target Role</h4>
                  <div className="text-xs">
                    {!profile?.target_role ? (
                      <p className="text-slate-650 font-medium italic mt-2">Target role not selected.</p>
                    ) : (
                      <>
                        <p className="font-bold text-slate-700">Target Role:</p>
                        <p className="text-slate-650 font-medium mt-0.5 mb-2.5">{profile.target_role}</p>
                        
                        <p className="font-bold text-slate-700">Experience Level:</p>
                        <p className="text-slate-650 font-medium mt-0.5">{profile.experience_level || 'Not specified'}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* 3. Resume Status */}
                <div className="bg-[#fafbfd] p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
                  <h4 className="font-extrabold text-xs text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">Resume Status</h4>
                  <div className="text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">Primary Active State:</span>
                      <span className={`font-bold ${activeResume.is_primary ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {activeResume.is_primary ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">Total Downloads:</span>
                      <span className="text-slate-700 font-bold">{activeResume.downloads_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">Score Benchmark Status:</span>
                      <span className={`font-bold ${activeResume.ats_score >= 80 ? 'text-emerald-500' : 'text-orange-500'}`}>
                        {activeResume.ats_score >= 80 ? 'Pass' : 'Warning'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Resume Summary */}
                <div className="bg-[#fafbfd] p-5 rounded-2xl border border-slate-150 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <FiUser className="w-16 h-16 text-slate-800" />
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider flex items-center gap-1.5"><FiUser /> Resume Summary</h4>
                  <div className="mt-3 text-sm text-slate-700 leading-relaxed max-w-2xl">
                    {activeResume.structured_data?.profile?.bio || 'No professional summary found.'}
                  </div>
                </div>
              </div>

              {/* Extracted Skills & Missing Skills */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 5. Extracted Skills Card */}
                <div className="bg-[#fafbfd] p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-xs text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider flex items-center gap-1.5"><FiCheckSquare className="text-emerald-500" /> Technical Skills</h4>
                  {activeResume.structured_data?.technical_skills && activeResume.structured_data.technical_skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {activeResume.structured_data.technical_skills.map((skill, index) => (
                        <span key={index} className="px-2 py-0.5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-md text-[10px] font-bold text-slate-600">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-450 italic">No structured skills found.</p>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <h4 className="font-extrabold text-xs text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider flex items-center gap-1.5 mb-3"><FiCheckSquare className="text-emerald-500" /> Soft Skills</h4>
                    {activeResume.structured_data?.soft_skills && activeResume.structured_data.soft_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {activeResume.structured_data.soft_skills.map((skill, index) => (
                          <span key={index} className="px-2 py-0.5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-md text-[10px] font-bold text-slate-600">
                            {typeof skill === 'object' && skill !== null ? skill.name : skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-450 italic">No soft skills found.</p>
                    )}
                  </div>
                </div>

                {/* 6. Missing Skills Card */}
                <div className="bg-[#fafbfd] p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-xs text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider flex items-center gap-1.5"><FiAlertTriangle className="text-orange-500" /> Missing Skills</h4>
                  {skillGapData?.missing_skills && skillGapData.missing_skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {skillGapData.missing_skills.map((skill, index) => (
                        <span key={index} className="px-2 py-0.5 bg-orange-50 border border-orange-100 rounded-md text-[10px] font-bold text-orange-600">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-450 italic">No missing skills flagged. Excellent!</p>
                  )}
                </div>
              </div>

              {/* Working Experience Card */}
              <div className="bg-[#fafbfd] p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-left">
                <h4 className="font-extrabold text-xs text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider flex items-center gap-1.5"><FiBriefcase className="text-orange-500" /> Working Experience</h4>
                {activeResume.structured_data?.experiences && activeResume.structured_data.experiences.length > 0 ? (
                  <div className="space-y-4">
                    {activeResume.structured_data.experiences.map((exp, idx) => (
                      <div key={idx} className="border-l-2 border-slate-100 pl-3.5 space-y-1">
                        <h5 className="font-bold text-xs text-slate-800">{exp.role || 'Role'} • <span className="text-orange-500 font-semibold">{exp.company || 'Company'}</span></h5>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{exp.description || 'No description provided.'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-450 italic">No experiences structured in resume document.</p>
                )}
              </div>

              {/* Education Card & Projects Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                {/* 7. Education Card */}
                <div className="bg-[#fafbfd] p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-xs text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider flex items-center gap-1.5"><FiBookOpen className="text-orange-500" /> Education</h4>
                  {activeResume.structured_data?.educations && activeResume.structured_data.educations.length > 0 ? (
                    <div className="space-y-3">
                      {activeResume.structured_data.educations.map((edu, idx) => (
                        <div key={idx} className="space-y-0.5">
                          <h5 className="font-bold text-xs text-slate-800">{edu.degree || 'Degree'}</h5>
                          <p className="text-[10px] text-slate-500 font-bold">{edu.institution || 'Institution'}</p>
                          <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">{edu.field_of_study || 'Field of Study'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-450 italic">No educations structured in resume.</p>
                  )}
                </div>

                {/* 8. Projects Card */}
                <div className="bg-[#fafbfd] p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-xs text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider flex items-center gap-1.5"><FiGrid className="text-orange-500" /> Projects</h4>
                  {activeResume.structured_data?.projects && activeResume.structured_data.projects.length > 0 ? (
                    <div className="space-y-3">
                      {activeResume.structured_data.projects.map((proj, idx) => (
                        <div key={idx} className="space-y-0.5">
                          <h5 className="font-bold text-xs text-slate-800">{proj.title || 'Project Title'}</h5>
                          <p className="text-[10px] text-slate-450 leading-relaxed font-medium">{proj.description || 'No description provided.'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-450 italic">No projects structured in resume.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
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
