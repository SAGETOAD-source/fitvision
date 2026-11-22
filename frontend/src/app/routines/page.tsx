import React from "react";
import type { Metadata } from "next";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import { RoutinesView } from "@/components/routines/RoutinesView";

export const metadata: Metadata = {
  title: "Recommended Routine — FitVision",
  description:
    "Your personalized FitVision workout routine with direct links to on-device Live Workout tracking.",
};

export default function RoutinesPage() {
  return (
    <div
      id="top"
      className="min-h-screen bg-bg-base text-white antialiased flex flex-col selection:bg-brand selection:text-white"
    >
      <LandingNavbar />
      <main className="flex-1 flex flex-col">
        <RoutinesView />
      </main>
      <LandingFooter />
    </div>
  );
}
