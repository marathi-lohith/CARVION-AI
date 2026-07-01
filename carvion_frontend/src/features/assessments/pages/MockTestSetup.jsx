import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import QuizInterface from '../components/QuizInterface.jsx';
import apiClient from '../../../core/api/apiClient.js';
import Card from '../../../components/common/Card.jsx';
import Button from '../../../components/common/Button.jsx';
import Loader from '../../../components/common/Loader.jsx';
import Toast from '../../../components/feedback/Toast.jsx';
import Input from '../../../components/common/Input.jsx';
import Badge from '../../../components/common/Badge.jsx';
import { 
  FiCpu, 
  FiAward, 
  FiSearch, 
  FiFilter, 
  FiClock, 
  FiChevronRight, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiHelpCircle,
  FiZap,
  FiTarget,
  FiActivity
} from 'react-icons/fi';
import { formatDate } from '../../../utils/formatters.js';
import { ROUTES } from '../../../config/constants.js';

import { refreshAssessment, refreshDashboard, refreshAnalytics, refreshProfile } from '../../../utils/queryRefresh/index.js';

const getGrade = (score) => {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
};

const getGradeBadgeStyle = (grade) => {
  switch (grade) {
    case 'A+': return 'bg-yellow-50 text-yellow-750 border border-yellow-250';
    case 'A': return 'bg-emerald-50 text-emerald-700 border border-emerald-250';
    case 'B': return 'bg-blue-50 text-blue-700 border border-blue-250';
    case 'C': return 'bg-orange-50 text-orange-600 border border-orange-250';
    case 'D': return 'bg-red-50 text-red-650 border border-red-250';
    default: return 'bg-rose-100 text-rose-800 border border-rose-250';
  }
};

const getCategoryLabel = (cat) => {
  switch (cat) {
    case 'MCQ': return 'MCQ';
    case 'Technical': return 'Technical';
    case 'Coding': return 'Coding';
    case 'Debugging': return 'Debugging';
    case 'Scenario': return 'Scenario Based';
    case 'HR': return 'HR Scenario';
    case 'Aptitude': return 'Aptitude';
    default: return cat;
  }
};

const getCategoryIcon = (cat) => {
  const norm = (cat || "").toLowerCase();
  if (norm.includes("mcq")) return <FiActivity className="w-3 h-3 mr-1" />;
  if (norm.includes("coding")) return <FiCpu className="w-3 h-3 mr-1" />;
  if (norm.includes("debug")) return <FiAlertCircle className="w-3 h-3 mr-1" />;
  if (norm.includes("scen") || norm.includes("scenario")) return <FiTarget className="w-3 h-3 mr-1" />;
  if (norm.includes("hr") || norm.includes("behavior")) return <FiZap className="w-3 h-3 mr-1" />;
  return <FiAward className="w-3 h-3 mr-1" />;
};

