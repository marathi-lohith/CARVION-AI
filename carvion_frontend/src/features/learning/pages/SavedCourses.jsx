import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CourseCard from '../../recommendations/components/CourseCard.jsx';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import Toast from '../../../components/feedback/Toast.jsx';
import Card from '../../../components/common/Card.jsx';
import { FiBookOpen } from 'react-icons/fi';

export default function SavedCourses() {
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const { data: savedResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ['savedCourses'],
    queryFn: async () => {
      const res = await apiClient.get('/api/courses/saved/');
      return res.data;
    },
    staleTime: 0,
    retry: 1,
  });

  const savedCourses = savedResponse?.data || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-left">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-3">
          Saved Courses
        </h2>
        <p className="text-sm text-slate-400 dark:text-[#8A9BB5] mt-1 font-medium">
          Your personal bookmarked library of courses.
        </p>
      </div>

      {isLoading && !savedResponse ? (
        <Loader skeleton={true} variant="card" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" />
      ) : isError ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md mx-auto space-y-3">
          <p className="text-red-500 font-semibold">Failed to load saved courses.</p>
          <p className="text-xs text-slate-400 dark:text-[#6B7FA3] font-medium">Make sure the API server is running.</p>
          <button onClick={() => refetch()} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition">
            Retry
          </button>
        </div>
      ) : savedCourses.length === 0 ? (
        <Card hoverable={false} className="py-16 text-center max-w-md mx-auto space-y-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] shadow-sm">
          <FiBookOpen className="w-12 h-12 text-slate-350 mx-auto" />
          <div className="space-y-1.5">
            <h4 className="font-extrabold text-slate-800 text-lg">No Saved Courses</h4>
            <p className="text-xs text-slate-450 font-medium">
              Save interesting courses from Course Navigator to access them later.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedCourses.map((saved) => (
            <CourseCard
              key={saved.id}
              course={saved}
              showToast={showToast}
              isSaved={true}
              savedId={saved.id}
              isSavedSection={true}
              refetchSaved={refetch}
            />
          ))}
        </div>
      )}

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
