import React from "react";
import type { Metadata } from "next";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import { OnboardingWizard } from "@/components/auth/OnboardingWizard";

export const metadata: Metadata = {
  title: "Training Setup — FitVision",
  description:
    "Choose your body goal and focus area to personalize your FitVision workout plan.",
};

export default function OnboardingPage() {
  return (
    <div
      id="top"
      className="min-h-screen bg-bg-base text-white antialiased flex flex-col selection:bg-brand selection:text-white"
    >
      <LandingNavbar />
      <main className="flex-1 flex flex-col">
        <OnboardingWizard />
      </main>
      <LandingFooter />
    </div>
  );
}
