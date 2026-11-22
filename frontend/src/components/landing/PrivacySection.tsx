import React from "react";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export default function PrivacySection() {
  return (
    <section
      className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-16 sm:py-20"
      id="privacy"
    >
      <Card
        variant="default"
        padding="lg"
        className="relative overflow-hidden p-6 sm:p-10 lg:p-12"
      >
        {/* Subtle burgundy ambient glow */}
        <div
          aria-hidden="true"
          className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-brand/20 blur-3xl pointer-events-none"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Header Column */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <SectionLabel>Privacy</SectionLabel>

            <div>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-white font-black uppercase tracking-tight leading-tight">
                Your video never leaves your device
              </h2>
              <div aria-hidden="true" className="w-14 h-1 bg-brand mt-4" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 w-fit">
              <span aria-hidden="true" className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
                CLIENT-SIDE PRIVACY ARCHITECTURE
              </span>
            </div>

            <p className="text-sm text-text-muted leading-relaxed pt-1 font-sans">
              FitVision is architected around on-device computer vision. Camera frames are evaluated strictly in local browser memory and are never transmitted to any server.
            </p>
          </div>

          {/* Cards Column */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Local Camera Execution */}
            <Card
              variant="elevated"
              padding="md"
              className="flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-3 text-white font-display text-base font-bold uppercase tracking-tight">
                  <span className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-accent shrink-0">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </span>
                  <span>In-Browser Camera Processing</span>
                </div>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed font-sans">
                  Camera frames are processed strictly in local browser memory. No camera feed, raw pixel buffer, or video recording is ever uploaded or transmitted across the network.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-border-subtle flex items-center gap-2 text-[11px] font-mono text-accent font-semibold">
                <svg
                  className="w-3.5 h-3.5 shrink-0"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.5L6.5 12L13 4.5" />
                </svg>
                <span>No Video Frames Transmitted</span>
              </div>
            </Card>

            {/* Card 2: Local Model Evaluation */}
            <Card
              variant="elevated"
              padding="md"
              className="flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-3 text-white font-display text-base font-bold uppercase tracking-tight">
                  <span className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-accent shrink-0">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </span>
                  <span>Local Model Evaluation</span>
                </div>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed font-sans">
                  The application downloads static web assets and the MediaPipe runtime to run locally on your machine. Pose detection and rep analysis execute entirely in-browser without sending video to backend inference servers.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-border-subtle flex items-center gap-2 text-[11px] font-mono text-white/80 font-semibold">
                <svg
                  className="w-3.5 h-3.5 text-accent shrink-0"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.5L6.5 12L13 4.5" />
                </svg>
                <span>Local Client Inference</span>
              </div>
            </Card>
          </div>
        </div>
      </Card>
    </section>
  );
}
