import React from "react";
import type { Metadata } from "next";
import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import PrivacySection from "@/components/landing/PrivacySection";
import WorkflowSection from "@/components/landing/WorkflowSection";
import ExercisesSection from "@/components/landing/ExercisesSection";
import MotionLabSection from "@/components/landing/MotionLabSection";
import TechPipelineSection from "@/components/landing/TechPipelineSection";
import CtaSection from "@/components/landing/CtaSection";
import LandingFooter from "@/components/landing/LandingFooter";
import { Marquee } from "@/components/ui/Marquee";
import { BigScrollText } from "@/components/ui/BigScrollText";

export const metadata: Metadata = {
  title: "FitVision — Intelligent Real-Time Athletic Vision",
  description:
    "Train with intelligence. Real-time computer vision fitness coaching directly in your browser with private, on-device pose tracking.",
};

const MARQUEE_FACTS = [
  "On-Device Pose Tracking",
  "33 Skeletal Keypoints",
  "6 Supported Exercises",
  "Zero Video Uploads",
  "Debounced Rep Counter",
];

export default function HomePage() {
  return (
    <div
      id="top"
      className="min-h-screen bg-bg-base text-white antialiased flex flex-col selection:bg-brand selection:text-white"
    >
      {/* Sticky Two-Tier Header + Full-Screen Menu Overlay */}
      <LandingNavbar />

      {/* Main Viewport Container */}
      <main className="flex-1 flex flex-col">
        {/* 1. Cinematic Athletic Hero */}
        <HeroSection />

        {/* 2. Continuous Product Facts Marquee */}
        <Marquee items={MARQUEE_FACTS} ariaLabel="FitVision product facts" />

        {/* 3. Privacy-First Assurance */}
        <PrivacySection />

        {/* 4. 3-Step Workout Workflow (Progress Accordion) */}
        <WorkflowSection />

        {/* 5. Decorative Scroll-Linked Display Text */}
        <BigScrollText text="TRAIN SMARTER" />

        {/* 6. Supported Movement Library (6 Exercises Bento Grid) */}
        <ExercisesSection />

        {/* 7. Interactive Procedural Motion Lab (Lazy-loaded 3D Mannequin) */}
        <MotionLabSection />

        {/* 8. Technology & Engine Pipeline */}
        <TechPipelineSection />

        {/* 9. Full-Width Bottom Conversion Band */}
        <CtaSection />
      </main>

      {/* Product Footer */}
      <LandingFooter />
    </div>
  );
}
