import React, { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import Card from '../../../components/common/Card.jsx';
import { ROUTES } from '../../../config/constants.js';
import {
  FiTrendingUp,
  FiFileText,
  FiCpu,
  FiAlertCircle,
  FiBriefcase,
  FiBookOpen,
  FiUser,
  FiAward,
  FiBarChart2,
  FiActivity,
  FiTarget,
  FiCheckCircle,
  FiClock,
  FiStar,
  FiArrowUp,
  FiArrowDown,
  FiChevronRight
} from 'react-icons/fi';

// ---- Shared KPI card ----
function KpiCard({ label, value, icon, color = 'orange', suffix = '' }) {
  const colors = {
    orange: { bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-500', val: 'text-orange-600 dark:text-orange-400' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-500', val: 'text-emerald-600 dark:text-emerald-400' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-500', val: 'text-blue-600 dark:text-blue-400' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-500', val: 'text-purple-600 dark:text-purple-400' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-500', val: 'text-amber-600 dark:text-amber-400' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-500', val: 'text-rose-600 dark:text-rose-400' },
  };
  const c = colors[color] || colors.orange;
  return (
    <Card hoverable={true} className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-4">
      <div className={`p-3 ${c.bg} ${c.text} rounded-xl flex-shrink-0`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-slate-405 dark:text-slate-400 font-bold uppercase tracking-wider truncate">{label}</p>
        <h4 className={`font-black text-lg mt-0.5 ${c.val} truncate`}>{value}{suffix}</h4>
      </div>
    </Card>
  );
}

// ---- Progress bar ----
function ProgressBar({ label, value, max = 100, color = 'orange' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const barColor = { orange: 'bg-orange-500', emerald: 'bg-emerald-500', blue: 'bg-blue-500', amber: 'bg-amber-500' };
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
        <span>{label}</span>
        <span>{value}{max !== 100 ? `/${max}` : '%'}</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${barColor[color] || barColor.orange}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---- EmptyState ----
function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3">
      <Icon className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
      <p className="font-bold text-slate-600 dark:text-slate-350 text-xs">{title}</p>
      {description && <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed">{description}</p>}
    </div>
  );
}

// ===== TAB PANELS =====

// 1. Resume Analytics
function ResumeAnalyticsPanel({ analytics }) {
  const atsHistory = analytics?.ats_history || [];
  const totalResumes = analytics?.total_resumes ?? 0;

  const avgAts = useMemo(() => {
    if (atsHistory.length === 0) return 0;
    return Math.round(atsHistory.reduce((acc, item) => acc + (item.score || 0), 0) / atsHistory.length);
  }, [atsHistory]);

  const latestAts = useMemo(() => {
    if (atsHistory.length === 0) return 0;
    return atsHistory[atsHistory.length - 1].score;
  }, [atsHistory]);

  const chartData = useMemo(() => {
    return atsHistory.map((item, idx) => ({
      name: `v${idx + 1}`,
      score: item.score,
      date: item.date,
    }));
  }, [atsHistory]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Resumes" value={totalResumes} icon={<FiFileText className="w-5 h-5" />} color="orange" />
        <KpiCard label="Average ATS Score" value={avgAts} suffix="%" icon={<FiTrendingUp className="w-5 h-5" />} color="emerald" />
        <KpiCard label="Latest ATS Score" value={latestAts} suffix="%" icon={<FiCheckCircle className="w-5 h-5" />} color="blue" />
        <KpiCard label="Audits Logged" value={atsHistory.length} icon={<FiAward className="w-5 h-5" />} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">ATS Score Trend</h3>
            <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">Historical progression of your resume quality scores.</p>
          </div>
          {chartData.length === 0 ? (
            <EmptyState icon={FiTrendingUp} title="No ATS scores tracked yet" description="Upload and scan your resume to view the score progression." />
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <ChartTooltip
                    contentStyle={{ background: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '10px' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#F97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAts)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Quality Distribution</h3>
            <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">ATS scan pass metrics.</p>
          </div>
          <div className="space-y-4">
            <ProgressBar label="ATS Benchmark (80%+)" value={atsHistory.filter(h => h.score >= 80).length} max={Math.max(1, atsHistory.length)} color="emerald" />
            <ProgressBar label="Average Score" value={avgAts} max={100} color="blue" />
            <ProgressBar label="Pending Optimization" value={atsHistory.filter(h => h.score < 80).length} max={Math.max(1, atsHistory.length)} color="orange" />
          </div>
          <div className="text-[10px] text-slate-400 mt-4 leading-relaxed font-semibold">
            💡 **Tip**: Scopes matching resume targets will help match more JSearch listings.
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
        <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Resume Upload History</h3>
        {atsHistory.length === 0 ? (
          <EmptyState icon={FiFileText} title="No uploaded resumes found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  <th className="py-2.5">File Name</th>
                  <th className="py-2.5">Upload Date</th>
                  <th className="py-2.5 text-right">ATS Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                {[...atsHistory].reverse().map((a, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 font-bold text-slate-700 dark:text-slate-300">{a.name}</td>
                    <td className="py-3 text-slate-400">{a.date}</td>
                    <td className="py-3 text-right font-black text-slate-855 dark:text-white">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        a.score >= 80 ? 'bg-emerald-50 text-emerald-600 font-extrabold' : 'bg-orange-50 text-orange-600 font-extrabold'
                      }`}>{a.score}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// 2. Career Analytics
function CareerAnalyticsPanel({ savedJobs, applications, insights }) {
  const savedCount = savedJobs?.length ?? 0;
  const appliedCount = applications?.length ?? 0;

  const successRate = useMemo(() => {
    if (appliedCount === 0) return 0;
    const offers = applications.filter(a => a.status === 'Offered').length;
    return Math.round((offers / appliedCount) * 100);
  }, [applications, appliedCount]);

  const statusChartData = useMemo(() => {
    const apps = applications || [];
    const counts = apps.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});
    
    return [
      { name: 'Applied', value: counts['Applied'] || 0, color: '#3B82F6' },
      { name: 'Interviewing', value: counts['Interviewing'] || 0, color: '#10B981' },
      { name: 'Offered', value: counts['Offered'] || 0, color: '#8B5CF6' },
      { name: 'Rejected', value: counts['Rejected'] || 0, color: '#EF4444' },
    ].filter(item => item.value > 0);
  }, [applications]);

  const barChartData = useMemo(() => {
    return (applications || []).slice(0, 7).map((a, idx) => ({
      name: a.company.substring(0, 10),
      score: a.status === 'Offered' ? 100 : a.status === 'Interviewing' ? 80 : a.status === 'Applied' ? 60 : 40,
      label: a.company
    }));
  }, [applications]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Saved Jobs" value={savedCount} icon={<FiBriefcase className="w-5 h-5" />} color="orange" />
        <KpiCard label="Job Applications" value={appliedCount} icon={<FiActivity className="w-5 h-5" />} color="blue" />
        <KpiCard label="Offer Success Rate" value={successRate} suffix="%" icon={<FiStar className="w-5 h-5" />} color="emerald" />
        <KpiCard label="Insight Target" value={insights?.target_role || 'N/A'} icon={<FiTarget className="w-5 h-5" />} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Application Stages</h3>
            <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">Status distribution of tracked job items.</p>
          </div>
          {statusChartData.length === 0 ? (
            <EmptyState icon={FiBriefcase} title="No tracked applications" />
          ) : (
            <div className="h-56 flex flex-col justify-center items-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    contentStyle={{ background: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <span className="text-xl font-black text-slate-850 dark:text-white block">{appliedCount}</span>
                <span className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">Apps</span>
              </div>
            </div>
          )}
          <div className="flex justify-center gap-4 flex-wrap text-[9px] text-slate-500 font-bold pt-3 border-t border-slate-50 dark:border-slate-855">
            {statusChartData.map(item => (
              <div key={item.name} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Recent Applications</h3>
            <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">Relative pipeline index of recently applied positions.</p>
          </div>
          {barChartData.length === 0 ? (
            <EmptyState icon={FiActivity} title="No recent items" />
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} domain={[0, 100]} />
                  <ChartTooltip
                    contentStyle={{ background: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '10px' }}
                    formatter={(value, name, props) => [`Stage score: ${value}`, props.payload.label]}
                  />
                  <Bar dataKey="score" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
          <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Saved Positions</h3>
          {savedCount === 0 ? (
            <EmptyState icon={FiBriefcase} title="No saved jobs" />
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {savedJobs.map((j, i) => (
                <div key={i} className="flex justify-between items-center text-xs border-b border-slate-50 dark:border-slate-850 pb-2 last:border-0">
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-350 block truncate max-w-[200px]">{j.title}</span>
                    <span className="text-[10px] text-slate-400">{j.company} • {j.location}</span>
                  </div>
                  <Link to={ROUTES.SAVED_JOBS} className="text-[10px] font-bold text-orange-500 hover:underline">Apply</Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
          <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Pipeline History</h3>
          {appliedCount === 0 ? (
            <EmptyState icon={FiActivity} title="No applications tracked" />
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {applications.map((a, i) => (
                <div key={i} className="flex justify-between items-center text-xs border-b border-slate-50 dark:border-slate-850 pb-2 last:border-0">
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-355 block truncate max-w-[200px]">{a.title}</span>
                    <span className="text-[10px] text-slate-400">{a.company} • {a.applied_at ? new Date(a.applied_at).toLocaleDateString() : ''}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${
                    a.status === 'Offered' ? 'bg-purple-50 text-purple-600' :
                    a.status === 'Interviewing' ? 'bg-emerald-50 text-emerald-600' :
                    a.status === 'Rejected' ? 'bg-red-50 text-red-650' : 'bg-slate-50 text-slate-500'
                  }`}>{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 3. Learning Analytics
function LearningAnalyticsPanel({ learningData, roadmaps }) {
  const progress = learningData?.summary?.completion_rate ?? 0;
  const totalMilestones = learningData?.summary?.total_milestones ?? 0;
  const streak = learningData?.summary?.streak ?? 0;
  const studyHours = learningData?.summary?.total_hours ?? 0;

  const activeRoadmaps = roadmaps.filter(r => r.is_active);
  const totalRoadmaps = roadmaps.length;

  const chartData = useMemo(() => {
    const weekly = learningData?.charts?.weekly || { labels: [], data: [] };
    return (weekly.labels || []).map((label, idx) => ({
      name: label,
      minutes: weekly.data[idx] || 0
    }));
  }, [learningData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Roadmap Progress" value={progress} suffix="%" icon={<FiBarChart2 className="w-5 h-5" />} color="emerald" />
        <KpiCard label="Active Path" value={activeRoadmaps.length > 0 ? activeRoadmaps[0].target_role : 'None'} icon={<FiBookOpen className="w-5 h-5" />} color="blue" />
        <KpiCard label="Milestones Met" value={totalMilestones} icon={<FiCheckCircle className="w-5 h-5" />} color="purple" />
        <KpiCard label="Study Streak" value={streak} suffix=" Days" icon={<FiActivity className="w-5 h-5" />} color="orange" />
        <KpiCard label="Study Time" value={studyHours} suffix="h" icon={<FiClock className="w-5 h-5" />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Study Duration</h3>
            <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">Daily study time (minutes) in the past week.</p>
          </div>
          {chartData.length === 0 ? (
            <EmptyState icon={FiClock} title="No progress metrics logged" />
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStudy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <ChartTooltip
                    contentStyle={{ background: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '10px' }}
                  />
                  <Area type="monotone" dataKey="minutes" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorStudy)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Milestone Progress</h3>
            <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">Progress completion distributions.</p>
          </div>
          <div className="space-y-4">
            <ProgressBar label="Active Roadmap" value={progress} color="emerald" />
            <ProgressBar label="Total Paths created" value={totalRoadmaps} max={10} color="blue" />
            <ProgressBar label="Completed Paths" value={roadmaps.filter(r => r.milestones?.length > 0 && r.milestones.every(m => m.is_completed)).length} max={Math.max(1, totalRoadmaps)} color="orange" />
          </div>
          <div className="text-[10px] text-slate-400 mt-4 leading-relaxed font-semibold">
            💡 **Tip**: Build paths inside "Roadmaps Workspace" to target career role learning gaps.
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
        <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Saved Roadmap Paths</h3>
        {totalRoadmaps === 0 ? (
          <EmptyState icon={FiBookOpen} title="No roadmaps created yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  <th className="py-2.5">Target Direction</th>
                  <th className="py-2.5">Compiled Date</th>
                  <th className="py-2.5">Source Type</th>
                  <th className="py-2.5 text-right">Active Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                {roadmaps.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 font-bold text-slate-700 dark:text-slate-350">{r.target_role}</td>
                    <td className="py-3 text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${
                        r.is_system_generated ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-600'
                      }`}>{r.is_system_generated ? 'Auto Generated' : 'Manual'}</span>
                    </td>
                    <td className="py-3 text-right font-black text-slate-800 dark:text-white">
                      <span className={`px-2.5 py-0.5 rounded-full ${
                        r.is_active ? 'bg-emerald-50 text-emerald-600 font-bold' : 'bg-slate-50 text-slate-400'
                      }`}>{r.is_active ? 'Active' : 'Saved'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// 4. AI Tools Analytics
function AiToolsAnalyticsPanel({ resumeOpts, coverLetters, chatSessions, skillData }) {
  const optCount = resumeOpts.length;
  const clCount = coverLetters.length;
  const chatCount = chatSessions.length;
  const missingCount = skillData?.missing_skills?.length ?? 0;

  const usageChartData = useMemo(() => {
    return [
      { name: 'Optimizer', count: optCount, fill: '#F97316' },
      { name: 'Cover Letter', count: clCount, fill: '#3B82F6' },
      { name: 'Assistant Chat', count: chatCount, fill: '#8B5CF6' },
    ];
  }, [optCount, clCount, chatCount]);

  const timelineHistory = useMemo(() => {
    const list = [];
    resumeOpts.forEach(item => {
      list.push({
        type: 'Optimizer',
        title: `Resume Optimized: ${item.target_role}`,
        date: new Date(item.created_at),
        desc: item.optimized_text ? item.optimized_text.substring(0, 110) + '...' : 'Optimized resume version.'
      });
    });
    coverLetters.forEach(item => {
      list.push({
        type: 'Cover Letter',
        title: `Cover Letter: ${item.target_role} at ${item.company_name}`,
        date: new Date(item.created_at),
        desc: item.cover_letter_text ? item.cover_letter_text.substring(0, 110) + '...' : 'Generated cover letter.'
      });
    });
    chatSessions.forEach(item => {
      list.push({
        type: 'Assistant',
        title: `Career Assistant: ${item.title || 'Chat Session'}`,
        date: new Date(item.created_at),
        desc: `Dialogue session: ${item.messages?.length || 0} messages.`
      });
    });
    return list.sort((a, b) => b.date - a.date).slice(0, 8);
  }, [resumeOpts, coverLetters, chatSessions]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Resume Optimizations" value={optCount} icon={<FiFileText className="w-5 h-5" />} color="orange" />
        <KpiCard label="Cover Letters Generated" value={clCount} icon={<FiAward className="w-5 h-5" />} color="blue" />
        <KpiCard label="Assistant Chats" value={chatCount} icon={<FiCpu className="w-5 h-5" />} color="purple" />
        <KpiCard label="Analyzed Gaps" value={missingCount} icon={<FiAlertCircle className="w-5 h-5" />} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Tool Engagement</h3>
            <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">Volume distribution across AI sub-services.</p>
          </div>
          {optCount + clCount + chatCount === 0 ? (
            <EmptyState icon={FiCpu} title="No AI tool operations found" />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} allowDecimals={false} />
                  <ChartTooltip
                    contentStyle={{ background: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '10px' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {usageChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
          <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">AI Operations Timeline</h3>
          {timelineHistory.length === 0 ? (
            <EmptyState icon={FiClock} title="No optimization sessions" />
          ) : (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {timelineHistory.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 border-b border-slate-50 dark:border-slate-850 pb-3 last:border-0 last:pb-0">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                    item.type === 'Optimizer' ? 'bg-orange-50 text-orange-600' :
                    item.type === 'Cover Letter' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                  }`}>{item.type}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-700 dark:text-slate-350">{item.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.date.toLocaleDateString()}</p>
                    <p className="text-[10px] text-slate-555 dark:text-slate-450 mt-1 italic truncate max-w-lg">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 5. Assessment Analytics
function AssessmentAnalyticsPanel({ scorecards, interviews }) {
  const testCount = scorecards.length;
  const interviewCount = interviews.length;

  const avgTestScore = useMemo(() => {
    if (testCount === 0) return 0;
    return Math.round(scorecards.reduce((acc, s) => acc + (s.score || 0), 0) / testCount);
  }, [scorecards, testCount]);

  const bestTestScore = useMemo(() => {
    if (testCount === 0) return 0;
    return Math.max(...scorecards.map(s => s.score || 0));
  }, [scorecards, testCount]);

  const radarData = useMemo(() => {
    if (interviewCount === 0) {
      return [
        { subject: 'Technical', A: 80, fullMark: 100 },
        { subject: 'Communication', A: 75, fullMark: 100 },
        { subject: 'Confidence', A: 85, fullMark: 100 },
        { subject: 'Grammar', A: 78, fullMark: 100 },
      ];
    }
    const total = interviews.reduce(
      (acc, item) => {
        const evalData = item.evaluation || {};
        acc.tech += evalData.technical_score || 80;
        acc.comm += evalData.communication_score || 75;
        acc.conf += evalData.confidence_score || 85;
        acc.gram += evalData.grammar_score || 78;
        return acc;
      },
      { tech: 0, comm: 0, conf: 0, gram: 0 }
    );
    return [
      { subject: 'Technical', A: Math.round(total.tech / interviewCount), fullMark: 100 },
      { subject: 'Communication', A: Math.round(total.comm / interviewCount), fullMark: 100 },
      { subject: 'Confidence', A: Math.round(total.conf / interviewCount), fullMark: 100 },
      { subject: 'Grammar', A: Math.round(total.gram / interviewCount), fullMark: 100 },
    ];
  }, [interviews, interviewCount]);

  const trendData = useMemo(() => {
    return scorecards.slice(0, 7).map((s, idx) => ({
      name: `Test ${idx + 1}`,
      Score: s.score || 0
    }));
  }, [scorecards]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Mock Tests Taken" value={testCount} icon={<FiAward className="w-5 h-5" />} color="orange" />
        <KpiCard label="Average Test Score" value={avgTestScore} suffix="%" icon={<FiTrendingUp className="w-5 h-5" />} color="emerald" />
        <KpiCard label="Best Test Score" value={bestTestScore} suffix="%" icon={<FiStar className="w-5 h-5" />} color="blue" />
        <KpiCard label="Mock Interviews" value={interviewCount} icon={<FiUser className="w-5 h-5" />} color="purple" />
        <KpiCard label="Avg. Technical" value={radarData[0].A} suffix="%" icon={<FiCpu className="w-5 h-5" />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Interview Metrics</h3>
            <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">Aggregated scores from verbal mock sessions.</p>
          </div>
          <div className="h-56 flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#64748B', fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                <Radar name="Performance" dataKey="A" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Assessment Progress</h3>
            <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">Test score progression trend.</p>
          </div>
          {trendData.length === 0 ? (
            <EmptyState icon={FiTrendingUp} title="No mock tests recorded yet" />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <ChartTooltip
                    contentStyle={{ background: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '10px' }}
                  />
                  <Line type="monotone" dataKey="Score" stroke="#10B981" strokeWidth={2.5} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
          <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Mock Test Records</h3>
          {testCount === 0 ? (
            <EmptyState icon={FiAward} title="No mock tests taken" />
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {scorecards.map((s, i) => (
                <div key={i} className="flex justify-between items-center text-xs border-b border-slate-50 dark:border-slate-850 pb-2 last:border-0">
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-350 block">{s.domain}</span>
                    <span className="text-[10px] text-slate-400">{s.category} • {s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}</span>
                  </div>
                  <span className={`font-black text-xs ${s.score >= 80 ? 'text-emerald-600' : 'text-orange-600'}`}>{s.score}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
          <h3 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Interview Session History</h3>
          {interviewCount === 0 ? (
            <EmptyState icon={FiUser} title="No interview sessions" />
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {interviews.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-xs border-b border-slate-50 dark:border-slate-850 pb-2 last:border-0">
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-350 block">{item.role}</span>
                    <span className="text-[10px] text-slate-400">{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</span>
                  </div>
                  <span className="font-black text-emerald-600 text-xs">{item.evaluation?.overall_score || 0}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== MAIN ANALYTICS VIEW =====

const TABS = [
  { id: 'resume', label: 'Resume', icon: <FiFileText className="w-3.5 h-3.5" /> },
  { id: 'career', label: 'Career', icon: <FiBriefcase className="w-3.5 h-3.5" /> },
  { id: 'learning', label: 'Learning', icon: <FiBookOpen className="w-3.5 h-3.5" /> },
  { id: 'ai-tools', label: 'AI Tools', icon: <FiCpu className="w-3.5 h-3.5" /> },
  { id: 'assessments', label: 'Assessments', icon: <FiAward className="w-3.5 h-3.5" /> },
];

const VALID_TABS = TABS.map(t => t.id);

export default function Analytics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'resume';
  const activeTab = VALID_TABS.includes(rawTab) ? rawTab : 'resume';

  const setTab = (tabId) => setSearchParams({ tab: tabId }, { replace: true });

  // 1. Fetch profile analytics (resumes stats, ATS scores, scorecard history)
  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['profileAnalyticsDetailsDashboard'],
    queryFn: async () => {
      const r = await apiClient.get('/api/profile/analytics/');
      return r.data?.data || r.data;
    }
  });

  // 2. Fetch skill gap metadata
  const { data: skillData, isLoading: loadingSkill } = useQuery({
    queryKey: ['skillGapDetailsDashboard'],
    queryFn: async () => {
      const r = await apiClient.get('/api/profile/skill-gap/');
      return r.data?.data || r.data;
    }
  });

  // 3. Fetch bookmarked jobs
  const { data: savedJobs, isLoading: loadingSaved } = useQuery({
    queryKey: ['savedJobsAnalyticsDashboard'],
    queryFn: async () => {
      const r = await apiClient.get('/api/recommendations/jobs/saved/');
      return r.data?.data || r.data || [];
    }
  });

  // 4. Fetch job applications pipeline
  const { data: applications, isLoading: loadingApps } = useQuery({
    queryKey: ['applicationsAnalyticsDashboard'],
    queryFn: async () => {
      const r = await apiClient.get('/api/recommendations/applications/');
      return r.data?.data || r.data || [];
    }
  });

  // 5. Fetch roadmap learning progress
  const { data: learningData, isLoading: loadingLearning } = useQuery({
    queryKey: ['learningProgressAnalyticsDashboard'],
    queryFn: async () => {
      const r = await apiClient.get('/api/learning/progress/');
      return r.data?.data || r.data;
    }
  });

  // 6. Fetch all compiler roadmaps
  const { data: roadmapsList, isLoading: loadingRoadmaps } = useQuery({
    queryKey: ['roadmapListAnalyticsDashboard'],
    queryFn: async () => {
      const r = await apiClient.get('/api/learning/all/');
      return r.data?.data || r.data || [];
    }
  });

  // 7. Fetch AI Career Insights advice
  const { data: insightsData, isLoading: loadingInsights } = useQuery({
    queryKey: ['careerInsightsAnalyticsDashboard'],
    queryFn: async () => {
      const r = await apiClient.get('/api/recommendations/career-insights/');
      return r.data?.data || r.data;
    }
  });

  // 8. Fetch AI histories
  const { data: resumeOpts = [], isLoading: loadingOpts } = useQuery({
    queryKey: ['resumeOptimizeHistoryAnalyticsDashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/api/resumes/optimize/history/');
      return res.data?.data || res.data || [];
    }
  });

  const { data: coverLetters = [], isLoading: loadingCls } = useQuery({
    queryKey: ['coverLetterHistoryAnalyticsDashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/api/resumes/cover-letter/history/');
      return res.data?.data || res.data || [];
    }
  });

  const { data: chatSessions = [], isLoading: loadingChats } = useQuery({
    queryKey: ['chatSessionsAnalyticsDashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/api/chat/sessions/');
      return res.data?.data || res.data || [];
    }
  });

  const { data: scorecards = [], isLoading: loadingTests } = useQuery({
    queryKey: ['scorecardHistoryAnalyticsDashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/api/assessments/');
      return res.data?.data || res.data || [];
    }
  });

  const { data: interviews = [], isLoading: loadingInterviews } = useQuery({
    queryKey: ['interviewHistoryAnalyticsDashboard'],
    queryFn: async () => {
      const res = await apiClient.get('/api/assessments/interview/');
      return res.data?.data || res.data || [];
    }
  });

  const isGlobalLoading =
    (loadingAnalytics && !analytics) ||
    (loadingSkill && !skillData) ||
    (loadingSaved && !savedJobs) ||
    (loadingApps && !applications) ||
    (loadingLearning && !learningData) ||
    (loadingRoadmaps && !roadmapsList) ||
    (loadingInsights && !insightsData) ||
    (loadingOpts && !resumeOpts) ||
    (loadingCls && !coverLetters) ||
    (loadingChats && !chatSessions) ||
    (loadingTests && !scorecards) ||
    (loadingInterviews && !interviews);

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-left">
      <div>
        <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
          <FiBarChart2 className="text-orange-500" /> Analytics Center
        </h2>
        <p className="text-slate-400 text-xs mt-1">Unified performance metrics and historical progress audit panels.</p>
      </div>

      {/* Tab Navigation bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 flex items-center gap-1 overflow-x-auto shadow-sm">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panel render content */}
      {isGlobalLoading ? (
        <Loader skeleton={true} variant="grid" />
      ) : (
        <>
          {activeTab === 'resume' && <ResumeAnalyticsPanel analytics={analytics} />}
          {activeTab === 'career' && (
            <CareerAnalyticsPanel
              savedJobs={savedJobs}
              applications={applications}
              insights={insightsData}
            />
          )}
          {activeTab === 'learning' && (
            <LearningAnalyticsPanel
              learningData={learningData}
              roadmaps={roadmapsList}
            />
          )}
          {activeTab === 'ai-tools' && (
            <AiToolsAnalyticsPanel
              resumeOpts={resumeOpts}
              coverLetters={coverLetters}
              chatSessions={chatSessions}
              skillData={skillData}
            />
          )}
          {activeTab === 'assessments' && (
            <AssessmentAnalyticsPanel
              scorecards={scorecards}
              interviews={interviews}
            />
          )}
        </>
      )}
    </div>
  );
}
