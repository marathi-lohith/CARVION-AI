import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ChatBubble from '../components/ChatBubble.jsx';
import apiClient from '../../../core/api/apiClient.js';
import Card from '../../../components/common/Card.jsx';
import Button from '../../../components/common/Button.jsx';
import Loader from '../../../components/common/Loader.jsx';
import { confirm } from '../../../utils/confirm.js';
import Toast from '../../../components/feedback/Toast.jsx';
import { 
  FiTrash2, 
  FiMessageSquare, 
  FiCpu, 
  FiPlus, 
  FiEdit3, 
  FiSquare, 
  FiCornerDownRight,
  FiClock
} from 'react-icons/fi';

export default function CareerAssistant() {
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isInitialMount = useRef(true);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [copiedText, setCopiedText] = useState('');
  const [textInput, setTextInput] = useState('');
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  // 1. Fetch list of all user chat sessions
  const { data: sessions = [], isLoading: loadingSessions, refetch: refetchSessions } = useQuery({
    queryKey: ['chatSessions'],
    queryFn: async () => {
      const res = await apiClient.get('/api/chat/sessions/');
      return res.data?.data || [];
    }
  });

  // Set default active session to the first one in the list if none is set on initial mount
  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId && isInitialMount.current) {
      setActiveSessionId(sessions[0].id);
      isInitialMount.current = false;
    }
  }, [sessions, activeSessionId]);

  // 2. Fetch transcript of active session
  const { data: activeSession, isLoading: loadingActiveSession } = useQuery({
    queryKey: ['chatSession', activeSessionId],
    queryFn: async () => {
      if (!activeSessionId) return null;
      const res = await apiClient.get(`/api/chat/?session_id=${activeSessionId}`);
      return res.data?.data || null;
    },
    enabled: !!activeSessionId
  });

  // 3. Send message mutation
  const { mutate: sendMessage, isLoading: posting } = useMutation({
    mutationFn: async ({ text, sessionId }) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const targetSessionId = sessionId || activeSessionId;

      // Optimistic update locally
      const tempUserMsg = { sender: 'user', text, timestamp: new Date().toISOString() };
      queryClient.setQueryData(['chatSession', targetSessionId], (old) => {
        const messages = old?.messages ? [...old.messages, tempUserMsg] : [tempUserMsg];
        return { ...old, messages };
      });

      const res = await apiClient.post('/api/chat/message/', { 
        text,
        session_id: targetSessionId
      }, {
        signal: controller.signal
      });
      return { data: res.data?.data || res.data, targetSessionId };
    },
    onSuccess: ({ data, targetSessionId }) => {
      // Replace with final reply payload from Gemini
      queryClient.setQueryData(['chatSession', targetSessionId], (old) => {
        const messages = old?.messages ? [...old.messages] : [];
        if (messages.length > 0) messages.pop(); // Remove optimistic user message
        return {
          ...old,
          messages: [...messages, data.user_message, data.bot_message]
        };
      });
      // Refresh list of sessions (updates titles/timestamps)
      queryClient.invalidateQueries(['chatSessions']);
    },
    onError: (err, variables) => {
      const targetSessionId = variables.sessionId || activeSessionId;
      if (err.name === 'CanceledError' || err.message === 'canceled') {
        console.log('Gemini generation aborted.');
      } else {
        showToast(err.response?.data?.error?.message || 'Connection to Gemini failed. Please retry.', 'error');
      }
      queryClient.invalidateQueries(['chatSession', targetSessionId]);
    }
  });

  // 4. Create new chat session
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/api/chat/sessions/create/', { title: 'New Conversation' });
      return res.data?.data;
    },
    onSuccess: (newSession) => {
      queryClient.setQueryData(['chatSessions'], (old) => {
        return old ? [newSession, ...old] : [newSession];
      });
      setActiveSessionId(newSession.id);
      showToast('New conversation session created.');
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to create new session.', 'error');
    }
  });

  // 5. Rename chat session
  const renameSessionMutation = useMutation({
    mutationFn: async ({ id, title }) => {
      const res = await apiClient.put(`/api/chat/sessions/${id}/rename/`, { title });
      return res.data?.data;
    },
    onSuccess: (_, variables) => {
      queryClient.setQueryData(['chatSessions'], (old) => {
        return old ? old.map(s => s.id === variables.id ? { ...s, title: variables.title } : s) : [];
      });
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to rename session.', 'error');
    }
  });

  // 6. Delete individual chat session
  const deleteSessionMutation = useMutation({
    mutationFn: async (id) => {
      await apiClient.delete(`/api/chat/sessions/${id}/delete/`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(['chatSessions'], (old) => {
        return old ? old.filter(s => s.id !== deletedId) : [];
      });
      if (activeSessionId === deletedId) {
        setActiveSessionId(null);
      }
      showToast('Conversation session deleted.');
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to delete session.', 'error');
    }
  });

  // 7. Delete all chat sessions
  const deleteAllSessionsMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/api/chat/sessions/delete-all/');
    },
    onSuccess: () => {
      queryClient.setQueryData(['chatSessions'], []);
      setActiveSessionId(null);
      showToast('All chat sessions cleared.');
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to clear sessions.', 'error');
    }
  });

  // 8. Clear active chat transcript messages
  const { mutate: clearChat } = useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/chat/clear/', { session_id: activeSessionId });
    },
    onSuccess: () => {
      queryClient.setQueryData(['chatSession', activeSessionId], null);
      queryClient.setQueryData(['chatSessions'], (old) => {
        return old ? old.filter(s => s.id !== activeSessionId) : [];
      });
      setActiveSessionId(null);
      setTextInput('');
      showToast('Chat history cleared.');
    },
    onError: (err) => {
      showToast(err.response?.data?.error?.message || 'Failed to clear chat.', 'error');
    }
  });

  // Auto-scroll to bottom of thread
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSession?.messages, posting]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = textInput.trim();
    if (!text || posting) return;
    setTextInput('');

    if (!activeSessionId) {
      try {
        const res = await apiClient.post('/api/chat/sessions/create/', { title: 'New Conversation' });
        const newSession = res.data?.data;
        queryClient.setQueryData(['chatSessions'], (old) => {
          return old ? [newSession, ...old] : [newSession];
        });
        setActiveSessionId(newSession.id);
        sendMessage({ text, sessionId: newSession.id });
      } catch (err) {
        showToast(err.response?.data?.error?.message || 'Failed to create new session.', 'error');
      }
    } else {
      sendMessage({ text, sessionId: activeSessionId });
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText('Copied text to clipboard!');
    setTimeout(() => setCopiedText(''), 2000);
  };

  const handleRegenerate = (msgIndex) => {
    if (!activeSession?.messages) return;
    let userText = '';
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (activeSession.messages[i].sender === 'user') {
        userText = activeSession.messages[i].text;
        break;
      }
    }
    if (userText) {
      queryClient.setQueryData(['chatSession', activeSessionId], (old) => {
        const messages = old?.messages ? old.messages.slice(0, msgIndex) : [];
        return { ...old, messages };
      });
      sendMessage({ text: userText, sessionId: activeSessionId });
    }
  };

  const handleRename = (id, currentTitle) => {
    const newTitle = window.prompt('Enter new name for this conversation:', currentTitle);
    if (newTitle && newTitle.trim()) {
      renameSessionMutation.mutate({ id, title: newTitle.trim() });
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Delete Conversation',
      message: 'Delete this conversation history?',
      type: 'delete',
      confirmText: 'Delete'
    });
    if (ok) {
      deleteSessionMutation.mutate(id);
    }
  };

  const handleDeleteAll = async () => {
    const ok = await confirm({
      title: 'Delete All Conversations',
      message: 'Are you absolutely sure you want to delete ALL conversations? This cannot be undone.',
      type: 'delete',
      confirmText: 'Delete All'
    });
    if (ok) {
      deleteAllSessionsMutation.mutate();
    }
  };

  if (loadingSessions) {
    return <Loader skeleton={true} variant="grid" className="max-w-6xl mx-auto" />;
  }

  const messages = activeSession?.messages || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-left">
      <div>
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <FiCpu className="text-orange-500 animate-pulse" /> Omniscient AI Career Assistant
        </h2>
        <p className="text-slate-400 text-xs mt-1">Get targeted mentorship advice, review resume keywords, and bridge skill gaps.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch min-h-[600px]">
        {/* SIDEBAR Panel: Recent Conversations List */}
        <div className="md:col-span-4 bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-2xl flex flex-col p-4 space-y-4">
          <Button
            onClick={() => createSessionMutation.mutate()}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <FiPlus className="w-4 h-4" />
            <span>New Conversation</span>
          </Button>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px] md:max-h-[500px]">
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider mb-2">Recent Chats</h4>
            {sessions.length === 0 ? (
              <div className="text-center py-10 text-[11px] text-slate-400 italic">No conversations. Start a new one!</div>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setActiveSessionId(s.id)}
                  className={`group relative w-full p-3 rounded-xl border transition text-left cursor-pointer flex items-center justify-between ${
                    activeSessionId === s.id
                      ? 'bg-orange-50/50 border-orange-200 text-orange-700'
                      : 'bg-white border-slate-200 hover:bg-slate-50/60 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden mr-6">
                    <FiMessageSquare className={`shrink-0 w-3.5 h-3.5 ${activeSessionId === s.id ? 'text-orange-500' : 'text-slate-450'}`} />
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold truncate pr-2">{s.title || 'New Conversation'}</p>
                      {s.updated_at && (
                        <p className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <FiClock className="w-2.5 h-2.5" />
                          {new Date(s.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRename(s.id, s.title); }}
                      className="p-1 hover:text-orange-500 rounded text-slate-400 hover:bg-white"
                      title="Rename Chat"
                    >
                      <FiEdit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, s.id)}
                      className="p-1 hover:text-red-500 rounded text-slate-400 hover:bg-white"
                      title="Delete Chat"
                    >
                      <FiTrash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {sessions.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="w-full text-center text-red-500 hover:text-red-650 hover:bg-red-50/50 rounded-xl py-2 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 border border-dashed border-slate-200 mt-auto"
            >
              <FiTrash2 className="w-3.5 h-3.5" />
              <span>Delete All Chats</span>
            </button>
          )}
        </div>

        {/* MAIN Chat Window */}
        <div className="md:col-span-8 flex flex-col items-stretch">
          <Card hoverable={false} className="flex flex-col h-[560px] p-0 border border-slate-200 bg-white shadow-sm rounded-2xl">
            {/* Header info */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white rounded-t-2xl shrink-0">
              <div className="overflow-hidden">
                <h3 className="font-extrabold text-slate-800 text-sm truncate">
                  {sessions.find((s) => s.id === activeSessionId)?.title || 'Career Guidance AI'}
                </h3>
                <p className="text-[10px] text-slate-405 font-medium mt-0.5">Live career feedback based on active profile criteria</p>
              </div>

              {messages.length > 0 && (
                <button
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Clear Chat',
                      message: 'Clear messages in this conversation?',
                      type: 'warning',
                      confirmText: 'Clear'
                    });
                    if (ok) clearChat();
                  }}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-[10px] font-bold text-slate-500 flex items-center gap-1"
                >
                  <FiTrash2 className="w-3 h-3 text-red-400" />
                  <span>Clear Conversation</span>
                </button>
              )}
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
              {loadingActiveSession && activeSessionId ? (
                <div className="h-full flex items-center justify-center"><Loader skeleton={false} /></div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-3 px-6">
                  <FiMessageSquare className="w-12 h-12 text-slate-300 animate-bounce" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-sm text-slate-750">Start a Career Consultation</p>
                    <p className="text-[11px] max-w-xs leading-relaxed text-slate-400 dark:text-[#6B7FA3] font-medium">
                      Ask about interview prep, matching resume keywords, target roadmap plans, or specific skills.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <ChatBubble 
                    key={idx} 
                    message={msg} 
                    index={idx}
                    onCopy={handleCopy}
                    onRegenerate={handleRegenerate}
                  />
                ))
              )}
              {posting && (
                <div className="flex w-full items-start space-x-3 py-1">
                  <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-white flex-shrink-0 animate-pulse">
                    <FiCpu className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] px-4 py-2.5 rounded-2xl rounded-tl-sm text-xs shadow-sm">
                    <div className="flex space-x-1.5 py-1.5 items-center justify-center">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Feedback message for copying */}
            {copiedText && (
              <div className="bg-green-50 text-green-600 px-4 py-2 text-xs font-bold text-center border-t border-green-150 animate-fade-in shrink-0">
                {copiedText}
              </div>
            )}

            {/* Input field area */}
            <div className="p-4 border-t border-slate-100 bg-white rounded-b-2xl shrink-0">
              <form onSubmit={handleSend} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={textInput}
                  disabled={posting}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Ask the counselor a career question..."
                  className="flex-1 px-4 py-3 rounded-2xl text-xs md:text-sm border bg-white text-slate-800 placeholder-slate-400 outline-none border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all disabled:opacity-50 font-medium"
                />
                
                {posting ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="p-3 bg-red-500 hover:bg-red-650 text-white rounded-2xl h-11 w-11 flex items-center justify-center flex-shrink-0 font-bold transition shadow-sm"
                    title="Stop Generating"
                  >
                    <FiSquare className="w-4 h-4 fill-current text-white animate-pulse" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!textInput.trim() || posting}
                    className="p-3 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:cursor-not-allowed text-white rounded-2xl h-11 w-11 flex items-center justify-center flex-shrink-0 font-bold transition shadow-sm"
                  >
                    <FiCornerDownRight className="w-4 h-4 text-white" />
                  </button>
                )}
              </form>
            </div>
          </Card>
        </div>
      </div>
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
