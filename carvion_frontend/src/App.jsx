import React, { useEffect, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Layouts
import MainLayout from './core/layouts/MainLayout.jsx';
import AuthLayout from './core/layouts/AuthLayout.jsx';
import AdminLayout from './core/layouts/AdminLayout.jsx';

// Guards
import AuthGuard from './core/guards/AuthGuard.jsx';
import GuestGuard from './core/guards/GuestGuard.jsx';
import AdminGuard from './core/guards/AdminGuard.jsx';

import UserGuard from './core/guards/UserGuard.jsx';

// Components
import Loader from './components/common/Loader.jsx';



import {
  LandingPage, Login, OAuthCallback, DashboardOverview, ResumeWorkspace,
  History, ATSScore, ResumeVersions, JobBoard, SavedJobs, Applications,
  CareerInsights, CourseNavigator, SavedCourses, InteractiveRoadmap,
  LearningProgress, MockTestSetup, PerformanceReview, InterviewPractice,
  CareerAssistant, ResumeOptimizer, CoverLetterGenerator, SkillGapAnalyzer,
  Analytics, NotificationsCenter, AdminConsole, UserManagement, Register,
  AdminLogin, AccessDenied, ProfileSettings, Settings, HelpSupport,
  AboutUs, ContactUs, PrivacyPolicy, TermsConditions
} from './core/lazyRoutes.js';

import useAuth from './hooks/useAuth.js';

export default function App() {
  const { darkMode } = useSelector((state) => state.theme);
  const { verifySession, isInitialized } = useAuth();

  // Verify active session on app startup
  useEffect(() => {
    verifySession();
  }, [verifySession]);

  // Sync global Redux theme state to document HTML element class List
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  if (!isInitialized) {
    return <Loader fullScreen={true} />;
  }

  return (
    <Suspense fallback={<Loader fullScreen={true} />}>
      <Routes>
        {/* Public Marketing/Landing Routes */}
        <Route path="/" element={<Suspense fallback={<Loader fullScreen={true} />}><LandingPage /></Suspense>} />
        <Route path="/about" element={<Suspense fallback={<Loader />}><AboutUs /></Suspense>} />
        <Route path="/contact" element={<Suspense fallback={<Loader />}><ContactUs /></Suspense>} />
        <Route path="/help" element={<Suspense fallback={<Loader />}><HelpSupport /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={<Loader />}><PrivacyPolicy /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={<Loader />}><TermsConditions /></Suspense>} />

        {/* Guest Session Protected Paths */}
        <Route element={<GuestGuard />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="/admin/login" element={<AdminLogin />} />
          </Route>
        </Route>

        {/* Standard Authenticated User Workspace Paths */}
        <Route element={<UserGuard />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardOverview />} />
            <Route path="/resumes" element={<ResumeWorkspace />} />
            <Route path="/resumes/history" element={<History />} />
            <Route path="/resumes/ats-score" element={<ATSScore />} />
            <Route path="/resumes/versions" element={<ResumeVersions />} />
            <Route path="/jobs" element={<JobBoard />} />
            <Route path="/jobs/saved" element={<SavedJobs />} />
            <Route path="/jobs/applications" element={<Applications />} />
            <Route path="/career/insights" element={<CareerInsights />} />
            <Route path="/courses" element={<CourseNavigator />} />
            <Route path="/learning/saved-courses" element={<SavedCourses />} />
            <Route path="/roadmap" element={<InteractiveRoadmap />} />
            <Route path="/learning/progress" element={<LearningProgress />} />
            <Route path="/chat" element={<CareerAssistant />} />
            <Route path="/ai/resume-optimizer" element={<ResumeOptimizer />} />
            <Route path="/ai/cover-letter" element={<CoverLetterGenerator />} />
            <Route path="/ai/skill-gap" element={<SkillGapAnalyzer />} />
            <Route path="/test" element={<MockTestSetup />} />
            <Route path="/test/interview-practice" element={<InterviewPractice />} />
            <Route path="/test/review" element={<PerformanceReview />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/notifications" element={<NotificationsCenter />} />
            <Route path="/profile" element={<ProfileSettings />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="/admin/access-denied" element={<Suspense fallback={<Loader />}><AccessDenied /></Suspense>} />
        </Route>


        {/* Admin Dashboard Protected Console */}
        <Route element={<AdminGuard />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminConsole />} />
            <Route path="/admin/users" element={<UserManagement />} />
          </Route>
        </Route>

        {/* Error Redirects */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
