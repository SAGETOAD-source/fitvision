import React from "react";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";

export default function CtaSection() {
  return (
    <section className="w-full relative overflow-hidden border-y border-border-subtle bg-bg-base py-20 sm:py-28">
      {/* Dimmed full-bleed photo placeholder backdrop (women-only asset slot) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-surface-elevated via-bg-base to-surface"
      />
      {/* Burgundy tint overlay + radial spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg-base/90 via-brand/70 to-bg-base/90"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[540px] h-[280px] rounded-full bg-brand/45 blur-3xl"
      />

      {/* Explicit placeholder badge for future approved women-only wide banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="flex justify-end mb-6">
          <span className="px-2.5 py-1 bg-bg-base/70 border border-white/15 font-mono text-[10px] uppercase tracking-wider text-text-muted">
            TODO: APPROVED FEMALE ATHLETE BANNER PHOTO
          </span>
        </div>

        <div className="max-w-3xl mx-auto text-center flex flex-col items-center space-y-5">
          <SectionLabel variant="white">On-Device Coaching</SectionLabel>

          <div>
            <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl text-white font-black uppercase tracking-tight leading-tight">
              Ready to Train in Private?
            </h2>
            <div aria-hidden="true" className="w-16 h-1 bg-accent mx-auto mt-5" />
          </div>

          <p className="text-sm sm:text-base text-white/90 max-w-xl font-sans leading-relaxed pb-2">
            Launch your camera-guided session with complete on-device privacy. Real-time form cues, instant rep counting, and zero video transmission.
          </p>

          <Button variant="secondary" size="lg" href="/routines">
            START TRAINING
          </Button>
        </div>
      </div>
    </section>
  );
}
