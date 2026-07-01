import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import Toast from '../../../components/feedback/Toast.jsx';
import { confirm } from '../../../utils/confirm.js';
import { 
  FiActivity, 
  FiArrowRight, 
  FiCheck, 
  FiAlertCircle, 
  FiSliders, 
  FiBookOpen, 
  FiAward, 
  FiBriefcase, 
  FiClock, 
  FiTrendingUp,
  FiTrendingDown,
  FiTrash2,
  FiEye,
  FiX,
  FiTarget,
  FiFileText,
  FiUser,
  FiList,
  FiCornerDownRight
} from 'react-icons/fi';

function AICareerInsights({ result }) {
  if (!result) return null;

  return (
    <div className="space-y-6">
      
      {/* Fallback alert banner */}
      {result.is_fallback && (
        <div className="bg-amber-50 border border-amber-250 text-amber-800 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 mb-4 shrink-0">
          <FiAlertCircle className="text-amber-550 shrink-0 w-4.5 h-4.5 animate-pulse" />
          <span>AI quota temporarily exceeded. Showing intelligent fallback analysis.</span>
        </div>
      )}

      {/* Card 1: Rollup metrics card */}
      <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm grid grid-cols-3 gap-4 text-center">
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">Skill Gap</p>
          <p className="text-xl font-black text-orange-500 flex items-center justify-center gap-0.5">
            <FiTrendingDown className="w-4 h-4 shrink-0 text-orange-500" />
            {result.skill_gap_percentage || 0}%
          </p>
        </div>
        <div className="space-y-1 border-x border-slate-100">
          <p className="text-[9px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">Learning Duration</p>
          <p className="text-xs font-bold text-slate-800 mt-1.5 flex items-center justify-center gap-1">
            <FiClock className="w-3.5 h-3.5 text-slate-400" />
            {result.estimated_learning_duration || 'N/A'}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">Hiring Readiness</p>
          <p className="text-xs font-bold text-emerald-600 mt-1.5 flex items-center justify-center gap-1">
            <FiTrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            {result.hiring_readiness || 'Medium'}
          </p>
        </div>
      </div>

      {/* Card 2: Missing skills badges */}
      <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm space-y-3">
        <h3 className="font-extrabold text-slate-800 text-xs">Missing Skills Gaps</h3>
        <div className="flex flex-wrap gap-2">
          {(result.missing_skills || []).map((s, idx) => (
            <span key={idx} className="px-2.5 py-1 bg-red-50 text-red-655 text-xs font-bold rounded-xl border border-red-100">
              {s}
            </span>
          ))}
          {(result.missing_skills || []).length === 0 && (
            <span className="text-xs text-slate-400 italic">No missing skills computed.</span>
          )}
        </div>
      </div>

      {/* Card 3: Recommended Learning Sequence */}
      <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-800 text-xs">Recommended Learning Sequence</h3>
        <div className="relative pl-6 border-l-2 border-orange-100 space-y-4">
          {(result.recommended_learning_sequence || []).map((step, idx) => (
            <div key={idx} className="relative">
              <div className="absolute -left-[31px] top-1.5 w-2 h-2 rounded-full bg-orange-500 ring-4 ring-orange-50" />
              <p className="text-xs font-bold text-slate-800">{step}</p>
            </div>
          ))}
          {(result.recommended_learning_sequence || []).length === 0 && (
            <p className="text-xs text-slate-400 italic">No learning steps compiled.</p>
          )}
        </div>
      </div>

      {/* Card 4: AI Study Recommendations */}
      <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm space-y-2">
        <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1">
          <FiBookOpen className="text-orange-500" /> AI Study Recommendations
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed font-medium">
          {result.ai_study_recommendations || result.advisor || 'No study recommendations generated.'}
        </p>
      </div>

      {/* Card 5 & 6 & 7: Resources, projects, certifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Card 5: Courses */}
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-xl space-y-2">
          <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1">
            <FiBookOpen className="text-orange-500" /> Suggested Courses
          </h4>
          <ul className="space-y-1.5">
            {(result.courses || []).map((c, i) => (
              <li key={i} className="text-[10px] text-slate-500 flex items-start gap-1 leading-relaxed">
                <FiCornerDownRight className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                <span>{c}</span>
              </li>
            ))}
            {(result.courses || []).length === 0 && (
              <li className="text-[10px] text-slate-400 italic">No courses recommended.</li>
            )}
          </ul>
        </div>

        {/* Card 5: Certifications */}
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-xl space-y-2">
          <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1">
            <FiAward className="text-orange-500" /> Certifications
          </h4>
          <ul className="space-y-1.5">
            {(result.certifications || []).map((c, i) => (
              <li key={i} className="text-[10px] text-slate-500 flex items-start gap-1 leading-relaxed">
                <FiCornerDownRight className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                <span>{c}</span>
              </li>
            ))}
            {(result.certifications || []).length === 0 && (
              <li className="text-[10px] text-slate-400 italic">No certifications recommended.</li>
            )}
          </ul>
        </div>

        {/* Card 6: Projects */}
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-xl space-y-2">
          <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1">
            <FiBriefcase className="text-orange-500" /> Target Projects
          </h4>
          <ul className="space-y-1.5">
            {(result.projects || []).map((p, i) => (
              <li key={i} className="text-[10px] text-slate-500 flex items-start gap-1 leading-relaxed">
                <FiCornerDownRight className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                <span>{p}</span>
              </li>
            ))}
            {(result.projects || []).length === 0 && (
              <li className="text-[10px] text-slate-400 italic">No projects recommended.</li>
            )}
          </ul>
        </div>

        {/* Card 7: Salary Expectations & Industry Recommendations */}
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-xl space-y-3">
          <div>
            <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1 mb-1">
              <FiTrendingUp className="text-orange-500" /> Salary Expectations
            </h4>
            <p className="text-[11px] text-slate-650 font-bold bg-slate-50 p-2 rounded-lg border border-slate-100 inline-block">
              {result.salary_prediction || 'N/A'}
            </p>
          </div>

          <div>
            <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1 mb-1.5">
              <FiSliders className="text-orange-500" /> Industry Recommendation
            </h4>
            <ul className="space-y-1">
              {(result.industry_recommendations || []).map((item, idx) => (
                <li key={idx} className="text-[10px] text-slate-550 flex items-start gap-1 leading-relaxed">
                  <FiCornerDownRight className="w-2.5 h-2.5 text-orange-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
              {(result.industry_recommendations || []).length === 0 && (
                <li className="text-[10px] text-slate-400 italic">No industry details.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Card 8: Career Advice */}
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-xl space-y-2 md:col-span-2">
          <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1">
            <FiActivity className="text-orange-500" /> Career Advice
          </h4>
          <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
            {result.career_advice || 'No general career advice generated.'}
          </p>
        </div>

      </div>
    </div>
  );
}

export default function SkillGapAnalyzer() {
  const queryClient = useQueryClient();
  const [targetRole, setTargetRole] = useState('');
  const [currentSkills, setCurrentSkills] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Entry-level');
  const [industry, setIndustry] = useState('');
  const [customResult, setCustomResult] = useState(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  // 1. Existing Automatic Skill Gap Query — always fresh, no stale cache
  const { data: gapData, isLoading: loadingAuto, isError: isErrorAuto, refetch: refetchAuto } = useQuery({
    queryKey: ['skillGapAnalysis'],
    queryFn: async () => {
      const response = await apiClient.get('/api/profile/skill-gap/');
      return response.data?.data || response.data;
    },
    staleTime: 0,           // Never use stale cache
    refetchOnMount: 'always', // Always refetch when component mounts (picks up new resume/profile)
    refetchOnWindowFocus: false, // Don't refetch on every window focus (costly API call)
  });

  // 2. Fetch Custom Skill Gap History
  const { 
    data: customHistory = [], 
    isLoading: loadingHistory,
    isError: errorLoadingHistory,
    refetch: refetchHistory
  } = useQuery({
    queryKey: ['customSkillGapHistory'],
    queryFn: async () => {
      const response = await apiClient.get('/api/profile/skill-gap/custom/history/');
      return response.data?.data || [];
    }
  });

  // 3. Custom Analysis Mutation
  const customAnalysisMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/api/profile/skill-gap/custom/', payload);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      setCustomResult(data);
      showToast('Custom skill gap analysis completed successfully!');
      queryClient.setQueryData(['customSkillGapHistory'], (old) => {
        return old ? [data, ...old] : [data];
      });
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Custom analysis failed.', 'error');
    }
  });

  // 4. Delete individual history item
  const deleteHistoryMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/api/profile/skill-gap/custom/history/${id}/delete/`);
    },
    onSuccess: (_, deletedId) => {
      showToast('History item deleted.');
      queryClient.setQueryData(['customSkillGapHistory'], (old) => {
        return old ? old.filter(item => item.id !== deletedId) : [];
      });
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to delete history item.', 'error');
    }
  });

  // 5. Delete all history items
  const deleteAllHistoryMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/api/profile/skill-gap/custom/history/delete-all/');
    },
    onSuccess: () => {
      showToast('All custom history deleted.');
      queryClient.setQueryData(['customSkillGapHistory'], []);
      setCustomResult(null);
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to delete all history.', 'error');
    }
  });

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!targetRole.trim() || !currentSkills.trim()) {
      showToast('Please fill out Target Role and Current Skills.', 'error');
      return;
    }
    customAnalysisMutation.mutate({
      target_role: targetRole.trim(),
      current_skills: currentSkills.trim(),
      experience_level: experienceLevel,
      preferred_industry: industry.trim()
    });
  };

  const handleOpenHistoryItem = (h) => {
    setTargetRole(h.target_role);
    setCurrentSkills(h.current_skills);
    setExperienceLevel(h.experience_level);
    setIndustry(h.preferred_industry || '');
    setCustomResult(h.results);
    setShowHistoryPanel(false);
    showToast('Loaded past analysis results!');
  };

  const handleDeleteHistoryItem = async (e, id) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Delete History Record',
      message: 'Delete this history record?',
      type: 'delete',
      confirmText: 'Delete'
    });
    if (ok) {
      deleteHistoryMutation.mutate(id);
    }
  };

  const handleDeleteAllHistory = async () => {
    const ok = await confirm({
      title: 'Wipe History',
      message: 'Wipe all manual analysis history from database?',
      type: 'delete',
      confirmText: 'Wipe History'
    });
    if (ok) {
      deleteAllHistoryMutation.mutate();
    }
  };

  if (loadingAuto && !gapData) {
    return <Loader skeleton={true} variant="grid" className="max-w-4xl mx-auto" />;
  }

  if (isErrorAuto) {
    return (
      <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-8 rounded-2xl text-center max-w-md mx-auto my-12 shadow-sm">
        <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="font-extrabold text-slate-800 text-lg">Failed to retrieve skill audits</h3>
        <button onClick={() => refetchAuto()} className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition">
          Retry
        </button>
      </div>
    );
  }

  const recommendations = gapData?.recommendations || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-left">
      
      {/* ================= EXISTING AUTOMATIC ANALYZER ================= */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <FiActivity className="text-orange-500" /> Automatic Skill Gap Analyzer
          </h2>
          <p className="text-slate-400 text-xs mt-1">Audit current user profile skills vs missing keywords compiled from target career path.</p>
        </div>

        {/* ── 4 Overview Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Card 1: Target Career Role */}
          <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                <FiTarget className="w-3.5 h-3.5 text-orange-500" />
              </div>
              <h4 className="text-[10px] font-black text-slate-500 dark:text-[#6B7FA3] uppercase tracking-wider">Target Role</h4>
            </div>
            <p className="text-sm font-extrabold text-slate-800 leading-tight">
              {gapData?.target_role || 'Not set'}
            </p>
            <p className="text-[9px] text-slate-400 dark:text-[#6B7FA3] font-medium">Source: User Profile</p>
          </div>

          {/* Card 2: Resume Extracted Skills */}
          <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <FiFileText className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <h4 className="text-[10px] font-black text-slate-500 dark:text-[#6B7FA3] uppercase tracking-wider">Resume Skills</h4>
            </div>
            {gapData?.resume_skills?.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {gapData.resume_skills.slice(0, 6).map((s, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] text-slate-600 rounded text-[9px] font-bold">{s}</span>
                ))}
                {gapData.resume_skills.length > 6 && (
                  <span className="px-1.5 py-0.5 text-slate-400 text-[9px] font-bold">+{gapData.resume_skills.length - 6} more</span>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic">No resume skills extracted yet.</p>
            )}
            <p className="text-[9px] text-slate-400 dark:text-[#6B7FA3] font-medium">Source: Latest Resume</p>
          </div>

          {/* Card 3: Missing Skills */}
          <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                <FiAlertCircle className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <h4 className="text-[10px] font-black text-slate-500 dark:text-[#6B7FA3] uppercase tracking-wider">Missing Skills</h4>
            </div>
            {gapData?.missing_skills?.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {gapData.missing_skills.slice(0, 5).map((s, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-rose-50 border border-rose-100 text-rose-600 rounded text-[9px] font-bold">{s}</span>
                ))}
                {gapData.missing_skills.length > 5 && (
                  <span className="px-1.5 py-0.5 text-slate-400 text-[9px] font-bold">+{gapData.missing_skills.length - 5} more</span>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-emerald-600 font-bold">No gaps detected!</p>
            )}
            <p className="text-[9px] text-slate-400 dark:text-[#6B7FA3] font-medium">Source: Skill Gap Analyzer</p>
          </div>

          {/* Card 4: Active Skill Inventory */}
          <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-4 rounded-2xl shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <FiUser className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <h4 className="text-[10px] font-black text-slate-500 dark:text-[#6B7FA3] uppercase tracking-wider">Skill Inventory</h4>
            </div>
            {gapData?.active_skills?.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {gapData.active_skills.slice(0, 6).map((s, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded text-[9px] font-bold">{s}</span>
                ))}
                {gapData.active_skills.length > 6 && (
                  <span className="px-1.5 py-0.5 text-slate-400 text-[9px] font-bold">+{gapData.active_skills.length - 6} more</span>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic">No manually added skills available.</p>
            )}
            <p className="text-[9px] text-slate-400 dark:text-[#6B7FA3] font-medium">Source: Profile Inventory</p>
          </div>

        </div>
        {/* ── End Overview Cards ── */}



        <AICareerInsights result={gapData?.results} />
      </div>

      <hr className="border-slate-200 my-8" />

      {/* ================= NEW CUSTOM SKILL GAP WORKFLOW ================= */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <FiSliders className="text-orange-500" /> Custom Skill Gap Analysis
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Custom Analysis Form */}
          <div className="lg:col-span-5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm">
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">Target Role</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none font-bold"
                  placeholder="e.g. Lead Devops Engineer"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">Current Skills (Comma Separated)</label>
                <textarea
                  value={currentSkills}
                  onChange={(e) => setCurrentSkills(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none font-medium"
                  placeholder="e.g. Python, SQL, Git, Linux"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">Experience Level</label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none bg-white font-bold text-slate-700"
                  >
                    <option value="Entry-level">Entry-level</option>
                    <option value="Mid-level">Mid-level</option>
                    <option value="Senior">Senior</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">Preferred Industry (Optional)</label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 font-bold"
                    placeholder="e.g. FinTech"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={customAnalysisMutation.isLoading}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
              >
                {customAnalysisMutation.isLoading ? 'Analyzing...' : 'Run Custom Analysis'}
              </button>
            </form>
          </div>

          {/* Results Output */}
          <div className="lg:col-span-7">
            {customAnalysisMutation.isLoading && (
              <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-8 rounded-2xl shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                <Loader skeleton={false} />
                <p className="text-xs text-slate-400 mt-4 font-semibold">Gemini is analyzing your custom parameters...</p>
              </div>
            )}

            {!customAnalysisMutation.isLoading && !customResult && (
              <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] border-dashed p-8 rounded-2xl text-center flex flex-col items-center justify-center min-h-[300px]">
                <FiSliders className="w-12 h-12 text-slate-350 mb-3 animate-pulse" />
                <h4 className="font-extrabold text-slate-700 text-sm">Custom Analysis Workspace</h4>
                <p className="text-xs text-slate-400 dark:text-[#8A9BB5] mt-1 max-w-sm leading-relaxed">
                  Enter target parameters and skills on the left to see missing skills, progress sequence maps, and hiring readiness metrics.
                </p>
              </div>
            )}

            {!customAnalysisMutation.isLoading && customResult && (
              <AICareerInsights result={customResult} />
            )}
          </div>

        </div>
      </div>

      {/* Permanent History Panel */}
      <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <FiClock className="text-orange-500" /> Custom Analysis History Logs
          </h3>
          <button
            disabled={customHistory.length === 0 || deleteAllHistoryMutation.isLoading}
            onClick={async () => {
              const ok = await confirm({
                title: 'Delete All History',
                message: 'Are you sure you want to permanently delete all custom skill gap history items for the current user? This action cannot be undone.',
                type: 'delete',
                confirmText: 'Delete All'
              });
              if (ok) {
                deleteAllHistoryMutation.mutate();
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
        {!loadingHistory && !errorLoadingHistory && customHistory.length === 0 && (
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
        {!loadingHistory && !errorLoadingHistory && customHistory.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-1">
            {customHistory.map((h) => {
              const preview = h.results?.ai_study_recommendations || `Current skills: ${h.current_skills}`;
              const slicedPreview = preview.slice(0, 120) + (preview.length > 120 ? '...' : '');
              return (
                <div
                  key={h.id}
                  className="p-4 bg-slate-50 border border-slate-255 hover:border-orange-300 rounded-xl transition text-left flex justify-between items-start gap-4"
                >
                  <div className="space-y-1.5 overflow-hidden flex-1">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-xs font-bold text-slate-800 truncate">Custom Skill Gap Analysis</h4>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 ${
                        h.results?.is_fallback ? 'bg-amber-105 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-250'
                      }`}>
                        {h.results?.is_fallback ? 'Completed (Fallback)' : 'Completed (Gemini AI)'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold space-y-0.5">
                      <p><span className="text-slate-400">Target Role:</span> {h.target_role}</p>
                      <p><span className="text-slate-400">Generated:</span> {new Date(h.created_at).toLocaleString()}</p>
                    </div>
                    <p className="text-[10px] text-slate-455 italic leading-relaxed mt-1 whitespace-pre-line line-clamp-3">
                      {slicedPreview}
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
