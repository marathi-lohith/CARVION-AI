import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import RegisterForm from '../components/RegisterForm.jsx';
import GoogleLoginButton from '../components/GoogleLoginButton.jsx';
import apiClient from '../../../core/api/apiClient.js';
import { setCredentials } from '../../../redux/slices/authSlice.js';
import { ROUTES, ROLES } from '../../../config/constants.js';

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleRegisterSubmit = async (data, setError) => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await apiClient.post('/api/auth/register/', {
        name: data.name,
        username: data.username,
        email: data.email,
        password: data.password,
      });
      const userPayload = response.data?.data || response.data;
      
      // Auto-login upon successful registration (backend sets JWT cookies in the same response)
      dispatch(setCredentials(userPayload));
      if (userPayload?.role === ROLES.ADMIN) {
        navigate(ROUTES.ADMIN, { replace: true });
      } else if (userPayload && !userPayload.onboarding_completed) {
        navigate(ROUTES.PROFILE, { replace: true });
      } else {
        navigate(ROUTES.DASHBOARD, { replace: true });
      }
    } catch (err) {
      const errorData = err.response?.data?.error;
      if (errorData?.code === 'ValidationError' && errorData?.details && setError) {
        Object.entries(errorData.details).forEach(([field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            setError(field, { type: 'manual', message: messages[0] });
          }
        });
        setAuthError('Validation failed. Please correct the errors below.');
      } else {
        setAuthError(errorData?.message || 'Registration failed. Please verify your details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialToken) => {
    setGoogleLoading(true);
    setAuthError(null);
    try {
      const response = await apiClient.post('/api/auth/google/', { token: credentialToken });
      const userPayload = response.data?.data || response.data;
      dispatch(setCredentials(userPayload));
      if (userPayload?.role === ROLES.ADMIN) {
        navigate(ROUTES.ADMIN, { replace: true });
      } else if (userPayload && !userPayload.onboarding_completed) {
        navigate(ROUTES.PROFILE, { replace: true });
      } else {
        navigate(ROUTES.DASHBOARD, { replace: true });
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
        <h2 className="text-2xl font-black tracking-tight text-slate-855 dark:text-white">Create Account</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
          Join Carvion AI today
        </p>
      </div>

      <RegisterForm
        onSubmit={handleRegisterSubmit}
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
        mode="signup"
      />

      <div className="border-t border-slate-100 dark:border-slate-855 pt-4 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-455 font-bold">
          Already have an account?{' '}
          <Link to={ROUTES.LOGIN} className="text-orange-500 font-bold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}


