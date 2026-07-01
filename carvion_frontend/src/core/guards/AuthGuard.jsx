import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ROUTES } from '../../config/constants.js';

export default function AuthGuard() {
  const { isAuthenticated, isInitialized, user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!isInitialized) {
    // Show nothing or a basic loading state while checking the initial cookies verification
    return null; 
  }

  if (!isAuthenticated) {
    const isParamAdmin = location.pathname.startsWith('/admin');
    return <Navigate to={isParamAdmin ? '/admin/login' : ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (user && !user.onboarding_completed && location.pathname !== ROUTES.PROFILE) {
    return <Navigate to={ROUTES.PROFILE} replace />;
  }

  return <Outlet />;
}
