import React, { useState } from 'react';
import { FiHelpCircle, FiChevronDown, FiChevronUp, FiBookOpen, FiTool } from 'react-icons/fi';
import PublicNavbar from '../components/PublicNavbar.jsx';
import Footer from '../components/Footer.jsx';

export default function HelpSupport() {
  const [activeSection, setActiveSection] = useState('faq');
  const [openFaq, setOpenFaq] = useState(null);

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
    <div className="bg-slate-50/50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 flex flex-col justify-between selection:bg-orange-500 selection:text-white transition-colors duration-200">
      <PublicNavbar />

      <main className="flex-grow max-w-4xl mx-auto px-4 py-24 space-y-6 w-full">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <FiHelpCircle className="text-orange-500" /> Help & Support Center
          </h2>
          <p className="text-slate-400 dark:text-slate-400 text-xs mt-1 font-medium">Resolve application questions and understand platform features.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => setActiveSection('faq')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeSection === 'faq' ? 'border-orange-500 text-orange-650 dark:text-orange-400' : 'border-transparent text-slate-450 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            Frequently Asked Questions
          </button>
          <button 
            onClick={() => setActiveSection('trouble')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeSection === 'trouble' ? 'border-orange-500 text-orange-650 dark:text-orange-400' : 'border-transparent text-slate-450 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            Troubleshooting Guide
          </button>
          <button 
            onClick={() => setActiveSection('guide')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeSection === 'guide' ? 'border-orange-500 text-orange-655 dark:text-orange-400' : 'border-transparent text-slate-450 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            User Guide
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm shadow-slate-100/50 dark:shadow-none">
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
                <div key={index} className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2">
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
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-2">
                    <FiBookOpen className="text-orange-500 w-4 h-4" /> {step.step}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold pl-6">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
