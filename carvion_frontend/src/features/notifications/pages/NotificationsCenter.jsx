import React, { useState } from 'react';
import useNotification from '../../../hooks/useNotification.js';
import useAuth from '../../../hooks/useAuth.js';
import NotificationItem from '../components/NotificationItem.jsx';
import BroadcastModal from '../components/BroadcastModal.jsx';
import Card from '../../../components/common/Card.jsx';
import Button from '../../../components/common/Button.jsx';
import Badge from '../../../components/common/Badge.jsx';
import { useMutation } from '@tanstack/react-query';
import apiClient from '../../../core/api/apiClient.js';
import Toast from '../../../components/feedback/Toast.jsx';
import { FiBell, FiCheckSquare, FiAlertCircle } from 'react-icons/fi';

export default function NotificationsCenter() {
  const { user, isAdmin } = useAuth();
  const { 
    notifications = [], 
    unreadCount, 
    markAsRead, 
    markAllAsRead 
  } = useNotification();

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  // Broadcast alert mutation (Admin only)
  const { mutate: broadcastAlert, isLoading: broadcasting } = useMutation({
    mutationFn: async (payload) => {
      await apiClient.post('/api/notifications/broadcast/', payload);
    },
    onSuccess: () => {
      showToast('System announcement broadcasted successfully.');
      setBroadcastOpen(false);
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Failed to dispatch broadcast.';
      showToast(msg, 'error');
    }
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2.5">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">Notifications Center</h2>
          {unreadCount > 0 && (
            <Badge variant="danger" className="text-[10px] py-0.5 font-bold">
              {unreadCount} Unread
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              onClick={markAllAsRead}
              className="flex items-center space-x-1.5 text-xs px-3.5 py-2 font-bold"
            >
              <FiCheckSquare className="w-4 h-4 text-slate-500" />
              <span>Mark All Read</span>
            </Button>
          )}

          {isAdmin && (
            <Button
              onClick={() => setBroadcastOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white flex items-center space-x-1.5 text-xs px-3.5 py-2 font-bold shadow-md shadow-orange-500/10"
            >
              <FiBell className="w-4 h-4 text-white" />
              <span>Broadcast Alert</span>
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card hoverable={false} className="py-16 text-center max-w-lg mx-auto space-y-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] shadow-sm">
          <FiBell className="w-12 h-12 text-slate-300 mx-auto animate-float" />
          <div className="space-y-1.5">
            <h4 className="font-extrabold text-slate-800 text-lg">Clean Inbox</h4>
            <p className="text-xs text-slate-450 font-medium leading-relaxed">
              No recent notifications or announcements received.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3.5">
          {notifications.map((item) => (
            <NotificationItem
              key={item.id}
              notification={item}
              onMarkRead={markAsRead}
            />
          ))}
        </div>
      )}

      {/* Admin Broadcast Dialog */}
      <BroadcastModal
        isOpen={broadcastOpen}
        onClose={() => setBroadcastOpen(false)}
        onBroadcast={broadcastAlert}
        loading={broadcasting}
      />

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
