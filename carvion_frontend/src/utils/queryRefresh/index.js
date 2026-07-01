/**
 * Centralized React Query cache refresh helpers.
 * Every mutation in the project should call the appropriate helper(s)
 * instead of scattering individual invalidateQueries calls.
 * 
 * Each helper receives a queryClient instance and invalidates ONLY
 * the queries belonging to that specific feature domain.
 */

// --- Dashboard ---
export function refreshDashboard(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
}

// --- Profile ---
export function refreshProfile(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['userProfile'] });
  queryClient.invalidateQueries({ queryKey: ['skillGapAnalysis'] });
  queryClient.invalidateQueries({ queryKey: ['userActivityHistoryLogs'] });
}

// --- Resume ---
export function refreshResume(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['resumeList'] });
  queryClient.invalidateQueries({ queryKey: ['optimizeHistory'] });
  queryClient.invalidateQueries({ queryKey: ['coverLetterHistory'] });
}

// --- Roadmap ---
export function refreshRoadmap(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['activeRoadmap'] });
  queryClient.invalidateQueries({ queryKey: ['roadmapList'] });
  queryClient.invalidateQueries({ queryKey: ['roadmapAnalytics'] });
}

// --- Learning ---
export function refreshLearning(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['learningAnalytics'] });
  queryClient.invalidateQueries({ queryKey: ['savedCourses'] });
}

// --- Assessment ---
export function refreshAssessment(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['scorecardHistory'] });
  queryClient.invalidateQueries({ queryKey: ['scorecardDetails'] });
}

// --- Analytics ---
export function refreshAnalytics(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['profileAnalytics'] });
  queryClient.invalidateQueries({ queryKey: ['profileAnalyticsDetailsDashboard'] });
  queryClient.invalidateQueries({ queryKey: ['skillGapDetailsDashboard'] });
  queryClient.invalidateQueries({ queryKey: ['savedJobsAnalyticsDashboard'] });
  queryClient.invalidateQueries({ queryKey: ['applicationsAnalyticsDashboard'] });
}

// --- Jobs ---
export function refreshJobs(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['savedJobs'] });
  queryClient.invalidateQueries({ queryKey: ['jobApplications'] });
}

// --- Interview ---
export function refreshInterview(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['interviewHistory'] });
  queryClient.invalidateQueries({ queryKey: ['interviewDetails'] });
}

// --- Recommendations ---
export function refreshRecommendations(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['recommendedCourses'] });
  queryClient.invalidateQueries({ queryKey: ['recommendedJobs'] });
  queryClient.invalidateQueries({ queryKey: ['careerInsights'] });
  queryClient.invalidateQueries({ queryKey: ['careerInsightsHistory'] });
}
