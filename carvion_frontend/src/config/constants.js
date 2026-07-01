// Routing Paths
export const ROUTES = {
  LANDING: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  OAUTH_CALLBACK: '/oauth/callback',
  DASHBOARD: '/dashboard',
  RESUMES: '/resumes',
  RESUME_HISTORY: '/resumes/history',
  ATS_SCORE: '/resumes/ats-score',
  RESUME_VERSIONS: '/resumes/versions',
  JOBS: '/jobs',
  SAVED_JOBS: '/jobs/saved',
  APPLICATIONS: '/jobs/applications',
  CAREER_INSIGHTS: '/career/insights',
  COURSES: '/courses',
  SAVED_COURSES: '/learning/saved-courses',
  ROADMAP: '/roadmap',
  LEARNING_PROGRESS: '/learning/progress',
  CHAT: '/chat',
  RESUME_OPTIMIZER: '/ai/resume-optimizer',
  COVER_LETTER: '/ai/cover-letter',
  SKILL_GAP: '/ai/skill-gap',
  TEST: '/test',
  INTERVIEW_PRACTICE: '/test/interview-practice',
  TEST_REVIEW: '/test/review',
  ANALYTICS: '/analytics',
  NOTIFICATIONS: '/notifications',
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  HELP: '/help',
  ABOUT: '/about',
  CONTACT: '/contact',
  PRIVACY: '/privacy',
  TERMS: '/terms',
};

// Access Roles
export const ROLES = {
  ADMIN: 'admin',
  STANDARD: 'standard',
};

// File Upload Constraints
export const FILE_CONSTRAINTS = {
  MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  MAX_SIZE_MB: 5,
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  ],
};

// Application Constants
export const APP_NAME = 'Carvion AI';
