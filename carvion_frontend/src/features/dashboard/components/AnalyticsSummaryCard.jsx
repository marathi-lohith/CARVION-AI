import React from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp } from 'react-icons/fi';

export default function AnalyticsSummaryCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  colorClass = 'from-orange-500/10 to-amber-500/10 text-orange-600',
  progress,
}) {
  const progressColor = colorClass.includes('emerald') || colorClass.includes('green')
    ? 'from-emerald-500 to-teal-500'
    : 'from-orange-500 to-amber-500';

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm shadow-slate-100/50 flex flex-col justify-between"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {title}
          </p>
          <h3 className="text-3xl font-extrabold text-slate-800">
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-tr ${colorClass}`}>
          {icon}
        </div>
      </div>

      <div className="mt-5">
        {progress !== undefined ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>Performance Level</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/20">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`bg-gradient-to-r ${progressColor} h-full rounded-full`}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 text-xs">
            {trend && (
              <span className="flex items-center space-x-0.5 text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50">
                <FiTrendingUp className="w-3.5 h-3.5" />
                <span>{trend}</span>
              </span>
            )}
            <span className="text-slate-400 font-semibold">
              {subtitle}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
