import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";

export default function CtaSection() {
  return (
    <section className="w-full relative overflow-hidden border-y border-border-subtle bg-bg-base py-24 sm:py-32">
      {/* Dimmed full-bleed editorial female athlete studio photograph */}
      <Image
        src="/images/editorial/cta-athlete.png"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-center opacity-35 pointer-events-none select-none"
        aria-hidden="true"
      />
      {/* Deep obsidian & burgundy atmospheric readability wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg-base/95 via-brand/75 to-bg-base/95"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-base via-transparent to-bg-base/80"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[540px] h-[280px] rounded-full bg-brand/45 blur-3xl"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center space-y-5">
          <SectionLabel variant="white">On-Device Coaching</SectionLabel>

          <div>
            <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl text-white font-black uppercase tracking-tight leading-tight fv-text-balance">
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
