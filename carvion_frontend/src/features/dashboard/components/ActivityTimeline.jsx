import React from 'react';
import { Link } from 'react-router-dom';
import { FiFileText, FiMap, FiCheckSquare, FiCalendar, FiCompass } from 'react-icons/fi';

export default function ActivityTimeline({
  resumesCount = 0,
  roadmapsCount = 0,
  mockTestsCount = 0,
}) {
  // Compile activities dynamically based on quantities
  const activities = [];

  if (resumesCount > 0) {
    activities.push({
      id: 'resume',
      icon: <FiFileText className="w-4 h-4 text-orange-500" />,
      title: 'ATS Resume Analysed',
      desc: `You have uploaded and parsed ${resumesCount} resume document(s) in your workspace history.`,
      link: '/resumes/history',
      linkText: 'View History',
      time: 'Recently updated',
    });
  }

  if (roadmapsCount > 0) {
    activities.push({
      id: 'roadmap',
      icon: <FiMap className="w-4 h-4 text-green-500" />,
      title: 'Active Skill Roadmap Generated',
      desc: 'Gemini AI has compiled career milestone guides matching your targeted profiles.',
      link: '/roadmap',
      linkText: 'Go to Roadmap',
      time: 'Active node',
    });
  }

  if (mockTestsCount > 0) {
    activities.push({
      id: 'test',
      icon: <FiCheckSquare className="w-4 h-4 text-amber-500" />,
      title: 'Mock Assessment scorecards',
      desc: `You have submitted and graded ${mockTestsCount} MCQ/Coding practice tests.`,
      link: '/test/review',
      linkText: 'Check Scores',
      time: 'Graded',
    });
  }

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-6 shadow-lg">
      <div className="flex items-center space-x-2.5 mb-6">
        <FiCalendar className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Workspace Activity Log</h3>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <FiCompass className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 animate-pulse mb-3" />
          <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-[#8A9BB5] font-medium">
            No activity reports recorded.
          </p>
          <Link
            to="/resumes"
            className="mt-3 inline-block text-xs font-semibold text-orange-500 underline hover:text-orange-600"
          >
            Upload your first resume to start
          </Link>
        </div>
      ) : (
        <div className="relative border-l border-slate-150 dark:border-slate-850 pl-5 space-y-8 ml-3.5">
          {activities.map((item) => (
            <div key={item.id} className="relative">
              {/* Timeline marker */}
              <span className="absolute -left-8.5 top-0.5 w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850/60 flex items-center justify-center shadow-sm">
                {item.icon}
              </span>
              
              {/* Details card */}
              <div className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    {item.time}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pr-4">
                  {item.desc}
                </p>
                <div className="pt-2">
                  <Link
                    to={item.link}
                    className="text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors flex items-center"
                  >
                    <span>{item.linkText}</span>
                    <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
