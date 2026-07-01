import React from 'react';
import PublicNavbar from '../components/PublicNavbar.jsx';
import Footer from '../components/Footer.jsx';

export default function PrivacyPolicy() {
  return (
    <div className="bg-white dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 flex flex-col justify-between selection:bg-orange-500 selection:text-white transition-colors duration-200">
      <PublicNavbar />
      
      <main className="flex-grow pt-28 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-6">Privacy Policy</h1>
        <p className="text-xs text-slate-400 mb-8 font-medium">Last updated: June 29, 2026</p>
        
        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">1. Information We Collect</h2>
            <p>
              We collect information to provide better services to all our users. This includes resume text, user profile inputs, and interaction metadata that you provide when uploading resumes or building them using our tools.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">2. How We Use Information</h2>
            <p>
              We use the collected information to analyze resume structure, calculate ATS matching scores, generate career milestones, and recommend relevant course pathways or job listings using advanced AI analytics. We do not sell your personal data to third parties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">3. Data Security and Storage</h2>
            <p>
              Your data is stored securely in encrypted databases. We implement standard protocols to protect your personal details and uploaded career files from unauthorized access, modification, or disclosure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">4. Cookies and Tracking</h2>
            <p>
              We use cookies to maintain your active authentication session and optimize UI display settings. You can manage cookie preferences directly via your browser settings.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
