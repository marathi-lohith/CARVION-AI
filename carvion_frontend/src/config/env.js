/**
 * Strictly validated environmental configuration outputs.
 * Throws runtime alerts or console warnings if required values are missing.
 */
const getEnv = (key, fallback = undefined, required = false) => {
  const value = import.meta.env[key];
  
  if (value === undefined || value === '') {
    if (required) {
      console.error(`🚨 REQUIRED ENV VARIABLE IS MISSING: "${key}". Application may fail to resolve API calls.`);
    }
    return fallback;
  }
  
  return value;
};

export const ENV = {
  API_URL: getEnv('VITE_API_URL', 'http://localhost:8000', true),
  GOOGLE_CLIENT_ID: getEnv('VITE_GOOGLE_CLIENT_ID', '', true),
  IS_DEV: import.meta.env.DEV,
};
