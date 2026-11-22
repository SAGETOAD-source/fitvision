import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

export default function HeroSection() {
  return (
    <section
      className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-24"
      id="experience"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Left Column: Athletic Campaign Messaging */}
        <div className="lg:col-span-6 flex flex-col space-y-6 sm:space-y-7">
          {/* Status Pill Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/40 w-fit max-w-full">
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shrink-0"
            />
            <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase text-white font-mono">
              YOUR VIDEO NEVER LEAVES YOUR DEVICE
            </span>
          </div>

          {/* Approved Headline Hierarchy */}
          <div>
            <h1 className="flex flex-col tracking-tight text-white">
              <span className="font-display text-3xl sm:text-5xl xl:text-[56px] leading-[1.04] font-black uppercase tracking-tight text-white">
                YOUR BODY.
              </span>
              <span className="font-display text-3xl sm:text-5xl xl:text-[56px] leading-[1.04] font-black uppercase tracking-tight text-white mt-1">
                YOUR DATA.
              </span>
              <span className="font-serif italic text-3xl sm:text-5xl xl:text-[54px] leading-[1.12] text-white/90 font-normal mt-2 uppercase tracking-tight">
                YOUR EVOLUTION.
              </span>
            </h1>
            <div aria-hidden="true" className="w-16 h-1 bg-brand mt-5" />
          </div>

          {/* Subhead */}
          <p className="text-base sm:text-lg text-text-muted leading-relaxed max-w-xl font-sans">
            Real-time computer vision rep counting and movement feedback directly in your browser.
          </p>

          {/* Dual CTAs using shared signature Button */}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <Button variant="primary" size="md" href="/routines">
              START TRAINING
            </Button>
            <Button variant="secondary" size="md" href="#workflow">
              EXPLORE WORKFLOW
            </Button>
          </div>

          {/* Telemetry Chips (inline SVGs, zero emojis) */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-1">
            <div className="px-3.5 py-1.5 rounded-full bg-surface-elevated border border-border-subtle inline-flex items-center gap-2">
              <svg
                className="w-3.5 h-3.5 text-accent shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span className="text-xs text-white font-medium">Real-Time Pose Tracking</span>
            </div>
            <div className="px-3.5 py-1.5 rounded-full bg-surface-elevated border border-border-subtle inline-flex items-center gap-2">
              <svg
                className="w-3.5 h-3.5 text-accent shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span className="text-xs text-white font-medium">In-Browser Processing</span>
            </div>
            <div className="px-3.5 py-1.5 rounded-full bg-surface-elevated border border-border-subtle inline-flex items-center gap-2">
              <svg
                className="w-3.5 h-3.5 text-accent shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span className="text-xs text-white font-medium">33 Skeletal Keypoints</span>
            </div>
          </div>
        </div>

        {/* Right Column: HUD Visual Showcase */}
        <div className="lg:col-span-6">
          <div className="relative rounded-3xl overflow-hidden border border-border-subtle bg-surface shadow-2xl">
            {/* Image + Responsive HUD Container */}
            <div className="relative">
              {/* Visual Hero Photograph */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-bg-base">
                <Image
                  src="/images/hero-athlete.png"
                  alt="FitVision real-time pose tracking HUD athletic preview"
                  fill
                  priority
                  className="object-cover object-center filter contrast-105 brightness-95"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-base/80 via-transparent to-bg-base/45"
                />

                {/* Top Telemetry Status Bar */}
                <div className="absolute top-3 sm:top-4 inset-x-3 sm:inset-x-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-bg-base/80 backdrop-blur-md border border-border-subtle">
                    <span className="text-[10px] sm:text-xs font-mono font-bold text-white tracking-wider">
                      WORKOUT HUD · SIMULATED
                    </span>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-bg-base/80 backdrop-blur-md border border-border-subtle text-[10px] sm:text-xs font-mono font-semibold text-accent tracking-wider uppercase">
                    ILLUSTRATIVE PREVIEW
                  </div>
                </div>
              </div>

              {/*
                HUD Readout Cards:
                - On mobile (<640px): stacked neatly below the 4:3 photo to avoid crowding/overlap at 390px.
                - On sm+ (>=640px): positioned as floating overlays over the photograph.
              */}
              <div className="p-3.5 bg-surface border-t border-border-subtle grid grid-cols-2 gap-3 sm:block sm:p-0 sm:bg-transparent sm:border-t-0 sm:absolute sm:inset-0 sm:pointer-events-none">
                {/* Illustrative Knee Angle Node */}
                <div className="bg-surface-elevated sm:bg-bg-base/85 sm:backdrop-blur-md border border-border-subtle rounded-2xl p-3 flex items-center gap-2.5 sm:gap-3 sm:absolute sm:bottom-20 sm:left-5">
                  <div className="w-8 h-8 rounded-full border-2 border-accent flex items-center justify-center text-xs font-mono font-bold text-accent shrink-0">
                    88°
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono text-text-muted font-medium uppercase tracking-wider">
                      MOVEMENT STATE
                    </div>
                    <div className="text-xs text-white font-bold font-mono tracking-wide truncate">
                      SQUAT · DESCENT
                    </div>
                  </div>
                </div>

                {/* Illustrative Giant 2-Meter Readable Rep Counter Card */}
                <div className="bg-brand/95 sm:bg-brand/90 sm:backdrop-blur-md border border-accent/40 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 text-center shadow-lg sm:absolute sm:top-16 sm:right-5">
                  <div className="text-[10px] font-mono text-white/80 uppercase tracking-widest font-bold">
                    Active Set (Preview)
                  </div>
                  <div className="font-display text-2xl sm:text-4xl text-white font-black leading-none mt-1">
                    12
                  </div>
                  <div className="text-[10px] font-mono text-accent font-bold mt-1">
                    REP COUNT
                  </div>
                </div>

                {/* Verified Squat Feedback Cue Badge */}
                <div className="col-span-2 bg-surface-elevated sm:bg-bg-base/85 sm:backdrop-blur-md border border-border-subtle rounded-full px-4 py-2 flex items-center gap-2.5 sm:absolute sm:bottom-4 sm:left-5">
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full bg-accent ring-2 ring-accent/30 shrink-0"
                  />
                  <span className="text-xs text-white font-semibold">
                    Feedback: &quot;Good depth!&quot; (Simulated)
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Telemetry Strip */}
            <div className="px-4 sm:px-5 py-3 sm:py-4 bg-surface border-t border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 text-text-muted text-xs font-mono">
                <svg
                  className="w-4 h-4 text-accent shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                  />
                </svg>
                <span>On-Device Canvas Pipeline</span>
              </div>
              <div className="flex items-center gap-2 text-white text-xs font-mono font-bold">
                <svg
                  className="w-4 h-4 text-accent shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span>NO VIDEO FRAMES TRANSMITTED</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
