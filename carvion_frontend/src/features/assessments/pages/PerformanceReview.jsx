import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { refreshAssessment, refreshInterview, refreshDashboard } from '../../../utils/queryRefresh/index.js';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  CartesianGrid
} from 'recharts';
import EvaluationCard from '../components/EvaluationCard.jsx';
import apiClient from '../../../core/api/apiClient.js';
import Card from '../../../components/common/Card.jsx';
import Button from '../../../components/common/Button.jsx';
import Loader from '../../../components/common/Loader.jsx';
import { confirm } from '../../../utils/confirm.js';
import Badge from '../../../components/common/Badge.jsx';
import {
  FiArrowLeft,
  FiAward,
  FiCheckCircle,
  FiClock,
  FiTarget,
  FiBarChart2,
  FiAlertCircle,
  FiPlus,
  FiTrash2,
  FiZap,
  FiTrendingUp,
  FiActivity,
  FiPrinter,
  FiTrendingDown,
  FiSmile,
  FiList,
  FiCode,
  FiUsers,
  FiCpu,
  FiBookOpen,
  FiDownload
} from 'react-icons/fi';
import { formatDate } from '../../../utils/formatters.js';
import { ROUTES } from '../../../config/constants.js';

// Print Styles helper (appended in head dynamically or inside component render)
const printStyles = `
@media print {
  body * {
    visibility: hidden;
  }
  .print-container, .print-container * {
    visibility: visible;
  }
  .print-container {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
  .no-print {
    display: none !important;
  }
}
`;

const getGradeDetails = (score) => {
  if (score >= 95) return { grade: 'A+', text: 'Excellent Work', color: 'text-yellow-600 bg-yellow-50/50 border-yellow-200 dark:border-yellow-900/30' };
  if (score >= 90) return { grade: 'A', text: 'Outstanding Performance', color: 'text-yellow-750 bg-yellow-50/50 border-yellow-250 dark:border-yellow-900/30' };
  if (score >= 75) return { grade: 'B', text: 'Good Performance', color: 'text-orange-605 bg-orange-50/40 border-orange-200 dark:border-orange-950/20' };
  if (score >= 60) return { grade: 'C', text: 'Satisfactory Performance', color: 'text-blue-600 bg-blue-50/40 border-blue-200 dark:border-blue-900/20' };
  if (score >= 40) return { grade: 'D', text: 'Needs Improvement', color: 'text-red-500 bg-red-50/40 border-red-200 dark:border-red-950/20' };
  return { grade: 'F', text: 'Unsatisfactory', color: 'text-red-700 bg-red-50/40 border-red-250 dark:border-red-950/20' };
};

const getCategoryDetails = (cat) => {
  const norm = (cat || "").toLowerCase();
  if (norm.includes("mcq")) return { label: "MCQ", icon: <FiList className="w-3.5 h-3.5" />, style: "bg-blue-50/50 text-blue-705 border-blue-150" };
  if (norm.includes("coding")) return { label: "Coding", icon: <FiCode className="w-3.5 h-3.5" />, style: "bg-purple-50/50 text-purple-700 border-purple-150" };
  if (norm.includes("debug")) return { label: "Debugging", icon: <FiAlertCircle className="w-3.5 h-3.5" />, style: "bg-rose-50/50 text-rose-700 border-rose-150" };
  if (norm.includes("scen") || norm.includes("scenario")) return { label: "Scenario Based", icon: <FiActivity className="w-3.5 h-3.5" />, style: "bg-indigo-50/50 text-indigo-700 border-indigo-150" };
  if (norm.includes("hr") || norm.includes("behavior")) return { label: "HR / Behavioral", icon: <FiUsers className="w-3.5 h-3.5" />, style: "bg-teal-50/50 text-teal-705 border-teal-150" };
  if (norm.includes("aptitude") || norm.includes("apt")) return { label: "Aptitude", icon: <FiTrendingUp className="w-3.5 h-3.5" />, style: "bg-amber-50/50 text-amber-700 border-amber-150" };
  return { label: cat, icon: <FiAward className="w-3.5 h-3.5" />, style: "bg-slate-50 text-slate-700 border-slate-200" };
};

const getRecommendationCardDetails = (recText) => {
  let skill = recText;
  let priority = "High Priority";
  let priorityColor = "bg-red-50/50 text-red-600 border-red-150";
  let estTime = "2 Hours";
  
  const cleanText = recText.replace("Review", "").replace("Improve", "").replace("Practice", "").replace("Study", "").replace("core fundamentals of", "").replace("in Python Developer", "").replace("in Java Developer", "").replace("in React Developer", "").replace("in DevOps Engineer", "").replace(".", "").trim();
  skill = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
  
  if (recText.includes("fundamentals") || recText.includes("syntax")) {
    priority = "Medium Priority";
    priorityColor = "bg-amber-50/50 text-amber-600 border-amber-200";
    estTime = "1.5 Hours";
  } else {
    priority = "High Priority";
    priorityColor = "bg-red-50/50 text-red-655 border-red-200";
    estTime = "3 Hours";
  }
  
  return {
    skill,
    priority,
    priorityColor,
    estTime,
    reason: `Incorrect answers suggest key gaps in ${skill.toLowerCase()} fundamentals.`,
    linkText: `Start ${skill} Roadmap`
  };
};

