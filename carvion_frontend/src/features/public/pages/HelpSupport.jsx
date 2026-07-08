import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FiHelpCircle, FiChevronDown, FiChevronUp, FiBookOpen, FiTool,
  FiMail, FiMessageSquare, FiSend, FiPlus, FiArrowLeft, FiUser,
  FiClock, FiAlertCircle, FiCheckCircle, FiShield, FiCalendar
} from 'react-icons/fi';
import PublicNavbar from '../components/PublicNavbar.jsx';
import Footer from '../components/Footer.jsx';
import useAuth from '../../../hooks/useAuth.js';
import apiClient from '../../../core/api/apiClient.js';
import Loader from '../../../components/common/Loader.jsx';
import Toast from '../../../components/feedback/Toast.jsx';

export default function HelpSupport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [activeSection, setActiveSection] = useState('faq');
  const [openFaq, setOpenFaq] = useState(null);
  const [toast, setToast] = useState(null);

  // User Tickets Panel State
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);

  // New ticket form state
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');

  // 1. Fetch user's tickets (only enabled if user is logged in)
  const { data: ticketsData, isLoading: ticketsLoading, refetch: refetchTickets } = useQuery({
    queryKey: ['userTickets'],
    queryFn: async () => {
      const response = await apiClient.get('/api/profile/tickets/');
      return response.data?.data || [];
    },
    enabled: !!user && activeSection === 'tickets'
  });

  // 2. Fetch details for selected ticket
  const { data: selectedTicket, isLoading: detailLoading, refetch: refetchDetail } = useQuery({
    queryKey: ['userTicketDetail', selectedTicketId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/profile/tickets/${selectedTicketId}/`);
      return response.data?.data || null;
    },
    enabled: !!user && !!selectedTicketId
  });

  // 3. User reply mutation
  const userReplyMutation = useMutation({
    mutationFn: async ({ id, message }) => {
      const response = await apiClient.post(`/api/profile/tickets/${id}/reply/`, { message });
      return response.data;
    },
    onSuccess: () => {
      setToast({ type: 'success', message: 'Reply sent successfully!' });
      setReplyMessage('');
      queryClient.invalidateQueries(['userTickets']);
      refetchDetail();
    },
    onError: (err) => {
      setToast({ type: 'error', message: err.response?.data?.error?.message || 'Failed to send reply.' });
    }
  });

  // 4. Create new ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post('/api/profile/contact/', payload);
      return response.data;
    },
    onSuccess: () => {
      setToast({ type: 'success', message: 'Support ticket created successfully!' });
      setNewSubject('');
      setNewMessage('');
      setCreatingTicket(false);
      queryClient.invalidateQueries(['userTickets']);
    },
    onError: (err) => {
      setToast({ type: 'error', message: err.response?.data?.error?.message || 'Failed to create support ticket.' });
    }
  });

  const handlePostReply = () => {
    if (!replyMessage.trim()) return;
    userReplyMutation.mutate({ id: selectedTicketId, message: replyMessage });
  };

  const handleCreateTicketSubmit = (e) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;
    createTicketMutation.mutate({
      name: user.name || 'Anonymous User',
      email: user.email,
      subject: newSubject,
      message: newMessage
    });
  };

  const faqs = [
    {
      question: "How does the ATS score calculation work?",
      answer: "The Applicant Tracking System (ATS) score matches raw text parsed from your resume against standard keywords and core tools expected for the target position. It uses Google Gemini LLM reasoning to evaluate missing elements, grammar, formatting, and overall style."
    },
    {
      question: "Can I manage different versions of my resume?",
      answer: "Yes! The platform keeps a complete version control repository of your uploaded resumes. You can access previous documents, scores progression, and optimization reports under Resume Versions tab."
    },
    {
      question: "How do I trigger custom course recommendations?",
      answer: "Go to the Course Navigator tab under Learning. Type a career pathway or tech stack, and our system searches public online resources matching your skills gaps to recommend ideal content."
    },
    {
      question: "Is my personal resume information protected?",
      answer: "Absolutely. Your parsed details, profile metadata, and files are securely stored on private databases dedicated strictly to your account workspace."
    }
  ];

  const troubleshooting = [
    {
      issue: "My resume upload keeps failing.",
      solution: "Ensure the file size is under 5MB and is formatted as either PDF (.pdf) or Word Document (.docx). Scanned images inside PDFs cannot be parsed accurately, so verify the text is selectable."
    },
    {
      issue: "Gemini AI response is slow or times out.",
      solution: "During high-traffic periods, AI operations may experience delay. If a request times out, click the reload/retry options provided directly on the page component."
    },
    {
      issue: "My profile target role updates are not saving.",
      solution: "Verify that all profile fields satisfy formatting constraints. Ensure that your internet connection is active and reload settings to update cache."
    }
  ];

  const userGuideSteps = [
    {
      step: "1. Update Career Targets",
      desc: "Navigate to My Profile setting using the top-right menu dropdown. Save your target role and active technical skills."
    },
    {
      step: "2. Perform ATS Audit Scan",
      desc: "Upload your latest resume document inside Resume Workspace. Click evaluate to generate keyword suggestions."
    },
    {
      step: "3. Address Keyword Gaps",
      desc: "Audit the skill checklist inside Skill Gap Analyzer, and use Resume Optimizer to rewrite weak experience bullets."
    },
    {
      step: "4. Take Mock Assessments",
      desc: "Test your theoretical capabilities in Assessments MCQ quizzes or try out our interactive Interview Practice simulator."
    }
  ];

  return (
    <div className="bg-slate-50/50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      <PublicNavbar />
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <main className="flex-grow max-w-4xl mx-auto px-4 py-24 space-y-6 w-full">
        <div>
          <h2 className="text-xl font-black text-slate-805 dark:text-white flex items-center gap-2">
            <FiHelpCircle className="text-indigo-600" /> Help & Support Center
          </h2>
          <p className="text-slate-400 dark:text-slate-400 text-xs mt-1 font-medium">Resolve application questions, understand features, and open conversation tickets.</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => setActiveSection('faq')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeSection === 'faq' ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400' : 'border-transparent text-slate-450 dark:text-slate-400 hover:text-slate-655'
            }`}
          >
            Frequently Asked Questions
          </button>
          <button 
            onClick={() => setActiveSection('trouble')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeSection === 'trouble' ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400' : 'border-transparent text-slate-450 dark:text-slate-400 hover:text-slate-655'
            }`}
          >
            Troubleshooting Guide
          </button>
          <button 
            onClick={() => setActiveSection('guide')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeSection === 'guide' ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400' : 'border-transparent text-slate-450 dark:text-slate-400 hover:text-slate-655'
            }`}
          >
            User Guide
          </button>
          
          {user && (
            <button 
              onClick={() => { setActiveSection('tickets'); setSelectedTicketId(null); setCreatingTicket(false); }}
              className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
                activeSection === 'tickets' ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400' : 'border-transparent text-slate-450 dark:text-slate-400 hover:text-slate-655'
              }`}
            >
              Support Tickets & Inbox
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          {activeSection === 'faq' && (
            <div className="space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={index} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="w-full flex items-center justify-between p-4 text-xs font-bold text-slate-750 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 transition text-left"
                    >
                      <span>{faq.question}</span>
                      {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                    {isOpen && (
                      <div className="p-4 pt-0 text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed font-semibold">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeSection === 'trouble' && (
            <div className="space-y-4">
              {troubleshooting.map((t, index) => (
                <div key={index} className="p-4 bg-slate-50 dark:bg-slate-955 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2">
                  <h4 className="font-bold text-xs text-red-500 dark:text-red-400 flex items-center gap-2">
                    <FiTool /> {t.issue}
                  </h4>
                  <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed font-semibold pl-6">
                    {t.solution}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeSection === 'guide' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userGuideSteps.map((step, index) => (
                <div key={index} className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2">
                  <h4 className="font-bold text-xs text-slate-850 dark:text-white flex items-center gap-2">
                    <FiBookOpen className="text-indigo-505 w-4 h-4" /> {step.step}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed font-semibold pl-6">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* User Support Tickets Portal Section */}
          {activeSection === 'tickets' && user && (
            <div className="space-y-6">
              {!selectedTicketId && !creatingTicket && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Your Conversation Support Tickets</h3>
                    <button
                      onClick={() => setCreatingTicket(true)}
                      className="px-4.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition"
                    >
                      <FiPlus className="w-3.5 h-3.5" /> Create New Ticket
                    </button>
                  </div>

                  {ticketsLoading ? (
                    <div className="p-8">
                      <Loader fullScreen={false} />
                    </div>
                  ) : !ticketsData || ticketsData.length === 0 ? (
                    <div className="p-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-2">
                      <FiMail className="w-12 h-12 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-400 font-bold italic">No support inquiries opened. Create one to begin a secure thread.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-slate-100 dark:border-slate-850 rounded-2xl divide-y divide-slate-100 dark:divide-slate-850">
                      {ticketsData.map((ticket) => (
                        <div
                          key={ticket.id}
                          onClick={() => setSelectedTicketId(ticket.id)}
                          className="p-4 bg-slate-50/30 dark:bg-slate-905/30 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5"
                        >
                          <div>
                            <span className="font-mono text-[9px] text-slate-400 block mb-0.5">TICKET: #{ticket.id.substring(0, 8)}</span>
                            <h4 className="text-xs font-black text-slate-800 dark:text-white">{ticket.subject}</h4>
                            <p className="text-[10px] text-slate-400 mt-1 font-bold">
                              Last Activity: {ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : new Date(ticket.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              ticket.priority === 'high' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {ticket.priority}
                            </span>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              ticket.status === 'resolved' ? 'bg-emerald-50 text-emerald-600' :
                              ticket.status === 'in_progress' ? 'bg-amber-50 text-amber-600' :
                              'bg-blue-50 text-blue-650'
                            }`}>
                              {ticket.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* View Conversation Thread */}
              {selectedTicketId && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-3">
                    <button
                      onClick={() => setSelectedTicketId(null)}
                      className="text-xs text-indigo-600 font-black flex items-center gap-1 hover:underline"
                    >
                      <FiArrowLeft /> Back to Tickets
                    </button>
                    {selectedTicket && (
                      <span className="font-mono text-[10px] text-slate-400 font-bold">
                        Status: <span className="uppercase text-indigo-500">{selectedTicket.status.replace(/_/g, ' ')}</span>
                      </span>
                    )}
                  </div>

                  {detailLoading ? (
                    <div className="p-8">
                      <Loader fullScreen={false} />
                    </div>
                  ) : !selectedTicket ? (
                    <p className="text-xs text-rose-500 font-bold">Ticket not found or access denied.</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Ticket Summary Header */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Subject</span>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white">{selectedTicket.subject}</h3>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">Opened on: {new Date(selectedTicket.created_at).toLocaleString()}</p>
                      </div>

                      {/* Chronological Chat Flow */}
                      <div className="space-y-3.5 p-4 border border-slate-100 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-905/10 rounded-2xl max-h-[360px] overflow-y-auto">
                        {(!selectedTicket.conversation || selectedTicket.conversation.length === 0) ? (
                          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl max-w-[85%]">
                            <p className="text-[9px] font-bold text-slate-400 mb-1">User ({selectedTicket.name})</p>
                            <p className="text-xs text-slate-700 dark:text-slate-350 font-semibold leading-relaxed whitespace-pre-wrap">{selectedTicket.message}</p>
                          </div>
                        ) : (
                          selectedTicket.conversation.map((msg, idx) => {
                            const isAdmin = msg.sender === 'admin';
                            return (
                              <div
                                key={idx}
                                className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                              >
                                <div className={`p-3.5 rounded-2xl border max-w-[85%] ${
                                  isAdmin 
                                    ? 'bg-indigo-50/20 border-indigo-100/50 dark:bg-indigo-950/10 dark:border-indigo-900/30' 
                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-850'
                                }`}>
                                  <div className="flex items-center gap-1.5 justify-between text-[9px] font-bold text-slate-400 mb-1">
                                    <span className={isAdmin ? 'text-indigo-550' : 'text-slate-600'}>
                                      {isAdmin ? 'Support Team' : (msg.sender_name || 'You')}
                                    </span>
                                    <span>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ''}</span>
                                  </div>
                                  <p className="text-xs text-slate-700 dark:text-slate-350 font-semibold leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Reply Box (Phase 4) */}
                      {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' ? (
                        <div className="space-y-2 bg-slate-55/20 dark:bg-slate-900/60 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl">
                          <textarea
                            rows={3}
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            className="w-full p-3 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-250 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            placeholder="Type message reply to support..."
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                              <FiShield className="text-indigo-500" /> secure user-to-admin message
                            </span>
                            <button
                              onClick={handlePostReply}
                              disabled={!replyMessage.trim()}
                              className="px-5 py-1.5 bg-indigo-650 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-[10px] font-black transition flex items-center gap-1.5"
                            >
                              <FiSend /> Send Message
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-100 dark:bg-slate-950 text-center rounded-xl text-xs font-bold text-slate-400 italic">
                          This support ticket case has been marked as {selectedTicket.status}. Open a new ticket if you need additional help.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Create Ticket Form */}
              {creatingTicket && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-3">
                    <button
                      onClick={() => setCreatingTicket(false)}
                      className="text-xs text-indigo-655 font-black flex items-center gap-1 hover:underline"
                    >
                      <FiArrowLeft /> Back to Tickets
                    </button>
                  </div>

                  <form onSubmit={handleCreateTicketSubmit} className="space-y-4 text-xs font-bold text-slate-700 dark:text-slate-350">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-455 tracking-wider">Your Email</label>
                      <input
                        type="email"
                        value={user.email}
                        disabled={true}
                        className="w-full p-2.5 bg-slate-100 dark:bg-slate-950 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-455 tracking-wider">Subject Title</label>
                      <input
                        type="text"
                        required
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        placeholder="Resume upload issue / course suggestions question..."
                        className="w-full p-2.5 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-455 tracking-wider">Describe your question or issue</label>
                      <textarea
                        rows={4}
                        required
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Write details of your problem here..."
                        className="w-full p-3 bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-205 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-555"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={createTicketMutation.isLoading}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5"
                    >
                      {createTicketMutation.isLoading ? 'Creating...' : (
                        <>
                          <FiSend /> Create Ticket & Start Thread
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
