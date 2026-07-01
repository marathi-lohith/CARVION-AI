/**
 * Formats a ISO or raw date string into readable format (e.g., Jun 25, 2026).
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Formats a score rating out of 100 into a percentage display string.
 */
export const formatScorePercent = (score) => {
  if (score === undefined || score === null) return '0%';
  const num = Number(score);
  return `${Math.round(num)}%`;
};

/**
 * Formats a numeric size in bytes into KB or MB.
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Formats an array of words or a sentence into capitalize format.
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
