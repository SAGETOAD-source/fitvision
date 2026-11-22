import React from "react";
import type { Metadata } from "next";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import { HistoryView } from "@/components/account/HistoryView";

export const metadata: Metadata = {
  title: "Workout History — FitVision",
  description:
    "Review all completed FitVision workouts with rep counts, timestamps, and durations.",
};

export default function HistoryPage() {
  return (
    <div
      id="top"
      className="min-h-screen bg-bg-base text-white antialiased flex flex-col selection:bg-brand selection:text-white"
    >
      <LandingNavbar />
      <main className="flex-1 flex flex-col">
        <HistoryView />
      </main>
      <LandingFooter />
    </div>
  );
}
