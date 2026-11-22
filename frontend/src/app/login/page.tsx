import React, { Suspense } from "react";
import type { Metadata } from "next";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import { AuthForm } from "@/components/auth/AuthForm";
import { LoadingSpinner } from "@/components/ui";

export const metadata: Metadata = {
  title: "Log In — FitVision",
  description:
    "Sign in to FitVision to access your training profile and recommended workout routine.",
};

export default function LoginPage() {
  return (
    <div
      id="top"
      className="min-h-screen bg-bg-base text-white antialiased flex flex-col selection:bg-brand selection:text-white"
    >
      <LandingNavbar />
      <main className="flex-1 flex flex-col justify-center">
        <Suspense
          fallback={
            <div className="py-24 flex justify-center">
              <LoadingSpinner label="Loading sign-in form..." showLabel />
            </div>
          }
        >
          <AuthForm mode="login" />
        </Suspense>
      </main>
      <LandingFooter />
    </div>
  );
}
