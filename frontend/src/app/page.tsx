import React from "react";
import type { Metadata } from "next";
import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import PrivacySection from "@/components/landing/PrivacySection";
import TaglineReveal from "@/components/landing/TaglineReveal";
import WorkflowSection from "@/components/landing/WorkflowSection";
import ExercisesSection from "@/components/landing/ExercisesSection";
import MotionLabSection from "@/components/landing/MotionLabSection";
import TechPipelineSection from "@/components/landing/TechPipelineSection";
import ReturnLoopSection from "@/components/landing/ReturnLoopSection";
import CtaSection from "@/components/landing/CtaSection";
import LandingFooter from "@/components/landing/LandingFooter";
import { Marquee } from "@/components/ui/Marquee";
import { BigScrollText } from "@/components/ui/BigScrollText";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

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

      {/* Main Storytelling Viewport Container */}
      <main id="main-content" className="flex-1 flex flex-col">
        {/* Act 1: Cinematic Athletic Hero */}
        <HeroSection />

        {/* Continuous Product Facts Marquee */}
        <Marquee items={MARQUEE_FACTS} ariaLabel="FitVision product facts" />

        {/* Chapter 01: Privacy-First Assurance */}
        <ScrollReveal>
          <PrivacySection />
        </ScrollReveal>

        {/* Chapter 02: Scroll-Lit Manifesto Reveal */}
        <TaglineReveal />

        {/* Chapter 03: 3-Step Workout Workflow (Progress Accordion) */}
        <ScrollReveal>
          <WorkflowSection />
        </ScrollReveal>

        {/* Decorative Scroll-Linked Display Text */}
        <BigScrollText text="TRAIN SMARTER" />

        {/* Chapter 04: Supported Movement Library (6 Exercises Bento Grid) */}
        <ScrollReveal>
          <ExercisesSection />
        </ScrollReveal>

        {/* Chapter 05: Interactive Procedural Motion Lab (Lazy-loaded 3D Mannequin) */}
        <ScrollReveal>
          <MotionLabSection />
        </ScrollReveal>

        {/* Chapter 06: Technology & Engine Pipeline */}
        <ScrollReveal>
          <TechPipelineSection />
        </ScrollReveal>

        {/* Chapter 07: The Daily Habit & Return Loop */}
        <ScrollReveal>
          <ReturnLoopSection />
        </ScrollReveal>

        {/* Final Act: Full-Width Bottom Conversion Band */}
        <ScrollReveal>
          <CtaSection />
        </ScrollReveal>
      </main>

      {/* Product Footer */}
      <LandingFooter />
    </div>
  );
}