const getDerivedInsights = (scorecard) => {
  const analytics = scorecard.performance_review?.analytics || {};
  const topicPerformance = analytics.topic_performance || {};
  
  let strongestSkill = analytics.strongest_skill || "N/A";
  let weakestSkill = analytics.weakest_skill || "N/A";
  let fastestAnswer = analytics.fastest_question || "N/A";
  let slowestAnswer = analytics.slowest_question || "N/A";
  let suggestedNext = analytics.suggested_next_difficulty || (scorecard.score >= 85 ? "Hard" : (scorecard.score >= 60 ? "Medium" : "Easy"));
  let mostChallenging = "Algorithmic execution logic";

  let strongestScore = -1;
  let weakestScore = 101;
  
  Object.entries(topicPerformance).forEach(([topic, data]) => {
    const acc = data.accuracy || 0;
    if (acc > strongestScore) {
      strongestScore = acc;
      if (!analytics.strongest_skill) strongestSkill = topic;
    }
    if (acc < weakestScore) {
      weakestScore = acc;
      if (!analytics.weakest_skill) weakestSkill = topic;
    }
  });

  const totalQ = scorecard.total_questions || 4;
  const duration = scorecard.duration || 180;
  const avgTime = Math.round(duration / totalQ);

  if (fastestAnswer === "N/A") fastestAnswer = `${Math.round(avgTime * 0.7)}s`;
  if (slowestAnswer === "N/A") slowestAnswer = `${Math.round(avgTime * 1.4)}s`;
  
  if (strongestSkill !== "N/A" && weakestSkill !== "N/A" && strongestSkill !== weakestSkill) {
    mostChallenging = `Understanding ${weakestSkill.toLowerCase()} edge-cases`;
  }
  
  return {
    strongestSkill,
    strongestScore: strongestScore !== -1 ? `${strongestScore}%` : "N/A",
    weakestSkill,
    weakestScore: weakestScore !== 101 ? `${weakestScore}%` : "N/A",
    fastestAnswer,
    slowestAnswer,
    suggestedNext,
    mostChallenging
  };
};

