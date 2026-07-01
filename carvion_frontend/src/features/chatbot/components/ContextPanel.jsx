import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Card from '../../../components/common/Card.jsx';
import Loader from '../../../components/common/Loader.jsx';
import apiClient from '../../../core/api/apiClient.js';
import { FiActivity, FiShield } from 'react-icons/fi';

export default function ContextPanel() {
  // Query to resolve the raw compiled context block from the backend
  const { data: contextData, isLoading } = useQuery({
    queryKey: ['chatContextPeek'],
    queryFn: async () => {
      const res = await apiClient.get('/api/chat/peek/');
      return res.data?.data || res.data;
    }
  });

  return (
    <Card hoverable={false} className="h-full flex flex-col space-y-4 border border-slate-200 p-5 text-left bg-white shadow-sm">
      <div>
        <h3 className="font-bold text-xs flex items-center space-x-1.5 uppercase text-orange-500 tracking-wider">
          <FiShield className="w-4 h-4 text-orange-550" />
          <span>Counselor Context Injection</span>
        </h3>
        <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">
          Verbatim parameters dynamically injected into the generative LLM prompt
        </p>
      </div>

      {isLoading ? (
        <Loader variant="circle" />
      ) : (
        <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-y-auto max-h-[350px]">
          <pre className="text-[10.5px] font-mono text-slate-600 whitespace-pre-wrap leading-relaxed">
            {contextData?.compiled_context || 'Failed to read context logs.'}
          </pre>
        </div>
      )}

      <div className="p-3 bg-orange-50/50 border border-orange-200/20 rounded-xl flex items-start space-x-2.5">
        <FiActivity className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-orange-700 leading-relaxed font-semibold">
          Context synchronizes on every message, adapting counselor recommendations to your profile edits.
        </p>
      </div>
    </Card>
  );
}
