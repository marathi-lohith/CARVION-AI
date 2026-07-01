import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ROUTES, ROLES } from '../../config/constants.js';

export default function UserGuard() {
  const { isAuthenticated, isInitialized, user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!isInitialized) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Allow standard user role
  if (user.role !== ROLES.STANDARD && user.role !== 'user') {
    if (user.role === ROLES.ADMIN) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (!user.onboarding_completed && location.pathname !== ROUTES.PROFILE) {
    return <Navigate to={ROUTES.PROFILE} replace />;
  }

  return <Outlet />;
}