// Sub-component: scorecard detail view
function ScorecardDetail({ scorecardId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: scorecard, isLoading, isError } = useQuery({
    queryKey: ['scorecardDetails', scorecardId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/assessments/scorecard/${scorecardId}/`);
      const raw = res.data?.data || res.data;
      if (raw) {
        raw.duration = raw.duration && raw.duration > 0 ? raw.duration : (raw.total_questions || 4) * 45;
      }
      return raw;
    },
    enabled: !!scorecardId,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/api/assessments/scorecard/${scorecardId}/delete/`);
    },
    onSuccess: () => {
      queryClient.setQueryData(['scorecardHistory'], (old) => {
        return old ? old.filter(item => item.id !== scorecardId) : [];
      });
      refreshDashboard(queryClient);
      navigate(ROUTES.TEST_REVIEW);
    }
  });

  if (isLoading && !scorecard) {
    return <Loader skeleton={true} variant="card" className="max-w-3xl mx-auto" />;
  }

  if (isError || !scorecard) {
    return (
      <div className="text-center py-12 space-y-4">
        <FiAlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <p className="text-red-500 font-semibold text-sm">Failed to load scorecard details.</p>
        <Button variant="primary" onClick={() => navigate(ROUTES.TEST_REVIEW)}>
          Back to Reviews
        </Button>
      </div>
    );
  }

  const answers = scorecard.answers_submitted || [];
  const score = scorecard.score || 0;
  const review = scorecard.performance_review || {};
  const gradeInfo = getGradeDetails(score);

  const handlePrint = () => {
    window.print();
  };

  const downloadPDF = () => {
    const element = document.querySelector('.print-container');
    if (!element) return;
    
    const roleClean = (scorecard.role || scorecard.domain || "Assessment").replace(/\s+/g, '_');
    const catClean = (scorecard.category || "Report").replace(/\s+/g, '_');
    const dateStr = new Date(scorecard.created_at || Date.now()).toISOString().split('T')[0];
    const filename = `${roleClean}_${catClean}_Report_${dateStr}.pdf`;
    
    const opt = {
      margin: 10,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    const runDownload = () => {
      window.html2pdf().from(element).set(opt).save();
    };
    
    if (window.html2pdf) {
      runDownload();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = runDownload;
      document.head.appendChild(script);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-7 text-left print-container">
      <style>{printStyles}</style>

      {/* Header bar */}
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(ROUTES.TEST_REVIEW)}
            className="p-2 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
          >
            <FiArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-355" />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white">Performance Scorecard</h2>
            <p className="text-xs text-slate-450 mt-0.5 font-medium">Detailed answers evaluation audit and grading rationales</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" onClick={downloadPDF} className="flex items-center gap-1.5 text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm transition">
            <FiDownload className="w-4 h-4 text-slate-500" /> Download PDF
          </Button>
          <Button variant="secondary" onClick={handlePrint} className="flex items-center gap-1.5 text-xs font-bold">
            <FiPrinter className="w-4 h-4" /> Export / Print
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              const ok = await confirm({
                title: 'Delete Scorecard',
                message: 'Are you sure you want to delete this assessment scorecard? This action cannot be undone.',
                type: 'delete',
                confirmText: 'Delete'
              });
              if (ok) {
                deleteMutation.mutate();
              }
            }}
            isLoading={deleteMutation.isLoading}
            className="flex items-center gap-1.5 text-xs font-bold"
          >
            <FiTrash2 className="w-4 h-4" /> Delete Report
          </Button>
        </div>
      </div>

      {/* Overview Stat Panel */}
      <Card hoverable={false} className="p-6 flex flex-col sm:flex-row items-center justify-around gap-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl">
        <div className="text-center space-y-1">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-sm border ${gradeInfo.color}`}>
            <span className="text-2xl font-black">{gradeInfo.grade}</span>
          </div>
          <h3 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white pt-1">{score}%</h3>
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 dark:text-[#6B7FA3] uppercase tracking-wider block">{gradeInfo.text}</span>
        </div>
        <div className="flex-1 space-y-2 text-center sm:text-left max-w-lg">
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <Badge variant="brand">{scorecard.domain}</Badge>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 border rounded-md uppercase tracking-wider flex items-center gap-1 ${
              scorecard.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              scorecard.difficulty === 'Medium' ? 'bg-orange-50 text-orange-650 border-orange-200' :
              'bg-red-50 text-red-650 border-red-200'
            }`}>
              {scorecard.difficulty}
            </span>
            {(() => {
              const catInfo = getCategoryDetails(scorecard.category);
              return (
                <span className={`text-[10px] font-extrabold px-2 py-0.5 border rounded-md uppercase tracking-wider flex items-center gap-1.5 ${catInfo.style}`}>
                  {catInfo.icon} {catInfo.label}
                </span>
              );
            })()}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium pt-1">
            {score >= 80
              ? 'Outstanding performance! You display deep competencies in this domain.'
              : score >= 50
              ? 'Satisfactory result. Review the grading rationales below to strengthen gaps.'
              : 'Requires improvement. We recommend revising target subjects and trying again.'}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
            Taken on: {formatDate(scorecard.created_at)}
          </p>
        </div>
      </Card>

      {/* Rich Performance Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl shadow-xs">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Accuracy %</span>
          <span className="text-lg font-black text-slate-800 block mt-1">{score}%</span>
          <span className="text-[9px] text-slate-450">Option match correctness</span>
        </div>
        <div className="p-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl shadow-xs">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Correct / Incorrect</span>
          <span className="text-lg font-black text-slate-800 block mt-1">
            <span className="text-emerald-600">{scorecard.correct_answers}</span>
            <span className="text-slate-350"> / </span>
            <span className="text-red-500">{scorecard.total_questions - scorecard.correct_answers}</span>
          </span>
          <span className="text-[9px] text-slate-450">Out of {scorecard.total_questions} total questions</span>
        </div>
        <div className="p-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl shadow-xs">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Total Time Taken</span>
          <span className="text-lg font-black text-slate-800 block mt-1">
            {scorecard.duration ? `${Math.floor(scorecard.duration / 60)}m ${scorecard.duration % 60}s` : 'N/A'}
          </span>
          <span className="text-[9px] text-slate-450">Avg per Qn: {scorecard.duration ? Math.round(scorecard.duration / scorecard.total_questions) + 's' : 'N/A'}</span>
        </div>
        <div className="p-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl shadow-xs">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Evaluation Type</span>
          <span className="text-lg font-black text-slate-800 block mt-1 truncate capitalize">{scorecard.category}</span>
          <span className="text-[9px] text-slate-450">Level: {scorecard.difficulty}</span>
        </div>
      </div>

      {/* AI Performance Insights Panel */}
      {(() => {
        const insights = getDerivedInsights(scorecard);
        const analytics = scorecard.performance_review?.analytics || {};
        return (
          <Card hoverable={false} className="p-5 border border-slate-200 bg-white rounded-2xl space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-455 tracking-wider flex items-center gap-1.5">
              <FiActivity className="text-orange-500" /> Performance Insights & Readiness
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[9px] font-bold text-slate-400 uppercase">✓ Strongest Skill</span>
                <span className="text-xs font-extrabold text-slate-800 block mt-1 truncate capitalize">{insights.strongestSkill} ({insights.strongestScore})</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[9px] font-bold text-slate-400 uppercase">✗ Weakest Skill</span>
                <span className="text-xs font-extrabold text-slate-800 block mt-1 truncate capitalize">{insights.weakestSkill} ({insights.weakestScore})</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[9px] font-bold text-slate-400 uppercase">⏱ Fastest Answer</span>
                <span className="text-xs font-extrabold text-slate-800 block mt-1">{insights.fastestAnswer}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[9px] font-bold text-slate-400 uppercase">⏱ Slowest Answer</span>
                <span className="text-xs font-extrabold text-slate-800 block mt-1">{insights.slowestAnswer}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[9px] font-bold text-slate-400 uppercase">⚡ Learning Readiness</span>
                <span className="text-xs font-extrabold text-slate-800 block mt-1">{analytics.learning_readiness || "Medium"}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[9px] font-bold text-slate-400 uppercase">💼 Interview Readiness</span>
                <span className="text-xs font-extrabold text-slate-800 block mt-1">{analytics.interview_readiness || "75%"}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[9px] font-bold text-slate-400 uppercase">🛡 Confidence Level</span>
                <span className="text-xs font-extrabold text-slate-800 block mt-1">{analytics.confidence_level || "Moderate"}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[9px] font-bold text-slate-400 uppercase">∅ Skipped Questions</span>
                <span className="text-xs font-extrabold text-slate-800 block mt-1">{analytics.skipped_questions !== undefined ? analytics.skipped_questions : 0}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase">⌥ Most Challenging Concept</span>
                <span className="text-xs font-extrabold text-slate-800 block mt-1 truncate">{insights.mostChallenging}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase">⌥ Next suggested difficulty</span>
                <span className="text-xs font-extrabold text-slate-850 block mt-1">{insights.suggestedNext}</span>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Skill Performance Breakdown */}
      {(() => {
        const topicPerf = review.analytics?.topic_performance || {};
        if (!topicPerf || Object.keys(topicPerf).length === 0) return null;
        return (
          <Card hoverable={false} className="p-5 border border-slate-200 bg-white rounded-2xl space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-455 tracking-wider">Skill Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(topicPerf).map(([topic, data]) => {
                const acc = data.accuracy || 0;
                return (
                  <div key={topic} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-slate-700 capitalize">{topic}</span>
                      <span className="text-slate-500">{acc}% Accuracy ({data.correct}/{data.total} Qns)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          acc >= 80 ? 'bg-emerald-500' : acc >= 60 ? 'bg-amber-500' : 'bg-red-400'
                        }`}
                        style={{ width: `${acc}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })()}

      {/* Structured Final Feedback Section */}
      <Card hoverable={false} className="p-6 border border-orange-100 dark:border-orange-950/40 bg-gradient-to-br from-orange-50/20 to-amber-50/15 dark:from-orange-950/10 dark:to-transparent rounded-2xl space-y-4">
        <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
          <FiZap className="text-orange-500 animate-pulse" /> Overall Performance Feedback
        </h3>
        
        {review.summary && (
          <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed font-semibold">
            {review.summary}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* Strengths & Weak Areas */}
          <div className="space-y-3.5">
            <div className="p-4 bg-emerald-50/20 border border-emerald-100 rounded-2xl space-y-2">
              <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-widest block">Evaluated Strengths</span>
              {review.strengths && review.strengths.length > 0 ? (
                <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  {review.strengths.map((str, idx) => <li key={idx}>{str}</li>)}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">No specific strengths listed.</p>
              )}
            </div>
            
            <div className="p-4 bg-red-50/20 border border-red-100 rounded-2xl space-y-2">
              <span className="text-[10px] font-extrabold text-red-655 uppercase tracking-widest block">Weak Areas</span>
              {review.weaknesses && review.weaknesses.length > 0 ? (
                <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  {review.weaknesses.map((weak, idx) => <li key={idx}>{weak}</li>)}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">No specific weak areas identified.</p>
              )}
            </div>
          </div>

          {/* Recommended Learning Path */}
          <div className="space-y-3.5">
            <div className="p-4 bg-orange-50/15 border border-orange-100 rounded-2xl space-y-2">
              <span className="text-[10px] font-extrabold text-orange-650 uppercase tracking-widest block">Recommended Learning Path</span>
              {review.learning_recommendations && review.learning_recommendations.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {review.learning_recommendations.map((recText, idx) => {
                    const rec = getRecommendationCardDetails(recText);
                    return (
                      <div key={idx} className="p-3 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-xl flex flex-col justify-between space-y-2.5">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-extrabold text-slate-800 truncate pr-2">{rec.skill}</span>
                            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 border rounded ${rec.priorityColor}`}>
                              {rec.priority}
                            </span>
                          </div>
                          <div className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">
                            Study Time: <span className="text-slate-600">{rec.estTime}</span>
                          </div>
                        </div>
                        <Link
                          to="/roadmap"
                          className="text-[10px] font-bold py-1.5 px-3 text-center border border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50/50 transition-colors block w-full"
                        >
                          Start {rec.skill} Roadmap
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Review core concepts to address gaps.</p>
              )}
            </div>

            {review.suggested_next_assessment && (
              <div className="p-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl">
                <span className="text-[10px] font-extrabold text-slate-500 dark:text-[#6B7FA3] uppercase tracking-widest block">Suggested Next Evaluation</span>
                <span className="text-xs font-bold text-orange-600 block mt-1.5">{review.suggested_next_assessment}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Graded Questions List */}
      <div className="space-y-6">
        <h3 className="text-xs font-bold flex items-center space-x-1.5 px-1 uppercase text-slate-400 tracking-wider">
          <FiCheckCircle className="text-emerald-500 w-4 h-4" />
          <span>Grading Audit Logs</span>
        </h3>
        {answers.map((question, idx) => {
          const coachingList = scorecard.performance_review?.incorrect_coaching || [];
          const qId = question.question_id;
          const coaching = coachingList.find(c => c.question_id === qId);
          return (
            <EvaluationCard
              key={qId || idx}
              question={question}
              index={idx}
              totalQuestions={answers.length}
              coaching={coaching}
            />
          );
        })}
      </div>

      <div className="flex justify-end pt-4 no-print">
        <Button variant="primary" onClick={() => navigate(ROUTES.TEST)} className="font-bold">
          Take Another Assessment
        </Button>
      </div>
    </div>
  );
}

// Sub-component: scorecard list view (Dashboard)
function ScorecardDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: scorecardsData, isLoading: isScorecardsLoading, isError: isScorecardsError, refetch: refetchScorecards } = useQuery({
    queryKey: ['scorecardHistory'],
    queryFn: async () => {
      const res = await apiClient.get('/api/assessments/');
      return res.data?.data || res.data || [];
    },
  });

  const { data: interviewsData, isLoading: isInterviewsLoading, isError: isInterviewsError, refetch: refetchInterviews } = useQuery({
    queryKey: ['interviewHistory'],
    queryFn: async () => {
      const res = await apiClient.get('/api/assessments/interview/');
      return res.data?.data || res.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (scorecardId) => {
      await apiClient.delete(`/api/assessments/scorecard/${scorecardId}/delete/`);
    },
    onSuccess: (_, scorecardId) => {
      queryClient.setQueryData(['scorecardHistory'], (old) => {
        return old ? old.filter(item => item.id !== scorecardId) : [];
      });
      refreshDashboard(queryClient);
    }
  });

  const deleteInterviewMutation = useMutation({
    mutationFn: async (sessionId) => {
      await apiClient.delete(`/api/assessments/interview/${sessionId}/delete/`);
    },
    onSuccess: (_, sessionId) => {
      queryClient.setQueryData(['interviewHistory'], (old) => {
        return old ? old.filter(item => item.id !== sessionId) : [];
      });
      refreshDashboard(queryClient);
    }
  });

  const [assessmentType, setAssessmentType] = useState('mock_test');

  if ((isScorecardsLoading && !scorecardsData) || (isInterviewsLoading && !interviewsData)) {
    return <Loader skeleton={true} variant="grid" />;
  }

  if (isScorecardsError || isInterviewsError) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-205 p-8 rounded-2xl text-center max-w-md mx-auto my-12 shadow-sm space-y-3">
        <FiAlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <h3 className="font-extrabold text-slate-800 dark:text-white">Failed to load performance reviews</h3>
        <button onClick={() => { refetchScorecards(); refetchInterviews(); }} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition">
          Retry
        </button>
      </div>
    );
  }

  // --- MOCK TEST DATA COMPILATION ---
  const mockTests = (Array.isArray(scorecardsData) ? scorecardsData : []).map(sc => ({
    ...sc,
    id: sc.id,
    type: 'mock_test',
    title: sc.domain || 'Mock Test',
    score: sc.score || 0,
    created_at: sc.created_at,
    category: sc.category || 'MCQ',
    difficulty: sc.difficulty || 'Medium',
    duration: sc.duration && sc.duration > 0 ? sc.duration : (sc.total_questions || 4) * 45,
    correct_answers: sc.correct_answers || 0,
    total_questions: sc.total_questions || 0
  }));

  const totalMockTests = mockTests.length;
  const mtAvgScore = totalMockTests ? Math.round(mockTests.reduce((sum, sc) => sum + sc.score, 0) / totalMockTests) : 0;
  const mtBestScore = totalMockTests ? Math.max(...mockTests.map(sc => sc.score)) : 0;
  const mtWorstScore = totalMockTests ? Math.min(...mockTests.map(sc => sc.score)) : 0;
  const mtTotalQ = mockTests.reduce((sum, sc) => sum + sc.total_questions, 0);
  const mtTotalCorrect = mockTests.reduce((sum, sc) => sum + sc.correct_answers, 0);
  const mtAvgAccuracy = mtTotalQ ? Math.round((mtTotalCorrect / mtTotalQ) * 100) : 0;

  const mtChartData = [...mockTests]
    .reverse()
    .map((sc, index) => ({
      index: index + 1,
      date: new Date(sc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: sc.score,
      accuracy: sc.total_questions ? Math.round((sc.correct_answers / sc.total_questions) * 105) : 0,
      topic: sc.title
    }));

  const mtImprovementPct = mtChartData.length > 1
    ? mtChartData[mtChartData.length - 1].score - mtChartData[0].score
    : 0;

  const mtDifficultyStats = { Easy: { sum: 0, count: 0 }, Medium: { sum: 0, count: 0 }, Hard: { sum: 0, count: 0 } };
  mockTests.forEach(sc => {
    const d = sc.difficulty || 'Medium';
    if (mtDifficultyStats[d]) {
      mtDifficultyStats[d].sum += sc.score;
      mtDifficultyStats[d].count += 1;
    }
  });

  const mtCategoryStats = {};
  mockTests.forEach(sc => {
    const c = sc.category || 'MCQ';
    if (!mtCategoryStats[c]) mtCategoryStats[c] = { sum: 0, count: 0 };
    mtCategoryStats[c].sum += sc.score;
    mtCategoryStats[c].count += 1;
  });

  const mtTopicStats = {};
  mockTests.forEach(sc => {
    const t = sc.title || 'General';
    if (!mtTopicStats[t]) mtTopicStats[t] = { correct: 0, total: 0, count: 0 };
    mtTopicStats[t].correct += sc.correct_answers;
    mtTopicStats[t].total += sc.total_questions;
    mtTopicStats[t].count += 1;
  });
  const mtTopicList = Object.entries(mtTopicStats).map(([topic, stats]) => ({
    topic,
    count: stats.count,
    accuracy: stats.total ? Math.round((stats.correct / stats.total) * 100) : 0
  })).sort((a, b) => b.accuracy - a.accuracy);

  const strongSkills = mtTopicList.filter(t => t.accuracy >= 75);
  const weakSkills = mtTopicList.filter(t => t.accuracy < 75);

  // --- INTERVIEW DATA COMPILATION ---
  const completedInterviews = (Array.isArray(interviewsData) ? interviewsData : [])
    .filter(session => session.status === 'completed' && session.evaluation);

  const totalInterviewsCount = (Array.isArray(interviewsData) ? interviewsData : []).length;
  const completionRate = totalInterviewsCount ? Math.round((completedInterviews.length / totalInterviewsCount) * 100) : 0;

  const interviewSessions = completedInterviews.map(session => {
    const evalData = session.evaluation || {};
    const dialogLength = session.dialog ? session.dialog.length : 0;
    return {
      ...session,
      id: session.id,
      type: 'interview',
      title: session.role || 'Interview Practice',
      score: evalData.overall_score || 0,
      technical: evalData.technical_score || 0,
      communication: evalData.communication_score || 0,
      behavioral: evalData.behavioral_score || 0,
      confidence: evalData.confidence_score || 0,
      problem_solving: evalData.problem_solving_score || 0,
      created_at: session.created_at,
      difficulty: session.difficulty || 'Medium',
      category: session.category || 'Technical',
      duration: dialogLength * 120 || 600
    };
  });

  const totalInterviews = interviewSessions.length;
  const intAvgScore = totalInterviews ? Math.round(interviewSessions.reduce((sum, sc) => sum + sc.score, 0) / totalInterviews) : 0;
  const intBestScore = totalInterviews ? Math.max(...interviewSessions.map(sc => sc.score)) : 0;
  
  const avgTechRating = totalInterviews ? Math.round(interviewSessions.reduce((sum, sc) => sum + sc.technical, 0) / totalInterviews) : 0;
  const avgCommRating = totalInterviews ? Math.round(interviewSessions.reduce((sum, sc) => sum + sc.communication, 0) / totalInterviews) : 0;
  const avgHRRating = totalInterviews ? Math.round(interviewSessions.reduce((sum, sc) => sum + sc.behavioral, 0) / totalInterviews) : 0;
  const avgConfidenceRating = totalInterviews ? Math.round(interviewSessions.reduce((sum, sc) => sum + sc.confidence, 0) / totalInterviews) : 0;
  const avgDurationSeconds = totalInterviews ? Math.round(interviewSessions.reduce((sum, sc) => sum + sc.duration, 0) / totalInterviews) : 0;

  const intChartData = [...interviewSessions]
    .reverse()
    .map((sc, index) => ({
      index: index + 1,
      date: new Date(sc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: sc.score,
      technical: sc.technical,
      communication: sc.communication,
      confidence: sc.confidence,
      role: sc.title
    }));

  const intTypeStats = {};
  interviewSessions.forEach(sc => {
    const c = sc.category || 'Technical';
    intTypeStats[c] = (intTypeStats[c] || 0) + 1;
  });
  const intDifficultyStats = {};
  interviewSessions.forEach(sc => {
    const d = sc.difficulty || 'Medium';
    intDifficultyStats[d] = (intDifficultyStats[d] || 0) + 1;
  });

  const weakAreasSet = new Set();
  interviewSessions.forEach(sc => {
    if (sc.evaluation?.weaknesses) {
      sc.evaluation.weaknesses.forEach(w => weakAreasSet.add(w));
    }
  });
  const commonWeakAreas = Array.from(weakAreasSet).slice(0, 5);

  const recommendationsSet = new Set();
  interviewSessions.forEach(sc => {
    if (sc.evaluation?.improvement_plan) {
      sc.evaluation.improvement_plan.forEach(r => recommendationsSet.add(r));
    }
  });
  const aiRecommendations = Array.from(recommendationsSet).slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto space-y-7 text-left">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-black text-slate-855 dark:text-white flex items-center gap-2">
          <FiBarChart2 className="text-orange-500" /> Performance Reviews Dashboard
        </h2>
        <p className="text-slate-400 text-xs mt-1">Exclusively trace mock tests evaluations and AI interview feedback logs.</p>
      </div>

      {/* Tabs Filter switcher (All Assessments tab is removed, default Mock Tests) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'mock_test', label: 'Mock Tests' },
          { id: 'interview', label: 'AI Interview' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAssessmentType(tab.id)}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all -mb-px ${
              assessmentType === tab.id
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-slate-400 hover:text-slate-655 dark:hover:text-slate-350'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* DASHBOARDS RENDER */}
      {assessmentType === 'mock_test' ? (
        /* --- MOCK TESTS DASHBOARD --- */
        totalMockTests === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 border-dashed rounded-2xl p-16 text-center space-y-4">
            <FiAward className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-slate-700 text-sm">No mock tests completed yet.</h3>
            <p className="text-xs text-slate-455 max-w-sm mx-auto leading-relaxed">
              Take AI-generated mock assessments to test your technical aptitude, code fluency, and category competence.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/test/mock-assessment')}
              className="font-bold py-2.5 px-6 shadow-sm"
            >
              Start Mock Test
            </Button>
          </div>
        ) : (
          <div className="space-y-7">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card hoverable={false} className="p-4 border border-slate-150 bg-white rounded-xl">
                <span className="text-[9px] font-black text-slate-400 dark:text-[#6B7FA3] uppercase tracking-widest block">Total Mock Tests</span>
                <span className="text-xl font-black text-slate-800 mt-1 block">{totalMockTests}</span>
              </Card>
              <Card hoverable={false} className="p-4 border border-slate-150 bg-white rounded-xl">
                <span className="text-[9px] font-black text-slate-400 dark:text-[#6B7FA3] uppercase tracking-widest block">Average Score</span>
                <span className="text-xl font-black text-slate-850 mt-1 block">{mtAvgScore}%</span>
              </Card>
              <Card hoverable={false} className="p-4 border border-slate-150 bg-white rounded-xl">
                <span className="text-[9px] font-black text-slate-400 dark:text-[#6B7FA3] uppercase tracking-widest block">High / Low Score</span>
                <span className="text-xl font-black text-slate-850 mt-1 block">
                  {mtBestScore}% <span className="text-xs text-slate-400 font-semibold">/ {mtWorstScore}%</span>
                </span>
              </Card>
              <Card hoverable={false} className="p-4 border border-slate-150 bg-white rounded-xl">
                <span className="text-[9px] font-black text-slate-400 dark:text-[#6B7FA3] uppercase tracking-widest block">Average Accuracy</span>
                <span className="text-xl font-black text-slate-850 mt-1 block">{mtAvgAccuracy}%</span>
              </Card>
              <Card hoverable={false} className="p-4 border border-slate-150 bg-white rounded-xl">
                <span className="text-[9px] font-black text-slate-400 dark:text-[#6B7FA3] uppercase tracking-widest block">Questions Attempted</span>
                <span className="text-xl font-black text-slate-800 mt-1 block">{mtTotalQ}</span>
              </Card>
              <Card hoverable={false} className="p-4 border border-slate-150 bg-white rounded-xl">
                <span className="text-[9px] font-black text-slate-400 dark:text-[#6B7FA3] uppercase tracking-widest block">Questions Correct</span>
                <span className="text-xl font-black text-emerald-500 mt-1 block">{mtTotalCorrect}</span>
              </Card>
              <Card hoverable={false} className="p-4 border border-slate-150 bg-white rounded-xl col-span-2">
                <span className="text-[9px] font-black text-slate-400 dark:text-[#6B7FA3] uppercase tracking-widest block">Current Improvement Trend</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-base font-black ${mtImprovementPct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {mtImprovementPct >= 0 ? '+' : ''}{mtImprovementPct}%
                  </span>
                  <span className="text-[10px] text-slate-450 font-bold uppercase">overall score swing</span>
                </div>
              </Card>
            </div>

            {/* Score progress Trend chart */}
            <Card hoverable={false} className="p-5 border border-slate-150 bg-white rounded-2xl space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-455 tracking-wider">Mock Test Score Progress</h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mtChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94A3B8' }} />
                    <ChartTooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="score" stroke="#F97316" strokeWidth={2.5} dot={{ r: 4, stroke: '#F97316', strokeWidth: 2, fill: '#fff' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Topic wise accuracy splits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card hoverable={false} className="p-5 border border-slate-150 bg-white rounded-2xl space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-455 tracking-wider">Difficulty Performance</h3>
                <div className="space-y-3">
                  {Object.entries(mtDifficultyStats).map(([diff, stats]) => {
                    const avg = stats.count ? Math.round(stats.sum / stats.count) : 0;
                    return (
                      <div key={diff} className="space-y-1 text-xs">
                        <div className="flex justify-between font-bold">
                          <span>{diff} Difficulty</span>
                          <span>{avg}% Avg Score</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-orange-500 h-full transition-all" style={{ width: `${avg}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card hoverable={false} className="p-5 border border-slate-150 bg-white rounded-2xl space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-455 tracking-wider">Category Performance</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {Object.keys(mtCategoryStats).length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">No categories graded.</p>
                  ) : (
                    Object.entries(mtCategoryStats).map(([cat, stats]) => {
                      const avg = stats.count ? Math.round(stats.sum / stats.count) : 0;
                      return (
                        <div key={cat} className="space-y-1 text-xs">
                          <div className="flex justify-between font-bold">
                            <span>{cat} Mode</span>
                            <span>{avg}% Avg Score</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-sky-500 h-full transition-all" style={{ width: `${avg}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>

            {/* Weak / Strong skills tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card hoverable={false} className="p-5 border border-slate-150 bg-white rounded-2xl space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-455 tracking-wider text-emerald-600">Strong Skills (★ 75%+)</h3>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {strongSkills.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">No strong skill ratings identified yet.</p>
                  ) : (
                    strongSkills.map((s, i) => (
                      <div key={i} className="flex justify-between items-center text-xs border-b border-slate-50 pb-2 last:border-0">
                        <span className="font-bold text-slate-705">{s.topic}</span>
                        <span className="font-black text-emerald-500">{s.accuracy}% Accuracy</span>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card hoverable={false} className="p-5 border border-slate-150 bg-white rounded-2xl space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-455 tracking-wider text-red-500">Weak Skills (✗ Below 75%)</h3>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {weakSkills.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">No weak skill ratings identified yet.</p>
                  ) : (
                    weakSkills.map((s, i) => (
                      <div key={i} className="flex justify-between items-center text-xs border-b border-slate-50 pb-2 last:border-0">
                        <span className="font-bold text-slate-705">{s.topic}</span>
                        <span className="font-black text-red-500">{s.accuracy}% Accuracy</span>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Recent Mock Tests List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Recent Mock Test Attempt Logs</h3>
              <div className="grid grid-cols-1 gap-3">
                {mockTests.map((sc) => (
                  <div
                    key={sc.id}
                    className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                        <span className="font-black text-sm text-orange-600">{sc.score}%</span>
                      </div>
                      <div>
                        <p className="font-extrabold text-sm text-slate-850 truncate">{sc.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">
                          <span>{sc.category}</span>
                          <span>•</span>
                          <span>{sc.difficulty}</span>
                          <span>•</span>
                          <span>{formatDate(sc.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <Button
                        variant="secondary"
                        onClick={() => navigate(`${ROUTES.TEST_REVIEW}?id=${sc.id}`)}
                        className="text-xs py-1.5 font-bold"
                      >
                        View Report
                      </Button>
                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Delete Report',
                            message: 'Delete this assessment report? This action cannot be undone.',
                            type: 'delete',
                            confirmText: 'Delete'
                          });
                          if (ok) deleteMutation.mutate(sc.id);
                        }}
                        className="p-2 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-450 hover:text-red-500 rounded-xl transition"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      ) : (
        /* --- AI INTERVIEW DASHBOARD --- */
        totalInterviews === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 border-dashed rounded-2xl p-16 text-center space-y-4">
            <FiMessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-slate-700 text-sm">No AI interviews completed yet.</h3>
            <p className="text-xs text-slate-455 max-w-sm mx-auto leading-relaxed">
              Engage with AI Recruiter simulators to practice technical depth, speech articulation, and sequential follow-up scenarios.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/test/interview-practice')}
              className="font-bold py-2.5 px-6 shadow-sm"
            >
              Start AI Interview
            </Button>
          </div>
        ) : (
          <div className="space-y-7">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card hoverable={false} className="p-4 border border-slate-150 bg-white rounded-xl">
                <span className="text-[9px] font-black text-slate-400 dark:text-[#6B7FA3] uppercase tracking-widest block">Total Interviews</span>
                <span className="text-xl font-black text-slate-800 mt-1 block">{totalInterviewsCount}</span>
              </Card>
              <Card hoverable={false} className="p-4 border border-slate-150 bg-white rounded-xl">
                <span className="text-[9px] font-black text-slate-400 dark:text-[#6B7FA3] uppercase tracking-widest block">Average Score</span>
                <span className="text-xl font-black text-slate-850 mt-1 block">{intAvgScore}%</span>
              </Card>
              <Card hoverable={false} className="p-4 border border-slate-150 bg-white rounded-xl">
                <span className="text-[9px] font-black text-slate-400 dark:text-[#6B7FA3] uppercase tracking-widest block">Best Score</span>
                <span className="text-xl font-black text-orange-600 mt-1 block">{intBestScore}%</span>
              </Card>
              <Card hoverable={false} className="p-4 border border-slate-150 bg-white rounded-xl">
                <span className="text-[9px] font-black text-slate-400 dark:text-[#6B7FA3] uppercase tracking-widest block">Completion Rate</span>
                <span className="text-xl font-black text-slate-855 mt-1 block">{completionRate}%</span>
              </Card>
              <Card hoverable={false} className="p-4 border border-slate-150 bg-white rounded-xl">
                <span className="text-[9px] font-black text-slate-400 dark:text-[#6B7FA3] uppercase tracking-widest block">Technical Rating</span>
                <span className="text-xl font-black text-emerald-500 mt-1 block">{avgTechRating}%</span>
              </Card>
              <Card hoverable={false} className="p-4 border border-slate-150 bg-white rounded-xl">
                <span className="text-[9px] font-black text-slate-400 dark:text-[#6B7FA3] uppercase tracking-widest block">Communication Rating</span>
                <span className="text-xl font-black text-sky-500 mt-1 block">{avgCommRating}%</span>
              </Card>
              <Card hoverable={false} className="p-4 border border-slate-150 bg-white rounded-xl">
                <span className="text-[9px] font-black text-slate-400 dark:text-[#6B7FA3] uppercase tracking-widest block">HR & Behavioral Rating</span>
                <span className="text-xl font-black text-indigo-500 mt-1 block">{avgHRRating}%</span>
              </Card>
              <Card hoverable={false} className="p-4 border border-slate-150 bg-white rounded-xl">
                <span className="text-[9px] font-black text-slate-400 dark:text-[#6B7FA3] uppercase tracking-widest block">Confidence Rating</span>
                <span className="text-xl font-black text-amber-500 mt-1 block">{avgConfidenceRating}%</span>
              </Card>
              <Card hoverable={false} className="p-4 border border-slate-150 bg-white rounded-xl col-span-2">
                <span className="text-[9px] font-black text-slate-400 dark:text-[#6B7FA3] uppercase tracking-widest block">Average Interview Duration</span>
                <span className="text-sm font-black text-slate-700 mt-1 block">
                  {Math.floor(avgDurationSeconds / 60)}m {avgDurationSeconds % 60}s
                </span>
              </Card>
            </div>

            {/* Score & skill growth progression line chart */}
            <Card hoverable={false} className="p-5 border border-slate-150 bg-white rounded-2xl space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-455 tracking-wider">AI Interview Performance & Skill Growth Trends</h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={intChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94A3B8' }} />
                    <ChartTooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="score" stroke="#F97316" strokeWidth={2.5} name="Overall Score" />
                    <Line type="monotone" dataKey="technical" stroke="#10B981" strokeWidth={2} name="Technical rating" />
                    <Line type="monotone" dataKey="communication" stroke="#0EA5E9" strokeWidth={2} name="Communication rating" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Distribution grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card hoverable={false} className="p-5 border border-slate-150 bg-white rounded-2xl space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-455 tracking-wider">Interview Category Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(intTypeStats).map(([cat, count]) => (
                    <div key={cat} className="flex justify-between items-center text-xs border-b border-slate-50 pb-2 last:border-0">
                      <span className="font-bold text-slate-705">{cat} Interview</span>
                      <span className="font-black text-slate-700">{count} sessions completed</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card hoverable={false} className="p-5 border border-slate-150 bg-white rounded-2xl space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-455 tracking-wider">Difficulty Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(intDifficultyStats).map(([diff, count]) => (
                    <div key={diff} className="flex justify-between items-center text-xs border-b border-slate-50 pb-2 last:border-0">
                      <span className="font-bold text-slate-705">{diff} Level</span>
                      <span className="font-black text-slate-700">{count} sessions completed</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Common Weak areas & AI recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card hoverable={false} className="p-5 border border-slate-150 bg-white rounded-2xl space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-455 tracking-wider text-red-500">Common Weak Areas</h3>
                <div className="space-y-2">
                  {commonWeakAreas.length === 0 ? (
                    <p className="text-xs text-slate-405 italic">No weak areas identified yet.</p>
                  ) : (
                    commonWeakAreas.map((w, idx) => (
                      <p key={idx} className="text-xs text-slate-655 font-semibold">• {w}</p>
                    ))
                  )}
                </div>
              </Card>

              <Card hoverable={false} className="p-5 border border-orange-100 bg-orange-50/10 rounded-2xl space-y-3">
                <h3 className="text-xs font-black uppercase text-orange-605 tracking-wider">AI Skill Roadmap Guidelines</h3>
                <div className="space-y-2">
                  {aiRecommendations.length === 0 ? (
                    <p className="text-xs text-slate-405 italic">No recommendations compile-ready.</p>
                  ) : (
                    aiRecommendations.map((r, idx) => (
                      <p key={idx} className="text-xs text-slate-655 font-semibold">• {r}</p>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Recent Interviews list table */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Recent Interview Practices</h3>
              <div className="grid grid-cols-1 gap-3">
                {interviewSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                        <span className="font-black text-sm text-orange-655">{session.score}%</span>
                      </div>
                      <div>
                        <p className="font-extrabold text-sm text-slate-850 truncate">{session.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">
                          <span>{session.category}</span>
                          <span>•</span>
                          <span>{session.difficulty}</span>
                          <span>•</span>
                          <span>{formatDate(session.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <Button
                        variant="secondary"
                        onClick={() => navigate(`${ROUTES.INTERVIEW_PRACTICE}?session_id=${session.id}`)}
                        className="text-xs py-1.5 font-bold"
                      >
                        View Report
                      </Button>
                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Delete Session',
                            message: 'Are you sure you want to delete this interview history? This action cannot be undone.',
                            type: 'delete',
                            confirmText: 'Delete'
                          });
                          if (ok) deleteInterviewMutation.mutate(session.id);
                        }}
                        className="p-2 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-450 hover:text-red-500 rounded-xl transition"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

// Main export: decides which sub-view to render based on query param
export default function PerformanceReview() {
  const [searchParams] = useSearchParams();
  const scorecardId = searchParams.get('id');

  if (scorecardId) {
    return <ScorecardDetail scorecardId={scorecardId} />;
  }

  return <ScorecardDashboard />;
}
