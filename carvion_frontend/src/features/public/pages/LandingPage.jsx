import React from 'react';
import PublicNavbar from '../components/PublicNavbar.jsx';
import HeroSection from '../components/HeroSection.jsx';
import FeatureGrid from '../components/FeatureGrid.jsx';
import PricingCard from '../components/PricingCard.jsx';
import PlatformStats from '../components/PlatformStats.jsx';
import Footer from '../components/Footer.jsx';

export default function LandingPage() {
  return (
    <div className="bg-white dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100 flex flex-col justify-between selection:bg-orange-500 selection:text-white transition-colors duration-200">
      {/* Dynamic Header Navbar */}
      <PublicNavbar />

      {/* Main sections layout */}
      <main className="flex-grow pt-16">
        {/* Section 1: Interactive Hero Landing */}
        <HeroSection />

        {/* Section 2: Core Platform Feature Grid details */}
        <FeatureGrid />

        {/* Section 3: SaaS pricing comparison models */}
        <PricingCard />

        {/* Section 4: Dynamic Platform Statistics */}
        <PlatformStats />
      </main>

      {/* Footer Details */}
      <Footer />
    </div>
  );
}
