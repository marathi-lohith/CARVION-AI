import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { refreshJobs, refreshDashboard } from '../../../utils/queryRefresh/index.js';
import SearchFilters from '../components/SearchFilters.jsx';
import JobCard from '../components/JobCard.jsx';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import Card from '../../../components/common/Card.jsx';
import Badge from '../../../components/common/Badge.jsx';
import Button from '../../../components/common/Button.jsx';
import Toast from '../../../components/feedback/Toast.jsx';
import { FiBriefcase, FiRefreshCw } from 'react-icons/fi';

export default function JobBoard() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };
  
  // Load user profile to read preferred location
  const { data: profile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await apiClient.get('/api/profile/');
      return response.data?.data || response.data;
    }
  });

  const [searchParams, setSearchParams] = useState({ query: '', location: '', page: 1 });
  const [isManualSearch, setIsManualSearch] = useState(false);
  const [filterKey, setFilterKey] = useState(0);

  // Sync preferred location from profile once loaded
  useEffect(() => {
    if (profile?.location && !searchParams.location) {
      setSearchParams(prev => ({
        ...prev,
        location: profile.location
      }));
    }
  }, [profile]);

  // Fetch jobs
  const { data: jobsResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ['recommendedJobs', searchParams],
    queryFn: async () => {
      const res = await apiClient.post('/api/recommendations/jobs/', searchParams);
      return res.data;
    },
    staleTime: 0,
    keepPreviousData: true,
  });

  // Fetch saved jobs to track bookmark state
  const { data: savedJobs } = useQuery({
    queryKey: ['savedJobs'],
    queryFn: async () => {
      const response = await apiClient.get('/api/recommendations/jobs/saved/');
      return response.data?.data || response.data || [];
    }
  });

  // Save Job
  const saveMutation = useMutation({
    mutationFn: async (job) => {
      await apiClient.post('/api/recommendations/jobs/saved/', {
        job_id: job.job_id,
        title: job.job_title,
        company: job.employer_name,
        location: job.job_city || 'Remote',
        url: job.job_apply_link,
        description: job.job_description
      });
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData(['savedJobs'], (old) => {
        const newJob = {
          id: variables.job_id,
          job_id: variables.job_id,
          title: variables.job_title,
          company: variables.employer_name,
          location: variables.job_city || 'Remote',
          url: variables.job_apply_link,
          description: variables.job_description
        };
        return old ? [...old, newJob] : [newJob];
      });
      refreshDashboard(queryClient);
      showToast('Job saved successfully!');
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to save job.', 'error');
    }
  });

  // Unsave Job
  const unsaveMutation = useMutation({
    mutationFn: async (jobId) => {
      await apiClient.delete('/api/recommendations/jobs/saved/', { data: { job_id: jobId } });
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData(['savedJobs'], (old) => {
        return old ? old.filter(j => j.id !== variables && j.job_id !== variables) : [];
      });
      refreshDashboard(queryClient);
      showToast('Job removed from saved list.');
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to remove job.', 'error');
    }
  });

  const handleSearch = (filters) => {
    setIsManualSearch(true);
    setSearchParams({
      query: (filters.query || '').trim(),
      location: (filters.location || '').trim(),
      page: 1,
    });
  };

  const handleReset = () => {
    setIsManualSearch(false);
    setSearchParams({
      query: '',
      location: profile?.location || '',
      page: 1,
    });
    setFilterKey(prev => prev + 1);
  };

  const handleToggleSave = (job) => {
    const isSaved = savedJobs?.some(sj => sj.job_id === job.job_id);
    if (isSaved) {
      unsaveMutation.mutate(job.job_id);
    } else {
      saveMutation.mutate(job);
    }
  };

  const jobs = jobsResponse?.data || [];
  const resolvedQuery = jobsResponse?.query || '';
  const isCached = jobsResponse?.cached || false;

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center gap-3">
            Career Job Board
            {isCached && (
              <Badge variant="success" className="text-[10px] py-0.5 font-bold">
                ⚡ Auto Generated
              </Badge>
            )}
          </h2>
          <p className="text-sm text-slate-400 dark:text-[#8A9BB5] mt-1 font-medium">
            Live matches based on your resume skills, missing keywords, and target role.
          </p>
          {resolvedQuery && (
            <p className="text-[11px] text-slate-500 mt-1 font-semibold">
              Showing recommendations for: <span className="text-orange-500">"{resolvedQuery}"</span>
            </p>
          )}
        </div>
        {isManualSearch && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition whitespace-nowrap"
            title="Reset to auto-recommendations"
          >
            <FiRefreshCw className="w-3.5 h-3.5" /> Auto-Recommend
          </button>
        )}
      </div>

      {/* Search bar — empty placeholder, no pre-filled text */}
      <SearchFilters
        key={`job-search-${filterKey}`}
        onSearch={handleSearch}
        defaultQuery={searchParams.query}
        defaultLocation={searchParams.location}
        showLocation={true}
        loading={isLoading && !jobsResponse}
      />

      {isLoading && !jobsResponse ? (
        <Loader skeleton={true} variant="card" className="grid grid-cols-1 md:grid-cols-2 gap-6" />
      ) : isError ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md mx-auto space-y-3">
          <p className="text-red-500 font-semibold">Failed to load job recommendations.</p>
          <p className="text-xs text-slate-400 dark:text-[#6B7FA3] font-medium">Make sure the API server is running.</p>
          <button onClick={() => refetch()} className="mt-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition">Retry</button>
        </div>
      ) : jobs.length === 0 ? (
        <Card hoverable={false} className="py-16 text-center max-w-md mx-auto space-y-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)]">
          <FiBriefcase className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="space-y-1.5">
            <h4 className="font-extrabold text-slate-800 text-lg">No Jobs Found</h4>
            <p className="text-xs text-slate-450 font-medium">
              {isManualSearch ? (
                `No matching jobs were found for "${searchParams.query}" in "${searchParams.location || 'any location'}". Please try a different keyword or location.`
              ) : (
                "Complete your profile with a target role or upload a resume to get personalized recommendations."
              )}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <JobCard
              key={job.job_id}
              job={job}
              isSaved={savedJobs?.some(sj => sj.job_id === job.job_id)}
              onToggleSave={() => handleToggleSave(job)}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {jobs.length > 0 && (
        <div className="flex justify-center items-center gap-4 pt-6 pb-4">
          <Button
            variant="outline"
            onClick={() => setSearchParams(prev => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
            disabled={searchParams.page === 1}
            className="px-4 py-2 text-xs font-bold"
          >
            Previous
          </Button>
          <span className="text-xs font-bold text-slate-655">
            Page {searchParams.page}
          </span>
          <Button
            variant="outline"
            onClick={() => setSearchParams(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={jobs.length < 10}
            className="px-4 py-2 text-xs font-bold"
          >
            Next
          </Button>
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
