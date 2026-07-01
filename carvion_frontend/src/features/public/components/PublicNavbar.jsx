import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMenu, FiX, FiCompass, FiSun, FiMoon,
  FiBell, FiChevronDown, FiUser, FiSettings,
  FiLogOut, FiGrid
} from 'react-icons/fi';
import { ROUTES } from '../../../config/constants.js';
import { routePreloadMap } from '../../../core/lazyRoutes.js';
import { toggleTheme } from '../../../redux/slices/themeSlice.js';
import useAuth from '../../../hooks/useAuth.js';

export default function PublicNavbar() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { darkMode } = useSelector((state) => state.theme);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handlePreload = (path) => {
    const routeComp = routePreloadMap[path];
    if (routeComp && typeof routeComp.preload === 'function') {
      routeComp.preload();
    }
  };

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    await logout();
    navigate(ROUTES.LANDING, { replace: true });
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-250 shadow-sm shadow-slate-100/30 dark:shadow-slate-950/30 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link 
              to={isAuthenticated ? ROUTES.DASHBOARD : '/'} 
              onMouseEnter={() => !isAuthenticated && handlePreload('/')}
              onFocus={() => !isAuthenticated && handlePreload('/')}
              className="flex items-center space-x-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/10 group-hover:scale-105 transition-transform duration-200">
                <FiCompass className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-slate-800 dark:text-white">
                Carvion<span className="text-orange-500">AI</span>
              </span>
            </Link>
          </div>

          {/* Right Action buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={() => dispatch(toggleTheme())}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors border border-slate-100 dark:border-slate-800/80"
              title="Toggle theme"
            >
              {darkMode ? <FiSun className="w-4 h-4 text-amber-500" /> : <FiMoon className="w-4 h-4" />}
            </button>

            {isAuthenticated ? (
              /* ── Authenticated Nav ── */
              <>
                {/* Go to Dashboard */}
                <Link
                  to={ROUTES.DASHBOARD}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <FiGrid className="w-3.5 h-3.5" />
                  Dashboard
                </Link>

                {/* User profile dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center space-x-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none border border-slate-150/60 dark:border-slate-800"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-sm uppercase select-none">
                      {user?.name ? user.name[0] : 'U'}
                    </div>
                    <span className="hidden lg:inline text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {user?.name?.split(' ')[0] || 'User'}
                    </span>
                    <FiChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {userDropdownOpen && (
                      <motion.div
                        className="absolute right-0 mt-2.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 p-1.5 overflow-hidden"
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        onMouseLeave={() => setUserDropdownOpen(false)}
                      >
                        {/* User info header */}
                        <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-sm uppercase select-none shadow-sm flex-shrink-0">
                              {user?.name ? user.name[0] : 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{user?.name || 'User'}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{user?.email || ''}</p>
                            </div>
                          </div>
                        </div>

                        <Link
                          to={ROUTES.PROFILE}
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-655 dark:text-slate-300 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-700 dark:hover:text-orange-400 transition-colors"
                        >
                          <FiUser className="w-3.5 h-3.5 text-slate-400" />
                          <span>My Profile</span>
                        </Link>
                        <Link
                          to={ROUTES.SETTINGS}
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-655 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          <FiSettings className="w-3.5 h-3.5 text-slate-400" />
                          <span>Settings</span>
                        </Link>

                        <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />

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
              </>
            ) : (
              /* ── Guest Nav ── */
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition duration-200"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle & Theme Toggle */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => dispatch(toggleTheme())}
              className="p-2 rounded-lg text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border border-slate-100 dark:border-slate-800"
            >
              {darkMode ? <FiSun className="w-4 h-4 text-amber-400" /> : <FiMoon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-400 hover:text-slate-600 focus:outline-none p-1"
            >
              {mobileMenuOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800 px-4 pt-2 pb-6 space-y-4 shadow-inner">
          {isAuthenticated ? (
            /* ── Authenticated Mobile Nav ── */
            <div className="flex flex-col space-y-2">
              {/* User info */}
              <div className="flex items-center gap-3 px-1 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-sm uppercase select-none shadow-sm">
                  {user?.name ? user.name[0] : 'U'}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{user?.name || 'User'}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">{user?.email || ''}</p>
                </div>
              </div>
              <Link
                to={ROUTES.DASHBOARD}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm"
              >
                Go to Dashboard
              </Link>
              <Link
                to={ROUTES.PROFILE}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <FiUser className="w-3.5 h-3.5" />
                My Profile
              </Link>
              <Link
                to={ROUTES.SETTINGS}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <FiSettings className="w-3.5 h-3.5" />
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left w-full"
              >
                <FiLogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            /* ── Guest Mobile Nav ── */
            <div className="flex flex-col space-y-3">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
