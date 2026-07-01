import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUser, FiUsers, FiTrash2, FiToggleLeft, FiToggleRight, FiSearch, FiX,
  FiFilter, FiTrendingUp, FiCheck, FiMail, FiPhone, FiMapPin,
  FiGithub, FiLinkedin, FiEdit3, FiEye, FiCheckCircle, FiActivity,
  FiBriefcase, FiBookOpen, FiFileText, FiAward, FiMessageSquare,
  FiCalendar, FiArrowRight, FiInfo, FiPercent
} from 'react-icons/fi';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid
} from 'recharts';
import { confirm } from '../../../utils/confirm.js';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';

export default function UsersTable({
  users = [],
  onUpdateRole,
  onUpdateStatus,
  onDeleteUser,
  isLoading = false,
}) {
  const queryClient = useQueryClient();
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expFilter, setExpFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('-created_at');
  
  // Selected user for Detail Drawer / Edit Modal
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState('overview');

  // Edit Modal Form State
  const [editForm, setEditForm] = useState({ name: '', email: '', is_active: true, role: 'standard' });
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Fetch detailed user profile info for the drawer
  const { data: userDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['adminUserDetail', selectedUserId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/admin/users/${selectedUserId}/`);
      return response.data?.data || response.data;
    },
    enabled: !!selectedUserId && isDrawerOpen,
  });

  // Edit User mutation
  const editUserMutation = useMutation({
    mutationFn: async ({ userId, data }) => {
      const response = await apiClient.patch(`/api/admin/users/${userId}/`, data);
      return response.data?.data || response.data;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries(['adminUsersList']);
      setEditingUser(null);
    },
  });

  // Calculate dynamic stats / KPIs from the standard users array
  const kpis = useMemo(() => {
    if (!users || users.length === 0) return { total: 0, active: 0, inactive: 0, newToday: 0, newWeek: 0, avgCompletion: 0 };
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.month, now.getDate());
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    let active = 0;
    let newToday = 0;
    let newWeek = 0;
    let totalCompletion = 0;

    users.forEach(u => {
      if (u.is_active) active++;
      
      const regDate = new Date(u.created_at);
      if (regDate >= today) newToday++;
      if (regDate >= oneWeekAgo) newWeek++;
      
      totalCompletion += u.profile_completion || 0;
    });

    return {
      total: users.length,
      active,
      inactive: users.length - active,
      newToday,
      newWeek,
      avgCompletion: Math.round(totalCompletion / users.length)
    };
  }, [users]);

  // Compute charts data
  const chartsData = useMemo(() => {
    if (!users || users.length === 0) return { registrations: [], activeStatus: [], experienceDist: [], roleDist: [] };

    // 1. Registrations over time (last 7 days counts)
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString(undefined, { weekday: 'short' });
    }).reverse();

    const regCounts = {};
    last7Days.forEach(day => { regCounts[day] = 0; });

    users.forEach(u => {
      const day = new Date(u.created_at).toLocaleDateString(undefined, { weekday: 'short' });
      if (regCounts[day] !== undefined) {
        regCounts[day]++;
      }
    });

    const registrations = last7Days.map(day => ({
      name: day,
      Registrations: regCounts[day]
    }));

    // 2. Active vs Inactive ratio
    const activeStatus = [
      { name: 'Active', value: kpis.active },
      { name: 'Inactive', value: kpis.inactive }
    ];

    // 3. Experience level distribution
    const expCounts = {};
    users.forEach(u => {
      const exp = u.experience || 'Not Specified';
      expCounts[exp] = (expCounts[exp] || 0) + 1;
    });
    const experienceDist = Object.keys(expCounts).map(k => ({
      name: k,
      Users: expCounts[k]
    }));

    // 4. Target role distribution
    const roleCounts = {};
    users.forEach(u => {
      const role = u.target_role || 'Not Specified';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });
    const roleDist = Object.keys(roleCounts).map(k => ({
      name: k,
      count: roleCounts[k]
    })).sort((a, b) => b.count - a.count).slice(0, 5);

    return { registrations, activeStatus, experienceDist, roleDist };
  }, [users, kpis]);

  // Dynamic filter lists
  const filterOptions = useMemo(() => {
    const experiences = new Set();
    const targetRoles = new Set();

    users.forEach(u => {
      if (u.experience && u.experience !== 'Not Specified') experiences.add(u.experience);
      if (u.target_role && u.target_role !== 'Not Specified') targetRoles.add(u.target_role);
    });

    return {
      experiences: Array.from(experiences),
      targetRoles: Array.from(targetRoles)
    };
  }, [users]);

  // Apply search and filter criteria locally
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search query
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(u => 
        (u.name || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.target_role || '').toLowerCase().includes(term) ||
        (u.experience || '').toLowerCase().includes(term) ||
        (u.phone || '').toLowerCase().includes(term) ||
        (u.skills || []).some(s => s.toLowerCase().includes(term))
      );
    }

    // Status Filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      result = result.filter(u => u.is_active === isActive);
    }

    // Experience Filter
    if (expFilter !== 'all') {
      result = result.filter(u => u.experience === expFilter);
    }

    // Target Role Filter
    if (roleFilter !== 'all') {
      result = result.filter(u => u.target_role === roleFilter);
    }

    // Sort
    const isDesc = sortBy.startsWith('-');
    const field = sortBy.replace('-', '');

    result.sort((a, b) => {
      let valA = a[field];
      let valB = b[field];

      if (field === 'created_at') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      } else {
        valA = valA || 0;
        valB = valB || 0;
      }

      if (valA < valB) return isDesc ? 1 : -1;
      if (valA > valB) return isDesc ? -1 : 1;
      return 0;
    });

    return result;
  }, [users, searchTerm, statusFilter, expFilter, roleFilter, sortBy]);

  // Handle Edit Action
  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      is_active: user.is_active,
      role: user.role
    });
    setEditError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setIsSavingEdit(true);
    try {
      await editUserMutation.mutateAsync({
        userId: editingUser.id,
        data: editForm
      });
      setEditingUser(null);
    } catch (err) {
      setEditError(err.response?.data?.error?.message || 'Failed to update user.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openDrawer = (userId) => {
    setSelectedUserId(userId);
    setActiveDrawerTab('overview');
    setIsDrawerOpen(true);
  };

  const PIE_COLORS = ['#f97316', '#cbd5e1'];

  return (
    <div className="space-y-6">
      
      {/* 1. KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Users', value: kpis.total, icon: FiUsers, color: 'from-orange-500/10 to-amber-500/10 text-orange-500' },
          { label: 'Active Users', value: kpis.active, icon: FiCheckCircle, color: 'from-emerald-500/10 to-teal-500/10 text-emerald-500' },
          { label: 'Inactive Users', value: kpis.inactive, icon: FiX, color: 'from-slate-500/10 to-gray-500/10 text-slate-500' },
          { label: 'New Today', value: kpis.newToday, icon: FiTrendingUp, color: 'from-blue-500/10 to-cyan-500/10 text-blue-500' },
          { label: 'New This Week', value: kpis.newWeek, icon: FiCalendar, color: 'from-purple-500/10 to-indigo-500/10 text-purple-500' },
          { label: 'Profile Completion', value: `${kpis.avgCompletion}%`, icon: FiPercent, color: 'from-amber-500/10 to-yellow-500/10 text-amber-500' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">{kpi.label}</p>
              <h4 className="text-xl font-black text-slate-800 dark:text-white mt-1">{kpi.value}</h4>
            </div>
            <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${kpi.color}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* 2. Charts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registrations Trend */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <h4 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <FiActivity className="text-orange-500" /> User Growth (Last 7 Days)
          </h4>
          <div className="h-48 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartsData.registrations}>
                <defs>
                  <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="Registrations" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorReg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Experience Distribution */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <h4 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <FiBriefcase className="text-orange-500" /> Experience Level Distribution
          </h4>
          <div className="h-48 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartsData.experienceDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="Users" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {chartsData.experienceDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Ratio */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <h4 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <FiCheckCircle className="text-orange-500" /> Active vs Inactive Ratio
          </h4>
          <div className="h-48 w-full flex items-center justify-center">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartsData.activeStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartsData.activeStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500" />
                <span>Active: {kpis.active} ({Math.round(kpis.active / (kpis.total || 1) * 100)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-350 dark:bg-slate-700" />
                <span>Inactive: {kpis.inactive} ({Math.round(kpis.inactive / (kpis.total || 1) * 100)}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filters Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-grow max-w-md">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
              <FiSearch className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by name, email, target role, phone, skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-850 dark:text-slate-200 font-semibold"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none text-slate-700 dark:text-slate-350 font-semibold"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Experience Filter */}
            <select
              value={expFilter}
              onChange={(e) => setExpFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none text-slate-700 dark:text-slate-350 font-semibold"
            >
              <option value="all">All Experience Levels</option>
              {filterOptions.experiences.map(exp => (
                <option key={exp} value={exp}>{exp}</option>
              ))}
            </select>

            {/* Target Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none text-slate-700 dark:text-slate-350 font-semibold"
            >
              <option value="all">All Target Roles</option>
              {filterOptions.targetRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none text-slate-700 dark:text-slate-350 font-semibold"
            >
              <option value="-created_at">Newest First</option>
              <option value="created_at">Oldest First</option>
              <option value="name">Name (A-Z)</option>
              <option value="-name">Name (Z-A)</option>
              <option value="-highest_ats_score">ATS Score (High-Low)</option>
              <option value="-resume_count">Resume Count (High-Low)</option>
              <option value="-assessment_count">Assessments (High-Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Main Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto max-w-full scrollbar-thin">
          <table className="w-full border-collapse text-left text-xs min-w-[1200px]">
            <thead>
              <tr className="sticky top-0 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200/50 dark:border-slate-800 z-10">
                <th className="px-5 py-4">Avatar</th>
                <th className="px-5 py-4">Full Name</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Target Role</th>
                <th className="px-5 py-4">Experience</th>
                <th className="px-5 py-4 text-center">Resumes</th>
                <th className="px-5 py-4 text-center">Highest ATS</th>
                <th className="px-5 py-4">Roadmap Status</th>
                <th className="px-5 py-4 text-center">Assessments</th>
                <th className="px-5 py-4">Account Status</th>
                <th className="px-5 py-4">Last Login</th>
                <th className="px-5 py-4">Registered Date</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-650 dark:text-slate-350">
              {isLoading && users.length === 0 ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse odd:bg-slate-50/30 dark:odd:bg-slate-800/10">
                    <td colSpan={13} className="px-5 py-5 text-center">
                      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-16 text-center text-slate-450 dark:text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FiInfo className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                      <span>No matching user records found.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/10 transition-colors odd:bg-slate-55/10 dark:odd:bg-slate-900/5">
                    {/* Avatar */}
                    <td className="px-5 py-4">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center font-extrabold text-xs shadow-sm uppercase border border-orange-100/50 dark:border-orange-900/40">
                        {u.name.charAt(0)}
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">{u.name}</td>

                    {/* Email */}
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-semibold">{u.email}</td>

                    {/* Target Role */}
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-100/30 text-orange-600 dark:text-orange-400 text-[10px] font-bold">
                        {u.target_role}
                      </span>
                    </td>

                    {/* Experience */}
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-semibold">{u.experience}</td>

                    {/* Resumes Count */}
                    <td className="px-5 py-4 text-center font-extrabold text-slate-700 dark:text-slate-300">{u.resume_count}</td>

                    {/* Highest ATS Score */}
                    <td className="px-5 py-4 text-center">
                      {u.resume_count > 0 ? (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${u.highest_ats_score >= 80 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/30' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100/30'}`}>
                          {u.highest_ats_score} pts
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">-</span>
                      )}
                    </td>

                    {/* Roadmap Status */}
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${u.roadmap_status.includes('Completed') ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                        {u.roadmap_status}
                      </span>
                    </td>

                    {/* Assessment Count */}
                    <td className="px-5 py-4 text-center font-extrabold text-slate-700 dark:text-slate-300">{u.assessment_count}</td>

                    {/* Account Status */}
                    <td className="px-5 py-4">
                      <button
                        onClick={() => onUpdateStatus(u.id, !u.is_active)}
                        className={`inline-flex items-center space-x-1.5 text-left group cursor-pointer ${
                          u.is_active ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-650'
                        }`}
                      >
                        {u.is_active ? (
                          <FiToggleRight className="w-5.5 h-5.5 transition-transform group-hover:scale-105 text-emerald-500" />
                        ) : (
                          <FiToggleLeft className="w-5.5 h-5.5 transition-transform group-hover:scale-105 text-slate-300 dark:text-slate-700" />
                        )}
                        <span className="text-[10px] font-extrabold uppercase tracking-wider select-none">
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </button>
                    </td>

                    {/* Last Login */}
                    <td className="px-5 py-4 text-slate-400 dark:text-slate-550 font-semibold">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'N/A'}
                    </td>

                    {/* Registered Date */}
                    <td className="px-5 py-4 text-slate-400 dark:text-slate-550 font-semibold">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openDrawer(u.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-all cursor-pointer"
                          title="View Profile Drawer"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditClick(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all cursor-pointer"
                          title="Edit Account Details"
                        >
                          <FiEdit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Delete User',
                              message: `Are you absolutely sure you want to permanently delete the user account for ${u.name}? This will purge all associated resume data records.`,
                              type: 'delete'
                            });
                            if (ok) onDeleteUser(u.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
                          title="Delete User Account"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Right-side Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Drawer Sheet */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-2xl h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-10"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-850 dark:text-white uppercase tracking-tight">User Administration Dashboard</h3>
                  <p className="text-xs text-slate-450 dark:text-slate-500 font-semibold mt-0.5">Explore comprehensive real-time career records.</p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition p-1.5 cursor-pointer"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content Body */}
              <div className="flex-grow overflow-y-auto min-h-0">
                {detailLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader fullScreen={false} skeleton={false} />
                  </div>
                ) : !userDetail ? (
                  <div className="p-8 text-center text-red-500 font-bold">Failed to load detailed profile data records.</div>
                ) : (
                  <div className="p-6 space-y-6">
                    {/* User Profile Card */}
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-850">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-extrabold text-2xl shadow-md uppercase">
                        {userDetail.name.charAt(0)}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-black text-slate-800 dark:text-white">{userDetail.name}</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-550 font-semibold flex items-center gap-1">
                          <FiMail /> {userDetail.email}
                        </p>
                        {userDetail.profile?.phone && (
                          <p className="text-xs text-slate-400 dark:text-slate-550 font-semibold flex items-center gap-1">
                            <FiPhone /> {userDetail.profile.phone}
                          </p>
                        )}
                      </div>
                      <div className="ml-auto text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase border ${userDetail.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20' : 'bg-slate-100 text-slate-450 border-slate-200 dark:bg-slate-800'}`}>
                          {userDetail.is_active ? 'Active Status' : 'Deactivated'}
                        </span>
                      </div>
                    </div>

                    {/* Drawer Navigation Tabs */}
                    <div className="flex border-b border-slate-150 dark:border-slate-800">
                      {[
                        { id: 'overview', label: 'Profile' },
                        { id: 'resumes', label: `Resumes (${userDetail.resumes?.length || 0})` },
                        { id: 'learning', label: `Learning` },
                        { id: 'jobs', label: `Jobs` },
                        { id: 'assessments', label: `Assessments` },
                        { id: 'timeline', label: 'Timeline' },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveDrawerTab(tab.id)}
                          className={`flex-grow py-2.5 text-center text-xs font-bold transition-all border-b-2 cursor-pointer ${
                            activeDrawerTab === tab.id
                              ? 'border-orange-500 text-orange-500 font-extrabold'
                              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Active Tab Panel */}
                    <div className="min-h-[300px]">
                      {activeDrawerTab === 'overview' && (
                        <div className="space-y-5 animate-fade-in text-xs">
                          {/* Career Details */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Targeted Career Role</p>
                              <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1">{userDetail.profile?.target_role || 'Not Specified'}</p>
                            </div>
                            <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Experience Level</p>
                              <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1">{userDetail.profile?.experience_level || 'Not Specified'}</p>
                            </div>
                          </div>

                          {/* Profile Completion */}
                          <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Profile Completion Rate</p>
                              <span className="font-extrabold text-orange-500">{userDetail.profile?.profile_completion || 0}%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${userDetail.profile?.profile_completion || 0}%` }} />
                            </div>
                          </div>

                          {/* Skills Inventory */}
                          <div className="space-y-2">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Skills Inventory</p>
                            {userDetail.profile?.skills?.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {userDetail.profile.skills.map((skill, i) => (
                                  <span key={i} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold border border-slate-200/30">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-400 italic">No skills inventory registered.</p>
                            )}
                          </div>

                          {/* Career Insights */}
                          {userDetail.profile?.career_insights && Object.keys(userDetail.profile.career_insights).length > 0 && (
                            <div className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800 space-y-2">
                              <p className="text-[10px] text-slate-400 uppercase font-bold">AI Career Insights</p>
                              <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto">
                                {Object.entries(userDetail.profile.career_insights).map(([key, val]) => (
                                  <div key={key} className="border-b border-slate-100 dark:border-slate-850 pb-1.5 last:border-0">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{key.replace(/_/g, ' ')}:</span>
                                    <span className="text-slate-500 dark:text-slate-400 ml-1.5">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {activeDrawerTab === 'resumes' && (
                        <div className="space-y-4 animate-fade-in text-xs">
                          {userDetail.resumes && userDetail.resumes.length > 0 ? (
                            userDetail.resumes.map(r => (
                              <div key={r.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-4 rounded-xl space-y-2 relative shadow-xs">
                                <div className="flex justify-between items-center">
                                  <h5 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                                    <FiFileText className="text-orange-500" /> {r.name}
                                  </h5>
                                  <span className={`px-2.5 py-0.5 rounded-full font-black ${r.ats_score >= 80 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600'}`}>
                                    {r.ats_score} pts
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-semibold space-y-0.5">
                                  <p>Original File: <span className="italic">{r.file_name}</span></p>
                                  <p>Uploaded At: {new Date(r.created_at).toLocaleString()}</p>
                                </div>
                                {r.is_primary && (
                                  <span className="absolute top-2.5 right-24 bg-orange-500 text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider">
                                    Primary
                                  </span>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-12 text-slate-400 font-bold">No resumes documents created.</div>
                          )}
                        </div>
                      )}

                      {activeDrawerTab === 'learning' && (
                        <div className="space-y-4 animate-fade-in text-xs">
                          {/* Active Roadmaps */}
                          <div>
                            <h5 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-2">Roadmaps generated</h5>
                            {userDetail.roadmaps && userDetail.roadmaps.length > 0 ? (
                              userDetail.roadmaps.map(rm => (
                                <div key={rm.id} className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/40 dark:border-slate-850 mb-3 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                      <FiBookOpen className="text-blue-500" /> {rm.target_role}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${rm.is_active ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                                      {rm.is_active ? 'Active Pathway' : 'Archived'}
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                                      <span>Milestones Progress</span>
                                      <span>{rm.completed_milestones_count} / {rm.milestones_count} Unit Tasks</span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(rm.completed_milestones_count / (rm.milestones_count || 1)) * 100}%` }} />
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-slate-450 italic">No learning roadmaps generated.</p>
                            )}
                          </div>

                          {/* Video watch progress */}
                          <div className="pt-2">
                            <h5 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-2">Roadmap Video watch progress</h5>
                            {userDetail.video_progress && userDetail.video_progress.length > 0 ? (
                              <div className="space-y-2.5 max-h-[180px] overflow-y-auto">
                                {userDetail.video_progress.map(vp => (
                                  <div key={vp.id} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-2">
                                    <div className="max-w-[70%]">
                                      <p className="font-bold text-slate-850 dark:text-slate-200 truncate">{vp.title}</p>
                                      <p className="text-[9px] text-slate-400 font-semibold">{vp.channel}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${vp.completed ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                      {vp.completed ? 'Watched' : `${vp.percentage_watched}%`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-450 italic">No watched video records found.</p>
                            )}
                          </div>
                        </div>
                      )}

                      {activeDrawerTab === 'jobs' && (
                        <div className="space-y-4 animate-fade-in text-xs">
                          {/* Applications */}
                          <div>
                            <h5 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-2">Job Applications</h5>
                            {userDetail.applications && userDetail.applications.length > 0 ? (
                              userDetail.applications.map(ap => (
                                <div key={ap.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-4 rounded-xl flex items-center justify-between mb-2">
                                  <div>
                                    <h6 className="font-bold text-slate-800 dark:text-white flex items-center gap-1">
                                      <FiBriefcase className="text-orange-500" /> {ap.title}
                                    </h6>
                                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{ap.company} - {ap.location}</p>
                                  </div>
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                                    ap.status === 'Offered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20' :
                                    ap.status === 'Rejected' ? 'bg-red-50 text-red-500 border-red-100' :
                                    ap.status === 'Interviewing' ? 'bg-blue-50 text-blue-500 border-blue-100' :
                                    'bg-slate-50 text-slate-500 border-slate-200'
                                  }`}>
                                    {ap.status}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-slate-450 italic">No job application records submitted.</p>
                            )}
                          </div>

                          {/* Saved Jobs */}
                          <div className="pt-2">
                            <h5 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-2">Saved Job Listings</h5>
                            {userDetail.saved_jobs && userDetail.saved_jobs.length > 0 ? (
                              <div className="grid grid-cols-1 gap-2">
                                {userDetail.saved_jobs.map(sj => (
                                  <div key={sj.id} className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/40 dark:border-slate-850">
                                    <p className="font-bold text-slate-800 dark:text-slate-200">{sj.title}</p>
                                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{sj.company} - {sj.location}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-450 italic">No saved jobs.</p>
                            )}
                          </div>
                        </div>
                      )}

                      {activeDrawerTab === 'assessments' && (
                        <div className="space-y-4 animate-fade-in text-xs">
                          {/* Scorecards */}
                          <div>
                            <h5 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-2">Scorecards & Tests</h5>
                            {userDetail.scorecards && userDetail.scorecards.length > 0 ? (
                              userDetail.scorecards.map(sc => (
                                <div key={sc.id} className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-4 rounded-xl flex items-center justify-between mb-2 shadow-xs">
                                  <div>
                                    <h6 className="font-bold text-slate-850 dark:text-white flex items-center gap-1">
                                      <FiAward className="text-orange-500" /> {sc.domain}
                                    </h6>
                                    <p className="text-[9px] uppercase font-bold text-slate-400 mt-0.5">{sc.category} - {sc.difficulty}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-black text-orange-500 text-sm">{sc.score}%</p>
                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">{sc.correct_answers} / {sc.total_questions} correct</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-slate-450 italic">No test scorecards recorded.</p>
                            )}
                          </div>

                          {/* Interviews Dialog */}
                          <div className="pt-2">
                            <h5 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider mb-2">Adaptive Interview Sessions</h5>
                            {userDetail.interviews && userDetail.interviews.length > 0 ? (
                              userDetail.interviews.map(iv => (
                                <div key={iv.id} className="bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/40 dark:border-slate-850 mb-2 space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                      <FiMessageSquare className="text-blue-500" /> {iv.role}
                                    </span>
                                    <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[9px] uppercase font-bold text-slate-500">
                                      {iv.mode} - {iv.status}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-semibold">Total Dialog Interactions: {iv.dialog_count} questions</p>
                                  {iv.evaluation && Object.keys(iv.evaluation).length > 0 && (
                                    <div className="bg-white dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850/50 text-[10px] font-semibold text-slate-500 dark:text-slate-450 leading-relaxed">
                                      <p className="font-bold text-slate-700 dark:text-slate-300">AI Evaluation Summary:</p>
                                      <p className="mt-1">{iv.evaluation.overall_feedback || iv.evaluation.feedback || 'Incomplete session'}</p>
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-slate-450 italic">No adaptive mock interviews created.</p>
                            )}
                          </div>
                        </div>
                      )}

                      {activeDrawerTab === 'timeline' && (
                        <div className="space-y-4 animate-fade-in text-xs">
                          <h5 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider">Activity Feed History</h5>
                          {userDetail.activity_timeline && userDetail.activity_timeline.length > 0 ? (
                            <div className="relative border-l border-slate-200 dark:border-slate-800 ml-2.5 pl-5 space-y-4">
                              {userDetail.activity_timeline.map(log => (
                                <div key={log.id} className="relative">
                                  <span className="absolute -left-7 top-1 w-3.5 h-3.5 bg-white dark:bg-slate-900 border-2 border-orange-500 rounded-full flex items-center justify-center">
                                    <span className="w-1 h-1 bg-orange-500 rounded-full" />
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-750 dark:text-slate-250 capitalize">{log.activity_type.replace(/_/g, ' ')}</span>
                                      <span className="text-[9px] uppercase font-bold text-orange-500 bg-orange-50 px-1.5 py-0.2 rounded">{log.module}</span>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-450 mt-1 font-semibold leading-relaxed">{log.description}</p>
                                    <p className="text-[9px] text-slate-400 mt-1.5 font-bold">{new Date(log.created_at).toLocaleString()}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-12 text-slate-400 font-bold">No activity logs recorded.</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="absolute inset-0 bg-slate-950 cursor-pointer"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-md w-full relative z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
                <h4 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">Edit User Account</h4>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition cursor-pointer"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              {editError && (
                <div className="p-3 bg-red-50 text-red-500 rounded-xl text-xs font-semibold">{editError}</div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-bold">
                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-850 dark:text-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-850 dark:text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Account Status</label>
                    <select
                      value={editForm.is_active ? 'active' : 'inactive'}
                      onChange={(e) => setEditForm(prev => ({ ...prev, is_active: e.target.value === 'active' }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 focus:outline-none text-slate-700 dark:text-slate-350"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Deactivated</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">System Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 focus:outline-none text-slate-700 dark:text-slate-350"
                    >
                      <option value="standard">Standard</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-3 border-t border-slate-100 dark:border-slate-850">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:bg-orange-350 transition cursor-pointer shadow-md shadow-orange-500/10"
                  >
                    {isSavingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
