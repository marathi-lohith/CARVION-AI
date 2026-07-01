import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { refreshInterview, refreshDashboard } from '../../../utils/queryRefresh/index.js';
import apiClient from '../../../core/api/apiClient.js';
import Card from '../../../components/common/Card.jsx';
import Button from '../../../components/common/Button.jsx';
import Loader from '../../../components/common/Loader.jsx';
import Toast from '../../../components/feedback/Toast.jsx';
import { confirm } from '../../../utils/confirm.js';
import Badge from '../../../components/common/Badge.jsx';
import Editor from '@monaco-editor/react';
import {
  FiMessageSquare,
  FiVideo,
  FiMic,
  FiMicOff,
  FiVideoOff,
  FiSend,
  FiAward,
  FiPlay,
  FiPause,
  FiSquare,
  FiTrash2,
  FiCheckCircle,
  FiActivity,
  FiTrendingUp,
  FiArrowLeft,
  FiBookOpen,
  FiBriefcase,
  FiVolume2,
  FiVolumeX,
  FiClock,
  FiAlertCircle,
  FiChevronRight,
  FiZap,
  FiTarget,
  FiSearch,
  FiCpu
} from 'react-icons/fi';
import { formatDate } from '../../../utils/formatters.js';
import { ROUTES } from '../../../config/constants.js';

const ROLE_SUGGESTIONS = [
  "Python Developer", "Java Developer", "Frontend Developer", "React Developer",
  "DevOps Engineer", "Cloud Engineer", "Data Scientist", "Product Manager",
  "QA Engineer", "Fullstack Engineer", "Security Analyst", "System Architect"
];

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
    case 'D': return 'bg-red-50 text-red-655 border border-red-250';
    default: return 'bg-rose-100 text-rose-800 border border-rose-250';
  }
};

const getQuestionMetadata = (idx, role) => {
  const meta = [
    { topic: "Candidate Intro & Background", difficulty: "Easy", time: "2 mins" },
    { topic: "Conceptual Fundamentals", difficulty: "Easy", time: "2 mins" },
    { topic: "Core Engineering Concepts", difficulty: "Medium", time: "2.5 mins" },
    { topic: "Framework Design Mechanics", difficulty: "Medium", time: "2.5 mins" },
    { topic: "Advanced Implementations", difficulty: "Medium", time: "3 mins" },
    { topic: "Debugging snippets", difficulty: "Hard", time: "3 mins" },
    { topic: "Optimization & Scaling Mechanics", difficulty: "Hard", time: "3.5 mins" },
    { topic: "Security protocols", difficulty: "Hard", time: "3.5 mins" },
    { topic: "Production Scenarios", difficulty: "Scenario", time: "4 mins" },
    { topic: "System Tradeoffs & Design Decisions", difficulty: "System Design", time: "4 mins" }
  ];
  return meta[idx] || { topic: "General Engineering Practice", difficulty: "Adaptive", time: "3 mins" };
};

const getEditorLanguage = (role) => {
  const r = (role || "").toLowerCase();
  if (r.includes("java") && !r.includes("javascript")) return "java";
  if (r.includes("javascript") || r.includes("react") || r.includes("node") || r.includes("frontend")) return "javascript";
  if (r.includes("c++") || r.includes("cpp")) return "cpp";
  if (r.includes("c#") || r.includes("csharp")) return "csharp";
  return "python";
};

