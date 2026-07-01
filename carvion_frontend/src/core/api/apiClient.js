import axios from 'axios';
import { ENV } from '../../config/env.js';

const apiClient = axios.create({
  baseURL: ENV.API_URL,
  withCredentials: true, // Required to send HTTP-only authentication cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Response interceptor to manage automated JWT refreshing on 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip retry logic for auth endpoints like login, register, refresh, logout, and google oauth
    const isAuthEndpoint = 
      originalRequest.url.includes('/api/auth/login') ||
      originalRequest.url.includes('/api/auth/register') ||
      originalRequest.url.includes('/api/auth/refresh') ||
      originalRequest.url.includes('/api/auth/logout') ||
      originalRequest.url.includes('/api/auth/google');

    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue any incoming calls while token refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Send POST request. If backend validates refresh cookie, it sets new cookies.
        await apiClient.post('/api/auth/refresh/');
        
        isRefreshing = false;
        processQueue(null);
        
        // Re-execute original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError);
        
        // Dispatch custom event to notify useAuth / Redux to flush local user state
        window.dispatchEvent(new CustomEvent('auth-session-expired'));
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
