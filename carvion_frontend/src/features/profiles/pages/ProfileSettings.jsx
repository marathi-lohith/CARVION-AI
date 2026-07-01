import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FiUser } from 'react-icons/fi';
import ProfileCard from '../components/ProfileCard.jsx';
import PersonalInfoForm from '../components/PersonalInfoForm.jsx';
import SkillsInventory from '../components/SkillsInventory.jsx';
import apiClient from '../../../core/api/apiClient.js';
import Toast from '../../../components/feedback/Toast.jsx';
import Loader from '../../../components/common/Loader.jsx';
import { setCredentials } from '../../../redux/slices/authSlice.js';
import { ROUTES } from '../../../config/constants.js';

import { refreshProfile, refreshRoadmap, refreshDashboard } from '../../../utils/queryRefresh/index.js';

export default function ProfileSettings() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
  
  const { user } = useSelector((state) => state.auth);
  const showOnboardingWelcome = user && !user.onboarding_completed;

  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  // 1. Fetch user profile document on mount
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await apiClient.get('/api/profile/');
      return response.data?.data || response.data;
    },
  });

  // 2. Setup mutations for updates
  const { mutate: updateProfile, isLoading: isSaving } = useMutation({
    mutationFn: async (updatedFields) => {
      const response = await apiClient.put('/api/profile/', updatedFields);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['userProfile'], data);
      refreshProfile(queryClient);
      refreshRoadmap(queryClient);
      refreshDashboard(queryClient);
      
      if (user) {
        const wasCompleted = user.onboarding_completed;
        const isNowCompleted = !!(data.name?.trim() && data.target_role?.trim());
        const updatedUser = {
          ...user,
          name: data.name,
          onboarding_completed: isNowCompleted
        };
        dispatch(setCredentials(updatedUser));
        
        if (!wasCompleted && isNowCompleted) {
          showToast('Profile completed successfully. Welcome to your Dashboard.', 'success');
          setTimeout(() => {
            navigate(ROUTES.DASHBOARD);
          }, 1500);
        } else {
          showToast('Profile settings saved successfully.', 'success');
        }
      } else {
        showToast('Profile settings saved successfully.', 'success');
      }
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Failed to update profile settings.';
      showToast(msg, 'error');
    },
  });

  if (isLoading && !profile) {
    return <Loader skeleton={true} variant="card" className="max-w-4xl mx-auto" />;
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-semibold">Failed to resolve profile records.</p>
        <p className="text-xs text-gray-400 mt-1">Check that the API server is operational.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="text-left">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">Profile Settings</h2>
        <p className="text-sm text-slate-400 dark:text-[#8A9BB5] mt-1 font-medium">
          Manage your personal identifiers, career goals, and matching skills
        </p>
      </div>

      {showOnboardingWelcome && (
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/60 rounded-2xl p-4 text-left flex items-start gap-3 shadow-sm">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400 flex-shrink-0">
            <FiUser className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-orange-850 dark:text-orange-355">Welcome to Carvion AI!</h4>
            <p className="text-xs text-orange-700 dark:text-orange-400 mt-1 font-medium">
              Complete your profile to unlock personalized AI recommendations.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Avatar Details Card */}
        <div className="lg:col-span-1">
          <ProfileCard profile={profile} />
        </div>

        {/* Right Side: Configuration Forms Grid */}
        <div className="lg:col-span-2 space-y-6">
          <PersonalInfoForm 
            profile={profile} 
            onSave={updateProfile} 
            saving={isSaving} 
          />
          
          <SkillsInventory 
            currentSkills={profile?.skills} 
            onSave={updateProfile} 
            saving={isSaving} 
          />
        </div>
      </div>

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
