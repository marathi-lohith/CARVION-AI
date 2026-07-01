import React, { useState } from 'react';
import {
  FiMail, FiPhone, FiGithub, FiLinkedin, FiMessageSquare,
  FiSend, FiCheckCircle, FiAlertCircle, FiUser, FiFileText, FiGlobe
} from 'react-icons/fi';
import apiClient from '../../../core/api/apiClient.js';
import { useSelector } from 'react-redux';
import PublicNavbar from '../components/PublicNavbar.jsx';
import Footer from '../components/Footer.jsx';
import Toast from '../../../components/feedback/Toast.jsx';

const contactDetails = [
  {
    icon: <FiMail className="w-5 h-5" />,
    label: 'Email Support',
    value: 'support@carvion.ai',
    href: 'mailto:support@carvion.ai',
    color: 'bg-orange-50 text-orange-500 border-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/60',
  },
  {
    icon: <FiPhone className="w-5 h-5" />,
    label: 'Phone',
    value: '+1 (800) CARVION',
    href: 'tel:+18002278466',
    color: 'bg-emerald-50 text-emerald-500 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/60',
  },
  {
    icon: <FiGithub className="w-5 h-5" />,
    label: 'GitHub',
    value: 'github.com/carvion-ai',
    href: 'https://github.com',
    color: 'bg-slate-50 text-slate-650 border-slate-100 dark:bg-slate-850 dark:text-slate-300 dark:border-slate-800',
    external: true,
  },
  {
    icon: <FiLinkedin className="w-5 h-5" />,
    label: 'LinkedIn',
    value: 'linkedin.com/company/carvion',
    href: 'https://linkedin.com',
    color: 'bg-blue-50 text-blue-500 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/60',
    external: true,
  },
  {
    icon: <FiGlobe className="w-5 h-5" />,
    label: 'Website',
    value: 'www.carvion.ai',
    href: 'https://carvion.ai',
    color: 'bg-purple-50 text-purple-500 border-purple-100 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/60',
    external: true,
  },
];

const SUBJECTS = [
  'General Enquiry',
  'Bug Report',
  'Feature Request',
  'Billing & Subscription',
  'Account Help',
  'Partnership',
  'Other',
];

export default function ContactUs() {
  const { user } = useSelector((state) => state.auth);

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.name.trim() || !form.email.trim() || !form.subject || !form.message.trim()) {
      setStatus('error');
      setErrorMsg('Please fill in all required fields.');
      showToast('Please fill in all required fields.', 'warning');
      return;
    }
    if (!emailRegex.test(form.email.trim())) {
      setStatus('error');
      setErrorMsg('Please enter a valid email address.');
      showToast('Please enter a valid email address.', 'warning');
      return;
    }
    setStatus('loading');
    try {
      await apiClient.post('/api/profile/contact/', form);
      setStatus('success');
      setForm(prev => ({ ...prev, subject: '', message: '' }));
      showToast('Message sent successfully.');
    } catch (err) {
      setStatus('error');
      const msg = err?.response?.data?.error?.message || 'Failed to send message. Please try again.';
      setErrorMsg(msg);
      showToast('Failed to send message. Please try again.', 'error');
    }
  };

  return (
    <div className="bg-slate-50/50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 flex flex-col justify-between selection:bg-orange-500 selection:text-white transition-colors duration-200">
      <PublicNavbar />

      <main className="flex-grow max-w-5xl mx-auto px-4 py-24 space-y-8 w-full">
        {/* Page Header */}
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <FiMessageSquare className="text-orange-500" /> Contact Us
          </h2>
          <p className="text-slate-400 dark:text-slate-400 text-xs mt-1">
            Get in touch with our team. We typically respond within 24 hours on business days.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Contact Info Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-slate-900 dark:to-slate-950 border border-orange-100 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
              <div>
                <h3 className="font-black text-slate-800 dark:text-white text-sm">Let's Connect</h3>
                <p className="text-slate-500 dark:text-slate-450 text-xs mt-1 leading-relaxed">
                  Have a question, found a bug, or want to collaborate? Reach us through any channel below or submit the contact form.
                </p>
              </div>
              <div className="space-y-3">
                {contactDetails.map((c) => (
                  <a
                    key={c.label}
                    href={c.href}
                    target={c.external ? '_blank' : undefined}
                    rel={c.external ? 'noopener noreferrer' : undefined}
                    className={`flex items-center gap-3 p-3 rounded-xl border hover:shadow-sm transition-all duration-200 hover:-translate-y-0.5 bg-white dark:bg-slate-900 dark:border-slate-800 ${c.color}`}
                  >
                    <div className="p-2 rounded-lg border flex-shrink-0 flex items-center justify-center">{c.icon}</div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{c.label}</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{c.value}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
              <h4 className="font-bold text-xs text-slate-700 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FiCheckCircle className="text-emerald-500 w-3.5 h-3.5" /> Response Times
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">General Enquiries</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">24–48 hrs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Bug Reports</span>
                  <span className="font-bold text-orange-500 dark:text-orange-400">12–24 hrs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Partnership Requests</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">3–5 days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-7 shadow-sm space-y-5">
              <h3 className="font-black text-slate-800 dark:text-white text-sm flex items-center gap-2">
                <FiSend className="text-orange-500 w-4 h-4" /> Send a Message
              </h3>

              {status === 'success' ? (
                <div className="text-center space-y-4 py-10">
                  <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto">
                    <FiCheckCircle className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-black text-slate-800 dark:text-white">Message Sent Successfully!</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs max-w-xs mx-auto leading-relaxed">
                    Thank you for reaching out. Our team will get back to you within 24–48 business hours.
                  </p>
                  <button
                    onClick={() => setStatus(null)}
                    className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {/* Error banner */}
                  {status === 'error' && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/60 rounded-xl text-xs text-red-600 dark:text-red-400 font-semibold">
                      <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                      {errorMsg}
                    </div>
                  )}

                  {/* Name + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-655 dark:text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider flex items-center gap-1.5">
                        <FiUser className="w-3 h-3" /> Full Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Your full name"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-655 dark:text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider flex items-center gap-1.5">
                        <FiMail className="w-3 h-3" /> Email Address <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-655 dark:text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider flex items-center gap-1.5">
                      <FiFileText className="w-3 h-3" /> Subject <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all"
                      required
                    >
                      <option value="">Select a subject...</option>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-655 dark:text-slate-400 dark:text-[#6B7FA3] uppercase tracking-wider flex items-center gap-1.5">
                      <FiMessageSquare className="w-3 h-3" /> Message <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      rows={5}
                      placeholder="Describe your question or issue in detail..."
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all resize-none"
                      required
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 text-right">{form.message.length} characters</p>
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl text-xs font-bold transition-all duration-200 hover:shadow-md hover:shadow-orange-200 disabled:cursor-not-allowed"
                  >
                    {status === 'loading' ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <FiSend className="w-3.5 h-3.5" /> Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
