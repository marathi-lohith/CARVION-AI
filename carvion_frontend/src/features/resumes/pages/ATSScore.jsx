import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import { ROUTES } from '../../../config/constants.js';
import { 
  FiTrendingUp, FiCheckCircle, FiAlertCircle, 
  FiFileText, FiAward 
} from 'react-icons/fi';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend
} from 'recharts';

export default function ATSScore() {
  const navigate = useNavigate();
  const [selectedResumeId, setSelectedResumeId] = useState(null);

  // 1. Fetch user analytics summary
  const { data: analyticsData, isLoading: loadingAnalytics, isError: isAnalyticsError, refetch: refetchAnalytics } = useQuery({
    queryKey: ['profileAnalytics'],
    queryFn: async () => {
      const response = await apiClient.get('/api/profile/analytics/');
      return response.data?.data || response.data;
    }
  });

  // 2. Fetch list of all resumes to extract detailed ATS metrics
  const { data: resumes, isLoading: loadingResumes, isError: isResumesError } = useQuery({
    queryKey: ['resumeList'],
    queryFn: async () => {
      const response = await apiClient.get('/api/resumes/');
      return response.data?.data || response.data || [];
    }
  });

  // 3. Fetch skill gap data (same queryKey as dashboard, synced)
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

  if (loadingAnalytics || loadingResumes) {
    return <Loader skeleton={true} variant="grid" className="max-w-4xl mx-auto" />;
  }

  if (isAnalyticsError || isResumesError) {
    return (
      <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-8 rounded-2xl text-center max-w-md mx-auto my-12 shadow-sm">
        <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="font-extrabold text-slate-800 text-lg">Failed to retrieve ATS metrics</h3>
        <p className="text-slate-400 text-xs mt-2">Make sure the backend service is running.</p>
        <button onClick={() => refetchAnalytics()} className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition">
          Retry
        </button>
      </div>
    );
  }


  
  // Find active resume (selected, primary, or latest)
  const activeResume = resumes?.find(r => r.id === selectedResumeId) || 
                       resumes?.find(r => r.is_primary) || 
                       resumes?.[0];

  const hasResumes = resumes && resumes.length > 0;

  // Extract ATS parameters from active resume
  const atsScore = activeResume?.ats_score || 0;
  // Backend stores extracted skills under technical_skills (and soft_skills), not generic 'skills'
  const techSkills = activeResume?.structured_data?.technical_skills || [];
  const softSkillsRaw = activeResume?.structured_data?.soft_skills || [];
  const softSkillNames = softSkillsRaw.map(s => typeof s === 'object' ? s.name : s);
  const matchedSkills = [...techSkills, ...softSkillNames];
  const missingKeywords = skillGapData?.missing_skills || [];
  const styleFeedback = activeResume?.analysis_report?.style_feedback || [];
  const structuralFeedback = activeResume?.analysis_report?.structural_feedback || [];
  const actionableSuggestions = activeResume?.analysis_report?.actionable_suggestions || [];

  // 1. Gauge chart data for Resume Strength Meter
  const gaugeData = [
    { value: atsScore, color: atsScore >= 80 ? '#10b981' : atsScore >= 60 ? '#f97316' : '#ef4444' },
    { value: 100 - atsScore, color: '#e2e8f0' }
  ];

  // 2. Pie chart data for ATS Breakdown
  const pieData = [
    { name: 'Matched Skills', value: Math.max(1, matchedSkills.length), color: '#10b981' },
    { name: 'Missing Keywords', value: Math.max(1, missingKeywords.length), color: '#ef4444' },
    { name: 'Style Suggests', value: Math.max(1, styleFeedback.length), color: '#f59e0b' },
    { name: 'Formatting Edits', value: Math.max(1, structuralFeedback.length), color: '#3b82f6' }
  ];

  // 3. Bar chart data for Keyword Match Graph
  const matchData = [
    { name: 'Matched Keywords', count: matchedSkills.length, fill: '#10b981' },
    { name: 'Missing Keywords', count: missingKeywords.length, fill: '#f97316' }
  ];

  // 4. Bar chart data for Missing Skills Chart
  const missingSkillsData = missingKeywords.slice(0, 5).map((skill, index) => {
    let weight = 90 - index * 12;
    if (weight < 30) weight = 30;
    return {
      name: skill,
      criticality: weight,
      fill: '#ef4444'
    };
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
            <FiTrendingUp className="text-orange-500" /> ATS Quality Dashboard
          </h2>
          <p className="text-sm text-slate-400 dark:text-[#8A9BB5] mt-1 font-medium">
            Review detailed ATS audit metrics and optimize your keyword match ratios.
          </p>
        </div>

        {/* Dropdown Resume Selector */}
        {hasResumes && (
          <div className="flex items-center gap-2">
            <label htmlFor="resume-selector" className="text-xs font-bold text-slate-400 whitespace-nowrap">Selected Resume:</label>
            <select
              id="resume-selector"
              value={activeResume?.id || ''}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-orange-500 transition-colors shadow-sm"
            >
              {resumes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.ats_score}%) {r.is_primary ? '★' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Analysis Dashboard Charts */}
      {hasResumes ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Resume Strength Meter (Gauge) */}
            <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm flex flex-col items-center justify-between min-h-[280px]">
              <div className="w-full">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-1">Resume Strength Meter</h4>
                <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">Overall evaluation score computed by Gemini AI</p>
              </div>

              <div className="relative w-full h-36 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gaugeData}
                      cx="50%"
                      cy="100%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius="75%"
                      outerRadius="105%"
                      dataKey="value"
                    >
                      <Cell fill={gaugeData[0].color} />
                      <Cell fill={gaugeData[1].color} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute bottom-2 text-center">
                  <span className="text-3xl font-black text-slate-800">{atsScore}%</span>
                  <span className="text-[10px] font-bold text-slate-450 block uppercase tracking-wider mt-1">
                    {atsScore >= 80 ? 'Excellent' : atsScore >= 60 ? 'Competitive' : 'Needs Optimization'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. ATS Breakdown (Pie Chart) */}
            <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[280px]">
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-1">ATS Audit Breakdown</h4>
                <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">Distribution of matched parameters and feedback items</p>
              </div>

              <div className="h-44 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius="50%"
                      outerRadius="75%"
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 pt-2 border-t border-slate-100">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="truncate">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Keyword Match Graph (Bar Chart) */}
            <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[280px]">
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-1">Keyword Match Summary</h4>
                <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">Comparison of matched vs missing skills</p>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={matchData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(249, 115, 22, 0.05)' }} contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                      {matchData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium leading-relaxed border-t border-slate-100 pt-3">
                {missingKeywords.length > 0 
                  ? `Your resume is missing ${missingKeywords.length} key technical terms. Add them to increase your match percentage.`
                  : 'Perfect match! No missing keywords found in this resume version.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 4. Missing Skills Chart (Bar Chart) */}
            <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm md:col-span-2 flex flex-col justify-between min-h-[260px]">
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-1">Missing Keyword Importance</h4>
                <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">Top missing skills plotted by relative priority/relevance</p>
              </div>

              {missingSkillsData.length > 0 ? (
                <div className="h-44 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={missingSkillsData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={100} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                      <Bar dataKey="criticality" fill="#ef4444" radius={[0, 6, 6, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs italic">
                  No missing skills! Outstanding match profile.
                </div>
              )}
            </div>

            {/* Quick Summary list of missing items */}
            <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[260px]">
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-2">Priority Missing Keywords</h4>
                <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">Inject these skills into your experience descriptions.</p>
              </div>

              <div className="flex-1 mt-3 overflow-y-auto max-h-[140px] space-y-1.5 pr-1">
                {missingKeywords.length > 0 ? (
                  missingKeywords.map((skill, index) => (
                    <div key={index} className="flex items-center justify-between text-[11px] font-bold text-slate-700 bg-red-50/50 border border-red-100/50 rounded-lg p-2">
                      <span className="truncate pr-2">{skill}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-red-100/80 text-red-655 shrink-0">
                        {index === 0 ? 'Critical' : index < 3 ? 'High' : 'Medium'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-emerald-600 font-bold bg-emerald-50 rounded-lg p-4 text-center">
                    All keywords matched successfully!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] py-16 px-8 text-center max-w-lg mx-auto rounded-2xl shadow-sm space-y-4">
          <FiFileText className="w-16 h-16 text-slate-300 mx-auto" />
          <div className="space-y-1.5">
            <h4 className="font-extrabold text-slate-800 text-lg">Resume Required</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium leading-relaxed">
              Upload a resume in the Resume Workspace to calculate your ATS score and unlock detailed keyword audits.
            </p>
          </div>
          <button 
            onClick={() => navigate(ROUTES.RESUMES)} 
            className="mx-auto text-xs px-5 py-2.5 font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-sm transition-all"
          >
            Upload Resume
          </button>
        </div>
      )}

      {/* Actionable ATS Insights Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        {/* Left Column: ATS Audit Details */}
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-6 rounded-2xl shadow-sm space-y-5">
          <div>
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">ATS Audit Details</h3>
            <p className="text-[10px] text-slate-450 font-semibold mt-0.5">Granular drill-down of all resume assessment categories</p>
          </div>

          <div className="space-y-5 overflow-y-auto max-h-[420px] pr-1">
            {/* Section 1: Matched Skills */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Matched Skills
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px]">
                  {matchedSkills.length}
                </span>
              </div>
              <div className="border-t border-slate-100 my-1" />
              {matchedSkills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {matchedSkills.map((skill, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-emerald-50/50 border border-emerald-100/50 text-[10px] font-bold text-emerald-700 rounded-md">
                      ✓ {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 italic pt-1">No matched skills identified.</p>
              )}
            </div>

            {/* Section 2: Missing Keywords */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5 text-red-600">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Missing Keywords
                </span>
                <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px]">
                  {missingKeywords.length}
                </span>
              </div>
              <div className="border-t border-slate-100 my-1" />
              {missingKeywords.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {missingKeywords.map((skill, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-red-50/50 border border-red-100/50 text-[10px] font-bold text-red-700 rounded-md">
                      • {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-emerald-600 font-bold pt-1">Excellent! No missing keywords.</p>
              )}
            </div>

            {/* Section 3: Style Suggestions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5 text-amber-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Style Suggestions
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px]">
                  {styleFeedback.length}
                </span>
              </div>
              <div className="border-t border-slate-100 my-1" />
              {styleFeedback.length > 0 ? (
                <ul className="space-y-1.5 pt-1 list-disc list-inside text-[10px] text-slate-600 font-medium leading-relaxed">
                  {styleFeedback.map((item, idx) => (
                    <li key={idx} className="marker:text-amber-500 pl-1">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[10px] text-slate-400 italic pt-1">No style improvements required.</p>
              )}
            </div>

            {/* Section 4: Formatting Edits */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5 text-blue-600">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Formatting Edits
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px]">
                  {structuralFeedback.length}
                </span>
              </div>
              <div className="border-t border-slate-100 my-1" />
              {structuralFeedback.length > 0 ? (
                <ul className="space-y-1.5 pt-1 list-disc list-inside text-[10px] text-slate-600 font-medium leading-relaxed">
                  {structuralFeedback.map((item, idx) => (
                    <li key={idx} className="marker:text-blue-500 pl-1">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[10px] text-slate-400 italic pt-1">No formatting improvements required.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: ATS Optimization Checklist */}
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-6 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">ATS Optimization Checklist</h3>
            <p className="text-[10px] text-slate-450 font-semibold mt-0.5">Real-time checklist of verified sections and content parameters</p>
          </div>

          <div className="space-y-2 mt-3 overflow-y-auto max-h-[320px] pr-1">
            {/* Completed Checks */}
            {activeResume?.structured_data?.profile?.phone && (
              <div className="flex items-center gap-2.5 text-xs text-slate-700 font-bold bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-2.5">
                <FiCheckCircle className="text-emerald-500 w-4 h-4 shrink-0" />
                <span>Contact information detected</span>
              </div>
            )}
            {activeResume?.structured_data?.profile?.email && (
              <div className="flex items-center gap-2.5 text-xs text-slate-700 font-bold bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-2.5">
                <FiCheckCircle className="text-emerald-500 w-4 h-4 shrink-0" />
                <span>Email address detected</span>
              </div>
            )}
            {((activeResume?.structured_data?.technical_skills?.length > 0) || (activeResume?.structured_data?.skills?.length > 0)) && (
              <div className="flex items-center gap-2.5 text-xs text-slate-700 font-bold bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-2.5">
                <FiCheckCircle className="text-emerald-500 w-4 h-4 shrink-0" />
                <span>Skills section detected</span>
              </div>
            )}
            {activeResume?.structured_data?.educations && activeResume.structured_data.educations.length > 0 && (
              <div className="flex items-center gap-2.5 text-xs text-slate-700 font-bold bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-2.5">
                <FiCheckCircle className="text-emerald-500 w-4 h-4 shrink-0" />
                <span>Education section detected</span>
              </div>
            )}
            {activeResume?.structured_data?.experiences && activeResume.structured_data.experiences.length > 0 && (
              <div className="flex items-center gap-2.5 text-xs text-slate-700 font-bold bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-2.5">
                <FiCheckCircle className="text-emerald-500 w-4 h-4 shrink-0" />
                <span>Experience section detected</span>
              </div>
            )}

            {/* Improvement Items */}
            {missingKeywords.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <p className="text-[9px] font-extrabold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider mb-1">Items Needing Improvement</p>
                {missingKeywords.map((skill, index) => (
                  <div key={index} className="flex items-center gap-2.5 text-xs text-slate-700 font-bold bg-amber-50/50 border border-amber-100/50 rounded-xl p-2.5">
                    <FiAlertCircle className="text-amber-500 w-4 h-4 shrink-0" />
                    <span>Add {skill}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm">
          <h4 className="font-extrabold text-slate-700 text-xs mb-3 flex items-center gap-2">
            <FiCheckCircle className="text-emerald-500" /> Success Benchmarks
          </h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            SaaS industry standard recommends striving for an ATS match rating of <span className="font-bold text-emerald-600">80% or higher</span>. This ensures keywords matching the target job description are parsed accurately by screening platforms.
          </p>
        </div>
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm">
          <h4 className="font-extrabold text-slate-700 text-xs mb-3 flex items-center gap-2">
            <FiAlertCircle className="text-orange-500" /> AI Suggestions for {activeResume?.name || 'This Resume'}
          </h4>
          {actionableSuggestions.length > 0 ? (
            <ul className="space-y-2">
              {actionableSuggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
                  <span className="w-4 h-4 shrink-0 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center font-bold text-[9px] mt-0.5">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Use the Resume Optimizer and Skill Gap Analyzer under AI Tools to scan for missing keywords and inject recommended technical tokens into your profile.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
