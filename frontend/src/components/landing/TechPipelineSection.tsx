import React from "react";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";

export default function TechPipelineSection() {
  const pipeline = [
    {
      num: "01",
      title: "Camera",
      tech: "getUserMedia",
      detail: "Local camera stream captured directly in the browser document.",
    },
    {
      num: "02",
      title: "MediaPipe Pose",
      tech: "WebAssembly Model",
      detail: "Downloaded vision runtime extracts 3D landmark coordinates in-browser.",
    },
    {
      num: "03",
      title: "Joint Angles",
      tech: "Vector Trigonometry",
      detail: "Pure geometric calculations derive interior joint angles from landmarks.",
    },
    {
      num: "04",
      title: "Classifier",
      tech: "TypeScript Decision Trees",
      detail: "In-browser decision tree walker evaluates angle vectors to classify state.",
    },
    {
      num: "05",
      title: "Rep Counter",
      tech: "Debounced Logic",
      detail: "State machine verifies phase transitions, target depth, and rep counts.",
    },
  ];

  return (
    <section
      className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-16 sm:py-24 scroll-mt-28 md:scroll-mt-32"
      id="architecture"
    >
      <Card
        variant="default"
        padding="lg"
        className="p-6 sm:p-10 lg:p-12"
      >
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-3">
          <SectionLabel>Chapter 06 · System Architecture</SectionLabel>
          <div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white font-black uppercase tracking-tight fv-text-balance">
              The FitVision Pipeline
            </h2>
            <div aria-hidden="true" className="w-14 h-1 bg-brand mx-auto mt-4" />
          </div>
          <p className="text-xs sm:text-sm text-text-muted pt-1 font-sans">
            A deterministic, fully client-side sequence executing continuously within the browser.
          </p>
        </div>

        {/* 5-Stage Architecture Pipeline Cards */}
        <div className="flex flex-col lg:flex-row items-stretch justify-between gap-3 lg:gap-2.5 w-full">
          {pipeline.map((stage, idx) => {
            const isFinal = idx === pipeline.length - 1;
            return (
              <React.Fragment key={stage.num}>
                <Card
                  variant={isFinal ? "default" : "elevated"}
                  padding="sm"
                  className={`rounded-2xl text-center flex-1 min-w-0 w-full lg:w-auto flex flex-col justify-center ${
                    isFinal
                      ? "bg-brand border-accent/40 text-white shadow-lg"
                      : "text-white"
                  }`}
                >
                  <div
                    className={`text-[11px] font-mono mb-1 fv-tabular ${
                      isFinal ? "text-white/80" : "text-text-muted/70"
                    }`}
                  >
                    {stage.num}
                  </div>
                  <div className="font-display text-sm font-bold uppercase tracking-tight text-white mb-0.5 fv-text-balance">
                    {stage.title}
                  </div>
                  <div className="text-[10px] font-mono mb-2 text-accent font-semibold">
                    {stage.tech}
                  </div>
                  <p className="text-[11px] text-text-muted leading-snug font-sans">
                    {stage.detail}
                  </p>
                </Card>

                {idx < pipeline.length - 1 && (
                  <div className="flex items-center justify-center text-accent shrink-0 my-0.5 lg:my-0 select-none">
                    {/* Horizontal arrow on desktop, vertical arrow on mobile */}
                    <svg
                      className="w-5 h-5 hidden lg:block"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                    <svg
                      className="w-5 h-5 lg:hidden"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Architectural Pillars (Verified Facts Only) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 pt-8 border-t border-border-subtle">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-accent shrink-0">
              <svg
                className="w-5 h-5"
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
            </div>
            <div>
              <div className="font-display text-xs sm:text-sm font-bold uppercase tracking-tight text-white mb-1">
                Client-Side Execution
              </div>
              <div className="text-xs text-text-muted font-sans leading-relaxed">
                MediaPipe WebAssembly pose detection and TypeScript decision tree classifiers execute on client hardware directly in the browser.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-accent shrink-0">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
            <div>
              <div className="font-display text-xs sm:text-sm font-bold uppercase tracking-tight text-white mb-1">
                Zero Frame Uploads
              </div>
              <div className="text-xs text-text-muted font-sans leading-relaxed">
                Camera frames are evaluated in browser memory and discarded immediately; video streams never leave your device.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-accent shrink-0">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <div className="font-display text-xs sm:text-sm font-bold uppercase tracking-tight text-white mb-1">
                Deterministic Debounce
              </div>
              <div className="text-xs text-text-muted font-sans leading-relaxed">
                Rep counts require consistent phase confirmations over consecutive frames, eliminating false triggers.
              </div>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
