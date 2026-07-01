import React from 'react';
import { FiInfo, FiBriefcase, FiBookOpen, FiAward, FiCheck } from 'react-icons/fi';
import { formatDate } from '../../../utils/formatters.js';

export default function NotificationItem({ notification, onMarkRead }) {
  if (!notification) return null;

  const isRead = notification.is_read || false;

  const typeConfigs = {
    'System': {
      icon: <FiInfo className="w-5 h-5 text-orange-500" />,
      color: 'bg-orange-50 border-orange-100'
    },
    'Job Alert': {
      icon: <FiBriefcase className="w-5 h-5 text-emerald-500" />,
      color: 'bg-emerald-50 border-emerald-100'
    },
    'Course Suggestion': {
      icon: <FiBookOpen className="w-5 h-5 text-amber-500" />,
      color: 'bg-amber-50 border-amber-100'
    },
    'Mock Test Result': {
      icon: <FiAward className="w-5 h-5 text-orange-500" />,
      color: 'bg-orange-50 border-orange-100'
    }
  };

  const currentConfig = typeConfigs[notification.type] || typeConfigs['System'];

  return (
    <div
      onClick={() => !isRead && onMarkRead(notification.id)}
      className={`p-4 border rounded-2xl flex items-start gap-4 transition-all duration-200 text-left ${
        isRead
          ? 'bg-slate-50/50 border-slate-200 opacity-60'
          : 'bg-white border-orange-500/20 shadow-sm cursor-pointer hover:border-orange-500 hover:shadow-md'
      }`}
    >
      {/* Icon Badge */}
      <div className={`p-2.5 rounded-xl border flex-shrink-0 ${currentConfig.color}`}>
        {currentConfig.icon}
      </div>

      {/* Info details */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex justify-between items-start gap-2">
          <h4 className={`text-sm font-extrabold truncate leading-snug ${isRead ? 'text-slate-500' : 'text-slate-800'}`}>
            {notification.title}
          </h4>
          <span className="text-[10px] text-slate-400 font-bold flex-shrink-0">
            {formatDate(notification.created_at)}
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed font-semibold">
          {notification.message}
        </p>
      </div>

      {/* Action button if unread */}
      {!isRead && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(notification.id);
          }}
          className="p-1 rounded-lg bg-slate-55 hover:bg-orange-50 hover:text-orange-500 text-slate-400 transition-colors self-center flex-shrink-0"
          title="Mark as read"
        >
          <FiCheck className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
