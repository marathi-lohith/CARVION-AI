import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ROLES } from '../../config/constants.js';

export default function AdminGuard() {
  const { isAuthenticated, isInitialized, user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!isInitialized) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (user.role !== ROLES.ADMIN) {
    return <Navigate to="/admin/access-denied" replace />;
  }

  return <Outlet />;
}
