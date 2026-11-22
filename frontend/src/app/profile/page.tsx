import React from "react";
import type { Metadata } from "next";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import { ProfileView } from "@/components/account/ProfileView";

export const metadata: Metadata = {
  title: "Profile — FitVision",
  description:
    "Manage your FitVision account, primary body goal, and target focus area.",
};

export default function ProfilePage() {
  return (
    <div
      id="top"
      className="min-h-screen bg-bg-base text-white antialiased flex flex-col selection:bg-brand selection:text-white"
    >
      <LandingNavbar />
      <main className="flex-1 flex flex-col">
        <ProfileView />
      </main>
      <LandingFooter />
    </div>
  );
}
