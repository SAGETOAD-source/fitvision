"use client";

import React, { useEffect, useRef, useState } from "react";

export interface BigScrollTextProps {
  text?: string;
  className?: string;
}

/**
 * Decorative oversized caps text that glides horizontally with page scroll.
 * - aria-hidden="true" (decorative only).
 * - overflow-hidden prevents horizontal page scroll at all widths.
 * - Static (zero horizontal travel) under prefers-reduced-motion: reduce.
 */
export function BigScrollText({
  text = "TRAIN SMARTER",
  className = "",
}: BigScrollTextProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [offsetPx, setOffsetPx] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) {
      setOffsetPx(0);
      return;
    }

    let rafId = 0;

    const updateOffset = () => {
      rafId = 0;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 900;
      // Normalized progress [-1 .. 1] as section passes through viewport
      const progress = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - vh / 2) / vh));
      // Subtle smooth horizontal glide (±96px max)
      setOffsetPx(Math.round(progress * -96));
    };

    const onScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateOffset);
      }
    };

    updateOffset();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      data-testid="big-scroll-text"
      className={`w-full overflow-hidden select-none pointer-events-none py-8 sm:py-14 bg-bg-base ${className}`.trim()}
    >
      <div
        className="flex justify-center will-change-transform motion-reduce:transform-none"
        style={{ transform: `translate3d(${offsetPx}px, 0, 0)` }}
      >
        <span className="font-display font-black uppercase whitespace-nowrap tracking-tighter text-5xl sm:text-8xl lg:text-[136px] leading-none text-white/[0.08]">
          {text}
        </span>
      </div>
    </div>
  );
}

export default BigScrollText;
