import React from "react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import { Button, Card, SectionLabel } from "@/components/ui";

export default function NotFound() {
  return (
    <div
      id="top"
      className="min-h-screen bg-bg-base text-white antialiased flex flex-col selection:bg-brand selection:text-white"
    >
      <LandingNavbar />

      <main
        id="main-content"
        className="flex-1 flex items-center justify-center px-4 sm:px-6 py-20 sm:py-28"
      >
        <Card
          variant="default"
          padding="lg"
          data-testid="not-found-page"
          className="max-w-xl w-full text-center space-y-6"
        >
          <div className="flex justify-center">
            <SectionLabel>404 · Route Not Found</SectionLabel>
          </div>

          <div>
            <div className="font-display text-6xl sm:text-7xl font-black text-accent leading-none fv-tabular">
              404
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-3 fv-text-balance">
              Back On Track
            </h1>
            <div aria-hidden="true" className="w-14 h-1 bg-brand mx-auto mt-4" />
          </div>

          <p className="text-sm text-text-muted font-sans leading-relaxed max-w-md mx-auto">
            That page does not exist on FitVision. Jump straight to your recommended workout routines or return to the homepage.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button variant="primary" size="md" href="/routines">
              Browse Routines
            </Button>
            <Button variant="secondary" size="md" href="/">
              Return Home
            </Button>
          </div>
        </Card>
      </main>

      <LandingFooter />
    </div>
  );
}
