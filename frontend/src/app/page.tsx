import React from 'react';
import type { Metadata } from 'next';
import LandingNavbar from '@/components/landing/LandingNavbar';
import HeroSection from '@/components/landing/HeroSection';
import PrivacySection from '@/components/landing/PrivacySection';
import WorkflowSection from '@/components/landing/WorkflowSection';
import ExercisesSection from '@/components/landing/ExercisesSection';
import MotionLabSection from '@/components/landing/MotionLabSection';
import TechPipelineSection from '@/components/landing/TechPipelineSection';
import CtaSection from '@/components/landing/CtaSection';
import LandingFooter from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'FitVision — Intelligent Real-Time Athletic Vision',
  description:
    'Train with intelligence. Real-time computer vision fitness coaching directly in your browser with private, on-device pose tracking.',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white antialiased flex flex-col selection:bg-[#6D001A] selection:text-white">
      {/* Sticky Top App Bar */}
      <LandingNavbar />

      {/* Main Viewport Container */}
      <main className="flex-1 flex flex-col gap-6 sm:gap-10">
        {/* 1. Cinematic Athletic Hero */}
        <HeroSection />

        {/* 2. Privacy-First Assurance */}
        <PrivacySection />

        {/* 3. 3-Step Workout Workflow */}
        <WorkflowSection />

        {/* 4. Supported Movement Library (6 Exercises) */}
        <ExercisesSection />

        {/* 5. Interactive Procedural Motion Lab (Lazy-loaded 3D Mannequin) */}
        <MotionLabSection />

        {/* 6. Technology & Engine Pipeline */}
        <TechPipelineSection />

        {/* 7. Bottom Conversion Banner */}
        <CtaSection />
      </main>

      {/* Product Footer */}
      <LandingFooter />
    </div>
  );
}
