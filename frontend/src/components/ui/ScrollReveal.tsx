"use client";

import React, { useEffect, useRef, useState } from "react";

export interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  distancePx?: number;
}

/**
 * One-shot IntersectionObserver scroll reveal using weighted cubic-bezier(0.22, 1, 0.36, 1).
 * - Animates transform & opacity only (GPU-composited, zero unthrottled scroll listeners).
 * - Reveals immediately at full opacity when prefers-reduced-motion: reduce is active or
 *   when IntersectionObserver is unavailable (SSR / older environments).
 */
export function ScrollReveal({
  children,
  className = "",
  delayMs = 0,
  distancePx = 28,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) {
      setReducedMotion(true);
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    // If element is already in or above the viewport on mount, reveal immediately
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.96) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -48px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const show = visible || reducedMotion;

  return (
    <div
      ref={ref}
      data-testid="scroll-reveal"
      data-visible={show ? "true" : "false"}
      className={`motion-reduce:opacity-100 motion-reduce:transform-none motion-reduce:transition-none ${className}`.trim()}
      style={
        reducedMotion
          ? undefined
          : {
              opacity: show ? 1 : 0,
              transform: show ? "translate3d(0, 0, 0)" : `translate3d(0, ${distancePx}px, 0)`,
              transitionProperty: "opacity, transform",
              transitionDuration: "700ms",
              transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
              transitionDelay: `${delayMs}ms`,
              willChange: show ? "auto" : "opacity, transform",
            }
      }
    >
      {children}
    </div>
  );
}

export default ScrollReveal;