export default function MockTestSetup() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTest, setActiveTest] = useState(null); // stores active MockTest document
  const [domainInput, setDomainInput] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [category, setCategory] = useState('MCQ');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('All');

  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  // 1. Fetch user profile target career skills to initialize domain defaults
  const { data: profile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await apiClient.get('/api/profile/');
      return res.data?.data || res.data;
    }
  });

  const [hasPrefilled, setHasPrefilled] = useState(false);

  React.useEffect(() => {
    if (profile && !hasPrefilled) {
      if (profile.target_role) {
        setDomainInput(profile.target_role);
      }
      setHasPrefilled(true);
    }
  }, [profile, hasPrefilled]);

  // 2. Fetch scorecard audit history
  const { data: scorecards = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['scorecardHistory'],
    queryFn: async () => {
      const res = await apiClient.get('/api/assessments/');
      return res.data?.data || res.data || [];
    }
  });

  // 3. Compile mock test session mutation
  const { mutate: createTest, isLoading: compiling } = useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post('/api/assessments/create/', payload);
      return res.data?.data || res.data;
    },
    onSuccess: (data) => {
      setActiveTest(data);
      showToast('Assessment questions compiled successfully.');
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Failed to compile test parameters.';
      showToast(msg, 'error');
    },
  });

  // 4. Submit test responses mutation
  const { mutate: submitTest, isLoading: grading } = useMutation({
    mutationFn: async ({ answers, duration }) => {
      const res = await apiClient.post(`/api/assessments/${activeTest.id}/submit/`, { answers, duration });
      return res.data?.data || res.data;
    },
    onSuccess: (scorecard) => {
      showToast('Grading validated. Loading scorecard details.');
      refreshAssessment(queryClient);
      refreshDashboard(queryClient);
      refreshAnalytics(queryClient);
      refreshProfile(queryClient);
      setActiveTest(null);
      setTimeout(() => {
        navigate(`${ROUTES.TEST_REVIEW}?id=${scorecard.id}`);
      }, 1000);
    },
    onError: () => {
      showToast('Failed to validate quiz grading.', 'error');
    },
  });

  const handleStartTest = (e) => {
    e.preventDefault();
    const domain = domainInput.trim() || profile?.target_role || 'General Software Engineering';
    createTest({ domain, difficulty, category });
  };

  // Dynamic estimated time mapping
  const getEstTime = (cat, diff) => {
    const qCount = 10;
    let factor = 1.2;
    if (['Coding', 'Debugging', 'Scenario'].includes(cat)) {
      factor = 2.5;
    }
    if (diff === 'Hard') {
      factor *= 1.5;
    }
    return Math.round(qCount * factor);
  };

  // Dynamic field helper explanations
  const getDifficultyHelperText = (diff) => {
    if (diff === 'Easy') return 'Tests core concepts, basic syntax, and fundamental conventions.';
    if (diff === 'Medium') return 'Tests practical implementation, framework API design, and standard logic.';
    return 'Tests architecture patterns, worst-case optimizations, and system edge-cases.';
  };

  const getCategoryHelperText = (cat) => {
    if (cat === 'MCQ') return 'Conceptual multiple choice question challenges.';
    if (cat === 'Technical') return 'Conceptual domain-specific matching challenges.';
    if (cat === 'Coding') return 'Complete algorithm code structures or write custom functions.';
    if (cat === 'Debugging') return 'Audit, identify, and correct bugs inside broken script snippets.';
    if (cat === 'Scenario') return 'Real-world infrastructure incidents or design tradeoff scenarios.';
    if (cat === 'HR') return 'Behavioral questions checking communication and leadership skills.';
    return 'Analytical logic sequences, numeric math reasoning, and patterns.';
  };

  // Analytics Metrics (Phase 7)
  const totalAssessments = scorecards.length;
  const avgScore = totalAssessments > 0 
    ? Math.round(scorecards.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalAssessments) 
    : 0;
  const highestScore = totalAssessments > 0 
    ? Math.max(...scorecards.map(c => c.score || 0)) 
    : 0;
  const passedAssessments = scorecards.filter(c => (c.score || 0) >= 70).length;
  const readinessIndex = totalAssessments > 0 ? `${avgScore}%` : '0%';

  // Search & Filter algorithm
  const filteredScorecards = scorecards.filter(card => {
    const term = searchQuery.toLowerCase();
    const searchMatch = 
      (card.domain || '').toLowerCase().includes(term) ||
      (card.category || '').toLowerCase().includes(term) ||
      (card.difficulty || '').toLowerCase().includes(term);
      
    if (!searchMatch) return false;

    if (filterTab === 'All') return true;
    if (filterTab === 'Recent') return true; // sliced later
    if (filterTab === 'Passed') return (card.score || 0) >= 70;
    if (filterTab === 'Needs Improvement') return (card.score || 0) < 70;
    if (filterTab === 'Highest Score') return true; // sorted later
    return true;
  });

  let finalScorecards = [...filteredScorecards];
  if (filterTab === 'Recent') {
    finalScorecards = finalScorecards.slice(0, 5);
  } else if (filterTab === 'Highest Score') {
    finalScorecards.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  if (compiling) {
    return <Loader skeleton={true} variant="card" className="max-w-3xl mx-auto" />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-7 text-left">
      <div className="text-left">
        <h2 className="text-2xl font-black tracking-tight text-slate-800">AI Mock Assessments</h2>
        <p className="text-xs text-slate-450 mt-0.5 font-medium">
          Create custom quizzes and practice dynamic mock tests curated by our Gemini evaluation pipeline.
        </p>
      </div>

      {activeTest ? (
        // Active test interface
        <div className="max-w-2xl mx-auto">
          <QuizInterface
            test={activeTest}
            onSubmit={submitTest}
            loading={grading}
          />
        </div>
      ) : (
        // Setup Form & Dashboard Grid
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Panel - Configuration Form */}
          <div className="lg:col-span-5">
            <Card hoverable={false} className="p-6 bg-white border border-slate-205 shadow-sm rounded-2xl space-y-5">
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center space-x-2">
                  <FiCpu className="text-orange-500 w-5 h-5 animate-pulse" />
                  <span>Create New Assessment</span>
                </h3>
                <p className="text-[11px] text-slate-450 mt-1 leading-relaxed">
                  Configure your assessment parameters to generate a personalized AI quiz.
                </p>
              </div>

              <form onSubmit={handleStartTest} className="space-y-4 text-left">
                <div>
                  <Input
                    label="Target Role / Domain Topic"
                    placeholder="e.g. Python Developer, DevOps Engineer, React Developer"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {profile?.target_role && domainInput === profile.target_role
                      ? "Using your Profile Target Role. You can change this to assess any role."
                      : "Specify target career role or focus language framework."}
                  </span>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-slate-650 uppercase">Difficulty Level</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs border bg-white text-slate-700 outline-none border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-semibold cursor-pointer"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                  <span className="text-[10px] text-slate-400 italic block leading-relaxed pr-1">
                    {getDifficultyHelperText(difficulty)}
                  </span>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-bold text-slate-650 uppercase">Assessment Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs border bg-white text-slate-700 outline-none border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-semibold cursor-pointer"
                  >
                    <option value="MCQ">Multiple Choice (MCQ)</option>
                    <option value="Technical">Technical MCQ</option>
                    <option value="Coding">Coding Challenge</option>
                    <option value="Debugging">Debugging Challenge</option>
                    <option value="Scenario">Scenario Based</option>
                    <option value="HR">HR Scenario</option>
                    <option value="Aptitude">Aptitude Logic</option>
                  </select>
                  <span className="text-[10px] text-slate-400 italic block leading-relaxed pr-1">
                    {getCategoryHelperText(category)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3.5 pt-1">
                  <div className="p-3 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Estimated Questions</span>
                    <span className="text-sm font-black text-slate-800 block mt-0.5">10 Questions</span>
                  </div>
                  <div className="p-3 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Estimated Duration</span>
                    <span className="text-sm font-black text-slate-800 block mt-0.5">{getEstTime(category, difficulty)} mins</span>
                  </div>
                </div>

                {/* Live Assessment Summary */}
                <div className="p-4 bg-orange-50/15 border border-orange-100 rounded-xl space-y-1">
                  <span className="text-[9px] font-extrabold text-orange-600 uppercase tracking-widest block">Live Assessment Preview</span>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-650 font-bold">
                    <span>Questions: <span className="text-slate-800">10</span></span>
                    <span>•</span>
                    <span>Difficulty: <span className="text-slate-800">{difficulty}</span></span>
                    <span>•</span>
                    <span>Category: <span className="text-slate-800">{category}</span></span>
                    <span>•</span>
                    <span>Est. Time: <span className="text-slate-800">{getEstTime(category, difficulty)} mins</span></span>
                  </div>
                </div>

                <Button type="submit" className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition flex items-center justify-center space-x-2">
                  <FiCpu className="w-4 h-4" />
                  <span>Generate Assessment</span>
                </Button>
              </form>
            </Card>
          </div>

          {/* Right Panel - Assessment Dashboard */}
          <div className="lg:col-span-7 space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              <div className="p-3.5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl shadow-xs text-center">
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Total Attempts</span>
                <span className="text-lg font-black text-slate-800 block mt-1">{totalAssessments}</span>
              </div>
              <div className="p-3.5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl shadow-xs text-center">
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Avg Score</span>
                <span className="text-lg font-black text-slate-800 block mt-1">{avgScore}%</span>
              </div>
              <div className="p-3.5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl shadow-xs text-center">
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Highest Score</span>
                <span className="text-lg font-black text-slate-800 block mt-1">{highestScore}%</span>
              </div>
              <div className="p-3.5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl shadow-xs text-center">
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Passed Rate</span>
                <span className="text-lg font-black text-slate-800 block mt-1">{passedAssessments}</span>
              </div>
              <div className="p-3.5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl shadow-xs text-center col-span-2 sm:col-span-1">
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Job Readiness</span>
                <span className="text-lg font-black text-orange-600 block mt-1">{readinessIndex}</span>
              </div>
            </div>

            {/* Filters and Search Bar Container */}
            <div className="space-y-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-xs">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <FiSearch className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search assessments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-xl text-xs bg-slate-50/50 border-slate-200 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-medium transition"
                  />
                </div>

                {/* Filters Tab list */}
                <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto pr-1">
                  {['All', 'Recent', 'Passed', 'Needs Improvement', 'Highest Score'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setFilterTab(tab)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                        filterTab === tab 
                          ? 'bg-orange-500 text-white shadow-xs' 
                          : 'bg-slate-100/70 text-slate-500 hover:bg-slate-150'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attempts list */}
              {loadingHistory && scorecards.length === 0 ? (
                <Loader variant="circle" />
              ) : finalScorecards.length === 0 ? (
                <div className="py-12 text-center text-slate-400 dark:text-[#6B7FA3] font-medium space-y-2">
                  <FiHelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-extrabold text-slate-700">No assessments yet.</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                    Generate your first AI assessment to begin tracking your interview readiness.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 pt-1">
                  {finalScorecards.map((card) => {
                    const grade = getGrade(card.score || 0);
                    return (
                      <Card
                        key={card.id}
                        className="p-4.5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)]/90 rounded-2xl hover:border-orange-500/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-2 min-w-0 flex-1 pr-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-extrabold text-sm text-slate-850 truncate max-w-xs capitalize">
                              {card.domain}
                            </h4>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 flex items-center">
                              {getCategoryIcon(card.category)}
                              {getCategoryLabel(card.category)}
                            </span>
                            <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md border ${
                              card.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-250' :
                              card.difficulty === 'Medium' ? 'bg-orange-50 text-orange-650 border-orange-200' :
                              'bg-red-50 text-red-650 border-red-250'
                            }`}>
                              {card.difficulty}
                            </span>
                            <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md ${getGradeBadgeStyle(grade)}`}>
                              Grade {grade}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                            <span>Score: <span className="text-slate-700">{card.score || 0}%</span></span>
                            <span>•</span>
                            <span>Correct: <span className="text-slate-700">{card.correct_answers || 0}/{card.total_questions || 4} Qns</span></span>
                            <span>•</span>
                            <span>Duration: <span className="text-slate-700">{card.duration ? `${Math.round(card.duration / 60)}m` : 'N/A'}</span></span>
                            <span>•</span>
                            <span>Attempted: <span className="text-slate-700">{formatDate(card.created_at)}</span></span>
                          </div>
                        </div>

                        <div className="flex-shrink-0 flex items-center justify-end">
                          <Button
                            variant="secondary"
                            onClick={() => navigate(`${ROUTES.TEST_REVIEW}?id=${card.id}`)}
                            className="text-xs py-1.5 px-3.5 font-bold hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors flex items-center space-x-1 shadow-sm rounded-xl"
                          >
                            <span>View Report</span>
                            <FiChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
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
