import React from "react";
import type { Metadata } from "next";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import { DashboardView } from "@/components/account/DashboardView";

export const metadata: Metadata = {
  title: "Dashboard — FitVision",
  description:
    "View your FitVision training streak, 7-day rep volume, exercise breakdown, and recent sessions.",
};

export default function DashboardPage() {
  return (
    <div
      id="top"
      className="min-h-screen bg-bg-base text-white antialiased flex flex-col selection:bg-brand selection:text-white"
    >
      <LandingNavbar />
      <main className="flex-1 flex flex-col">
        <DashboardView />
      </main>
      <LandingFooter />
    </div>
  );
}
