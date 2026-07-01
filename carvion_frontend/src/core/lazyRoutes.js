import React from 'react';

// Custom lazy loading utility supporting promise-cached preloading
export const lazyWithPreload = (importFn) => {
  const Component = React.lazy(importFn);
  let preloadPromise = null;
  Component.preload = () => {
    if (!preloadPromise) {
      preloadPromise = importFn();
    }
    return preloadPromise;
  };
  return Component;
};

// Declaring route components with preloading capabilities
export const LandingPage = lazyWithPreload(() => import('../features/public/pages/LandingPage.jsx'));
export const Login = lazyWithPreload(() => import('../features/auth/pages/Login.jsx'));
export const OAuthCallback = lazyWithPreload(() => import('../features/auth/pages/OAuthCallback.jsx'));
export const DashboardOverview = lazyWithPreload(() => import('../features/dashboard/pages/DashboardOverview.jsx'));
export const ResumeWorkspace = lazyWithPreload(() => import('../features/resumes/pages/ResumeWorkspace.jsx'));
export const History = lazyWithPreload(() => import('../features/resumes/pages/History.jsx'));
export const ATSScore = lazyWithPreload(() => import('../features/resumes/pages/ATSScore.jsx'));
export const ResumeVersions = lazyWithPreload(() => import('../features/resumes/pages/ResumeVersions.jsx'));
export const JobBoard = lazyWithPreload(() => import('../features/recommendations/pages/JobBoard.jsx'));
export const SavedJobs = lazyWithPreload(() => import('../features/recommendations/pages/SavedJobs.jsx'));
export const Applications = lazyWithPreload(() => import('../features/recommendations/pages/Applications.jsx'));
export const CareerInsights = lazyWithPreload(() => import('../features/recommendations/pages/CareerInsights.jsx'));
export const CourseNavigator = lazyWithPreload(() => import('../features/recommendations/pages/CourseNavigator.jsx'));
export const SavedCourses = lazyWithPreload(() => import('../features/learning/pages/SavedCourses.jsx'));
export const InteractiveRoadmap = lazyWithPreload(() => import('../features/learning/pages/InteractiveRoadmap.jsx'));
export const LearningProgress = lazyWithPreload(() => import('../features/learning/pages/LearningProgress.jsx'));
export const MockTestSetup = lazyWithPreload(() => import('../features/assessments/pages/MockTestSetup.jsx'));
export const PerformanceReview = lazyWithPreload(() => import('../features/assessments/pages/PerformanceReview.jsx'));
export const InterviewPractice = lazyWithPreload(() => import('../features/assessments/pages/InterviewPractice.jsx'));
export const CareerAssistant = lazyWithPreload(() => import('../features/chatbot/pages/CareerAssistant.jsx'));
export const ResumeOptimizer = lazyWithPreload(() => import('../features/resumes/pages/ResumeOptimizer.jsx'));
export const CoverLetterGenerator = lazyWithPreload(() => import('../features/resumes/pages/CoverLetterGenerator.jsx'));
export const SkillGapAnalyzer = lazyWithPreload(() => import('../features/profiles/pages/SkillGapAnalyzer.jsx'));
export const Analytics = lazyWithPreload(() => import('../features/dashboard/pages/Analytics.jsx'));
export const NotificationsCenter = lazyWithPreload(() => import('../features/notifications/pages/NotificationsCenter.jsx'));
export const AdminConsole = lazyWithPreload(() => import('../features/admin/pages/AdminConsole.jsx'));
export const UserManagement = lazyWithPreload(() => import('../features/admin/pages/UserManagement.jsx'));
export const Register = lazyWithPreload(() => import('../features/auth/pages/Register.jsx'));
export const AdminLogin = lazyWithPreload(() => import('../features/auth/pages/AdminLogin.jsx'));
export const AccessDenied = lazyWithPreload(() => import('../features/auth/pages/AccessDenied.jsx'));
export const ProfileSettings = lazyWithPreload(() => import('../features/profiles/pages/ProfileSettings.jsx'));
export const Settings = lazyWithPreload(() => import('../features/profiles/pages/Settings.jsx'));
export const HelpSupport = lazyWithPreload(() => import('../features/public/pages/HelpSupport.jsx'));
export const AboutUs = lazyWithPreload(() => import('../features/public/pages/AboutUs.jsx'));
export const ContactUs = lazyWithPreload(() => import('../features/public/pages/ContactUs.jsx'));
export const PrivacyPolicy = lazyWithPreload(() => import('../features/public/pages/PrivacyPolicy.jsx'));
export const TermsConditions = lazyWithPreload(() => import('../features/public/pages/TermsConditions.jsx'));

// Map URL paths to preloadable page components
// Initially registers only the 6 public information routes:
export const routePreloadMap = {
  '/': LandingPage,
  '/help': HelpSupport,
  '/about': AboutUs,
  '/contact': ContactUs,
  '/privacy': PrivacyPolicy,
  '/terms': TermsConditions
};
