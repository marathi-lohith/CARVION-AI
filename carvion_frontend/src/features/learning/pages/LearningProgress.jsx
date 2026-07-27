import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/apiClient.js';
import { refreshRoadmap, refreshLearning } from '../../../utils/queryRefresh/index.js';
import Loader from '../../../components/common/Loader.jsx';
import { FiBookOpen, FiCheckCircle, FiCircle, FiMap, FiAlertCircle, FiClock, FiActivity, FiAward, FiTrendingUp, FiYoutube, FiZap, FiCalendar, FiBarChart2, FiStar, FiPlay } from 'react-icons/fi';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, ComposedChart, PieChart, Pie, Cell
} from 'recharts';

function StatCard({ icon: Icon, label, value, color = 'orange', sub }) {
  const colors = {
    orange: { bg: 'bg-orange-50', text: 'text-orange-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600' },
  };
  const c = colors[color] || colors.orange;
  return (
    <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm flex items-start gap-4">
      <div className={`p-3 ${c.bg} ${c.text} rounded-xl shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">{label}</p>
        <h4 className="font-black text-slate-800 text-xl mt-1">{value}</h4>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, unit = 'min' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] shadow-lg rounded-xl px-4 py-2.5 text-xs text-left space-y-1">
        <p className="font-bold text-slate-700">{label}</p>
        {payload.map((p, idx) => {
          if (p.dataKey === 'minutes') {
            return (
              <p key={idx} className="text-orange-500 font-extrabold">
                Watch Time: {p.value} {unit}
              </p>
            );
          }
          if (p.dataKey === 'completed') {
            return (
              <p key={idx} className="text-emerald-650 font-extrabold">
                Completed: {p.value} Videos
              </p>
            );
          }
          return null;
        })}
      </div>
    );
  }
  return null;
};

export default function LearningProgress() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('weekly');
  const [selectedRoadmapId, setSelectedRoadmapId] = useState('all');

  const { data: analytics, isLoading: analyticsLoading, isError } = useQuery({
    queryKey: ['learningAnalytics'],
    queryFn: async () => {
      const response = await apiClient.get('/api/learning/analytics/');
      return response.data?.data || response.data;
    }
  });

  const { data: roadmaps, isLoading: roadmapsLoading } = useQuery({
    queryKey: ['roadmapList'],
    queryFn: async () => {
      const response = await apiClient.get('/api/learning/all/');
      return response.data?.data || response.data || [];
    },
    keepPreviousData: true
  });

  const { data: progressAnalytics, isLoading: progressAnalyticsLoading, isError: progressAnalyticsError } = useQuery({
    queryKey: ['learningProgressAnalytics'],
    queryFn: async () => {
      const response = await apiClient.get('/api/learning/progress-analytics/');
      return response.data?.data || response.data;
    }
  });

  const { data: roadmapAnalytics, isLoading: roadmapAnalyticsLoading } = useQuery({
    queryKey: ['roadmapAnalytics', selectedRoadmapId, roadmaps, analytics],
    queryFn: async () => {
      if (selectedRoadmapId === 'all') {
        if (!roadmaps || roadmaps.length === 0) {
          return {
            overview: {
              roadmap_id: 'all',
              roadmap_name: 'All Roadmaps',
              target_role: 'All Roles',
              created_date: 'N/A',
              status: 'Active',
              total_milestones: 0,
              completed_milestones: 0,
              remaining_milestones: 0,
              percentage: 0
            },
            summary: {
              total_hours: 0,
              total_minutes: 0,
              total_learning_days: 0,
              streak: 0,
              milestones_completed: 0,
              courses_completed: 0,
              completion_rate: 0
            },
            charts: {
              timeline: { labels: [], data: [] },
              weekly: { labels: [], data: [] },
              distribution: { completed: 0, in_progress: 0, remaining: 0 }
            }
          };
        }

        // Fetch each roadmap's analytics
        const promises = roadmaps.map(r =>
          apiClient.get('/api/learning/roadmap/analytics/', {
            params: { roadmap_id: r.id }
          }).then(res => res.data?.data || res.data)
        );
        const results = await Promise.all(promises);

        // Aggregate statistics
        let totalMinutes = 0;
        let totalMilestones = 0;
        let completedMilestones = 0;
        let remainingMilestones = 0;
        let coursesCompleted = 0;

        results.forEach(res => {
          const summary = res?.summary || {};
          const overview = res?.overview || {};
          totalMinutes += summary.total_minutes || 0;
          totalMilestones += overview.total_milestones || 0;
          completedMilestones += summary.milestones_completed || 0;
          remainingMilestones += overview.remaining_milestones || 0;
          coursesCompleted += summary.courses_completed || 0;
        });

        const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
        const completionRate = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

        // Unique learning days and streak across every roadmap
        const totalLearningDays = analytics?.summary?.learning_days || 0;
        const streak = analytics?.summary?.streak || 0;

        // Aggregate charts:
        // A. Timeline: merge milestone completion timestamps across all roadmaps
        const completedMilestonesWithDates = [];
        roadmaps.forEach(r => {
          const createdDateStr = r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '';
          if (r.milestones) {
            r.milestones.forEach(m => {
              if (m.is_completed) {
                let compDate = createdDateStr;
                if (m.completion_timestamp) {
                  try {
                    compDate = m.completion_timestamp.split('T')[0];
                  } catch (e) {
                    compDate = createdDateStr;
                  }
                }
                if (compDate) {
                  completedMilestonesWithDates.push(compDate);
                }
              }
            });
          }
        });

        completedMilestonesWithDates.sort();

        const timelineMap = {};
        completedMilestonesWithDates.forEach(d => {
          timelineMap[d] = (timelineMap[d] || 0) + 1;
        });

        const sortedDates = Object.keys(timelineMap).sort();
        const timelineLabels = [];
        const timelineData = [];
        let runningTotal = 0;
        sortedDates.forEach(d => {
          runningTotal += timelineMap[d];
          timelineLabels.push(d);
          timelineData.push(runningTotal);
        });

        if (timelineLabels.length === 0) {
          const todayStr = new Date().toISOString().split('T')[0];
          timelineLabels.push(todayStr);
          timelineData.push(0);
        }

        // B. Completion Distribution: sum of each category from every roadmap
        const distribution = { completed: 0, in_progress: 0, remaining: 0 };
        results.forEach(res => {
          const dist = res?.charts?.distribution || {};
          distribution.completed += dist.completed || 0;
          distribution.in_progress += dist.in_progress || 0;
          distribution.remaining += dist.remaining || 0;
        });

        // C. Weekly Progress: component-wise sum of milestone completions
        let maxWeeks = 4;
        results.forEach(res => {
          const weeklyData = res?.charts?.weekly?.data || [];
          if (weeklyData.length > maxWeeks) {
            maxWeeks = weeklyData.length;
          }
        });

        const weeklyProgress = Array(maxWeeks).fill(0);
        results.forEach(res => {
          const weeklyData = res?.charts?.weekly?.data || [];
          weeklyData.forEach((val, idx) => {
            weeklyProgress[idx] += val || 0;
          });
        });
        const weeklyLabels = Array.from({ length: maxWeeks }, (_, i) => `Week ${i + 1}`);

        return {
          overview: {
            roadmap_id: 'all',
            roadmap_name: 'All Roadmaps',
            target_role: 'All Roles',
            created_date: 'N/A',
            status: 'Active',
            total_milestones: totalMilestones,
            completed_milestones: completedMilestones,
            remaining_milestones: remainingMilestones,
            percentage: completionRate
          },
          summary: {
            total_hours: totalHours,
            total_minutes: totalMinutes,
            total_learning_days: totalLearningDays,
            streak: streak,
            milestones_completed: completedMilestones,
            courses_completed: coursesCompleted,
            completion_rate: completionRate
          },
          charts: {
            timeline: { labels: timelineLabels, data: timelineData },
            weekly: { labels: weeklyLabels, data: weeklyProgress },
            distribution: distribution
          }
        };
      } else {
        const response = await apiClient.get('/api/learning/roadmap/analytics/', {
          params: { roadmap_id: selectedRoadmapId }
        });
        return response.data?.data || response.data;
      }
    },
    enabled: !!roadmaps && (analyticsLoading === false),
    keepPreviousData: true
  });

  const isInitialLoad = (analyticsLoading && !analytics) || 
                        (roadmapAnalyticsLoading && !roadmapAnalytics) || 
                        (roadmapsLoading && !roadmaps) ||
                        (progressAnalyticsLoading && !progressAnalytics);

  if (isInitialLoad) {
    return <Loader skeleton={true} variant="grid" />;
  }

  if (isError || progressAnalyticsError) {
    return (
      <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-8 rounded-2xl text-center max-w-md mx-auto my-12 shadow-sm">
        <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="font-extrabold text-slate-800 text-lg">Failed to retrieve roadmap metrics</h3>
        <button onClick={() => { refreshRoadmap(queryClient); refreshLearning(queryClient); }} className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition">
          Retry
        </button>
      </div>
    );
  }

  const summary = analytics?.summary || {};
  const charts = analytics?.charts || {};
  
  const stats = progressAnalytics || {
    total_hours_watched: 0.0,
    total_minutes_watched: 0,
    videos_watched: 0,
    videos_completed: 0,
    learning_days: 0,
    current_learning_streak: 0
  };

  // Prepare chart data arrays for Course Analytics
  const weeklyData = (charts.weekly?.labels || []).map((label, i) => ({
    name: label,
    minutes: charts.weekly?.data?.[i] || 0
  }));
  const dailyData = (charts.daily?.labels || []).map((label, i) => ({
    name: label,
    minutes: charts.daily?.data?.[i] || 0
  }));
  const monthlyData = (charts.monthly?.labels || []).map((label, i) => ({
    name: label,
    minutes: charts.monthly?.data?.[i] || 0,
    completed: charts.monthly?.completed?.[i] || 0
  }));

  const activeChartData = activeTab === 'daily' ? dailyData : activeTab === 'monthly' ? monthlyData : weeklyData;

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-slate-800">
      {/* Header */}
      <div className="text-left">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <FiBarChart2 className="text-orange-500" /> Learning Progress & Analytics
        </h2>
        <p className="text-slate-400 text-xs mt-1">Track your learning activity from Course Navigator.</p>
      </div>

      {/* Course Learning Analytics Section */}
      <div className="space-y-6">
        <div className="text-left border-b border-slate-100 pb-3">
          <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <FiPlay className="text-orange-500" /> Course Learning Analytics
          </h2>
          <p className="text-slate-400 text-xs mt-1">Monitor your video learning progress, watch time, and learning consistency.</p>
        </div>

        {/* Analytics Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard icon={FiClock} label="Total Hours Watched" value={`${stats.total_hours_watched || 0} Hours`} color="orange" sub="watch duration" />
          <StatCard icon={FiZap} label="Total Minutes Watched" value={`${stats.total_minutes_watched || 0} Minutes`} color="amber" sub="watch duration" />
          <StatCard icon={FiPlay} label="Videos Watched" value={stats.videos_watched || 0} color="rose" sub="unique videos watched" />
          <StatCard icon={FiCheckCircle} label="Videos Completed" value={stats.videos_completed || 0} color="emerald" sub="completed (80%+)" />
          <StatCard icon={FiCalendar} label="Learning Days" value={stats.learning_days || 0} color="blue" sub="days active" />
          <StatCard icon={FiStar} label="Current Learning Streak" value={`${stats.current_learning_streak || 0}d`} color="violet" sub="consecutive days" />
        </div>

        {/* Learning Charts */}
        <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <FiActivity className="text-orange-500" /> Course Activity Graphs
            </h3>
            <div className="flex items-center gap-2">
              {['daily', 'weekly', 'monthly'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold capitalize transition ${
                    activeTab === tab
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {tab === 'daily' ? 'Daily Watch Time' : tab === 'weekly' ? 'Weekly Learning Activity' : 'Monthly Learning Trend'}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-52">
            {activeChartData.every(d => d.minutes === 0 && (d.completed === undefined || d.completed === 0)) ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                No activity recorded yet. Watch course videos to track progress.
              </div>
            ) : activeTab === 'monthly' ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={activeChartData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#10b981', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip unit="min" />} />
                  <defs>
                    <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <Area yAxisId="left" type="monotone" dataKey="minutes" stroke="#f97316" strokeWidth={2.5} fill="url(#activityGrad)" dot={{ r: 3, fill: '#f97316', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  <Bar yAxisId="right" dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip unit="min" />} />
                  <defs>
                    <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="minutes" stroke="#f97316" strokeWidth={2.5} fill="url(#activityGrad)" dot={{ r: 3, fill: '#f97316', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Roadmap Analytics Section */}
      {roadmapAnalytics && (
        <div className="border-t border-slate-200 pt-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="text-left">
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <FiMap className="text-orange-500" /> Roadmap Analytics
              </h2>
              <p className="text-slate-400 text-xs mt-1">Track your roadmap progress, milestone completion, and learning journey.</p>
            </div>
            
            {roadmaps && roadmaps.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Select Roadmap:</span>
                <select
                  value={selectedRoadmapId}
                  onChange={(e) => setSelectedRoadmapId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 cursor-pointer max-w-xs"
                >
                  <option value="all">All Roadmaps</option>
                  {roadmaps.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.is_system_generated ? 'Auto Generated Roadmap' : r.target_role}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Roadmap Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={FiClock} label="Total Hours Watched" value={`${roadmapAnalytics.summary?.total_hours || 0} Hours`} color="orange" sub="watch duration" />
            <StatCard icon={FiZap} label="Total Minutes Watched" value={`${roadmapAnalytics.summary?.total_minutes || 0} Mins`} color="amber" sub="watch duration" />
            <StatCard icon={FiCalendar} label="Total Learning Days" value={roadmapAnalytics.summary?.total_learning_days || 0} color="blue" sub="milestone study days" />
            <StatCard icon={FiAward} label="Current Streak" value={`${roadmapAnalytics.summary?.streak || 0}d`} color="violet" sub="consecutive days" />
            <StatCard icon={FiCheckCircle} label="Milestones Completed" value={roadmapAnalytics.summary?.milestones_completed || 0} color="emerald" sub="completed milestones" />
            <StatCard icon={FiBookOpen} label="Courses Completed" value={roadmapAnalytics.summary?.courses_completed || 0} color="indigo" sub="completed roadmaps" />
            <StatCard icon={FiTrendingUp} label="Completion Rate" value={`${roadmapAnalytics.summary?.completion_rate || 0}%`} color="cyan" sub="milestone progress rate" />
            
            {/* Roadmap Progress Card */}
            <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] p-5 rounded-2xl shadow-sm flex items-start gap-4 text-left">
              <div className="p-3 bg-orange-50 text-orange-500 rounded-xl shrink-0">
                <FiMap className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Roadmap Progress</p>
                <h4 className="font-black text-slate-800 text-xl mt-1">{roadmapAnalytics.overview?.percentage || 0}%</h4>
                <div className="space-y-1.5 mt-2">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-full bg-orange-500 transition-all duration-700" 
                      style={{ width: `${roadmapAnalytics.overview?.percentage || 0}%` }} 
                    />
                  </div>
                  <p className="text-[9px] text-slate-450 font-bold">
                    {roadmapAnalytics.overview?.completed_milestones || 0} / {roadmapAnalytics.overview?.total_milestones || 0} Milestones
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Roadmap Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Chart 1: Progress Timeline */}
            <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl p-5 shadow-sm space-y-4 md:col-span-2">
              <h3 className="font-extrabold text-slate-800 text-xs text-left">Progress Timeline (Milestones Over Time)</h3>
              <div className="w-full h-52">
                {roadmapAnalytics.charts?.timeline?.data?.length === 0 || roadmapAnalytics.charts?.timeline?.data?.every(d => d === 0) ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                    No milestone progress logged yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={(roadmapAnalytics.charts?.timeline?.labels || []).map((label, i) => ({
                        name: label,
                        milestones: roadmapAnalytics.charts?.timeline?.data?.[i] || 0
                      }))} 
                      margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <defs>
                        <linearGradient id="roadmapTimelineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="milestones" stroke="#3b82f6" strokeWidth={2.5} fill="url(#roadmapTimelineGrad)" dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Completion Distribution */}
            <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <h3 className="font-extrabold text-slate-800 text-xs text-left mb-2">Completion Distribution</h3>
              <div className="w-full h-44 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Completed', value: roadmapAnalytics.charts?.distribution?.completed || 0, color: '#10b981' },
                        { name: 'In Progress', value: roadmapAnalytics.charts?.distribution?.in_progress || 0, color: '#f59e0b' },
                        { name: 'Remaining', value: roadmapAnalytics.charts?.distribution?.remaining || 0, color: '#cbd5e1' }
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {[
                        { name: 'Completed', color: '#10b981' },
                        { name: 'In Progress', color: '#f59e0b' },
                        { name: 'Remaining', color: '#cbd5e1' }
                      ].filter(d => {
                        const val = d.name === 'Completed'
                          ? roadmapAnalytics.charts?.distribution?.completed
                          : d.name === 'In Progress'
                            ? roadmapAnalytics.charts?.distribution?.in_progress
                            : roadmapAnalytics.charts?.distribution?.remaining;
                        return val > 0;
                      }).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[9px] font-bold text-slate-500 pt-2 border-t border-slate-100">
                <div className="flex flex-col items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mb-1" />
                  <span>Completed: {roadmapAnalytics.charts?.distribution?.completed || 0}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mb-1" />
                  <span>In Progress: {roadmapAnalytics.charts?.distribution?.in_progress || 0}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="w-2 h-2 rounded-full bg-slate-300 mb-1" />
                  <span>Remaining: {roadmapAnalytics.charts?.distribution?.remaining || 0}</span>
                </div>
              </div>
            </div>
            
            {/* Chart 3: Weekly Roadmap Progress */}
            <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl p-5 shadow-sm space-y-4 md:col-span-3">
              <h3 className="font-extrabold text-slate-800 text-xs text-left">Weekly Roadmap Progress (Milestones Completed)</h3>
              <div className="w-full h-48">
                {roadmapAnalytics.charts?.weekly?.data?.length === 0 || roadmapAnalytics.charts?.weekly?.data?.every(d => d === 0) ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                    No milestone progress logged this week.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={(roadmapAnalytics.charts?.weekly?.labels || []).map((label, i) => ({
                        name: label,
                        milestones: roadmapAnalytics.charts?.weekly?.data?.[i] || 0
                      }))}
                      margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="milestones" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
