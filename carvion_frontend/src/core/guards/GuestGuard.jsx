import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ROUTES, ROLES } from '../../config/constants.js';

export default function GuestGuard() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (isAuthenticated) {
    if (user?.role === ROLES.ADMIN) {
      return <Navigate to={ROUTES.ADMIN} replace />;
    }
    // If standard user visits administrator guest route (like /admin/login), redirect to access-denied
    if (location.pathname.startsWith('/admin')) {
      return <Navigate to="/admin/access-denied" replace />;
    }
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <Outlet />;
}
