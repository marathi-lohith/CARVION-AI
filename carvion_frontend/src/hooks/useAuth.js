import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCredentials, logout as clearCredentials, setInitialized, setAuthError } from '../redux/slices/authSlice.js';
import apiClient from '../core/api/apiClient.js';
import { ROLES } from '../config/constants.js';

export default function useAuth() {
  const dispatch = useDispatch();
  const { user, isAuthenticated, isInitialized, error } = useSelector((state) => state.auth);

  // Authenticate user via login endpoint
  const login = useCallback(async (usernameOrEmail, password, portal = "user") => {
    dispatch(setAuthError(null));
    try {
      const response = await apiClient.post('/api/auth/login/', { username_or_email: usernameOrEmail, password, portal });
      const userData = response.data?.data || response.data;
      dispatch(setCredentials(userData));
      return userData;
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || 'Failed to authenticate user.';
      dispatch(setAuthError(errMsg));
      throw new Error(errMsg);
    }
  }, [dispatch]);

  // Log user session out
  const logout = useCallback(async () => {
    try {
      await apiClient.post('/api/auth/logout/');
    } catch (err) {
      console.error('Logout request failed on backend, cleaning up client state anyway:', err);
    } finally {
      dispatch(clearCredentials());
    }
  }, [dispatch]);

  // Refresh and check active cookie session on application boot
  const verifySession = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/auth/me/');
      const userData = response.data?.data || response.data;
      dispatch(setCredentials(userData));
    } catch (err) {
      dispatch(clearCredentials());
    } finally {
      dispatch(setInitialized(true));
    }
  }, [dispatch]);

  // Listen for automated session expiration events from axios interceptors
  useEffect(() => {
    const handleSessionExpired = () => {
      dispatch(clearCredentials());
    };
    
    window.addEventListener('auth-session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth-session-expired', handleSessionExpired);
    };
  }, [dispatch]);

  return {
    user,
    isAuthenticated,
    isInitialized,
    error,
    isAdmin: user?.role === ROLES.ADMIN,
    login,
    logout,
    verifySession,
  };
}
