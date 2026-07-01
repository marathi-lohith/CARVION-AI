import React from 'react';
import { motion } from 'framer-motion';

export default function ProgressCircle({
  score = 0,
  size = 120,
  strokeWidth = 10,
  className = '',
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Cap score between 0 and 100
  const normalizedScore = Math.max(0, Math.min(100, score));
  const offset = circumference - (normalizedScore / 100) * circumference;

  // Determine dynamic ring colors based on target score thresholds
  const getColor = (val) => {
    if (val >= 80) return 'stroke-green-500';
    if (val >= 50) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Track circle */}
        <circle
          className="stroke-gray-200 dark:stroke-dark-400"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Animated Progress Circle */}
        <motion.circle
          className={`transition-colors duration-500 ${getColor(normalizedScore)}`}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          strokeLinecap="round"
        />
      </svg>
      {/* Central Rating Text */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {normalizedScore}
        </span>
        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-semibold">
          ATS SCORE
        </span>
      </div>
    </div>
  );
}
