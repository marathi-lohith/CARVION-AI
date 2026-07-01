import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleTheme } from '../../../redux/slices/themeSlice.js';
import { FiSettings, FiSun, FiMoon, FiTrash2, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';
import useAuth from '../../../hooks/useAuth.js';
import apiClient from '../../../core/api/apiClient.js';
import Toast from '../../../components/feedback/Toast.jsx';

export default function Settings() {
  const dispatch = useDispatch();
  const { darkMode } = useSelector((state) => state.theme);
  const { user, logout, verifySession } = useAuth();

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [recommendationsAlerts, setRecommendationsAlerts] = useState(true);

  // Deletion state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });

  const triggerToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getRemainingDays = (dateStr) => {
    if (!dateStr) return 0;
    const target = new Date(dateStr);
    const now = new Date();
    const diffTime = target - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const response = await apiClient.post('/api/auth/delete-account/', { password });
      const data = response.data;
      const formattedDate = data.data?.formatted_date || '30 days from now';

      // Reset modal state
      setIsDeleteModalOpen(false);
      setPassword('');

      triggerToast(`Account deletion scheduled successfully. Your account will be permanently deleted on: ${formattedDate}`, 'success');

      // Logout after 1.8 seconds so toast can be read
      setTimeout(async () => {
        await logout();
      }, 1800);

    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.error || 'Failed to schedule deletion. Please check your password.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelDeletion = async () => {
    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/api/auth/cancel-deletion/');
      triggerToast(response.data.message || 'Scheduled account deletion has been cancelled successfully.', 'success');
      // Refresh current user state locally
      await verifySession();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to cancel deletion request.';
      triggerToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-[#F1F5F9] flex items-center gap-2">
          <FiSettings className="text-orange-500" /> Account Settings
        </h2>
        <p className="text-slate-400 dark:text-[#8A9BB5] text-xs mt-1">Configure dashboard preferences, theme selections, and notifications.</p>
      </div>

      <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl p-6 shadow-sm space-y-6">
        {/* Theme Settings */}
        <div className="space-y-3">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider text-slate-400 dark:text-[#4A5980]">Display Theme Settings</h3>
          <div className="flex items-center justify-between p-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-xl">
            <div>
              <h4 className="font-bold text-slate-750 text-xs">Application Appearance</h4>
              <p className="text-[10px] text-slate-400 dark:text-[#8A9BB5] mt-0.5">Toggle between Standard Light and Deep Dark interfaces.</p>
            </div>
            <button 
              onClick={() => dispatch(toggleTheme())}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-xl text-xs font-bold text-slate-655 transition hover:bg-slate-50 dark:hover:bg-slate-100"
            >
              {darkMode ? <><FiSun /> Use Light Mode</> : <><FiMoon /> Use Dark Mode</>}
            </button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="space-y-3">
          <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider text-slate-400 dark:text-[#4A5980]">Notification Alerts Settings</h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-xl">
              <div>
                <h4 className="font-bold text-slate-750 text-xs">Email Recommendations Digest</h4>
                <p className="text-[10px] text-slate-400 dark:text-[#8A9BB5] mt-0.5">Get weekly highlights of job openings and matching courses.</p>
              </div>
              <input 
                type="checkbox" 
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 text-orange-500 border-slate-350 rounded focus:ring-orange-400"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-xl">
              <div>
                <h4 className="font-bold text-slate-750 text-xs">In-App Recommendations Alerts</h4>
                <p className="text-[10px] text-slate-400 dark:text-[#8A9BB5] mt-0.5">Receive immediate notifications on mock tests grades reviews.</p>
              </div>
              <input 
                type="checkbox" 
                checked={recommendationsAlerts}
                onChange={(e) => setRecommendationsAlerts(e.target.checked)}
                className="w-4 h-4 text-orange-500 border-slate-350 rounded focus:ring-orange-400"
              />
            </div>
          </div>
        </div>

        {/* Deletion Information Banner (when deletion is pending) */}
        {user?.is_pending_deletion && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
            <div className="space-y-1">
              <h4 className="font-bold text-rose-800 text-sm flex items-center gap-2">
                <FiAlertTriangle className="text-rose-600" /> Account scheduled for deletion
              </h4>
              <p className="text-rose-700 text-xs leading-relaxed">
                Your account is scheduled for deletion in <span className="font-bold">{getRemainingDays(user.scheduled_deletion_date)} days</span> (on {formatDate(user.scheduled_deletion_date)}).
                Log in before this date to cancel deletion automatically.
              </p>
            </div>
            <button
              onClick={handleCancelDeletion}
              disabled={isSubmitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex-shrink-0 disabled:opacity-50"
            >
              Cancel Scheduled Deletion
            </button>
          </div>
        )}

        {/* Danger Zone Section */}
        <div className="pt-4 space-y-4">
          <div className="flex items-center gap-2 text-rose-600">
            <FiAlertTriangle className="w-4.5 h-4.5" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Danger Zone</h3>
          </div>
          <p className="text-slate-400 dark:text-[#8A9BB5] text-xs">
            Permanently delete your Carvion AI account and all associated data.
          </p>

          <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-sm">Delete Account</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                  Once you schedule account deletion, your account will enter a 30-day recovery period. 
                  During this period you can cancel the deletion simply by logging back into your account. 
                  After 30 days your account and all associated data will be permanently removed and cannot be recovered.
                </p>
              </div>
              {!user?.is_pending_deletion && (
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(true);
                    setPassword('');
                    setErrorMsg('');
                  }}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 flex-shrink-0"
                >
                  <FiTrash2 className="w-4 h-4" /> Delete My Account
                </button>
              )}
            </div>

            {/* Warning Box */}
            <div className="bg-rose-50/50 border border-rose-200/60 rounded-xl p-4 text-left space-y-3">
              <h5 className="font-bold text-rose-800 text-xs flex items-center gap-1.5">
                <FiAlertTriangle className="text-rose-600 w-3.5 h-3.5" /> Warning
              </h5>
              <p className="text-[11px] text-rose-700 font-semibold">
                Deleting your account will permanently remove:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[10px] text-rose-600 font-medium list-disc pl-4">
                <li>Profile information</li>
                <li>Uploaded resumes</li>
                <li>ATS reports</li>
                <li>Interview history</li>
                <li>Mock assessment history</li>
                <li>Learning roadmap progress</li>
                <li>Saved jobs</li>
                <li>Saved courses</li>
                <li>Analytics</li>
                <li>Settings</li>
                <li>AI chat history</li>
              </ul>
              <p className="text-[10px] text-rose-700 italic">
                This action becomes irreversible after the 30-day recovery period expires.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 relative z-10 space-y-4"
            >
              <div className="flex items-center gap-2.5 text-rose-600">
                <FiAlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-bold">Schedule Account Deletion</h3>
              </div>
              
              <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed space-y-2 text-left">
                <p>Are you sure you want to delete your Carvion AI account?</p>
                <p className="font-semibold text-slate-700 dark:text-slate-350">Your account will NOT be deleted immediately. Instead:</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                  <li>Your account will be deactivated.</li>
                  <li>A 30-day recovery period will begin.</li>
                  <li>Logging in during those 30 days automatically cancels the deletion request.</li>
                  <li>After 30 days all your data will be permanently deleted.</li>
                </ul>
                <p className="italic text-rose-600 font-semibold">This action cannot be reversed after the recovery period ends.</p>
              </div>

              <form onSubmit={handleConfirmDelete} className="space-y-3 pt-2">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Confirm current password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your current password"
                    required
                    className="w-full px-3 py-2 text-xs bg-[#fafbfd] border border-slate-200 rounded-xl focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition dark:bg-[#141C2E] dark:border-slate-700 dark:text-[#CBD5E1]"
                  />
                </div>

                {errorMsg && (
                  <p className="text-[10px] font-bold text-rose-600 text-left bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg">
                    {errorMsg}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Scheduling...' : 'Schedule Deletion'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Toast 
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
