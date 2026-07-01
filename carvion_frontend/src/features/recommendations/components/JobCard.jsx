import React from 'react';
import Card from '../../../components/common/Card.jsx';
import Badge from '../../../components/common/Badge.jsx';
import Button from '../../../components/common/Button.jsx';
import { 
  FiBriefcase, FiMapPin, FiClock, FiExternalLink, 
  FiBookmark, FiDollarSign, FiAward, FiHome 
} from 'react-icons/fi';
import { formatDate } from '../../../utils/formatters.js';

export default function JobCard({ job, isSaved, onToggleSave }) {
  if (!job) return null;

  const defaultLogo = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=80&h=80&q=80";
  const requiredSkills = job.job_required_skills || [];

  return (
    <Card className="flex flex-col justify-between border border-slate-200 p-5 h-full text-left bg-white hover:shadow-md transition-all duration-200 relative">
      <div className="space-y-4">
        {/* Header section with Logo & Save Bookmark Button */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start space-x-3">
            <img
              src={job.employer_logo || defaultLogo}
              alt={job.employer_name}
              className="w-11 h-11 rounded-xl bg-slate-50 object-contain p-1 border border-slate-100 flex-shrink-0"
              onError={(e) => {
                e.target.src = defaultLogo;
              }}
            />
            <div className="min-w-0">
              <h4 className="font-extrabold text-sm truncate text-slate-850 leading-snug" title={job.job_title}>
                {job.job_title}
              </h4>
              <p className="text-[11px] text-slate-400 font-bold truncate mt-0.5">
                {job.employer_name}
              </p>
            </div>
          </div>

          {/* Save/Bookmark button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleSave();
            }}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
            title={isSaved ? "Unsave Job" : "Save Job"}
          >
            <FiBookmark className={`w-4 h-4 ${isSaved ? 'fill-orange-500 text-orange-500' : 'text-slate-400'}`} />
          </button>
        </div>

        {/* Detailed Metadata Grid */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-650 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center gap-1.5 truncate">
            <FiDollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{job.job_salary || 'Not Specified'}</span>
          </div>

          <div className="flex items-center gap-1.5 truncate">
            <FiAward className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{job.job_experience || '3+ years'}</span>
          </div>

          <div className="flex items-center gap-1.5 truncate">
            <FiMapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{job.job_city || job.location || 'Remote'}</span>
          </div>

          <div className="flex items-center gap-1.5 truncate">
            <FiHome className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{job.job_is_remote ? 'Remote' : 'Hybrid / On-site'}</span>
          </div>
        </div>

        {/* Required Skills list badges */}
        {requiredSkills.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[9px] font-extrabold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider block">Required Skills</span>
            <div className="flex flex-wrap gap-1">
              {requiredSkills.slice(0, 4).map((skill, index) => (
                <span 
                  key={index}
                  className="text-[9px] font-bold bg-orange-50 text-orange-655 px-2 py-0.5 rounded-md border border-orange-100/50"
                >
                  {skill}
                </span>
              ))}
              {requiredSkills.length > 4 && (
                <span className="text-[9px] font-bold text-slate-400 px-1 py-0.5">
                  +{requiredSkills.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Brief description snippet */}
        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed font-medium">
          {job.job_description}
        </p>
      </div>

      {/* Footer link trigger */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
        <span className="text-[10px] text-slate-450 font-bold flex items-center">
          <FiClock className="w-3 h-3 mr-1" />
          {job.job_posted_at_datetime_utc ? formatDate(job.job_posted_at_datetime_utc) : 'Recently'}
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant={isSaved ? "secondary" : "outline"}
            onClick={(e) => {
              e.preventDefault();
              onToggleSave();
            }}
            className="px-2.5 py-1.5 text-xs font-bold flex items-center space-x-1 border-slate-200"
          >
            <FiBookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-orange-500 text-orange-500' : 'text-slate-400'}`} />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </Button>

          {job.job_apply_link ? (
            <a
              href={job.job_apply_link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="primary" className="px-3.5 py-1.5 text-xs font-bold flex items-center space-x-1">
                <span>Apply</span>
                <FiExternalLink className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </a>
          ) : (
            <Button
              variant="secondary"
              disabled
              className="px-2.5 py-1.5 text-[10px] font-bold flex items-center space-x-1 opacity-50 cursor-not-allowed"
            >
              <span>Application Link Unavailable</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
