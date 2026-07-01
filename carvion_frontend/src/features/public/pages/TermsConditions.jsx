import React from 'react';
import PublicNavbar from '../components/PublicNavbar.jsx';
import Footer from '../components/Footer.jsx';

export default function TermsConditions() {
  return (
    <div className="bg-white dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 flex flex-col justify-between selection:bg-orange-500 selection:text-white transition-colors duration-200">
      <PublicNavbar />
      
      <main className="flex-grow pt-28 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-6">Terms & Conditions</h1>
        <p className="text-xs text-slate-400 mb-8 font-medium">Last updated: June 29, 2026</p>
        
        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Carvion AI, you accept and agree to be bound by these Terms & Conditions. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">2. Description of Service</h2>
            <p>
              Carvion AI provides AI-powered career development services, including automated ATS resume scoring, interactive learning roadmaps, mock coding/MCQ tests, and mentor assistant chat features. We reserve the right to modify or terminate services at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">3. User Conduct and Content</h2>
            <p>
              You are responsible for all data, files, and text that you upload or compile. You agree not to upload content that violates intellectual property rights, is offensive, or contains malicious code.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">4. Intellectual Property</h2>
            <p>
              All software, layout designs, trademarks, and generated structures are the property of Carvion AI. You are granted a limited, personal, non-transferable license to use the services for your personal career optimization.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
