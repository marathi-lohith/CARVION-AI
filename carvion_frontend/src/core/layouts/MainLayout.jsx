import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import Loader from '../../components/common/Loader.jsx';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiGrid, FiFileText, FiBriefcase, FiBookOpen,
  FiMap, FiCpu, FiMessageSquare, FiBell,
  FiSettings, FiLogOut, FiMenu, FiChevronLeft,
  FiChevronDown, FiSun, FiMoon,
  FiUser, FiHelpCircle, FiTrendingUp, FiBookmark,
  FiPlus, FiActivity, FiX, FiArrowLeft, FiInfo,
  FiMail, FiBarChart2, FiTarget, FiAward
} from 'react-icons/fi';
import { toggleTheme } from '../../redux/slices/themeSlice.js';
import useAuth from '../../hooks/useAuth.js';
import useNotification from '../../hooks/useNotification.js';
import { ROUTES, ROLES } from '../../config/constants.js';
import apiClient from '../api/apiClient.js';
import Toast from '../../components/feedback/Toast.jsx';
import { routePreloadMap } from '../lazyRoutes.js';

export default function MainLayout() {
  const { user, logout, verifySession } = useAuth();
  const { darkMode } = useSelector((state) => state.theme);
  const { unreadCount } = useNotification();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Recovery modal state
  const [showRecoveryModal, setShowRecoveryModal] = useState(() => {
    const dismissed = sessionStorage.getItem('dismissed_account_recovery_modal');
    return !!(user?.is_pending_deletion && !dismissed);
  });
  const [toastState, setToastState] = useState({ isOpen: false, message: '', type: 'success' });
  const [isRecoverySubmitting, setIsRecoverySubmitting] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('dismissed_account_recovery_modal');
    if (user?.is_pending_deletion && !dismissed) {
      setShowRecoveryModal(true);
    } else {
      setShowRecoveryModal(false);
    }
  }, [user]);

  const formatDeletionDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const handleKeepAccount = async () => {
    setIsRecoverySubmitting(true);
    try {
      const response = await apiClient.post('/api/auth/cancel-deletion/');
      setToastState({
        isOpen: true,
        message: response.data.message || 'Welcome back! Your scheduled account deletion has been cancelled successfully.',
        type: 'success'
      });
      setShowRecoveryModal(false);
      sessionStorage.removeItem('dismissed_account_recovery_modal');
      await verifySession();
    } catch (err) {
      setToastState({
        isOpen: true,
        message: err.response?.data?.error?.message || 'Failed to cancel deletion request.',
        type: 'error'
      });
    } finally {
      setIsRecoverySubmitting(false);
    }
  };

  const handleContinueDeletion = () => {
    setShowRecoveryModal(false);
    sessionStorage.setItem('dismissed_account_recovery_modal', 'true');
  };

  // Retrieve initial expanded groups from localStorage or use defaults
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const stored = localStorage.getItem('expanded_sidebar_groups');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // use default
      }
    }
    return {
      resume: true,
      career: false,
      learning: false,
      aiTools: false,
      assessments: false,
      analysis: false,
      information: false,
    };
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const contentRef = useRef(null);

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    await logout();
    navigate(ROUTES.LANDING, { replace: true });
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(ROUTES.DASHBOARD);
    }
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => {
      const next = {
        ...prev,
        [groupId]: !prev[groupId]
      };
      localStorage.setItem('expanded_sidebar_groups', JSON.stringify(next));
      return next;
    });
  };

  // Active study duration tracking
  useEffect(() => {
    const learningPaths = [
      ROUTES.COURSES,
      ROUTES.SAVED_COURSES,
      ROUTES.ROADMAP,
      ROUTES.LEARNING_PROGRESS
    ];
    
    const currentPath = location.pathname;
    const isLearningPath = learningPaths.includes(currentPath);
    
    if (!isLearningPath || !user) return;
    
    // Map path to activity type
    let activityType = 'Roadmap';
    if (currentPath === ROUTES.COURSES || currentPath === ROUTES.SAVED_COURSES) {
      activityType = 'Video';
    }
    
    let intervalSeconds = 30; // ping every 30 seconds
    const intervalId = setInterval(async () => {
      try {
        await apiClient.post('/api/learning/session/pulse/', {
          activity_type: activityType,
          duration: intervalSeconds
        });
      } catch (err) {
        console.error('Failed to log learning pulse:', err);
      }
    }, intervalSeconds * 1000);
    
    // Also track initial page load as 5 seconds just in case they stay less than 30s but we want to capture entrance
    const initialTimeoutId = setTimeout(async () => {
      try {
        await apiClient.post('/api/learning/session/pulse/', {
          activity_type: activityType,
          duration: 5
        });
      } catch (e) {}
    }, 5000);
    
    return () => {
      clearInterval(intervalId);
      clearTimeout(initialTimeoutId);
    };
  }, [location.pathname, user]);

  // Synchronize expanded state based on active path matches
  useEffect(() => {
    const path = location.pathname;

    const hasActiveItem = (items) => {
      return items.some(item => item.path === path);
    };

    const hasActiveAnalytics = () => {
      return path === ROUTES.ANALYTICS;
    };

    const hasActiveInfo = () => {
      return [ROUTES.HELP, ROUTES.ABOUT, ROUTES.CONTACT].includes(path);
    };

    setExpandedGroups(prev => {
      let updated = false;
      const next = { ...prev };

      // Resume
      if (hasActiveItem([
        { path: ROUTES.RESUMES },
        { path: ROUTES.RESUME_HISTORY },
        { path: ROUTES.RESUME_VERSIONS },
        { path: ROUTES.ATS_SCORE }
      ]) && !prev.resume) {
        next.resume = true;
        updated = true;
      }
      // Career
      if (hasActiveItem([
        { path: ROUTES.JOBS },
        { path: ROUTES.SAVED_JOBS },
        { path: ROUTES.APPLICATIONS },
        { path: ROUTES.CAREER_INSIGHTS }
      ]) && !prev.career) {
        next.career = true;
        updated = true;
      }
      // Learning
      if (hasActiveItem([
        { path: ROUTES.COURSES },
        { path: ROUTES.SAVED_COURSES },
        { path: ROUTES.ROADMAP },
        { path: ROUTES.LEARNING_PROGRESS }
      ]) && !prev.learning) {
        next.learning = true;
        updated = true;
      }
      // AI Tools
      if (hasActiveItem([
        { path: ROUTES.CHAT },
        { path: ROUTES.RESUME_OPTIMIZER },
        { path: ROUTES.COVER_LETTER },
        { path: ROUTES.SKILL_GAP }
      ]) && !prev.aiTools) {
        next.aiTools = true;
        updated = true;
      }
      // Assessments
      if (hasActiveItem([
        { path: ROUTES.TEST },
        { path: ROUTES.INTERVIEW_PRACTICE },
        { path: ROUTES.TEST_REVIEW }
      ]) && !prev.assessments) {
        next.assessments = true;
        updated = true;
      }
      // Analysis
      if (hasActiveAnalytics() && !prev.analysis) {
        next.analysis = true;
        updated = true;
      }
      // Information
      if (hasActiveInfo() && !prev.information) {
        next.information = true;
        updated = true;
      }

      if (updated) {
        localStorage.setItem('expanded_sidebar_groups', JSON.stringify(next));
        return next;
      }
      return prev;
    });
  }, [location.pathname]);

  useEffect(() => {
    contentRef.current?.scrollTo({
      top: 0,
      behavior: 'auto',
    });
  }, [location.pathname]);

  // Check if an analytics tab is currently active
  const isAnalyticsActive = location.pathname === '/analytics';
  const getAnalyticsTab = () => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'dashboard';
  };

  const navigationGroups = [
    {
      title: 'Dashboard',
      items: [
        { name: 'Dashboard', path: ROUTES.DASHBOARD, icon: <FiGrid className="w-4 h-4" /> },
      ]
    },
    {
      title: 'Resume',
      id: 'resume',
      items: [
        { name: 'Resume Workspace', path: ROUTES.RESUMES, icon: <FiPlus className="w-4 h-4" /> },
        { name: 'Resume History', path: ROUTES.RESUME_VERSIONS, icon: <FiActivity className="w-4 h-4" /> },
        { name: 'ATS Score', path: ROUTES.ATS_SCORE, icon: <FiTrendingUp className="w-4 h-4" /> }
      ]
    },
    {
      title: 'Career',
      id: 'career',
      items: [
        { name: 'Job Board', path: ROUTES.JOBS, icon: <FiBriefcase className="w-4 h-4" /> },
        { name: 'Saved Jobs', path: ROUTES.SAVED_JOBS, icon: <FiBookmark className="w-4 h-4" /> },
        { name: 'Applications', path: ROUTES.APPLICATIONS, icon: <FiActivity className="w-4 h-4" /> },
        { name: 'Career Insights', path: ROUTES.CAREER_INSIGHTS, icon: <FiTarget className="w-4 h-4" /> }
      ]
    },
    {
      title: 'Learning',
      id: 'learning',
      items: [
        { name: 'Course Navigator', path: ROUTES.COURSES, icon: <FiBookOpen className="w-4 h-4" /> },
        { name: 'Saved Courses', path: ROUTES.SAVED_COURSES, icon: <FiBookmark className="w-4 h-4" /> },
        { name: 'Career Roadmap', path: ROUTES.ROADMAP, icon: <FiMap className="w-4 h-4" /> },
        { name: 'Learning Progress', path: ROUTES.LEARNING_PROGRESS, icon: <FiBarChart2 className="w-4 h-4" /> }
      ]
    },
    {
      title: 'AI Tools',
      id: 'aiTools',
      items: [
        { name: 'Career Assistant', path: ROUTES.CHAT, icon: <FiMessageSquare className="w-4 h-4" /> },
        { name: 'Resume Optimizer', path: ROUTES.RESUME_OPTIMIZER, icon: <FiCpu className="w-4 h-4" /> },
        { name: 'Cover Letter Generator', path: ROUTES.COVER_LETTER, icon: <FiFileText className="w-4 h-4" /> },
        { name: 'Skill Gap Analyzer', path: ROUTES.SKILL_GAP, icon: <FiActivity className="w-4 h-4" /> }
      ]
    },
    {
      title: 'Assessments',
      id: 'assessments',
      items: [
        { name: 'AI Mock Tests', path: ROUTES.TEST, icon: <FiCpu className="w-4 h-4" /> },
        { name: 'Interview Practice', path: ROUTES.INTERVIEW_PRACTICE, icon: <FiMessageSquare className="w-4 h-4" /> },
        { name: 'Performance Review', path: ROUTES.TEST_REVIEW, icon: <FiAward className="w-4 h-4" /> }
      ]
    },
    {
      title: 'Analysis',
      id: 'analysis',
      items: [
        { name: 'Analytics Dashboard', path: ROUTES.ANALYTICS, icon: <FiBarChart2 className="w-4 h-4" /> },
        { name: 'History Analytics', path: ROUTES.RESUME_HISTORY, icon: <FiActivity className="w-4 h-4" /> },
      ]
    },
  ];

  // Analytics sub-items (all route to /analytics with ?tab=...)
  const analyticsItems = [
    { name: 'Analytics Dashboard', tab: 'dashboard', icon: <FiGrid className="w-3.5 h-3.5" /> },
    { name: 'Resume Analytics', tab: 'resume', icon: <FiFileText className="w-3.5 h-3.5" /> },
    { name: 'Skill Analytics', tab: 'skill', icon: <FiActivity className="w-3.5 h-3.5" /> },
    { name: 'Job Analytics', tab: 'job', icon: <FiBriefcase className="w-3.5 h-3.5" /> },
    { name: 'Learning Analytics', tab: 'learning', icon: <FiBookOpen className="w-3.5 h-3.5" /> },
    { name: 'Assessment Analytics', tab: 'assessment', icon: <FiAward className="w-3.5 h-3.5" /> },
    { name: 'Profile Analytics', tab: 'profile', icon: <FiUser className="w-3.5 h-3.5" /> },
    { name: 'AI Career Insights', tab: 'ai-insights', icon: <FiCpu className="w-3.5 h-3.5" /> },
  ];

  const informationItems = [
    { name: 'Help Center', path: ROUTES.HELP, icon: <FiHelpCircle className="w-4 h-4" /> },
    { name: 'About Us', path: ROUTES.ABOUT, icon: <FiInfo className="w-4 h-4" /> },
    { name: 'Contact Us', path: ROUTES.CONTACT, icon: <FiMail className="w-4 h-4" /> },
  ];

  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    if (paths.length === 0) return ['Home'];
    return ['Workspace', ...paths.map(p => p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, ' '))];
  };

  const NavItem = ({ item, isMobile = false, indented = false }) => {
    // Support items whose path includes query params (e.g. /analytics?tab=history)
    const [itemPath, itemSearch] = item.path.split('?');
    const isActive = itemSearch
      ? location.pathname === itemPath && location.search === `?${itemSearch}`
      : location.pathname === item.path && !location.search;

    const handlePreload = () => {
      const routeComp = routePreloadMap[itemPath];
      if (routeComp && typeof routeComp.preload === 'function') {
        routeComp.preload();
      }
    };

    return (
      <Link
        to={item.path}
        onClick={() => isMobile && setMobileOpen(false)}
        onMouseEnter={handlePreload}
        onFocus={handlePreload}
        className={`flex items-center rounded-xl transition-all duration-[180ms] group relative ${
          indented ? 'p-2 pl-3.5' : 'p-2.5'
        } ${
          isActive
            ? 'bg-orange-500/[0.12] dark:bg-orange-500/[0.15] text-orange-600 dark:text-white font-semibold border-l-4 border-orange-500 rounded-r-xl rounded-l-none pl-3 shadow-[0_2px_8px_rgba(249,115,22,0.15),inset_0_0_12px_rgba(249,115,22,0.08)]'
            : 'text-slate-500 dark:text-[#8A9BB5] hover:bg-slate-50/80 dark:hover:bg-white/[0.06] hover:text-slate-800 dark:hover:text-[#CBD5E1]'
        }`}
        title={!sidebarOpen && !isMobile ? item.name : undefined}
      >
        <span className={`flex-shrink-0 transition-all duration-[180ms] ${
          isActive
            ? 'text-orange-500 dark:text-orange-400 scale-105'
            : 'text-slate-400 dark:text-[#5A6E8C] group-hover:text-slate-600 dark:group-hover:text-[#A8B8CE] group-hover:scale-105'
        }`}>
          {item.icon}
        </span>
        {(sidebarOpen || isMobile) && (
          <span className={`ml-2.5 truncate text-xs leading-none ${indented ? 'text-[11px]' : ''}`}>{item.name}</span>
        )}
        {!sidebarOpen && !isMobile && (
          <div className="absolute left-16 bg-slate-800 text-white text-[10px] px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg border border-slate-700">
            {item.name}
          </div>
        )}
      </Link>
    );
  };

  const AnalyticsNavItem = ({ item, isMobile = false }) => {
    const isActive = isAnalyticsActive && getAnalyticsTab() === item.tab;
    const path = `${ROUTES.ANALYTICS}?tab=${item.tab}`;
    return (
      <Link
        to={path}
        onClick={() => isMobile && setMobileOpen(false)}
        className={`flex items-center p-2 pl-3.5 rounded-xl transition-all duration-[180ms] group relative ${
          isActive
            ? 'bg-emerald-500/[0.12] dark:bg-emerald-500/[0.15] text-emerald-700 dark:text-white font-semibold border-l-4 border-emerald-500 rounded-r-xl rounded-l-none pl-3 shadow-[0_2px_8px_rgba(16,185,129,0.15),inset_0_0_12px_rgba(16,185,129,0.08)]'
            : 'text-slate-500 dark:text-[#8A9BB5] hover:bg-slate-50/80 dark:hover:bg-white/[0.06] hover:text-slate-800 dark:hover:text-[#CBD5E1]'
        }`}
        title={!sidebarOpen && !isMobile ? item.name : undefined}
      >
        <span className={`flex-shrink-0 transition-transform duration-200 ${
          isActive ? 'text-emerald-500 dark:text-emerald-400 scale-110' : 'text-slate-450 dark:text-[#5A6E8C] group-hover:text-slate-650 dark:group-hover:text-white group-hover:scale-105'
        }`}>
          {item.icon}
        </span>
        {(sidebarOpen || isMobile) && (
          <span className="ml-2.5 text-[11px] truncate">{item.name}</span>
        )}
        {!sidebarOpen && !isMobile && (
          <div className="absolute left-16 bg-slate-800 text-white text-[10px] px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg">
            {item.name}
          </div>
        )}
      </Link>
    );
  };

  const GroupHeader = ({ group, isMobile = false }) => {
    const hasSubmenu = !!group.id;
    const isExpanded = expandedGroups[group.id] ?? false;

    if (!sidebarOpen && !isMobile) {
      return <div className="h-px bg-slate-100 dark:bg-white/8 my-1.5 mx-2" />;
    }

    if (hasSubmenu) {
      return (
        <button
          onClick={() => toggleGroup(group.id)}
          className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-extrabold text-slate-400 dark:text-[#4A5980] uppercase tracking-widest hover:text-slate-600 dark:hover:text-[#8A9BB5] transition-colors duration-[180ms] rounded-md hover:bg-slate-50/60 dark:hover:bg-white/5"
        >
          <span>{group.title}</span>
          <FiChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
        </button>
      );
    }

    return (
      <div className="px-2 py-1.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
        {group.title}
      </div>
    );
  };

  const renderNavList = (isMobile = false) => (
    <div className="flex-1 overflow-y-auto overscroll-y-none px-3 py-3 space-y-3 scrollbar-thin dark:[color-scheme:dark]">
      {/* Standard navigation groups */}
      {navigationGroups.map((group) => {
        const hasSubmenu = !!group.id;
        const isExpanded = expandedGroups[group.id] ?? false;
        const showItems = !hasSubmenu || isExpanded || (!sidebarOpen && !isMobile);

        return (
          <div key={group.title} className="space-y-0.5">
            <GroupHeader group={group} isMobile={isMobile} />
            <AnimatePresence initial={false}>
              {showItems && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="space-y-0.5 overflow-hidden"
                >
                  {group.items.map((item) => (
                    <NavItem key={item.name} item={item} isMobile={isMobile} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Information group */}
      <div className="space-y-0.5">
        {(sidebarOpen || isMobile) ? (
          <button
            onClick={() => toggleGroup('information')}
            className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-extrabold text-slate-400 dark:text-[#4A5980] uppercase tracking-widest hover:text-slate-600 dark:hover:text-[#8A9BB5] transition-colors duration-[180ms] rounded-md hover:bg-slate-50/60 dark:hover:bg-white/5"
          >
            <span>Information</span>
            <FiChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedGroups.information ? 'rotate-180' : 'rotate-0'}`} />
          </button>
        ) : (
          <div className="h-px bg-slate-100 dark:bg-white/8 my-1.5 mx-2" />
        )}

        <AnimatePresence initial={false}>
          {(expandedGroups.information || (!sidebarOpen && !isMobile)) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="space-y-0.5 overflow-hidden"
            >
              {informationItems.map((item) => (
                <NavItem key={item.name} item={item} isMobile={isMobile} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Admin console link if applicable */}
      {user?.role === ROLES.ADMIN && (
        <div className="pt-1 border-t border-slate-100 dark:border-white/8">
          <Link
            to={ROUTES.ADMIN}
            onClick={() => isMobile && setMobileOpen(false)}
            className={`flex items-center p-2.5 rounded-xl transition-all duration-200 group relative ${
              location.pathname.startsWith('/admin')
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold border-l-2 border-emerald-500 rounded-l-none pl-3.5'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FiSettings className="w-4 h-4 text-emerald-500" />
            {(sidebarOpen || isMobile) && (
              <span className="ml-2.5 text-xs">Admin Console</span>
            )}
          </Link>
        </div>
      )}
    </div>
  );

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="h-screen overflow-hidden flex bg-[#f8fafc] dark:bg-[var(--surface-workspace)] text-slate-800 dark:text-[#CBD5E1] transition-colors duration-200 font-sans">
      {/* Desktop Sidebar */}
      <motion.aside
        className="hidden md:flex flex-col bg-white dark:bg-[var(--surface-shell)] border-r border-slate-200/60 dark:border-[var(--border-soft)] z-20 relative sticky top-0 h-screen shadow-sm dark:shadow-[2px_0_16px_rgba(0,0,0,0.3)]"
        animate={{ width: sidebarOpen ? 248 : 68 }}
        transition={{ duration: 0.22, ease: 'easeInOut' }}
      >
        {/* Sidebar Header / Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100/80 dark:border-[rgba(255,255,255,0.06)] flex-shrink-0">
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                className="font-black text-base bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent ml-1 tracking-tight flex items-center gap-1.5 select-none"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
              >
                Carvion<span className="text-orange-500 font-extrabold bg-orange-100 dark:bg-orange-950 text-[9px] px-1 py-0.5 rounded-md ml-0.5">AI</span>
              </motion.span>
            )}
          </AnimatePresence>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/8 text-slate-400 dark:text-[#6B7FA3] hover:text-slate-600 dark:hover:text-[#CBD5E1] transition-all duration-[180ms] ml-auto border border-slate-100/60 dark:border-[rgba(255,255,255,0.08)] flex-shrink-0"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <FiChevronLeft className={`w-3.5 h-3.5 transition-transform duration-200 ${!sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* User mini-avatar in collapsed mode */}
        {!sidebarOpen && (
          <div className="px-3 pt-3 pb-1 flex justify-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-sm uppercase select-none">
              {user?.name ? user.name[0] : 'U'}
            </div>
          </div>
        )}

        {renderNavList(false)}
      </motion.aside>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-[#141C2E] z-40 md:hidden flex flex-col border-r border-slate-200 dark:border-[rgba(255,255,255,0.07)] shadow-2xl"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            >
              <div className="h-14 flex items-center justify-between px-5 border-b border-slate-100 dark:border-[rgba(255,255,255,0.07)] flex-shrink-0">
                <span className="font-black text-base bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                  Carvion<span className="text-orange-500 font-extrabold bg-orange-100 dark:bg-orange-950 text-[9px] px-1 py-0.5 rounded-md ml-1">AI</span>
                </span>
                <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg border border-slate-100 dark:border-white/10 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                  <FiX className="w-4 h-4" />
                </button>
              </div>
              {renderNavList(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white dark:bg-[var(--surface-navbar)] border-b border-slate-100/80 dark:border-[var(--border-soft)] flex items-center justify-between px-4 z-10 sticky top-0 shadow-sm shadow-slate-100/30 dark:shadow-[0_1px_0_rgba(255,255,255,0.04),0_2px_12px_rgba(0,0,0,0.25)] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg border border-slate-150 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-500 dark:text-[#8A9BB5] hover:text-slate-800 dark:hover:text-white md:hidden transition-colors duration-[180ms]"
            >
              <FiMenu className="w-4 h-4" />
            </button>

            {/* Back button */}
            <button
              onClick={handleBack}
              className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-150 dark:border-white/10 text-slate-400 dark:text-[#8A9BB5] hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white transition-all duration-[180ms] hover:scale-105"
              title="Go back"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>

            {/* Breadcrumbs */}
            <div className="hidden sm:flex items-center space-x-1.5 text-xs font-medium text-slate-400 dark:text-[#5A6E8C]">
              {breadcrumbs.map((b, i) => (
                <React.Fragment key={`${b}-${i}`}>
                  {i > 0 && <span className="text-slate-200 dark:text-[#344050] px-0.5">/</span>}
                  <span className={i === breadcrumbs.length - 1 ? 'text-slate-700 dark:text-[#E2E8F0] font-semibold' : 'text-slate-400 dark:text-[#5A6E8C]'}>
                    {b}
                  </span>
                </React.Fragment>
              ))}
            </div>

            {/* Mobile page title */}
            <div className="sm:hidden font-extrabold text-sm text-slate-700 dark:text-[#CBD5E1]">
              {breadcrumbs[breadcrumbs.length - 1]}
            </div>
          </div>

          {/* Header Right Side */}
          <div className="flex items-center space-x-2">
            {/* Theme Toggle */}
            <button
              onClick={() => dispatch(toggleTheme())}
              className="p-2 rounded-lg text-slate-400 dark:text-[#8A9BB5] hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-650 dark:hover:text-white transition-colors duration-[180ms] border border-slate-150/60 dark:border-white/10"
              title="Toggle theme"
            >
              {darkMode ? <FiSun className="w-4 h-4 text-amber-500" /> : <FiMoon className="w-4 h-4" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setNotifOpen(!notifOpen); setUserDropdownOpen(false); }}
                className="p-2 rounded-lg text-slate-400 dark:text-[#8A9BB5] hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-600 dark:hover:text-white transition-all duration-[180ms] relative border border-slate-150/60 dark:border-white/10"
              >
                <FiBell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full" />
                )}
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl dark:shadow-none z-30 p-4"
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    onMouseLeave={() => setNotifOpen(false)}
                  >
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-white/10">
                      <span className="font-bold text-xs text-slate-700 dark:text-[#CBD5E1] uppercase tracking-wider">Recent Alerts</span>
                      <Link to={ROUTES.NOTIFICATIONS} className="text-xs text-orange-500 font-bold hover:underline" onClick={() => setNotifOpen(false)}>View all</Link>
                    </div>
                    <div className="py-6 text-xs text-slate-450 dark:text-slate-500 text-center font-medium">No new notifications.</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User profile dropdown */}
            <div className="relative">
              <button
                onClick={() => { setUserDropdownOpen(!userDropdownOpen); setNotifOpen(false); }}
                className="flex items-center space-x-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-[180ms] focus:outline-none border border-slate-150/60 dark:border-slate-700"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-sm uppercase select-none">
                  {user?.name ? user.name[0] : 'U'}
                </div>
                <FiChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {userDropdownOpen && (
                  <motion.div
                    className="absolute right-0 mt-2.5 w-52 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl dark:shadow-none z-30 p-1.5 overflow-hidden"
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    {/* User info header */}
                    <div className="px-3 py-2.5 border-b border-slate-100 dark:border-white/10 mb-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-sm uppercase select-none shadow-sm flex-shrink-0">
                          {user?.name ? user.name[0] : 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-[#CBD5E1] truncate">{user?.name || 'User'}</p>
                          <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] truncate">{user?.email || ''}</p>
                        </div>
                      </div>
                    </div>

                    <Link
                      to={ROUTES.PROFILE}
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-[#A8B8CE] rounded-xl hover:bg-orange-50 dark:hover:bg-orange-500/15 hover:text-orange-700 dark:hover:text-orange-400 transition-colors duration-[180ms]"
                    >
                      <FiUser className="w-3.5 h-3.5 text-slate-400" />
                      <span>My Profile</span>
                    </Link>
                    <Link
                      to={ROUTES.SETTINGS}
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-[#A8B8CE] rounded-xl hover:bg-slate-50 dark:hover:bg-white/8 hover:text-slate-900 dark:hover:text-white transition-colors duration-[180ms]"
                    >
                      <FiSettings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Settings</span>
                    </Link>

                    <div className="my-1 h-px bg-slate-100 dark:bg-white/8" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left"
                    >
                      <FiLogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main ref={contentRef} className="flex-1 overflow-y-auto overscroll-y-none p-5 md:p-6 bg-[#f8fafc] dark:bg-[var(--surface-workspace)]">
          <Suspense fallback={<Loader className="mt-8" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Account Recovery Dialog */}
      <AnimatePresence>
        {showRecoveryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 relative z-10 space-y-4"
            >
              <div className="flex items-center gap-2.5 text-rose-600">
                <FiAlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-bold">Account Recovery</h3>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed space-y-2 text-left">
                <p>Your account is currently scheduled for permanent deletion.</p>
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 rounded-xl p-3 text-rose-800 dark:text-rose-350">
                  <span className="font-bold text-[10px] uppercase tracking-wider block text-rose-600">Deletion Date:</span>
                  <span className="text-sm font-extrabold">{formatDeletionDate(user?.scheduled_deletion_date)}</span>
                </div>
                <p>Logging in indicates you want to continue using Carvion AI.</p>
                <p className="font-semibold text-slate-700 dark:text-slate-300">Would you like to cancel the scheduled deletion?</p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={handleContinueDeletion}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Continue Deletion
                </button>
                <button
                  onClick={handleKeepAccount}
                  disabled={isRecoverySubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {isRecoverySubmitting ? 'Cancelling...' : 'Keep My Account'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Toast
        isOpen={toastState.isOpen}
        message={toastState.message}
        type={toastState.type}
        onClose={() => setToastState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
