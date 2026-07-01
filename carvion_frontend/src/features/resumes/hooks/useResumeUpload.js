import { useState } from 'react';
import apiClient from '../../../core/api/apiClient.js';

export default function useResumeUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [progressText, setProgressText] = useState('');

  const uploadResume = async (file, friendlyName = '') => {
    setUploading(true);
    setError(null);
    setProgressText('Uploading Resume...');

    const interval = setInterval(() => {
      setProgressText((prev) => {
        if (prev === 'Uploading Resume...') {
          return 'Extracting Resume Content...';
        } else if (prev === 'Extracting Resume Content...') {
          return 'Analyzing Resume with AI...';
        } else if (prev === 'Analyzing Resume with AI...') {
          return 'Finalizing Analysis...';
        }
        return prev;
      });
    }, 1000);

    const formData = new FormData();
    formData.append('file', file);
    if (friendlyName) {
      formData.append('name', friendlyName);
    }

    try {
      const response = await apiClient.post('/api/resumes/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      clearInterval(interval);
      setUploading(false);
      setProgressText('');
      return response.data?.data || response.data;
    } catch (err) {
      clearInterval(interval);
      const errMsg = err.response?.data?.error?.message || 'File upload failed. Please try again.';
      setError(errMsg);
      setUploading(false);
      setProgressText('');
      throw new Error(errMsg);
    }
  };

  return {
    uploadResume,
    uploading,
    progressText,
    error,
  };
}
