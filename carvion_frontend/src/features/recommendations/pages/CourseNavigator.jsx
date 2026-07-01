import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SearchFilters from '../components/SearchFilters.jsx';
import CourseCard from '../components/CourseCard.jsx';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import Toast from '../../../components/feedback/Toast.jsx';
import Card from '../../../components/common/Card.jsx';
import Badge from '../../../components/common/Badge.jsx';
import { FiBookOpen, FiRefreshCw } from 'react-icons/fi';

export default function CourseNavigator() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };
  // null means auto-resolve from profile; string means user searched manually
  const [manualQuery, setManualQuery] = useState(null);
  const [filterKey, setFilterKey] = useState(0);

  const { data: courseResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ['recommendedCourses', manualQuery],
    queryFn: async () => {
      // Send empty string to trigger backend auto-resolve from profile/resume/missing skills
      const res = await apiClient.post('/api/courses/recommended/', {
        query: manualQuery || ''
      });
      return res.data;
    },
    staleTime: 0,
    retry: 1,
  });

  const { data: savedResponse, isLoading: isSavedLoading, refetch: refetchSaved } = useQuery({
    queryKey: ['savedCourses'],
    queryFn: async () => {
      const res = await apiClient.get('/api/courses/saved/');
      return res.data;
    },
    staleTime: 0,
    retry: 1,
  });

  const handleSearch = (filters) => {
    const newQuery = (filters.query || '').trim();
    if (newQuery) {
      setManualQuery(newQuery);
    }
  };

  const handleReset = () => {
    setManualQuery(null);
    setFilterKey(prev => prev + 1);
    queryClient.removeQueries(['recommendedCourses', null]);
    // Trigger re-fetch for auto-resolve
    setTimeout(() => refetch(), 50);
  };

  const courses = courseResponse?.data || [];
  const resolvedQuery = courseResponse?.query || '';
  const isCached = courseResponse?.cached || false;
  const savedCourses = savedResponse?.data || [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-3">
            Course Navigator
            {isCached && (
              <Badge variant="success" className="text-[10px] py-0.5 font-bold">
                ⚡ CACHED
              </Badge>
            )}
          </h2>
          <p className="text-sm text-slate-400 dark:text-[#8A9BB5] mt-1 font-medium">
            Training tracks matched to your resume skills, missing keywords, and target role.
          </p>
          {resolvedQuery && (
            <p className="text-[11px] text-slate-500 mt-1 font-semibold">
              Showing results for: <span className="text-orange-500">"{resolvedQuery}"</span>
            </p>
          )}
        </div>
        {manualQuery && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition whitespace-nowrap"
            title="Reset to auto-recommendations"
          >
            <FiRefreshCw className="w-3.5 h-3.5" /> Auto-Recommend
          </button>
        )}
      </div>

      {/* Search — empty placeholder, no pre-filled text */}
      <SearchFilters
        key={`course-search-${filterKey}`}
        onSearch={handleSearch}
        defaultQuery=""
        showLocation={false}
        loading={isLoading && !courseResponse}
      />

      {/* Recommended Courses Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold tracking-tight text-slate-800 flex items-center gap-3">
          Recommended Courses
        </h3>

        {isLoading && !courseResponse ? (
          <Loader skeleton={true} variant="card" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" />
        ) : isError ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md mx-auto space-y-3">
            <p className="text-red-500 font-semibold">Failed to load course recommendations.</p>
            <p className="text-xs text-slate-400 dark:text-[#6B7FA3] font-medium">Make sure the API server is running.</p>
            <button onClick={() => refetch()} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition">
              Retry
            </button>
          </div>
        ) : courses.length === 0 ? (
          <Card hoverable={false} className="py-16 text-center max-w-md mx-auto space-y-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)]">
            <FiBookOpen className="w-12 h-12 text-slate-350 mx-auto" />
            <div className="space-y-1.5">
              <h4 className="font-extrabold text-slate-800 text-lg">No Courses Found</h4>
              <p className="text-xs text-slate-450 font-medium">
                Complete your profile with a target role or upload a resume to get personalized course recommendations.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const courseId = course.id?.videoId || course.id;
              const savedItem = savedCourses.find(item => item.course_id === courseId);
              return (
                <CourseCard
                  key={courseId}
                  course={course}
                  showToast={showToast}
                  isSaved={!!savedItem}
                  savedId={savedItem?.id}
                  isSavedSection={false}
                  refetchSaved={refetchSaved}
                />
              );
            })}
          </div>
        )}
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

