"use client";

import React, { useEffect, useRef, useState } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";

interface ManifestoToken {
  word: string;
  accent?: boolean;
}

const MANIFESTO_LINES: ReadonlyArray<ReadonlyArray<ManifestoToken>> = [
  [
    { word: "Every" },
    { word: "rep" },
    { word: "measured" },
    { word: "in" },
    { word: "your", accent: true },
    { word: "browser.", accent: true },
  ],
  [
    { word: "Every" },
    { word: "angle" },
    { word: "verified" },
    { word: "in" },
    { word: "real" },
    { word: "time." },
  ],
  [
    { word: "Zero", accent: true },
    { word: "video", accent: true },
    { word: "ever" },
    { word: "leaves" },
    { word: "the" },
    { word: "room." },
  ],
];

const TOTAL_WORDS = MANIFESTO_LINES.reduce((sum, line) => sum + line.length, 0);

/**
 * Scroll-lit word-by-word editorial manifesto chapter.
 * - Words start dimmed (opacity-25) and illuminate sequentially in reading order as the
 *   user scrolls through the section using a single rAF-throttled scroll listener.
 * - Under prefers-reduced-motion: reduce, all words render at full contrast immediately.
 */
export default function TaglineReveal() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [litCount, setLitCount] = useState<number>(TOTAL_WORDS);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) {
      setReducedMotion(true);
      setLitCount(TOTAL_WORDS);
      return;
    }

    let rafId = 0;

    const computeLitWords = () => {
      rafId = 0;
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 900;
      // Start lighting words as section enters lower 85% of viewport; finish by 28% from top
      const start = vh * 0.88;
      const end = vh * 0.25;
      const raw = (start - rect.top) / Math.max(1, start - end);
      const progress = Math.max(0, Math.min(1, raw));
      const nextCount = Math.max(2, Math.round(progress * TOTAL_WORDS));
      setLitCount(nextCount);
    };

    const onScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(computeLitWords);
      }
    };

    computeLitWords();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  let runningIndex = 0;

  return (
    <section
      ref={sectionRef}
      id="manifesto"
      data-testid="tagline-reveal-section"
      className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-16 sm:py-28 scroll-mt-28 md:scroll-mt-32"
    >
      <div className="max-w-4xl mx-auto text-center space-y-6">
        <div className="flex justify-center">
          <SectionLabel>Chapter 02 · The Standard</SectionLabel>
        </div>

        <p className="font-display text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-[1.18] fv-text-balance">
          {MANIFESTO_LINES.map((line, lineIdx) => (
            <span key={lineIdx} className="block mt-1.5 first:mt-0">
              {line.map((token) => {
                const wordIdx = runningIndex++;
                const isLit = reducedMotion || wordIdx < litCount;
                const colorClass = token.accent ? "text-accent" : "text-white";

                return (
                  <React.Fragment key={`${lineIdx}-${wordIdx}`}>
                    <span
                      data-lit={isLit ? "true" : "false"}
                      className={`inline-block transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:opacity-100 ${colorClass} ${
                        isLit ? "opacity-100" : "opacity-25"
                      }`}
                    >
                      {token.word}
                    </span>
                    {token !== line[line.length - 1] ? " " : null}
                  </React.Fragment>
                );
              })}
            </span>
          ))}
        </p>

        <div aria-hidden="true" className="w-16 h-1 bg-brand mx-auto pt-0.5" />
      </div>
    </section>
  );
}
