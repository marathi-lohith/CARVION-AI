import React from 'react';
import { motion } from 'framer-motion';

export default function Loader({
  fullScreen = false,
  skeleton = false,
  variant = 'circle', // 'circle', 'text', 'card'
  className = '',
}) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 dark:bg-black/60 backdrop-blur-md">
        <div className="flex flex-col items-center space-y-4">
          {/* Glowing central spinner */}
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-brand-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-t-brand-500 animate-spin" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-white animate-pulse">
            Configuring session...
          </span>
        </div>
      </div>
    );
  }

  if (skeleton) {
    const shimmer = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 dark:before:via-white/5 before:to-transparent";
    
    if (variant === 'text') {
      return (
        <div className={`space-y-2.5 ${className}`}>
          <div className={`h-4 w-3/4 rounded bg-gray-200 dark:bg-dark-400 ${shimmer}`} />
          <div className={`h-3 w-5/6 rounded bg-gray-200 dark:bg-dark-400 ${shimmer}`} />
          <div className={`h-3 w-1/2 rounded bg-gray-200 dark:bg-dark-400 ${shimmer}`} />
        </div>
      );
    }

    if (variant === 'card') {
      return (
        <div className={`rounded-2xl border border-gray-100 dark:border-dark-400 bg-white dark:bg-dark-500 p-6 space-y-4 ${className}`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full bg-gray-200 dark:bg-dark-400 ${shimmer}`} />
            <div className="flex-1 space-y-2">
              <div className={`h-3 w-1/3 rounded bg-gray-200 dark:bg-dark-400 ${shimmer}`} />
              <div className={`h-2.5 w-1/2 rounded bg-gray-200 dark:bg-dark-400 ${shimmer}`} />
            </div>
          </div>
          <div className={`h-3 w-full rounded bg-gray-200 dark:bg-dark-400 ${shimmer}`} />
          <div className={`h-3 w-5/6 rounded bg-gray-200 dark:bg-dark-400 ${shimmer}`} />
        </div>
      );
    }
  }

  // Local spinner fallback
  return (
    <div className={`flex items-center justify-center py-4 ${className}`}>
      <div className="w-8 h-8 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin" />
    </div>
  );
}
