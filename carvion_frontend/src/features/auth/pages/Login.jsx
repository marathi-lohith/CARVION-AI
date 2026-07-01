import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import LoginForm from '../components/LoginForm.jsx';
import GoogleLoginButton from '../components/GoogleLoginButton.jsx';
import useAuth from '../../../hooks/useAuth.js';
import apiClient from '../../../core/api/apiClient.js';
import { setCredentials } from '../../../redux/slices/authSlice.js';
import { ROUTES, ROLES } from '../../../config/constants.js';

export default function Login() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  // Redirect to original page attempt or fallback to standard user dashboard
  const from = location.state?.from?.pathname || ROUTES.DASHBOARD;

  const handleCredentialsSubmit = async (data) => {
    setLoading(true);
    setAuthError(null);
    try {
      const loggedUser = await login(data.email, data.password, "user");
      if (loggedUser?.role === ROLES.ADMIN) {
        const target = from.startsWith('/admin') ? from : ROUTES.ADMIN;
        navigate(target, { replace: true });
      } else if (loggedUser && !loggedUser.onboarding_completed) {
        navigate(ROUTES.PROFILE, { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setAuthError(err.message || 'Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialToken) => {
    setGoogleLoading(true);
    setAuthError(null);
    try {
      const response = await apiClient.post('/api/auth/google/', { token: credentialToken, portal: "user" });
      const userPayload = response.data?.data || response.data;
      dispatch(setCredentials(userPayload));
      if (userPayload?.role === ROLES.ADMIN) {
        const target = from.startsWith('/admin') ? from : ROUTES.ADMIN;
        navigate(target, { replace: true });
      } else if (userPayload && !userPayload.onboarding_completed) {
        navigate(ROUTES.PROFILE, { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setAuthError(err.response?.data?.error?.message || 'Google authentication failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleFailure = (err) => {
    setAuthError(err.message || 'Google Client verification failed.');
  };

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-xl max-w-md w-full mx-auto">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black tracking-tight text-slate-855 dark:text-white">Welcome Back</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
          Access your career workspace
        </p>
      </div>

      <LoginForm
        onSubmit={handleCredentialsSubmit}
        loading={loading || googleLoading}
        error={authError}
      />

      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
        <span className="flex-shrink mx-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Or</span>
        <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
      </div>

      <GoogleLoginButton
        onSuccess={handleGoogleSuccess}
        onFailure={handleGoogleFailure}
        mode="signin"
      />

      <div className="border-t border-slate-100 dark:border-slate-850 pt-4 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-455 font-bold">
          Don't have an account?{' '}
          <Link to={ROUTES.REGISTER} className="text-orange-500 font-bold hover:underline">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
