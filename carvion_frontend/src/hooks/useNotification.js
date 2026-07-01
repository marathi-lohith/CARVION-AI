import { useState, useEffect, useCallback } from 'react';
import apiClient from '../core/api/apiClient.js';
import { ENV } from '../config/env.js';

export default function useNotification() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch initial notifications log on mount
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/notifications/');
      const data = response.data?.data || response.data || [];
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    } catch (err) {
      console.error('Failed to load active notifications:', err);
    }
  }, []);

  // Mark a specific notification record as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await apiClient.post(`/api/notifications/${notificationId}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.post('/api/notifications/read-all/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  }, []);

  // Delete a specific notification record
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await apiClient.delete(`/api/notifications/${notificationId}/delete/`);
      setNotifications((prev) => {
        const deletedNotif = prev.find((n) => n.id === notificationId);
        if (deletedNotif && !deletedNotif.is_read) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        return prev.filter((n) => n.id !== notificationId);
      });
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  }, []);

  // Subscribe to real-time notification streams via Server-Sent Events (SSE)
  useEffect(() => {
    fetchNotifications();

    const sseUrl = `${ENV.API_URL}/api/notifications/stream/`;
    const eventSource = new EventSource(sseUrl, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const newNotif = JSON.parse(event.data);
        setNotifications((prev) => [newNotif, ...prev]);
        setUnreadCount((prev) => prev + 1);
      } catch (err) {
        console.error('Error parsing SSE event data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE connection interrupted, retrying...', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

