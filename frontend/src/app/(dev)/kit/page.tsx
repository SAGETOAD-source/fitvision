"use client";

import React, { useState, useEffect } from "react";
import { ArrowButton } from "@/components/ui/ArrowButton";
import { Marquee } from "@/components/ui/Marquee";
import { ProgressAccordion } from "@/components/ui/ProgressAccordion";
import { SectionLabel } from "@/components/ui/SectionLabel";

/**
 * UI Interactions Kit — Dev-only demo page (/kit)
 * Shows all components in each state: default, hover, focus, reduced-motion note
 * Only renders in development mode
 */
export default function KitPage() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mediaQuery.matches);
      const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const accordionItems = [
    {
      title: "COUNT EVERY REP",
      content: (
        <p className="text-[var(--fv-fg-muted)] text-sm leading-relaxed">
          Computer vision tracks your joints in real time. Every rep counted
          automatically — no manual logging, no missed sets.
        </p>
      ),
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop",
      imageAlt: "Person doing squats with phone camera",
    },
    {
      title: "FIX EVERY FORM",
      content: (
        <p className="text-[var(--fv-fg-muted)] text-sm leading-relaxed">
          Instant feedback on depth, tempo, and alignment. Green for good
          reps, amber for corrections — like a coach in your pocket.
        </p>
      ),
      image: "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=600&h=400&fit=crop",
      imageAlt: "Person checking form on phone",
    },
    {
      title: "NO GEAR, JUST YOUR PHONE",
      content: (
        <p className="text-[var(--fv-fg-muted)] text-sm leading-relaxed">
          Works on any device with a camera. No wearables, no sensors,
          no subscription. Pure computer vision, runs locally in browser.
        </p>
      ),
      image: "https://images.unsplash.com/photo-1512289050510-ec5a6d8a8b1d?w=600&h=400&fit=crop",
      imageAlt: "Phone on stand recording workout",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--fv-bg)] text-[var(--fv-fg)] p-4 md:p-8 lg:p-12">
      {/* Header */}
      <header className="mb-12 max-w-5xl mx-auto">
        <SectionLabel variant="rose" className="mb-4">UI INTERACTIONS KIT</SectionLabel>
        <h1 className="font-display font-black text-3xl md:text-5xl tracking-tight">
          FitVision Interaction Components
        </h1>
        <p className="mt-4 text-[var(--fv-fg-muted)] text-base md:text-lg max-w-2xl">
          Reusable, accessible components built with design tokens. All colors,
          durations, easings from CSS variables — no hardcoded values.
        </p>

        {/* Reduced motion badge */}
        <div className="mt-6 flex items-center gap-3">
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-[var(--radius-cta)] text-xs font-medium ${reducedMotion ? "bg-[var(--fv-rose)]/20 text-[var(--fv-rose)]" : "bg-[var(--fv-bg-elevated)] text-[var(--fv-fg-muted)] border border-[var(--fv-border)]"}`}>
            <span className={`w-2 h-2 rounded-full ${reducedMotion ? "bg-[var(--fv-rose)]" : "bg-[var(--fv-fg-muted)]"}`} />
            {reducedMotion ? "prefers-reduced-motion: ON (animations paused)" : "prefers-reduced-motion: OFF (animations running)"}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto space-y-16">
        {/* ArrowButton Section */}
        <section>
          <SectionLabel variant="rose" className="mb-6">ARROW BUTTON</SectionLabel>
          <p className="text-[var(--fv-fg-muted)] mb-6 max-w-2xl">
            Rectangular button with text + chevron square. Hover/focus: accent
            fill wipes across (250ms), chevron nudges 4px, square inverts color.
            Press: scale 0.98. Works as button or a. Min-height 48px.
          </p>

          <div className="flex flex-wrap gap-4">
            {/* Primary variants */}
            <div className="flex flex-col gap-3">
              <span className="text-xs text-[var(--fv-fg-muted)] uppercase tracking-wider">Primary — md</span>
              <div className="flex items-center gap-4">
                <ArrowButton variant="primary" size="md">START FREE</ArrowButton>
                <ArrowButton variant="primary" size="md" chevronPosition="start">START FREE</ArrowButton>
                <ArrowButton variant="primary" size="md" href="/signup">AS LINK</ArrowButton>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-xs text-[var(--fv-fg-muted)] uppercase tracking-wider">Primary — lg</span>
              <div className="flex items-center gap-4">
                <ArrowButton variant="primary" size="lg">START FREE</ArrowButton>
                <ArrowButton variant="primary" size="lg" chevronPosition="start">START FREE</ArrowButton>
              </div>
            </div>

            {/* Outline variants */}
            <div className="flex flex-col gap-3">
              <span className="text-xs text-[var(--fv-fg-muted)] uppercase tracking-wider">Outline — md</span>
              <div className="flex items-center gap-4">
                <ArrowButton variant="outline" size="md">VIEW DETAILS</ArrowButton>
                <ArrowButton variant="outline" size="md" chevronPosition="start">VIEW DETAILS</ArrowButton>
              </div>
            </div>

            {/* Disabled */}
            <div className="flex flex-col gap-3">
              <span className="text-xs text-[var(--fv-fg-muted)] uppercase tracking-wider">Disabled</span>
              <div className="flex items-center gap-4">
                <ArrowButton variant="primary" size="md" disabled>DISABLED</ArrowButton>
                <ArrowButton variant="outline" size="md" disabled>DISABLED</ArrowButton>
              </div>
            </div>
          </div>
        </section>

        {/* Marquee Section */}
        <section>
          <SectionLabel variant="rose" className="mb-6">MARQUEE</SectionLabel>
          <p className="text-[var(--fv-fg-muted)] mb-6 max-w-2xl">
            Infinite horizontal ticker. Items separated by rose slash. CSS
            translateX 0→-50% linear (30s). Pauses on hover/focus.
            prefers-reduced-motion: stops animation, shows static wrapped row.
            Duplicate set is aria-hidden.
          </p>

          <div className="bg-[var(--fv-bg-elevated)] rounded-[var(--radius-card)] p-6 overflow-hidden">
            <Marquee
              items={[
                "COUNT EVERY REP",
                "FIX EVERY FORM",
                "NO GEAR, JUST YOUR PHONE",
              ]}
              separator=" / "
              duration={30000}
              pauseOnHover={true}
              ariaLabel="FitVision key benefits"
            />
          </div>

          {/* Reduced motion note */}
          <p className="mt-4 text-sm text-[var(--fv-fg-muted)]">
            {reducedMotion
              ? "Reduced motion enabled: marquee shows as static wrapped row above."
              : "Hover the marquee to pause. Enable prefers-reduced-motion in OS to test static fallback."}
          </p>
        </section>

        {/* ProgressAccordion Section */}
        <section>
          <SectionLabel variant="rose" className="mb-6">PROGRESS ACCORDION</SectionLabel>
          <p className="text-[var(--fv-fg-muted)] mb-6 max-w-2xl">
            Vertical accordion — one open at a time. Rose progress line fills
            over 6s (duration prop), then auto-advances (wraps). Click opens
            item and restarts line. Hover/focus pauses line. Side image
            crossfades. Keyboard: Arrow Up/Down, Home, End.
            prefers-reduced-motion: no auto-advance, no animation.
          </p>

          <div className="bg-[var(--fv-bg-elevated)] rounded-[var(--radius-card)] overflow-hidden">
            <ProgressAccordion
              items={accordionItems}
              progressDuration={6000}
              autoAdvance={!reducedMotion}
              ariaLabel="FitVision feature highlights"
            />
          </div>

          <p className="mt-4 text-sm text-[var(--fv-fg-muted)]">
            {reducedMotion
              ? "Reduced motion enabled: auto-advance disabled, progress lines static. Click headers to navigate."
              : "Hover or focus inside accordion to pause progress line. Click header to open/restart."}
          </p>
        </section>

        {/* SectionLabel Section */}
        <section>
          <SectionLabel variant="rose" className="mb-6">SECTION LABEL</SectionLabel>
          <p className="text-[var(--fv-fg-muted)] mb-6 max-w-2xl">
            Bracketed uppercase label for section headers. Tracked, rose by default.
            variant="white" for white text.
          </p>

          <div className="flex flex-wrap gap-4">
            <SectionLabel variant="rose">HOW IT WORKS</SectionLabel>
            <SectionLabel variant="white">FEATURES</SectionLabel>
            <SectionLabel variant="rose">GET STARTED</SectionLabel>
          </div>
        </section>

        {/* Tokens Reference */}
        <section>
          <SectionLabel variant="rose" className="mb-6">DESIGN TOKENS REFERENCE</SectionLabel>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <TokenCard title="Colors" items={[
              { name: "--fv-bg", value: "#0B0B0C" },
              { name: "--fv-bg-elevated", value: "#131316" },
              { name: "--fv-fg", value: "#FFFFFF" },
              { name: "--fv-fg-muted", value: "#A1A1AA" },
              { name: "--fv-burgundy", value: "#6D001A" },
              { name: "--fv-burgundy-hover", value: "#7A001D" },
              { name: "--fv-rose", value: "#FF4D6D" },
              { name: "--fv-rose-muted", value: "#FF4D6D99" },
              { name: "--fv-border", value: "#1F1F23" },
              { name: "--fv-border-focus", value: "#FF4D6D" },
            ]} />
            <TokenCard title="Durations" items={[
              { name: "--duration-wipe", value: "250ms" },
              { name: "--duration-progress", value: "6000ms" },
              { name: "--duration-nudge", value: "150ms" },
              { name: "--duration-crossfade", value: "300ms" },
              { name: "--duration-press", value: "50ms" },
              { name: "--duration-marquee", value: "30000ms" },
            ]} />
            <TokenCard title="Easing / Radius" items={[
              { name: "--ease-out-expo", value: "cubic-bezier(0.19,1,0.22,1)" },
              { name: "--ease-in-out", value: "cubic-bezier(0.4,0,0.2,1)" },
              { name: "--radius-cta", value: "4px" },
              { name: "--radius-card", value: "12px" },
              { name: "--progress-line-h", value: "2px" },
            ]} />
          </div>
        </section>
      </main>

      <footer className="mt-16 max-w-5xl mx-auto pt-8 border-t border-[var(--fv-border)]">
        <p className="text-sm text-[var(--fv-fg-muted)] text-center">
          Dev-only route — not linked in production. All tokens from CSS variables.
          <br />Branch: feat/ui-interactions-kit
        </p>
      </footer>
    </div>
  );
}

function TokenCard({ title, items }: { title: string; items: { name: string; value: string }[] }) {
  return (
    <div className="bg-[var(--fv-bg-elevated)] rounded-[var(--radius-card)] p-4">
      <h4 className="font-display font-black text-sm uppercase tracking-wider text-[var(--fv-rose)] mb-3">
        {title}
      </h4>
      <dl className="space-y-2 text-xs">
        {items.map((item) => (
          <div key={item.name} className="flex justify-between gap-4">
            <dt className="font-mono text-[var(--fv-fg-muted)]">{item.name}</dt>
            <dd className="font-mono text-[var(--fv-fg)] text-right">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}