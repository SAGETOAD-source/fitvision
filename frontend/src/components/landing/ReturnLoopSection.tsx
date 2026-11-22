import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";

interface LoopChapter {
  step: string;
  label: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  detail: string;
}

const LOOP_CHAPTERS: ReadonlyArray<LoopChapter> = [
  {
    step: "01",
    label: "Plan",
    title: "Pick Your Routine",
    description:
      "Choose Slim, Muscular, or Bulk and narrow your focus to Legs, Upper Body, Core, or Balanced. See exact set and rep targets before turning on your camera.",
    ctaLabel: "Browse Routines",
    href: "/routines",
    detail: "Open preview without login",
  },
  {
    step: "02",
    label: "Train",
    title: "Run The Full Circuit",
    description:
      "Launch Routine Mode to move smoothly through every prescribed exercise with Next, Previous, and Skip controls, a 2-meter rep counter, and live posture feedback.",
    ctaLabel: "Launch Routine Mode",
    href: "/workout?routine=1&goal=muscular",
    detail: "Live on-device pose tracking",
  },
  {
    step: "03",
    label: "Return",
    title: "Watch Your Streak Build",
    description:
      "Sign in to save completed sets automatically when you switch exercises or finish, then track your UTC training streak, 7-day volume, and full workout history.",
    ctaLabel: "Open Dashboard",
    href: "/dashboard",
    detail: "Daily streak & 7-day volume",
  },
];

export default function ReturnLoopSection() {
  return (
    <section
      id="habit-loop"
      data-testid="return-loop-section"
      className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-16 sm:py-24 scroll-mt-28 md:scroll-mt-32"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-6">
        <div className="space-y-3">
          <SectionLabel>Built For Every Session</SectionLabel>
          <div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white font-black uppercase tracking-tight fv-text-balance">
              One Rhythm. Every Day.
            </h2>
            <div aria-hidden="true" className="w-14 h-1 bg-brand mt-4" />
          </div>
        </div>
        <p className="text-xs sm:text-sm text-text-muted max-w-md font-sans leading-relaxed">
          Every visit follows the same clean loop: open a tailored plan, train privately with real-time rep counting, and come back to beat yesterday&apos;s volume.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {LOOP_CHAPTERS.map((chapter, idx) => (
          <Card
            key={chapter.step}
            variant="interactive"
            padding="lg"
            className="flex flex-col justify-between gap-6 relative overflow-hidden"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-accent fv-tabular">
                  {chapter.step} · {chapter.label}
                </span>
                <span
                  aria-hidden="true"
                  className="font-display text-3xl font-black text-white/10 select-none leading-none fv-tabular"
                >
                  {chapter.step}
                </span>
              </div>

              <h3 className="font-display text-xl sm:text-2xl font-black uppercase tracking-tight text-white fv-text-balance">
                {chapter.title}
              </h3>

              <p className="text-xs sm:text-sm text-text-muted leading-relaxed font-sans">
                {chapter.description}
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-border-subtle">
              <div className="flex items-center gap-2 text-[11px] font-mono text-white/80">
                <span
                  aria-hidden="true"
                  className="w-1.5 h-1.5 rounded-full bg-accent shrink-0"
                />
                <span>{chapter.detail}</span>
              </div>

              <div>
                <Button
                  variant={idx === 1 ? "primary" : "secondary"}
                  size="sm"
                  href={chapter.href}
                >
                  {chapter.ctaLabel}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
