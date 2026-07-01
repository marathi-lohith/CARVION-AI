import React from 'react';
import Card from '../../../components/common/Card.jsx';
import Badge from '../../../components/common/Badge.jsx';
import { FiCheckCircle, FiClock, FiLock, FiPlay } from 'react-icons/fi';

export default function RoadmapNode({ node, onToggle, onPlayVideo, index, loading }) {
  if (!node) return null;

  const isCompleted = node.is_completed || false;

  // Calculate difficulty & timeframe estimate
  let difficulty = 'Beginner';
  if (index >= 3) difficulty = 'Advanced';
  else if (index >= 1) difficulty = 'Intermediate';

  let estimatedTime = '10 Hours';
  if (node.estimated_hours) {
    estimatedTime = `${node.estimated_hours} Hours`;
  } else if (node.timeframe) {
    const timeframeStr = String(node.timeframe).toLowerCase();
    if (timeframeStr.includes('week')) {
      const match = timeframeStr.match(/\d+/g);
      if (match) {
        const weeks = match.length >= 2 ? (Math.max(...match.map(Number)) - Math.min(...match.map(Number)) + 1) : 1;
        estimatedTime = `${weeks * 10} Hours`;
      }
    } else {
      estimatedTime = node.timeframe;
    }
  }

  const isLocked = node.status === 'Locked';
  const isInProgress = node.status === 'In Progress';

  return (
      <Card
        hoverable={false}
        className={`border text-left relative transition-all duration-300 ${
          isCompleted 
            ? 'bg-emerald-50/20 border-emerald-250 shadow-sm'
            : isLocked
              ? 'bg-slate-50/70 border-slate-100 opacity-60'
              : 'border-orange-200 bg-white shadow-sm'
        }`}
      >
        <div className="flex flex-col gap-4">
          {/* Header Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-orange-500 tracking-wide uppercase">
                Milestone {index + 1}
              </span>
              <span className="text-slate-350">•</span>
              <span className="text-slate-450 font-semibold flex items-center">
                <FiClock className="w-3.5 h-3.5 mr-1" />
                Est. Time: {estimatedTime}
              </span>
              <span className="text-slate-350">•</span>
              <Badge variant={difficulty === 'Beginner' ? 'info' : difficulty === 'Intermediate' ? 'brand' : 'danger'}>
                {difficulty}
              </Badge>
            </div>
            
            {/* Status Badge */}
            <div>
              {isCompleted ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600">
                  <FiCheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Completed
                </span>
              ) : isInProgress ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-600">
                  <FiPlay className="w-3.5 h-3.5 mr-1 text-amber-500 animate-pulse" /> In Progress
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-450">
                  <FiLock className="w-3.5 h-3.5 mr-1" /> Locked
                </span>
              )}
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <h4 className={`text-base font-extrabold text-slate-800`}>
              {node.title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-[#8A9BB5] mt-1 leading-relaxed font-medium">
              {node.description}
            </p>
          </div>

          {/* Topics Bullet Points */}
          {node.skills && node.skills.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Topics Covered:</p>
              <div className="flex flex-wrap gap-1.5">
                {node.skills.map((skill) => (
                  <Badge key={skill} variant="slate">
                    • {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Learning Resources (Videos) */}
          {node.videos && node.videos.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Learning Resources:</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {node.videos.map((vid, vidIdx) => {
                  const vidCompleted = vid.completed || false;
                  return (
                    <div
                      key={vid.video_id || vidIdx}
                      onClick={() => !isLocked && onPlayVideo && onPlayVideo(vid, node.id)}
                      className={`group p-2 rounded-2xl border transition-all flex flex-col justify-between h-full bg-slate-50/50 ${
                        isLocked
                          ? 'border-slate-100 cursor-not-allowed select-none'
                          : vidCompleted
                            ? 'border-emerald-200 bg-emerald-50/5 hover:border-emerald-305 cursor-pointer'
                            : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50/5 cursor-pointer'
                      }`}
                    >
                      {/* Video Thumbnail */}
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-200 relative">
                        <img
                          src={vid.thumbnail}
                          alt={vid.title}
                          className="w-full h-full object-cover group-hover:scale-103 transition duration-300"
                        />
                        {isLocked ? (
                          <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                            <FiLock className="w-6 h-6 text-white" />
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-md">
                              <FiPlay className="w-4 h-4 fill-white ml-0.5" />
                            </div>
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[8px] bg-slate-900/70 text-white font-bold">
                          {vid.duration || '10:00'}
                        </span>
                      </div>

                      {/* Video Info */}
                      <div className="text-left mt-2 flex-1 flex flex-col justify-between">
                        <div>
                          <h5 className="text-[11px] font-extrabold text-slate-850 line-clamp-2 leading-tight group-hover:text-orange-600 transition" title={vid.title}>
                            {vid.title}
                          </h5>
                          <p className="text-[9px] text-slate-450 mt-1 truncate">Channel: <strong>{vid.channel}</strong></p>
                        </div>

                        {/* Watch Progress */}
                        {!isLocked && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100/60">
                            <div className="flex justify-between text-[8px] font-bold text-slate-400 mb-1">
                              <span>{vidCompleted ? 'COMPLETED' : 'WATCH PROGRESS'}</span>
                              <span>{vid.percentage_watched || 0}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-350 ${vidCompleted ? 'bg-emerald-500' : 'bg-orange-500'}`}
                                style={{ width: `${vid.percentage_watched || 0}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
}
