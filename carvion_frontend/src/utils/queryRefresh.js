/**
 * queryRefresh.js
 *
 * Centralised React Query cache refresh helpers.
 * Every mutation in the project should call the appropriate helper(s)
 * instead of scattering individual invalidateQueries calls everywhere.
 *
 * Rules:
 *  - Each helper invalidates queries belonging to that feature domain.
 *  - Use setQueryData when the mutation response already contains the updated object.
 */

// --- Profile ---

/** Invalidate all profile-derived caches. Call after: profile update, target role change, skills change. */
export function refreshProfileData(queryClient) {
  queryClient.invalidateQueries(['userProfile']);
  queryClient.invalidateQueries(['skillGapAnalysis']);
  queryClient.invalidateQueries(['profileAnalytics']);
  queryClient.invalidateQueries(['userActivityHistoryLogs']);
}

// --- Dashboard ---

/** Refresh the dashboard metrics panel. Call after any counter-affecting operation. */
export function refreshDashboardData(queryClient) {
  queryClient.invalidateQueries(['dashboardMetrics']);
}

// --- Resume ---

/** Invalidate all resume-related caches. Call after: upload, delete, build, set-primary, optimize. */
export function refreshResumeData(queryClient) {
  queryClient.invalidateQueries(['resumeList']);
  queryClient.invalidateQueries(['skillGapAnalysis']);
  queryClient.invalidateQueries(['profileAnalytics']);
  queryClient.invalidateQueries(['dashboardMetrics']);
  queryClient.invalidateQueries(['userActivityHistoryLogs']);
}

// --- Roadmap / Learning ---

/** Invalidate roadmap caches. Call after: generate, rebuild, toggle milestone, select roadmap. */
export function refreshRoadmapData(queryClient) {
  queryClient.invalidateQueries(['activeRoadmap']);
  queryClient.invalidateQueries(['roadmapList']);
  queryClient.invalidateQueries(['roadmapAnalytics']);
  queryClient.invalidateQueries(['dashboardMetrics']);
  queryClient.invalidateQueries(['userActivityHistoryLogs']);
}

/** Invalidate learning analytics caches. Call after: video watch progress, save/unsave course. */
export function refreshLearningData(queryClient) {
  queryClient.invalidateQueries(['learningAnalytics']);
  queryClient.invalidateQueries(['roadmapAnalytics']);
  queryClient.invalidateQueries(['dashboardMetrics']);
  queryClient.invalidateQueries(['userActivityHistoryLogs']);
}

// --- Assessments ---

/** Invalidate assessment caches. Call after: submit test, delete scorecard, complete/delete interview. */
export function refreshAssessmentData(queryClient) {
  queryClient.invalidateQueries(['scorecardHistory']);
  queryClient.invalidateQueries(['interviewHistory']);
  queryClient.invalidateQueries(['dashboardMetrics']);
  queryClient.invalidateQueries(['userActivityHistoryLogs']);
}

// --- Recommendations / Jobs / Courses ---

/** Invalidate job recommendation caches. Call after: save/unsave job, apply, update/delete application. */
export function refreshRecommendationData(queryClient) {
  queryClient.invalidateQueries(['savedJobs']);
  queryClient.invalidateQueries(['jobApplications']);
  queryClient.invalidateQueries(['dashboardMetrics']);
  queryClient.invalidateQueries(['userActivityHistoryLogs']);
}

/** Invalidate course/saved-courses caches. Call after: save course, unsave course. */
export function refreshSavedCoursesData(queryClient) {
  queryClient.invalidateQueries(['savedCourses']);
  queryClient.invalidateQueries(['dashboardMetrics']);
  queryClient.invalidateQueries(['userActivityHistoryLogs']);
}
