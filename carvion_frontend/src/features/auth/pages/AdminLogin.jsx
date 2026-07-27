import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiMail } from 'react-icons/fi';
import LoginForm from '../components/LoginForm.jsx';
import useAuth from '../../../hooks/useAuth.js';
import { ROUTES, ROLES } from '../../../config/constants.js';

export default function AdminLogin() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect target for authenticated admin
  const from = location.state?.from?.pathname || ROUTES.ADMIN;

  const handleCredentialsSubmit = async (data) => {
    setLoading(true);
    setAuthError(null);
    try {
      const loggedUser = await login(data.usernameOrEmail, data.password, "admin");
      if (loggedUser?.role === ROLES.ADMIN) {
        navigate(from, { replace: true });
      } else {
        setAuthError("Unauthorized user role. This console is restricted to administrators.");
      }
    } catch (err) {
      setAuthError(err.message || 'Incorrect username, email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 bg-white p-8 rounded-2xl border border-slate-150 shadow-xl max-w-md w-full mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">Admin Console</h2>
        <p className="text-sm text-slate-400 dark:text-[#8A9BB5] mt-1.5 font-medium">
          Sign in with administrator credentials
        </p>
      </div>

      <LoginForm
        onSubmit={handleCredentialsSubmit}
        loading={loading}
        error={authError}
        label="Email Address"
        placeholder="e.g. candidate@example.com"
        icon={<FiMail className="w-4 h-4 text-slate-400" />}
      />
    </div>
  );
}