export default function InterviewPractice() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const sessionIdParam = searchParams.get('session_id');

  // Setup / Control States
  const [role, setRole] = useState('Software Engineer');
  const [mode, setMode] = useState('text'); // 'text' | 'voice'
  const [difficulty, setDifficulty] = useState('Medium'); // 'Easy' | 'Medium' | 'Hard'
  const [category, setCategory] = useState('Technical'); // 'Technical' | 'HR' | 'Coding'
  const [activeSession, setActiveSession] = useState(null); // Current session object
  const [viewingPastSession, setViewingPastSession] = useState(null); // Viewing details of a past session
  const [inputText, setInputText] = useState('');
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
  
  // Search autocomplete & filters
  const [roleInputFocused, setRoleInputFocused] = useState(false);
  const [filterTab, setFilterTab] = useState('All');
  const [hasPrefilled, setHasPrefilled] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };
  
  // Voice & Video States
  const [isListening, setIsListening] = useState(false);
  const [synthesisEnabled, setSynthesisEnabled] = useState(true);
  const [speechError, setSpeechError] = useState('');
  const [aiSpeaking, setAiSpeaking] = useState(false);
  
  const recognitionRef = useRef(null);

  // References to prevent stale state in speech recognition callbacks
  const activeSessionRef = useRef(null);
  const modeRef = useRef('text');
  const inputTextRef = useRef('');

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);

  // 1. Fetch user profile for target role initialization
  const { data: profile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await apiClient.get('/api/profile/');
      return res.data?.data || res.data;
    }
  });

  useEffect(() => {
    if (profile && !hasPrefilled) {
      if (profile.target_role) {
        setRole(profile.target_role);
      }
      setHasPrefilled(true);
    }
  }, [profile, hasPrefilled]);

  // 2. Fetch Interview History
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['interviewHistory'],
    queryFn: async () => {
      const res = await apiClient.get('/api/assessments/interview/');
      return res.data?.data || res.data || [];
    }
  });

  const history = Array.isArray(historyData) ? historyData : [];

  useEffect(() => {
    if (sessionIdParam && history.length > 0) {
      const matched = history.find(s => s.id === sessionIdParam);
      if (matched) {
        setViewingPastSession(matched);
      }
    }
  }, [sessionIdParam, history]);

  // Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setSpeechError(`Microphone issue: ${event.error}`);
          setIsListening(false);
        }
      };

      rec.onend = () => {
        setIsListening(false);
        // Automatic submission on speech end boundary (Part 7)
        if (modeRef.current === 'voice' && activeSessionRef.current && inputTextRef.current.trim()) {
          respondMutation.mutate({
            sessionId: activeSessionRef.current.id,
            answer: inputTextRef.current
          });
        }
      };

      recognitionRef.current = rec;
    } else {
      setSpeechError('Speech recognition is not supported in this browser. Fallback to typing.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Web Speech Synthesis Reader
  const speakText = (text) => {
    if (!synthesisEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // stop current read
    const utterance = new SpeechUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setAiSpeaking(true);
    utterance.onend = () => {
      setAiSpeaking(false);
      // Automatically trigger voice recognition after AI recruiter finishes speaking (Part 7)
      if (modeRef.current === 'voice' && activeSessionRef.current) {
        startVoiceRecognition();
      }
    };
    window.speechSynthesis.speak(utterance);
  };

  const startVoiceRecognition = () => {
    if (!recognitionRef.current || isListening) return;
    setInputText('');
    setSpeechError('');
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.error(err);
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (newMode === 'voice' && category === 'Coding') {
      setCategory('Technical');
      showToast('Coding Interview is only available in Text mode. Switched to Technical Interview.', 'info');
    }
  };

  // Mutations
  const startMutation = useMutation({
    mutationFn: async ({ roleVal, modeVal, difficultyVal, categoryVal }) => {
      const res = await apiClient.post('/api/assessments/interview/start/', {
        role: roleVal,
        mode: modeVal,
        difficulty: difficultyVal,
        category: categoryVal
      });
      return res.data?.data || res.data;
    },
    onSuccess: (data) => {
      setActiveSession(data);
      setViewingPastSession(null);
      setInputText('');
      
      const firstQ = data.dialog[0]?.question;
      if (firstQ) {
        setTimeout(() => speakText(firstQ), 800);
      }
      showToast('Mock interview session started.');
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to start interview session.', 'error');
    }
  });

  const respondMutation = useMutation({
    mutationFn: async ({ sessionId, answer }) => {
      const res = await apiClient.post(`/api/assessments/interview/${sessionId}/respond/`, { answer });
      return res.data?.data || res.data;
    },
    onSuccess: (data) => {
      setActiveSession(data);
      setInputText('');
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      // Read next question if session not completed
      if (data.status !== 'completed') {
        const nextQ = data.dialog[data.dialog.length - 1]?.question;
        if (nextQ) {
          setTimeout(() => speakText(nextQ), 800);
        }
      } else {
        speakText("Thank you! The interview session has ended. We are generating your report.");
        refreshInterview(queryClient);
        refreshDashboard(queryClient);
        showToast('Interview completed. Scorecard report ready.');
      }
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to record response.', 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (sessionId) => {
      await apiClient.delete(`/api/assessments/interview/${sessionId}/delete/`);
    },
    onSuccess: (_, sessionId) => {
      queryClient.setQueryData(['interviewHistory'], (old) => {
        return old ? old.filter(item => item.id !== sessionId) : [];
      });
      refreshDashboard(queryClient);
      if (viewingPastSession && viewingPastSession.id === viewingPastSession) {
        setViewingPastSession(null);
      }
      showToast('Interview session deleted.');
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to delete interview session.', 'error');
    }
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/api/assessments/interview/delete-all/');
    },
    onSuccess: () => {
      queryClient.setQueryData(['interviewHistory'], []);
      refreshDashboard(queryClient);
      setActiveSession(null);
      setViewingPastSession(null);
      showToast('All interview history cleared.');
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to purge history.', 'error');
    }
  });

  const handleStartSession = (e) => {
    e.preventDefault();
    startMutation.mutate({
      roleVal: role,
      modeVal: mode,
      difficultyVal: difficulty,
      categoryVal: category
    });
  };

  const handleSendAnswer = () => {
    if (!inputText.trim() || respondMutation.isLoading) return;
    respondMutation.mutate({
      sessionId: activeSession.id,
      answer: inputText
    });
  };

  const handleCancelSession = () => {
    window.speechSynthesis?.cancel();
    setActiveSession(null);
  };

  // Autocomplete suggestions
  const filteredSuggestions = ROLE_SUGGESTIONS.filter(r =>
    r.toLowerCase().includes(role.toLowerCase())
  );

  // Statistics calculation (Phase 1)
  const completed = history.filter(h => h.status === 'completed');
  const drafts = history.filter(h => h.status !== 'completed');
  
  const totalInterviews = history.length;
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((acc, curr) => acc + (curr.evaluation?.overall_score || 0), 0) / completed.length)
    : 0;
  const bestScore = completed.length > 0
    ? Math.max(...completed.map(h => h.evaluation?.overall_score || 0))
    : 0;
  const practiceTimeMins = history.reduce((acc, h) => acc + (h.dialog?.length || 0) * 3.5, 0);
  const practiceTimeHours = (practiceTimeMins / 60).toFixed(1);

  // Filters (Phase 9)
  const filteredHistory = history.filter(session => {
    if (filterTab === 'All') return true;
    if (filterTab === 'Completed') return session.status === 'completed';
    if (filterTab === 'Draft') return session.status !== 'completed';
    if (filterTab === 'Text') return session.mode === 'text';
    if (filterTab === 'Voice') return session.mode === 'voice';
    return true;
  });

  if (filterTab === 'Highest Score') {
    filteredHistory.sort((a, b) => (b.evaluation?.overall_score || 0) - (a.evaluation?.overall_score || 0));
  } else if (filterTab === 'Newest') {
    filteredHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // Performance progression chart data and Interview Readiness dashboard metrics removed (centralized in final report page)

  // Rendering past reports and details
  const renderEvaluationReport = (session) => {
    const evalData = session.evaluation || {};
    const dialog = session.dialog || [];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setViewingPastSession(null);
                refetchHistory();
              }}
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <FiArrowLeft className="w-4 h-4 text-slate-655" />
            </button>
            <div>
              <h3 className="text-lg font-black text-slate-850 dark:text-white">Interview Evaluation Detail</h3>
              <p className="text-[10px] text-slate-455 font-medium">Position: {session.role} • Category: {session.category} • Difficulty: {session.difficulty || 'Medium'} • Created: {formatDate(session.created_at)}</p>
            </div>
          </div>

          <Button
            variant="danger"
            onClick={async () => {
              const ok = await confirm({
                title: 'Delete Report',
                message: 'Remove this interview report? This action cannot be undone.',
                type: 'delete',
                confirmText: 'Delete'
              });
              if (ok) {
                deleteMutation.mutate(session.id);
                setViewingPastSession(null);
              }
            }}
            className="flex items-center gap-1.5 text-xs py-1.5 font-bold"
          >
            <FiTrash2 className="w-4 h-4" /> Delete Report
          </Button>
        </div>

        {/* Evaluation Scores Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card hoverable={false} className="p-4 border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-center space-y-1">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Overall Score</span>
            <span className="text-2xl font-black text-slate-855 dark:text-white block">{evalData.overall_score || 0}%</span>
          </Card>
          <Card hoverable={false} className="p-4 border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-center space-y-1">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Technical Accuracy</span>
            <span className="text-2xl font-black text-emerald-500 block">{evalData.technical_score || 0}%</span>
          </Card>
          <Card hoverable={false} className="p-4 border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-center space-y-1">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Communication</span>
            <span className="text-2xl font-black text-sky-500 block">{evalData.communication_score || 0}%</span>
          </Card>
          <Card hoverable={false} className="p-4 border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-center space-y-1">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Confidence / Grammar</span>
            <span className="text-2xl font-black text-orange-500 block">{evalData.confidence_score || 0}%</span>
          </Card>
        </div>

        {/* Detailed Breakdown Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card hoverable={false} className="p-5 border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-455 dark:text-slate-400 tracking-wider">Evaluation Summary</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              {evalData.summary}
            </p>

            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-extrabold text-slate-455 block uppercase tracking-wider">Key Scores Breakdowns</span>
              <div className="space-y-1.5 text-[11px] font-semibold">
                <div className="flex justify-between">
                  <span>Grammar Competence:</span>
                  <span>{evalData.grammar_score}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Behavioral Performance:</span>
                  <span>{evalData.behavioral_score}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Problem Solving Capability:</span>
                  <span>{evalData.problem_solving_score}%</span>
                </div>
              </div>
            </div>
          </Card>

          <Card hoverable={false} className="p-5 border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Proven Strengths</span>
              {evalData.strengths && evalData.strengths.length > 0 ? (
                <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  {evalData.strengths.map((str, idx) => <li key={idx}>{str}</li>)}
                </ul>
              ) : (
                <p className="text-xs text-slate-450 italic">No specific strengths captured.</p>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest block">Critical Weaknesses</span>
              {evalData.weaknesses && evalData.weaknesses.length > 0 ? (
                <ul className="list-disc list-inside text-xs text-slate-655 dark:text-slate-400 space-y-1">
                  {evalData.weaknesses.map((weak, idx) => <li key={idx}>{weak}</li>)}
                </ul>
              ) : (
                <p className="text-xs text-slate-455 italic">No weaknesses captured.</p>
              )}
            </div>
          </Card>
        </div>

        {/* AI Recommendations Panel */}
        <Card hoverable={false} className="p-5 border border-orange-100 dark:border-orange-950/40 bg-gradient-to-br from-orange-50/20 to-amber-50/15 dark:from-orange-950/10 rounded-xl space-y-4">
          <h4 className="text-xs font-black uppercase text-orange-600 dark:text-orange-400 tracking-wider">AI Skill Roadmap and Career Recommendations</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div>
                <span className="font-extrabold text-[10px] uppercase text-slate-455 block mb-1">Target Training Path</span>
                {evalData.improvement_plan && evalData.improvement_plan.map((plan, idx) => (
                  <p key={idx} className="font-semibold text-slate-700 dark:text-slate-300 mb-1">• {plan}</p>
                ))}
              </div>
              <div>
                <span className="font-extrabold text-[10px] uppercase text-slate-455 block mb-1">Suggested Courses</span>
                <div className="flex flex-wrap gap-1.5">
                  {evalData.suggested_courses && evalData.suggested_courses.map((course, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-bold text-[10px]">
                      {course}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <span className="font-extrabold text-[10px] uppercase text-slate-455 block mb-1">Suggested Certifications</span>
                <div className="flex flex-wrap gap-1.5">
                  {evalData.suggested_certifications && evalData.suggested_certifications.map((cert, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-orange-100/50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-md font-bold text-[10px]">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-extrabold text-[10px] uppercase text-slate-455 block mb-1">Recommended Next Evaluation</span>
                <div className="flex flex-wrap gap-1.5">
                  {evalData.suggested_mock_tests && evalData.suggested_mock_tests.map((test, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-amber-50 dark:bg-slate-800 border border-amber-200 dark:border-amber-950/30 text-amber-700 dark:text-amber-400 rounded-md font-bold text-[10px]">
                      {test}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Full Chat Dialog Transcript */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase text-slate-455 dark:text-slate-400 tracking-wider">Interview Dialogue Transcript</h4>
          <div className="space-y-4">
            {dialog.map((turn, idx) => (
              <div key={idx} className="space-y-2">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl space-y-1">
                  <span className="font-extrabold text-[10px] text-orange-500 uppercase tracking-wider block">Question {idx + 1}</span>
                  <p className="text-xs text-slate-800 dark:text-white font-bold leading-relaxed">{turn.question}</p>
                </div>

                {turn.answer ? (
                  <div className="p-4 bg-white dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800 rounded-xl space-y-3 ml-6">
                    <span className="font-extrabold text-[10px] text-slate-455 block uppercase tracking-wider">Candidate Response</span>
                    {session.category === 'Coding' ? (
                      <pre className="p-3 bg-slate-55 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-750 overflow-x-auto whitespace-pre">
                        {turn.answer}
                      </pre>
                    ) : (
                      <p className="text-xs text-slate-655 dark:text-slate-350 italic leading-relaxed">"{turn.answer}"</p>
                    )}
                    
                    {turn.evaluation && (
                      <div className="border-t border-slate-100 dark:border-slate-850 pt-2.5 grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                        <div>
                          <span className="text-slate-400 block font-bold">Accuracy:</span>
                          <span className="font-black text-slate-700 dark:text-slate-200">{turn.evaluation.technical_accuracy}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold">Communication:</span>
                          <span className="font-black text-slate-700 dark:text-slate-200">{turn.evaluation.communication_quality}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold">Confidence:</span>
                          <span className="font-black text-slate-700 dark:text-slate-200">{turn.evaluation.confidence_level}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold">Grammar Feedback:</span>
                          <span className="font-black text-slate-700 dark:text-slate-250 block truncate">{turn.evaluation.grammar_feedback}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-red-50/30 text-red-500 border border-red-200 border-dashed rounded-xl ml-6 text-xs italic">
                    Candidate did not respond.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-7 text-left">
      {/* Header */}
      {!activeSession && !viewingPastSession && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-slate-100 dark:border-slate-850">
          <div>
            <h2 className="text-2xl font-black text-slate-850 dark:text-white flex items-center gap-2">
              <FiMessageSquare className="text-orange-500" /> AI Interview Practice Simulator
            </h2>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              Powered by Gemini AI • Technical • HR • Behavioral • Coding
            </p>
          </div>
          {profile?.target_role && (
            <div className="px-3.5 py-2 bg-orange-50/30 border border-orange-100/70 rounded-2xl">
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-455 block">Profile Target Role</span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 block capitalize mt-0.5">{profile.target_role}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      {viewingPastSession ? (
        renderEvaluationReport(viewingPastSession)
      ) : activeSession ? (
        /* Active Interview Simulator Screen */
        activeSession.mode === 'voice' ? (
          /* Voice Recruiter Interface (Part 6 & 7) */
          <div className="max-w-2xl mx-auto space-y-6 text-center">
            <Card hoverable={false} className="p-8 border border-slate-200 bg-white rounded-2xl shadow-sm flex flex-col items-center space-y-6">
              <h3 className="text-xs font-black text-slate-455 uppercase tracking-wider border-b border-slate-100 pb-2 w-full">AI Recruiter voice Simulator</h3>
              
              {/* spoken/displayed matching question */}
              <div className="p-6 bg-slate-50 rounded-2xl w-full border border-slate-100 text-left space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                  <span className="text-[9px] uppercase tracking-wider font-black text-orange-600">
                    AI Recruiter Speaking • Question {activeSession.dialog.length} of 10
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-black text-slate-450 capitalize">
                    {activeSession.category} Interview
                  </span>
                </div>
                <p className="text-sm text-slate-850 font-extrabold leading-relaxed">
                  {activeSession.dialog[activeSession.dialog.length - 1]?.question}
                </p>
              </div>

              {/* Microphone status only (Part 6) */}
              <div className="flex flex-col items-center space-y-3.5 w-full py-4">
                <div className={`p-5 rounded-full border transition-all duration-300 ${
                  isListening ? 'border-red-500 bg-red-50/50 animate-pulse' : 'border-slate-200 bg-slate-50'
                } mb-2`}>
                  <FiMic className={`w-10 h-10 ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
                </div>
                
                <div className="text-xs font-black uppercase tracking-widest">
                  {respondMutation.isLoading ? (
                    <span className="text-orange-600 animate-pulse">Evaluating Answer...</span>
                  ) : aiSpeaking ? (
                    <span className="text-sky-500 animate-pulse">AI Recruiter Speaking...</span>
                  ) : isListening ? (
                    <span className="text-red-500 animate-pulse">🎤 Listening...</span>
                  ) : (
                    <span className="text-slate-400">Mic Paused</span>
                  )}
                </div>
                
                <p className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider">
                  {isListening ? "Speak your answer naturally." : "Recruiter is speaking. Please wait..."}
                </p>
              </div>

              {inputText && (
                <div className="p-4 bg-orange-50/10 border border-orange-100 rounded-xl w-full">
                  <p className="text-xs text-slate-655 italic font-semibold leading-relaxed">
                    You: "{inputText}"
                  </p>
                </div>
              )}

              <div className="pt-2 w-full">
                <Button
                  onClick={handleCancelSession}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs transition shadow-sm"
                >
                  End Interview
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          /* Text Interview: Centered Single Column layout (Part 1) */
          <div className="max-w-4xl mx-auto space-y-4">
            <Card hoverable={false} className="border border-slate-150 bg-white rounded-2xl flex flex-col overflow-hidden h-[600px]">
              
              {/* Chat Header (Clean Question progress bar segmenting Part 11) */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-xs text-slate-800 truncate capitalize">
                    {activeSession.category} Interview Simulator
                  </h3>
                  <span className="text-[9px] text-slate-400 font-bold block">{activeSession.role} Panel • Difficulty: {activeSession.difficulty || 'Medium'}</span>
                </div>
                
                <div className="space-y-1 text-right flex-shrink-0">
                  <span className="text-[9px] font-extrabold text-slate-455 uppercase block">
                    Question {activeSession.dialog.length} of 10
                  </span>
                  <div className="w-32 bg-slate-150 h-2 rounded-full overflow-hidden flex">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-full flex-1 border-r border-white/30 last:border-r-0 ${
                          i < activeSession.dialog.length ? 'bg-orange-500' : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[8px] text-slate-450 font-bold block">
                    {Math.round((activeSession.dialog.length / 10) * 100)}% Complete
                  </span>
                </div>
              </div>

              {/* Chat Messages Log */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4.5 scrollbar-thin">
                {activeSession.dialog.map((turn, idx) => (
                  <React.Fragment key={idx}>
                    {/* Recruiter Question card layout */}
                    <div className="flex items-start gap-3 w-full text-left">
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center font-bold text-xs flex-shrink-0 text-slate-600 dark:text-slate-400 dark:text-[#8A9BB5] mt-1">
                        AI
                      </div>
                      <Card hoverable={false} className="flex-1 p-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl rounded-tl-none space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/50 pb-1.5">
                          <span className="text-[8px] uppercase tracking-wider font-black text-orange-600">
                            Question {idx + 1} of 10
                          </span>
                          <span className="text-slate-350 text-[9px] font-bold">•</span>
                          <span className="text-[8px] uppercase tracking-wider font-black text-slate-455">
                            Topic: {getQuestionMetadata(idx, role).topic}
                          </span>
                          <span className="text-slate-350 text-[9px] font-bold">•</span>
                          <span className="text-[8px] uppercase tracking-wider font-black text-slate-455">
                            Difficulty: {getQuestionMetadata(idx, role).difficulty}
                          </span>
                          <span className="text-slate-350 text-[9px] font-bold">•</span>
                          <span className="text-[8px] uppercase tracking-wider font-black text-sky-600">
                            Time: {getQuestionMetadata(idx, role).time}
                          </span>
                        </div>
                        
                        <p className="text-xs text-slate-800 dark:text-white leading-relaxed font-bold">
                          {turn.question}
                        </p>
                      </Card>
                    </div>

                    {/* Candidate Answer */}
                    {turn.answer && (
                      <div className="flex items-start gap-2.5 max-w-2xl ml-auto justify-end text-left">
                        <div className="bg-orange-50 p-3.5 rounded-2xl rounded-tr-none border border-orange-100 shadow-xs flex-1">
                          {activeSession.category === 'Coding' ? (
                            <pre className="p-3 bg-white/70 border border-slate-150 rounded-xl font-mono text-[10.5px] leading-relaxed text-slate-750 overflow-x-auto whitespace-pre">
                              {turn.answer}
                            </pre>
                          ) : (
                            <p className="text-xs text-slate-850 leading-relaxed font-medium">
                              {turn.answer}
                            </p>
                          )}
                        </div>
                        <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                          U
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                ))}

                {respondMutation.isLoading && (
                  <div className="flex items-start gap-2.5 max-w-sm text-left">
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      AI
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl rounded-tl-none border border-slate-150 flex items-center space-x-2">
                      <Loader skeleton={false} className="w-4.5 h-4.5" />
                      <span className="text-[9px] text-slate-455 font-bold uppercase tracking-wider animate-pulse">Evaluating answer & formulating follow-up...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Editor Bar (Part 1 & Coding editor Monaco integration Part 5) */}
              {activeSession.status !== 'completed' && (
                <div className="p-4 border-t border-slate-100 flex flex-col gap-2.5 bg-slate-50/30">
                  {activeSession.category === 'Coding' ? (
                    /* Monaco Coding Editor setup */
                    <div className="space-y-2 text-left">
                      <div className="flex justify-between items-center text-[10px] text-slate-450 font-black uppercase tracking-wider px-1">
                        <span>Coding Editor (Language: {getEditorLanguage(role)})</span>
                        <span>Use dark tab editor to compile program code</span>
                      </div>
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                        <Editor
                          height="200px"
                          language={getEditorLanguage(role)}
                          theme="vs-dark"
                          value={inputText}
                          onChange={(val) => setInputText(val || '')}
                          options={{
                            fontSize: 12,
                            minimap: { enabled: false },
                            lineNumbers: 'on',
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            wordWrap: 'on',
                            tabSize: 4
                          }}
                        />
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button
                          onClick={handleSendAnswer}
                          disabled={respondMutation.isLoading || !inputText.trim()}
                          className="py-2.5 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm"
                        >
                          <FiSend className="w-4 h-4" />
                          <span>Submit Solution</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Normal textarea editor layout */
                    <>
                      <div className="flex items-center gap-2">
                        <textarea
                          rows={3}
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendAnswer();
                            }
                          }}
                          placeholder="Type your interview answer..."
                          className="flex-1 text-xs p-3 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none font-medium text-slate-800"
                        />
                        <button
                          onClick={handleSendAnswer}
                          disabled={respondMutation.isLoading || !inputText.trim()}
                          className="p-3 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl transition flex-shrink-0 shadow-sm animate-fade"
                        >
                          <FiSend className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Character and word count */}
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-black uppercase tracking-wider px-1">
                        <span>Press Enter to submit • Shift+Enter for new line</span>
                        <span>
                          {inputText.length} characters • {inputText.trim() === "" ? 0 : inputText.trim().split(/\s+/).length} words
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleCancelSession}
                className="py-2 px-5 bg-red-50 border-red-200 text-red-600 hover:bg-red-100/50 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <FiSquare className="w-4 h-4" />
                <span>End Interview</span>
              </Button>
            </div>
          </div>
        )
      ) : (
        /* Configuration and Selection Mode Screen */
        <div className="space-y-8">
          
          {/* Statistics Dashboard Overview (Phase 1) */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="p-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl shadow-xs text-center">
              <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Total Interviews</span>
              <span className="text-lg font-black text-slate-800 block mt-1">{totalInterviews}</span>
            </div>
            <div className="p-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl shadow-xs text-center">
              <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Average Score</span>
              <span className="text-lg font-black text-slate-800 block mt-1">{avgScore}%</span>
            </div>
            <div className="p-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl shadow-xs text-center">
              <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Best Score</span>
              <span className="text-lg font-black text-orange-600 block mt-1">{bestScore}%</span>
            </div>
            <div className="p-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl shadow-xs text-center">
              <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Practice Time</span>
              <span className="text-lg font-black text-slate-800 block mt-1">{practiceTimeHours} hrs</span>
            </div>
            <div className="p-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl shadow-xs text-center">
              <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Completed</span>
              <span className="text-lg font-black text-emerald-600 block mt-1">{completed.length}</span>
            </div>
            <div className="p-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl shadow-xs text-center">
              <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Draft</span>
              <span className="text-lg font-black text-amber-500 block mt-1">{drafts.length}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Panel: Configuration Setup Card (Phase 2) */}
            <div className="lg:col-span-5">
              <Card hoverable={false} className="bg-white border border-slate-205 p-6 rounded-2xl shadow-sm space-y-5">
                <div>
                  <h3 className="text-base font-black text-slate-800 flex items-center space-x-2">
                    <FiCpu className="text-orange-500 w-5 h-5 animate-pulse" />
                    <span>Configure Session</span>
                  </h3>
                  <p className="text-[11px] text-slate-455 mt-1 leading-relaxed">
                    Set up your target role and select your category options.
                  </p>
                </div>

                <form onSubmit={handleStartSession} className="space-y-4 text-left">
                  
                  {/* Searchable Target Role Input */}
                  <div className="relative space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">Target Position/Role</label>
                    <div className="relative">
                      <FiSearch className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                      <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        onFocus={() => setRoleInputFocused(true)}
                        onBlur={() => setTimeout(() => setRoleInputFocused(false), 200)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 bg-slate-50/50 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-orange-500"
                        placeholder="e.g. Frontend Developer"
                        required
                      />
                    </div>
                    {roleInputFocused && filteredSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-xl shadow-lg z-25 max-h-48 overflow-y-auto">
                        {filteredSuggestions.map(sug => (
                          <button
                            key={sug}
                            type="button"
                            onMouseDown={() => {
                              setRole(sug);
                              setRoleInputFocused(false);
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-xs font-bold text-slate-700"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    )}
                    <span className="text-[9px] text-slate-400 block pt-0.5">
                      {profile?.target_role && role === profile.target_role
                        ? "Using your Profile Target Role. Search/type to edit."
                        : "Specify target career role or focus language framework."}
                    </span>
                  </div>

                  {/* Interview Mode Selectable Cards */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">Interview Mode</label>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div
                        onClick={() => handleModeChange('text')}
                        className={`p-3.5 rounded-2xl border cursor-pointer hover:-translate-y-0.5 transition-all duration-300 ${
                          mode === 'text'
                            ? 'border-orange-500 bg-orange-50/15 text-orange-700'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xl">💬</span>
                        <h4 className="font-extrabold text-xs mt-2 text-slate-800">Text Interview</h4>
                        <p className="text-[10px] text-slate-400 dark:text-[#8A9BB5] mt-1 leading-relaxed">Chat-based evaluation.</p>
                      </div>

                      <div
                        onClick={() => handleModeChange('voice')}
                        className={`p-3.5 rounded-2xl border cursor-pointer hover:-translate-y-0.5 transition-all duration-300 ${
                          mode === 'voice'
                            ? 'border-orange-500 bg-orange-50/15 text-orange-700'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xl">🎤</span>
                        <h4 className="font-extrabold text-xs mt-2 text-slate-800">Voice Interview</h4>
                        <p className="text-[10px] text-slate-400 dark:text-[#8A9BB5] mt-1 leading-relaxed">Voice simulator.</p>
                      </div>
                    </div>
                  </div>

                  {/* Explicit Category Selection (Part 4) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">Interview Category</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setCategory('Technical')}
                        className={`py-2 rounded-xl border font-bold text-[11px] transition ${
                          category === 'Technical'
                            ? 'border-orange-500 bg-orange-50/15 text-orange-700'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        Technical
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategory('HR')}
                        className={`py-2 rounded-xl border font-bold text-[11px] transition ${
                          category === 'HR'
                            ? 'border-orange-500 bg-orange-50/15 text-orange-700'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        HR
                      </button>
                      <button
                        type="button"
                        disabled={mode === 'voice'}
                        onClick={() => setCategory('Coding')}
                        className={`py-2 rounded-xl border font-bold text-[11px] transition ${
                          mode === 'voice'
                            ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-350 border-slate-200'
                            : category === 'Coding'
                              ? 'border-orange-500 bg-orange-50/15 text-orange-700'
                              : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'
                        }`}
                        title={mode === 'voice' ? "Coding Interviews are available only in Text Interview mode." : ""}
                      >
                        Coding
                      </button>
                    </div>
                  </div>

                  {/* Difficulty level selection (Part 3) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">Difficulty Level</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Easy', 'Medium', 'Hard'].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDifficulty(d)}
                          className={`py-2 rounded-xl border font-bold text-[11px] transition ${
                            difficulty === d
                              ? 'border-orange-500 bg-orange-50/15 text-orange-700'
                              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Informational parameters */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-2.5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Estimated Duration</span>
                      <span className="text-xs font-black text-slate-800 block mt-0.5">25–35 minutes</span>
                    </div>
                    <div className="p-2.5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">AI Recruiter</span>
                      <span className="text-xs font-black text-slate-800 block mt-0.5 font-bold">Gemini AI</span>
                    </div>
                    <div className="p-2.5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Questions Count</span>
                      <span className="text-xs font-black text-slate-800 block mt-0.5">10 Questions</span>
                    </div>
                    <div className="p-2.5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Interview Style</span>
                      <span className="text-xs font-black text-orange-600 block mt-0.5">Sequential</span>
                    </div>
                  </div>

                  {/* Start CTA Button Area */}
                  <div className="space-y-2 pt-2">
                    <Button
                      type="submit"
                      disabled={startMutation.isLoading}
                      className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition flex items-center justify-center space-x-2 shadow-sm"
                    >
                      {startMutation.isLoading ? <Loader skeleton={false} className="w-4 h-4 text-white" /> : <FiPlay className="w-4 h-4" />}
                      <span>Start AI Interview</span>
                    </Button>
                    <span className="text-[9px] text-slate-400 block text-center font-semibold">
                      Estimated session: 25–35 minutes
                    </span>
                  </div>
                </form>
              </Card>
            </div>

            {/* Right Panel: Past Attempts History Dashboard & Logs */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Heading Section */}
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Recent Interview Sessions
                </h3>
                {history.length > 0 && (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Clear History',
                        message: 'Are you sure you want to delete ALL interview history? This action is permanent.',
                        type: 'delete',
                        confirmText: 'Clear All'
                      });
                      if (ok) {
                        deleteAllMutation.mutate();
                      }
                    }}
                    disabled={deleteAllMutation.isLoading}
                    className="text-xs py-1.5 px-3 border border-red-200 text-red-500 hover:bg-red-50/50 transition font-bold"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" /> Clear History
                  </Button>
                )}
              </div>

              {/* Filters list */}
              <div className="bg-white border border-slate-205 p-4 rounded-2xl shadow-xs text-left">
                <div className="flex items-center space-x-1.5 overflow-x-auto w-full pr-1">
                  {['All', 'Completed', 'Draft', 'Text', 'Voice', 'Highest Score', 'Newest'].map(tab => (
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

              {/* List scoring grid */}
              {historyLoading && history.length === 0 ? (
                <Loader skeleton={true} variant="list" />
              ) : filteredHistory.length === 0 ? (
                /* Empty state design */
                <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] border-dashed rounded-2xl p-12 text-center space-y-4">
                  <FiActivity className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="font-extrabold text-slate-700 text-xs">No interview sessions yet.</h4>
                  <p className="text-[10px] text-slate-455 leading-relaxed max-w-xs mx-auto">
                    Practice with AI recruiters and receive detailed feedback after every interview.
                  </p>
                  <Button 
                    variant="secondary"
                    onClick={() => {
                      const inputElement = document.querySelector('input[placeholder="e.g. Frontend Developer"]');
                      if (inputElement) inputElement.focus();
                    }}
                    className="text-xs py-1.5 px-4 font-bold border border-orange-500 text-orange-500 hover:bg-orange-50"
                  >
                    Start Your First Interview
                  </Button>
                </div>
              ) : (
                <div className="space-y-4.5 text-left">
                  {filteredHistory.map((session) => {
                    const score = session.evaluation?.overall_score || 0;
                    const grade = getGrade(score);
                    const isComp = session.status === 'completed';
                    const dialogLength = session.dialog?.length || 0;
                    const completionPercent = Math.min(100, Math.round((dialogLength / 10) * 100));

                    return (
                      <Card
                        key={session.id}
                        className="p-5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl hover:border-orange-500/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-2 min-w-0 flex-1 pr-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-extrabold text-sm text-slate-850 truncate capitalize">
                              {session.role}
                            </h4>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-655">
                              {session.category || 'Technical'}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600">
                              {session.mode === 'voice' ? 'Voice Interview' : 'Text Interview'}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-655">
                              {session.difficulty || 'Medium'}
                            </span>
                            <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md border ${
                              isComp ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-amber-50 text-amber-600 border-orange-205'
                            }`}>
                              {isComp ? 'Completed' : `Draft • ${completionPercent}% Complete`}
                            </span>
                            {isComp && (
                              <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md ${getGradeBadgeStyle(grade)}`}>
                                Grade {grade}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                            <span>Questions: <span className="text-slate-700">{dialogLength}/10 Qns</span></span>
                            <span>•</span>
                            <span>Duration: <span className="text-slate-700">{dialogLength * 3} mins</span></span>
                            <span>•</span>
                            <span>Date: <span className="text-slate-700">{formatDate(session.created_at)}</span></span>
                            <span>•</span>
                            <span>AI Model: <span className="text-slate-700">Gemini AI</span></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3.5 flex-shrink-0 justify-end">
                          {isComp ? (
                            <div className="flex items-center gap-3">
                              {/* Premium circular indicator style badge */}
                              <div className="w-12 h-12 rounded-full border-2 border-orange-500/25 flex flex-col items-center justify-center bg-orange-50/10">
                                <span className="text-xs font-black text-slate-800">{score}%</span>
                              </div>
                              <Button
                                variant="secondary"
                                onClick={() => setViewingPastSession(session)}
                                className="text-xs py-1.5 px-3.5 font-bold hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors flex items-center space-x-1 shadow-sm rounded-xl"
                              >
                                <span>View Report</span>
                                <FiChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setActiveSession(session);
                                setViewingPastSession(null);
                              }}
                              className="text-xs py-1.5 px-3.5 font-bold bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 transition-colors flex items-center space-x-1 shadow-sm rounded-xl"
                            >
                              <span>Resume Interview</span>
                              <FiChevronRight className="w-4 h-4" />
                            </Button>
                          )}

                          <button
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Delete Report',
                                message: 'Remove this individual report? This action cannot be undone.',
                                type: 'delete',
                                confirmText: 'Delete'
                              });
                              if (ok) {
                                deleteMutation.mutate(session.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
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
