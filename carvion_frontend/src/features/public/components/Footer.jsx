import React from 'react';
import { Link } from 'react-router-dom';
import { FiCompass, FiGithub, FiLinkedin, FiMail } from 'react-icons/fi';
import { ROUTES } from '../../../config/constants.js';
import { routePreloadMap } from '../../../core/lazyRoutes.js';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const version = 'v1.1.2';

  const handlePreload = (path) => {
    const routeComp = routePreloadMap[path];
    if (routeComp && typeof routeComp.preload === 'function') {
      routeComp.preload();
    }
  };

  return (
    <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800/80 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {/* Brand block */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1 space-y-4">
            <Link 
              to={ROUTES.LANDING} 
              onMouseEnter={() => handlePreload(ROUTES.LANDING)}
              onFocus={() => handlePreload(ROUTES.LANDING)}
              className="flex items-center space-x-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/10 group-hover:scale-105 transition-transform duration-200">
                <FiCompass className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-slate-800 dark:text-slate-100">
                Carvion<span className="text-orange-500">AI</span>
              </span>
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs font-medium">
              Empower your career transition with state-of-the-art AI parsing, ATS analysis, resume optimization, and tailored educational pathways.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 dark:text-[#6B7FA3] uppercase tracking-wider">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs font-semibold">
              <li>
                <Link 
                  to={ROUTES.LANDING} 
                  onMouseEnter={() => handlePreload(ROUTES.LANDING)}
                  onFocus={() => handlePreload(ROUTES.LANDING)}
                  className="text-slate-600 dark:text-slate-350 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  to={ROUTES.CONTACT} 
                  onMouseEnter={() => handlePreload(ROUTES.CONTACT)}
                  onFocus={() => handlePreload(ROUTES.CONTACT)}
                  className="text-slate-600 dark:text-slate-350 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link 
                  to={ROUTES.HELP} 
                  onMouseEnter={() => handlePreload(ROUTES.HELP)}
                  onFocus={() => handlePreload(ROUTES.HELP)}
                  className="text-slate-600 dark:text-slate-350 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
                  Help Center
                </Link>
              </li>
            </ul>
          </div>

          {/* AI Tools */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 dark:text-[#6B7FA3] uppercase tracking-wider">
              AI Tools
            </h4>
            <ul className="space-y-2 text-xs font-semibold">
              <li>
                <Link to="/login" className="text-slate-600 dark:text-slate-350 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
                  Resume Analyzer
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-600 dark:text-slate-350 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
                  Resume Optimizer
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-600 dark:text-slate-350 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
                  Cover Letter Generator
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-600 dark:text-slate-350 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
                  Skill Gap Analyzer
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-600 dark:text-slate-350 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
                  Interview Practice
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-600 dark:text-slate-350 hover:text-orange-500 dark:hover:text-orange-400 transition-colors">
                  Career Assistant
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 dark:text-[#6B7FA3] uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-2 text-xs font-semibold">
              <li>
                <Link 
                  to={ROUTES.ABOUT} 
                  onMouseEnter={() => handlePreload(ROUTES.ABOUT)}
                  onFocus={() => handlePreload(ROUTES.ABOUT)}
                  className="text-slate-600 dark:text-slate-350 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link 
                  to={ROUTES.PRIVACY} 
                  onMouseEnter={() => handlePreload(ROUTES.PRIVACY)}
                  onFocus={() => handlePreload(ROUTES.PRIVACY)}
                  className="text-slate-600 dark:text-slate-350 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  to={ROUTES.TERMS} 
                  onMouseEnter={() => handlePreload(ROUTES.TERMS)}
                  onFocus={() => handlePreload(ROUTES.TERMS)}
                  className="text-slate-600 dark:text-slate-350 hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
                >
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 dark:text-[#6B7FA3] uppercase tracking-wider">
              Support
            </h4>
            <ul className="space-y-2 text-xs font-semibold">
              <li>
                <span className="text-slate-450 dark:text-slate-400">FAQ</span>
              </li>
              <li>
                <span className="text-slate-450 dark:text-slate-400">Feedback</span>
              </li>
              <li>
                <span className="text-slate-450 dark:text-slate-400">Report a Bug</span>
              </li>
            </ul>

            <div className="pt-2">
              <h4 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 dark:text-[#6B7FA3] uppercase tracking-widest mb-2">
                Connect
              </h4>
              <div className="flex space-x-3.5 text-slate-400 dark:text-slate-550">
                <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                  <FiGithub className="w-4.5 h-4.5" />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                  <FiLinkedin className="w-4.5 h-4.5" />
                </a>
                <a href="mailto:support@carvion.ai" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                  <FiMail className="w-4.5 h-4.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200/50 dark:border-slate-800/60 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-450 dark:text-slate-500 dark:text-[#8A9BB5] font-medium">
          <p>
            &copy; {currentYear} Carvion AI. All rights reserved.
          </p>
          <div className="flex items-center space-x-3">
            <span>Version {version}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
