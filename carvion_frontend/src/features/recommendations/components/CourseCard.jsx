import React, { useState, useEffect, useRef } from 'react';
import Card from '../../../components/common/Card.jsx';
import Button from '../../../components/common/Button.jsx';
import { FiPlay, FiTv, FiExternalLink, FiBookmark, FiTrash2, FiX, FiClock } from 'react-icons/fi';
import apiClient from '../../../core/api/apiClient.js';
import { useQueryClient } from '@tanstack/react-query';
import { refreshLearning, refreshRoadmap, refreshDashboard, refreshProfile } from '../../../utils/queryRefresh/index.js';

export default function CourseCard({ course, showToast, isSaved = false, savedId = null, isSavedSection = false, refetchSaved }) {
  if (!course) return null;

  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Extract properties supporting both raw YouTube format and our SavedCourse DB format
  const isSavedDbItem = !course.id?.videoId && course.course_id;
  const courseId = isSavedDbItem ? course.course_id : (course.id?.videoId || course.id);
  const snippet = course.snippet || {};
  
  const title = isSavedDbItem ? course.title : (snippet.title || 'Course Video');
  const description = isSavedDbItem ? course.description : (snippet.description || '');
  const channel = isSavedDbItem ? course.provider : (snippet.channelTitle || '');
  const thumbnail = isSavedDbItem ? course.thumbnail : (snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || '');
  const youtubeUrl = isSavedDbItem ? course.url : (courseId ? `https://www.youtube.com/watch?v=${courseId}` : '#');

  const handleSaveToggle = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (isSaved) {
        // Unsave
        const dbId = savedId || course.id;
        await apiClient.delete(`/api/courses/saved/${dbId}/`);
        refreshLearning(queryClient);
        if (refetchSaved) refetchSaved();
        if (showToast) {
          showToast('Course removed from saved courses.');
        }
      } else {
        // Save
        await apiClient.post('/api/courses/save/', {
          course_id: courseId,
          title: title,
          provider: channel,
          description: description,
          thumbnail: thumbnail,
          url: youtubeUrl
        });
        refreshLearning(queryClient);
        if (refetchSaved) refetchSaved();
        if (showToast) {
          showToast('Course saved successfully.');
        }
      }
    } catch (err) {
      if (showToast) {
        showToast(isSaved ? 'Failed to remove course.' : 'Failed to save course.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSaved = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const dbId = course.id; // DB ID
      await apiClient.delete(`/api/courses/saved/${dbId}/`);
      refreshLearning(queryClient);
      if (refetchSaved) refetchSaved();
      if (showToast) {
        showToast('Course removed from saved courses.');
      }
    } catch (err) {
      if (showToast) {
        showToast('Failed to remove course.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const [isWatching, setIsWatching] = useState(false);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  const playerRef = useRef(null);
  const timerRef = useRef(null);
  const watchedSecondsRef = useRef(0);
  const completionPercentageRef = useRef(0);
  const sessionRef = useRef(null);

  // Load Youtube IFrame Player API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  const saveProgress = async () => {
    if (!sessionRef.current) return;
    
    let pct = completionPercentageRef.current;
    if (playerRef.current && playerRef.current.getCurrentTime && playerRef.current.getDuration) {
      const current = playerRef.current.getCurrentTime() || 0;
      const duration = playerRef.current.getDuration() || 0;
      if (duration > 0) {
        pct = Math.round((current / duration) * 100);
        completionPercentageRef.current = pct;
        setCompletionPercentage(pct);
      }
    }
    
    try {
      await apiClient.post('/api/learning/session/update/', {
        session_id: sessionRef.current,
        watched_duration: watchedSecondsRef.current,
        completion_percentage: pct
      });
      refreshLearning(queryClient);
      refreshRoadmap(queryClient);
      refreshDashboard(queryClient);
      refreshProfile(queryClient);
    } catch (err) {
      console.error('Failed to update watch session progress:', err);
    }
  };

  const startTimer = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      watchedSecondsRef.current += 1;
      setWatchedSeconds(watchedSecondsRef.current);
      
      if (playerRef.current && playerRef.current.getCurrentTime && playerRef.current.getDuration) {
        const current = playerRef.current.getCurrentTime() || 0;
        const duration = playerRef.current.getDuration() || 0;
        if (duration > 0) {
          const pct = Math.round((current / duration) * 100);
          completionPercentageRef.current = pct;
          setCompletionPercentage(pct);
        }
      }
      
      if (watchedSecondsRef.current % 10 === 0) {
        saveProgress();
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePlayerStateChange = (event) => {
    // YT.PlayerState.PLAYING = 1
    if (event.data === 1) {
      startTimer();
    } else {
      stopTimer();
      saveProgress();
    }
  };

  const startWatching = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;
    setLoading(true);
    
    try {
      const res = await apiClient.post('/api/learning/session/start/', {
        course_id: courseId,
        video_id: courseId,
        title: title
      });
      sessionRef.current = res.data?.data?.session_id || res.data?.session_id;
      watchedSecondsRef.current = 0;
      completionPercentageRef.current = 0;
      setWatchedSeconds(0);
      setCompletionPercentage(0);
      setIsWatching(true);
    } catch (err) {
      console.error('Failed to start watch session:', err);
    } finally {
      setLoading(false);
    }
  };

  const stopWatching = async () => {
    stopTimer();
    await saveProgress();
    setIsWatching(false);
    sessionRef.current = null;
  };

  useEffect(() => {
    if (!isWatching) return;
    
    let playerInstance = null;
    const initPlayer = () => {
      if (window.YT && window.YT.Player) {
        playerInstance = new window.YT.Player(`yt-player-${courseId}`, {
          videoId: courseId,
          playerVars: {
            autoplay: 1,
            modestbranding: 1,
            rel: 0
          },
          events: {
            onStateChange: handlePlayerStateChange
          }
        });
        playerRef.current = playerInstance;
      } else {
        setTimeout(initPlayer, 200);
      }
    };
    
    initPlayer();
    
    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
      }
      stopTimer();
      if (sessionRef.current) {
        apiClient.post('/api/learning/session/update/', {
          session_id: sessionRef.current,
          watched_duration: watchedSecondsRef.current,
          completion_percentage: completionPercentageRef.current
        }).catch(() => {});
      }
    };
  }, [isWatching]);

  return (
    <Card className="flex flex-col justify-between border border-slate-200 overflow-hidden h-full p-0 text-left bg-white hover:shadow-md transition-all duration-200">
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-slate-100 overflow-hidden group">
        {thumbnail && (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
          <button
            onClick={startWatching}
            className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:scale-110 transition-transform"
          >
            <FiPlay className="w-6 h-6 fill-current" />
          </button>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Title */}
          <h4
            className="font-extrabold text-sm text-slate-800 line-clamp-2 leading-snug hover:text-orange-500 transition-colors"
            title={title}
          >
            <button
              onClick={startWatching}
              className="text-left font-extrabold text-sm text-slate-800 hover:text-orange-500 transition-colors focus:outline-none"
            >
              {title}
            </button>
          </h4>

          {/* Channel Name */}
          <p className="text-xs text-slate-400 font-semibold flex items-center">
            <FiTv className="w-3.5 h-3.5 mr-1" />
            <span>{channel}</span>
          </p>

          {/* Snippet Description */}
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
            {description}
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="secondary"
            onClick={startWatching}
            className="flex-1 py-2 text-xs font-bold flex items-center justify-center space-x-1.5 border border-orange-500/20 text-orange-500 hover:bg-orange-50/30"
          >
            <span>Watch Course</span>
            <FiExternalLink className="w-3.5 h-3.5" />
          </Button>
          
          {isSavedSection ? (
            <button
              onClick={handleRemoveSaved}
              disabled={loading}
              title="Remove Saved"
              className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-650 hover:bg-red-100 hover:border-red-300 transition"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSaveToggle}
              disabled={loading}
              title={isSaved ? "Remove from Saved" : "Save Course"}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition ${
                isSaved
                  ? 'bg-orange-50 border-orange-200 text-orange-600'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-orange-300 hover:text-orange-600'
              }`}
            >
              <FiBookmark className={`w-4 h-4 ${isSaved ? 'fill-orange-500 text-orange-500' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Embedded Watch Video Modal */}
      {isWatching && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl max-w-4xl w-full flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/20">
              <div className="text-left min-w-0 pr-4">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white truncate" title={title}>
                  {title}
                </h3>
                <p className="text-xs text-slate-400 dark:text-[#8A9BB5] mt-1 font-semibold flex items-center">
                  <FiTv className="w-3.5 h-3.5 mr-1" />
                  <span>{channel}</span>
                </p>
              </div>
              <button
                onClick={stopWatching}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Embed IFrame Wrapper */}
            <div className="relative w-full aspect-video bg-black">
              <div id={`yt-player-${courseId}`} className="absolute inset-0 w-full h-full" />
            </div>

            {/* Footer Status */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-bold text-slate-500">
              <div className="flex items-center gap-2">
                <FiClock className="text-orange-500" />
                <span>
                  Watched: {Math.floor(watchedSeconds / 60)}m {watchedSeconds % 60}s
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Completion: {completionPercentage}%
                </span>
              </div>
              {completionPercentage >= 80 && (
                <span className="text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg">
                  ✓ Watched (80%+)
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

