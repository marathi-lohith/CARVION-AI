import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import Loader from '../../components/common/Loader.jsx';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSliders, FiUsers, FiArrowLeft, FiShield,
  FiFileText, FiBriefcase, FiBookOpen, FiAward,
  FiCpu, FiBarChart2, FiLayers, FiMail, FiBell,
  FiSettings, FiActivity, FiSun, FiMoon, FiTool,
  FiChevronLeft, FiChevronRight, FiTrash2, FiCheck, FiAlertCircle, FiLogOut
} from 'react-icons/fi';
import { ROUTES } from '../../config/constants.js';
import { toggleTheme } from '../../redux/slices/themeSlice.js';
import useNotification from '../../hooks/useNotification.js';
import useAuth from '../../hooks/useAuth.js';

export default function AdminLayout() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { darkMode } = useSelector((state) => state.theme);
  const location = useLocation();
  const navigate = useNavigate();
  const contentRef = useRef(null);
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  useEffect(() => {
    contentRef.current?.scrollTo({
      top: 0,
      behavior: 'auto',
    });
  }, [location.pathname]);

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/admin/dashboard');
    }
  };

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotification();


  const searchParams = new URLSearchParams(location.search);
  const activeModule = searchParams.get('module') || 'dashboard';

  const adminMenu = [
    { name: 'Dashboard', path: '/admin?module=dashboard', id: 'dashboard', icon: <FiSliders className="w-4.5 h-4.5" /> },
    { name: 'User Management', path: '/admin?module=users', id: 'users', icon: <FiUsers className="w-4.5 h-4.5" /> },
    { name: 'Resume Management', path: '/admin?module=resumes', id: 'resumes', icon: <FiFileText className="w-4.5 h-4.5" /> },
    { name: 'Career Management', path: '/admin?module=jobs', id: 'jobs', icon: <FiBriefcase className="w-4.5 h-4.5" /> },
    { name: 'Learning Management', path: '/admin?module=learning', id: 'learning', icon: <FiBookOpen className="w-4.5 h-4.5" /> },
    { name: 'Assessment Management', path: '/admin?module=assessments', id: 'assessments', icon: <FiAward className="w-4.5 h-4.5" /> },
    { name: 'AI Management', path: '/admin?module=ai', id: 'ai', icon: <FiCpu className="w-4.5 h-4.5" /> },
    { name: 'Analytics', path: '/admin?module=analytics', id: 'analytics', icon: <FiBarChart2 className="w-4.5 h-4.5" /> },
    { name: 'System Maintenance', path: '/admin?module=content', id: 'content', icon: <FiTool className="w-4.5 h-4.5" /> },
    { name: 'Contact Messages', path: '/admin?module=contact_messages', id: 'contact_messages', icon: <FiMail className="w-4.5 h-4.5" /> },
    { name: 'Notifications', path: '/admin?module=notifications', id: 'notifications', icon: <FiBell className="w-4.5 h-4.5" /> },
    { name: 'Settings', path: '/admin?module=settings', id: 'settings', icon: <FiSettings className="w-4.5 h-4.5" /> },
    { name: 'Activity Logs', path: '/admin?module=activity_logs', id: 'activity_logs', icon: <FiActivity className="w-4.5 h-4.5" /> },
  ];

  // Helper to map module ID to clean breadcrumb name
  const getBreadcrumbName = (id) => {
    const matched = adminMenu.find(item => item.id === id);
    return matched ? matched.name : 'Console';
  };

  const currentInitials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD';

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#f8fafc] dark:bg-[var(--surface-workspace)] text-slate-800 dark:text-[#CBD5E1] transition-colors duration-200 font-sans">
      {/* Top Header */}
      <header className="h-16 bg-white dark:bg-[var(--surface-navbar)] border-b border-slate-200/50 dark:border-[var(--border-soft)] flex items-center justify-between px-6 shadow-sm dark:shadow-[0_1px_0_rgba(255,255,255,0.04),0_2px_12px_rgba(0,0,0,0.25)] sticky top-0 z-40">
        {/* Left Side: Brand & Breadcrumbs */}
        <div className="flex items-center space-x-4">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-200/60 dark:border-white/10 text-slate-500 dark:text-[#8A9BB5] hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white transition-all duration-[180ms] hover:scale-105"
            title="Go back"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <FiShield className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-sm tracking-wider uppercase bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent hidden sm:inline-block">
              Carvion Admin
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-2 text-xs font-semibold text-slate-400 dark:text-[#6B7FA3]">
            <span>Admin</span>
            <span>/</span>
            <span className="text-orange-500 dark:text-orange-400 font-bold transition-all duration-300">
              {getBreadcrumbName(activeModule)}
            </span>
          </div>
        </div>

        {/* Right Side: Quick Tools & Status */}
        <div className="flex items-center space-x-4">
          {/* Online system status badge */}
          <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-full text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span>SYSTEM ONLINE</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => dispatch(toggleTheme())}
            className="p-2 rounded-xl border border-slate-200/60 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-500 dark:text-[#8A9BB5] transition-colors duration-[180ms]"
            title="Toggle theme mode"
          >
            {darkMode ? <FiSun className="w-4 h-4 text-amber-500" /> : <FiMoon className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl border border-slate-200/60 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-500 dark:text-[#8A9BB5] transition-colors duration-[180ms] relative"
              title="Notifications Panel"
            >
              <FiBell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 border-2 border-white dark:border-[#161F2F] rounded-full text-[9px] text-white flex items-center justify-center font-black animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <>
                  {/* Backdrop click dismisser */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-3 w-80 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden text-slate-800 dark:text-[#CBD5E1]"
                  >
                    {/* Header */}
                    <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-150 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">System Alerts</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-[10px] text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 font-extrabold flex items-center gap-1 transition-colors"
                        >
                          <FiCheck className="w-3 h-3" /> Mark all read
                        </button>
                      )}
                    </div>

                    {/* Content List */}
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 scrollbar-thin">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-slate-400 dark:text-slate-550 flex flex-col items-center justify-center space-y-1">
                          <FiBell className="w-6 h-6 text-slate-300 dark:text-slate-700" />
                          <p className="text-[11px] font-bold">All clear! No alerts.</p>
                        </div>
                      ) : (
                        notifications.slice(0, 8).map((n) => (
                          <div
                            key={n.id}
                            className={`p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors flex items-start space-x-3 group relative cursor-pointer ${!n.is_read ? 'bg-orange-50/20 dark:bg-orange-950/5' : ''}`}
                            onClick={() => !n.is_read && markAsRead(n.id)}
                          >
                            {/* Icon Indicator */}
                            <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                              n.type === 'Job Alert' ? 'bg-blue-50 text-blue-500 dark:bg-blue-950/30' :
                              n.type === 'Course Suggestion' ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30' :
                              n.type === 'Mock Test Result' ? 'bg-amber-50 text-amber-500 dark:bg-amber-950/30' :
                              'bg-orange-50 text-orange-500 dark:bg-orange-950/30'
                            }`}>
                              {n.type === 'Mock Test Result' ? <FiActivity className="w-3.5 h-3.5" /> : <FiAlertCircle className="w-3.5 h-3.5" />}
                            </div>

                            {/* Message Details */}
                            <div className="flex-1 min-w-0 pr-4">
                              <p className={`text-xs font-bold truncate ${!n.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-650 dark:text-slate-350'}`}>
                                {n.title}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold line-clamp-2 mt-0.5 leading-relaxed">
                                {n.message}
                              </p>
                              <p className="text-[9px] text-slate-400 dark:text-slate-600 font-bold mt-1 uppercase tracking-tight">
                                {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                              </p>
                            </div>

                            {/* Actions (Delete icon) */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(n.id);
                              }}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                              title="Delete notification"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <Link
                      to="/admin?module=notifications"
                      onClick={() => setShowNotifications(false)}
                      className="block text-center py-2.5 text-[11px] font-black text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/10 hover:bg-slate-50 dark:hover:bg-slate-950/30 transition-colors uppercase tracking-wider"
                    >
                      View Notification History
                    </Link>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Operator Profile Info */}
          <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200/60 dark:border-white/10">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-extrabold text-slate-800 dark:text-[#CBD5E1]">{user?.name || 'Administrator'}</p>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-[#6B7FA3]">{user?.email}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center border-2 border-orange-100 dark:border-orange-900 shadow-sm">
              {currentInitials}
            </div>
          </div>

          {/* Sign Out button */}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 text-xs bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-900/50 px-3 py-1.5 rounded-xl transition-all duration-[180ms] font-bold"
          >
            <FiLogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Container */}
        <motion.aside
          animate={{ width: isCollapsed ? 76 : 256 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="bg-white dark:bg-[var(--surface-shell)] border-r border-slate-200/50 dark:border-[var(--border-soft)] flex flex-col justify-between hidden md:flex overflow-hidden relative dark:shadow-[2px_0_16px_rgba(0,0,0,0.3)]"
        >
          {/* Menu Items */}
          <div className="p-3 space-y-1.5 flex-1 overflow-y-auto overscroll-y-none scrollbar-thin">
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-[#4A5980] tracking-wider uppercase whitespace-nowrap">
                {isCollapsed ? 'CTRL' : 'Control Panel'}
              </span>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 bg-slate-50 dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-500 dark:text-[#8A9BB5] border border-slate-200/50 dark:border-white/10 rounded-lg transition-colors duration-[180ms] cursor-pointer flex-shrink-0"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? <FiChevronRight className="w-3.5 h-3.5" /> : <FiChevronLeft className="w-3.5 h-3.5" />}
              </button>
            </div>
            {adminMenu.map((item) => {
              const isActive = activeModule === item.id;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center transition-all duration-[180ms] rounded-xl relative ${
                    isActive
                      ? 'bg-orange-500/[0.12] dark:bg-orange-500/[0.15] text-orange-600 dark:text-white font-semibold border-l-4 border-orange-500 rounded-r-xl rounded-l-none pl-3 shadow-[0_2px_8px_rgba(249,115,22,0.15),inset_0_0_12px_rgba(249,115,22,0.08)]'
                      : 'text-slate-500 dark:text-[#8A9BB5] hover:bg-slate-50/80 dark:hover:bg-white/[0.06] hover:text-slate-800 dark:hover:text-[#CBD5E1] hover:translate-x-1 pl-4'
                  } py-2.5`}
                  title={isCollapsed ? item.name : ''}
                >
                  <span className={`transition-transform duration-200 flex-shrink-0 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                    {item.icon}
                  </span>
                  
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="ml-3 text-xs font-semibold whitespace-nowrap"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </Link>
              );
            })}
          </div>

        </motion.aside>

        <main ref={contentRef} className="flex-1 overflow-y-auto overscroll-y-none bg-[#f8fafc] dark:bg-[var(--surface-workspace)]">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="p-6 md:p-8"
          >
            <Suspense fallback={<Loader className="mt-8" />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
