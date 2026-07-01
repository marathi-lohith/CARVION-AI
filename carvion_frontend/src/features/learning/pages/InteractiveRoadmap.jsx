import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { refreshRoadmap, refreshDashboard, refreshLearning, refreshProfile } from '../../../utils/queryRefresh/index.js';
import MilestoneTimeline from '../components/MilestoneTimeline.jsx';
import RoadmapVideoPlayer from '../components/RoadmapVideoPlayer.jsx';
import apiClient from '../../../core/api/apiClient.js';
import Card from '../../../components/common/Card.jsx';
import Button from '../../../components/common/Button.jsx';
import Loader from '../../../components/common/Loader.jsx';
import Toast from '../../../components/feedback/Toast.jsx';
import Input from '../../../components/common/Input.jsx';
import { confirm } from '../../../utils/confirm.js';
import { FiMap, FiRefreshCw, FiTrash2, FiStar } from 'react-icons/fi';

export default function InteractiveRoadmap() {
  const queryClient = useQueryClient();
  const [targetRoleInput, setTargetRoleInput] = useState('');
  const [loadingNodeId, setLoadingNodeId] = useState(null);
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
  const [activeVideo, setActiveVideo] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  // 1. Fetch user profile target role
  const { data: profile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await apiClient.get('/api/profile/');
      return res.data?.data || res.data;
    }
  });

  // 2. Fetch active roadmap
  const { data: roadmap, isLoading: loadingActive, isError } = useQuery({
    queryKey: ['activeRoadmap'],
    queryFn: async () => {
      const res = await apiClient.get('/api/learning/');
      return res.data?.data || res.data;
    },
    retry: false,
  });

  // 3. Fetch list of all saved roadmaps
  const { data: roadmaps, isLoading: loadingList } = useQuery({
    queryKey: ['roadmapList'],
    queryFn: async () => {
      const res = await apiClient.get('/api/learning/all/');
      return res.data?.data || res.data || [];
    }
  });

  // 4. Generate roadmap mutation
  const { mutate: createRoadmap, isLoading: generating } = useMutation({
    mutationFn: async (target_role) => {
      const res = await apiClient.post('/api/learning/generate/', { target_role });
      return res.data?.data || res.data;
    },
    onSuccess: () => {
      refreshRoadmap(queryClient);
      refreshDashboard(queryClient);
      setTargetRoleInput('');
      showToast('Career learning roadmap compiled successfully.');
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Failed to compile learning milestones.';
      showToast(msg, 'error');
    },
  });

  // 4b. Regenerate active system roadmap mutation
  const { mutate: regenerateRoadmap, isLoading: regeneratingSystem } = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/api/learning/regenerate/');
      return res.data?.data || res.data;
    },
    onSuccess: () => {
      refreshRoadmap(queryClient);
      refreshDashboard(queryClient);
      showToast('Career learning roadmap regenerated successfully.');
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Failed to regenerate learning milestones.';
      showToast(msg, 'error');
    },
  });

  // 5. Switch active roadmap mutation
  const selectRoadmapMutation = useMutation({
    mutationFn: async (id) => {
      const res = await apiClient.post(`/api/learning/${id}/select/`);
      return res.data?.data || res.data;
    },
    onSuccess: () => {
      refreshRoadmap(queryClient);
      refreshDashboard(queryClient);
      showToast('Switched active learning roadmap.');
    },
    onError: () => {
      showToast('Failed to switch active roadmap.', 'error');
    }
  });

  // 6. Delete roadmap mutation
  const deleteRoadmapMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/api/learning/${id}/delete/`);
    },
    onSuccess: () => {
      refreshRoadmap(queryClient);
      refreshDashboard(queryClient);
      showToast('Learning roadmap deleted.');
    },
    onError: () => {
      showToast('Failed to delete roadmap.', 'error');
    }
  });

  // 7. Toggle node completion status mutation
  const { mutate: toggleNode } = useMutation({
    mutationFn: async (nodeId) => {
      setLoadingNodeId(nodeId);
      const res = await apiClient.post(`/api/learning/node/${nodeId}/toggle/`);
      return res.data?.data || res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['activeRoadmap'], data);
      setLoadingNodeId(null);
    },
    onError: (err) => {
      setLoadingNodeId(null);
      showToast('Failed to toggle completion status.', 'error');
    },
  });

  const handleGenerate = (e) => {
    e.preventDefault();
    const cleanRole = targetRoleInput.trim() || profile?.target_role;
    if (cleanRole) {
      createRoadmap(cleanRole);
    }
  };

  const allRoadmaps = roadmaps || [];
  const milestones = roadmap?.milestones || [];
  const completedCount = milestones.filter((n) => n.is_completed).length;
  const progressPercent = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800">Career Learning Roadmaps</h2>
          <p className="text-sm text-slate-400 dark:text-[#8A9BB5] mt-1 font-medium">
            Generate customized milestones matching your target roles, switch between paths, and track study progress.
          </p>
        </div>
        
        {roadmap && (
          <Button
            variant="secondary"
            onClick={() => {
              if (roadmap.is_system_generated) {
                regenerateRoadmap();
              } else {
                createRoadmap(roadmap.target_role);
              }
            }}
            className="flex items-center space-x-1.5 text-xs px-3.5 py-2 font-bold"
            disabled={generating || regeneratingSystem}
          >
            <FiRefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Rebuild Path</span>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Roadmap Manager */}
        <div className="lg:col-span-1 space-y-6">
          {/* Target Role search & build */}
          <div className="bg-[#fafbfd] p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800">Generate New Roadmap</h3>
            <p className="text-[10px] text-slate-400 dark:text-[#6B7FA3] font-medium">Target a new role and let Gemini compile a new learning path.</p>
            
            <form onSubmit={handleGenerate} className="space-y-3">
              <Input
                placeholder="e.g. Cloud Architect"
                value={targetRoleInput}
                onChange={(e) => setTargetRoleInput(e.target.value)}
                disabled={generating}
              />
              <Button 
                type="submit" 
                disabled={!targetRoleInput.trim() && !profile?.target_role} 
                className="w-full font-bold text-xs"
              >
                {generating ? 'Compiling Path...' : 'Generate Roadmap'}
              </Button>
            </form>
          </div>

          {/* Roadmaps Switcher List */}
          <div className="bg-[#fafbfd] p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-extrabold text-sm text-slate-800">Your Roadmap Paths</h3>
            
            {loadingList && allRoadmaps.length === 0 ? (
              <Loader skeleton={true} variant="list" />
            ) : allRoadmaps.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">No roadmaps generated yet.</p>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {allRoadmaps.map((r) => {
                  const isActive = r.id === roadmap?.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => !isActive && selectRoadmapMutation.mutate(r.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-left ${
                        isActive 
                          ? 'border-orange-500/50 bg-orange-500/5 shadow-sm'
                          : 'border-slate-200 hover:border-slate-350 bg-slate-50/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-800 truncate">{r.target_role}</h4>
                        <span className="text-[9px] text-slate-400 dark:text-[#6B7FA3] font-medium">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {r.is_system_generated && (
                          <span className="text-[9px] font-bold text-orange-600 bg-orange-100/50 px-1.5 py-0.5 rounded-md">
                            Auto Generated
                          </span>
                        )}
                        {isActive && (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100/50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <FiStar className="fill-emerald-500 text-emerald-500 w-2.5 h-2.5" /> Active
                          </span>
                        )}
                        {!r.is_system_generated && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              const ok = await confirm({
                                title: 'Delete Roadmap',
                                message: 'Are you sure you want to delete this roadmap? This action cannot be undone.',
                                type: 'delete',
                                confirmText: 'Delete'
                              });
                              if (ok) {
                                deleteRoadmapMutation.mutate(r.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition"
                            title="Delete roadmap"
                            disabled={deleteRoadmapMutation.isLoading}
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Timeline view */}
        <div className="lg:col-span-2">
          {(loadingActive && !roadmap) || generating ? (
            <Loader skeleton={true} variant="card" />
          ) : !roadmap ? (
            <Card hoverable={false} className="py-16 text-center space-y-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] h-full flex flex-col justify-center items-center">
              <FiMap className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-slate-850 text-lg">No Active Roadmap Found</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium">
                  Use the manager panel on the left to target a role and compile your first career learning path.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              {/* Progress bar card */}
              <Card hoverable={false} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-200 bg-white shadow-sm">
                <div className="text-left">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider">Active Direction</span>
                  <h4 className="text-lg font-extrabold text-orange-500">{roadmap.target_role}</h4>
                </div>

                <div className="flex-1 max-w-md space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Progress metrics</span>
                    <span className="text-slate-700 font-bold">{progressPercent}% completed ({completedCount}/{milestones.length})</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-500" 
                      style={{ width: `${progressPercent}%` }} 
                    />
                  </div>
                </div>
              </Card>

              {/* Timeline Nodes */}
              <MilestoneTimeline
                milestones={milestones}
                onToggleNode={toggleNode}
                onPlayVideo={(video, mId) => setActiveVideo({ video, milestoneId: mId })}
                loadingNodeId={loadingNodeId}
              />
            </div>
          )}
        </div>
      </div>

      {activeVideo && (
        <RoadmapVideoPlayer
          video={activeVideo.video}
          milestoneId={activeVideo.milestoneId}
          roadmapId={roadmap.id}
          onClose={() => setActiveVideo(null)}
          onProgressUpdated={() => {
            refreshRoadmap(queryClient);
            refreshLearning(queryClient);
            refreshDashboard(queryClient);
            refreshProfile(queryClient);
          }}
        />
      )}

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
