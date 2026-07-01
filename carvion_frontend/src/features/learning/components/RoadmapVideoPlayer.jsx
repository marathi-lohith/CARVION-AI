import React, { useEffect, useRef, useState } from 'react';
import apiClient from '../../../core/api/apiClient.js';
import { FiX, FiExternalLink, FiPlay, FiPause, FiTv } from 'react-icons/fi';

export default function RoadmapVideoPlayer({ video, milestoneId, roadmapId, onClose, onProgressUpdated }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(video.last_position || 0);
  const [duration, setDuration] = useState(0);
  const [progressPct, setProgressPct] = useState(video.percentage_watched || 0);
  const [isCompleted, setIsCompleted] = useState(video.completed || false);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const lastTimeRef = useRef(video.last_position || 0);

  useEffect(() => {
    // Load YouTube API script if not present
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    let ytPlayer;

    const onPlayerReady = (event) => {
      const durationSec = event.target.getDuration();
      setDuration(durationSec);
      if (video.last_position) {
        event.target.seekTo(video.last_position, true);
      }
    };

    const onPlayerStateChange = (event) => {
      // YT.PlayerState.PLAYING = 1, YT.PlayerState.PAUSED = 2
      if (event.data === window.YT.PlayerState.PLAYING) {
        setIsPlaying(true);
        startTracking(event.target);
      } else {
        setIsPlaying(false);
        stopTracking(event.target);
      }
    };

    const initPlayer = () => {
      ytPlayer = new window.YT.Player('roadmap-yt-iframe', {
        videoId: video.video_id,
        playerVars: {
          start: video.last_position || 0,
          autoplay: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange
        }
      });
      playerRef.current = ytPlayer;
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      // Global callback
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        initPlayer();
      };
    }

    return () => {
      stopTracking();
      if (ytPlayer && ytPlayer.destroy) {
        ytPlayer.destroy();
      }
    };
  }, [video.video_id]);

  const sendProgressUpdate = async (playerInstance) => {
    if (!playerInstance || typeof playerInstance.getCurrentTime !== 'function') return;

    try {
      const currTime = Math.floor(playerInstance.getCurrentTime());
      const totalDur = Math.floor(playerInstance.getDuration()) || duration || 600;
      const pct = Math.min(100, Math.round((currTime / totalDur) * 100));

      const delta = Math.max(0, currTime - lastTimeRef.current);
      lastTimeRef.current = currTime;

      setCurrentTime(currTime);
      setProgressPct(pct);

      if (pct >= 95 && !isCompleted) {
        setIsCompleted(true);
      }

      await apiClient.post('/api/learning/roadmap/video/progress/', {
        roadmap_id: roadmapId,
        milestone_id: milestoneId,
        video_id: video.video_id,
        duration: totalDur,
        last_position: currTime,
        percentage_watched: pct,
        watch_time_delta: delta
      });

      if (onProgressUpdated) {
        onProgressUpdated();
      }
    } catch (err) {
      console.error('Error reporting video learning progress:', err);
    }
  };

  const startTracking = (playerInstance) => {
    stopTracking();
    intervalRef.current = setInterval(() => {
      sendProgressUpdate(playerInstance);
    }, 3000); // report progress every 3 seconds
  };

  const stopTracking = (playerInstance = playerRef.current) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (playerInstance) {
      sendProgressUpdate(playerInstance);
    }
  };

  const formattedTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="text-left">
            <span className="text-[9px] font-bold text-orange-600 bg-orange-100/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Guided Learning Player
            </span>
            <h4 className="font-extrabold text-sm text-slate-800 mt-1.5 truncate max-w-md" title={video.title}>
              {video.title}
            </h4>
            <p className="text-[10px] text-slate-450 mt-0.5">Channel: <strong>{video.channel}</strong></p>
          </div>
          <button 
            onClick={() => {
              stopTracking();
              onClose();
            }}
            className="p-2 hover:bg-slate-200 text-slate-450 hover:text-slate-700 rounded-full transition"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Embedded IFrame */}
        <div className="flex-1 bg-black relative aspect-video flex items-center justify-center">
          <div id="roadmap-yt-iframe" className="w-full h-full" />
        </div>

        {/* Modal Info Footer */}
        <div className="p-5 bg-white border-t border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-left flex-1">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-1">
                <span>PROGRESS ({progressPct}%)</span>
                <span>{formattedTime(currentTime)} / {formattedTime(duration || video.duration || 600)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${isCompleted ? 'bg-emerald-500' : 'bg-orange-500'}`} 
                  style={{ width: `${progressPct}%` }} 
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://www.youtube.com/watch?v=${video.video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => stopTracking()}
                className="px-4 py-2 border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-slate-650 hover:text-slate-850 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
              >
                <span>Open on YouTube</span>
                <FiExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
