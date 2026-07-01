import React from 'react';
import RoadmapNode from './RoadmapNode.jsx';

export default function MilestoneTimeline({ milestones = [], onToggleNode, onPlayVideo, loadingNodeId }) {
  if (!milestones || milestones.length === 0) return null;

  return (
    <div className="relative border-l border-slate-200 pl-6 sm:pl-8 ml-4 sm:ml-6 space-y-8 py-2">
      {milestones.map((node, index) => {
        const isCompleted = node.is_completed || false;
        
        return (
          <div key={node.id} className="relative">
            {/* Timeline bullet indicator */}
            <span className={`absolute -left-[35px] sm:-left-[43px] top-4 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
              isCompleted
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                : 'bg-white border-slate-350 text-slate-400'
            }`}>
              {index + 1}
            </span>

            <RoadmapNode
              node={node}
              index={index}
              onToggle={onToggleNode}
              onPlayVideo={onPlayVideo}
              loading={loadingNodeId === node.id}
            />
          </div>
        );
      })}
    </div>
  );
}
