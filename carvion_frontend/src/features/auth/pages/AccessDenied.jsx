import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiLogOut, FiHome } from 'react-icons/fi';
import useAuth from '../../../hooks/useAuth.js';
import { ROUTES } from '../../../config/constants.js';

export default function AccessDenied() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 p-6">
      <div className="bg-white p-8 rounded-2xl border border-slate-150 shadow-xl max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
          <FiAlertCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">Access Denied</h2>
          <p className="text-sm text-slate-500 dark:text-[#8A9BB5] font-medium leading-relaxed">
            You do not have the required administrative permissions to access the Admin Dashboard.
            If you believe this is an error, please log out and authenticate with a different account.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <FiHome className="w-4 h-4" />
            Go to Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <FiLogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
