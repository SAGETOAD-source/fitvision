"use client";

import React from "react";

export interface MarqueeProps {
  items: string[];
  separator?: string;
  durationMs?: number;
  pauseOnHover?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * Seamless infinite horizontal ticker strip.
 * - White bold caps text on black with burgundy slash separators.
 * - Pauses on hover/focus.
 * - Duplicate track is aria-hidden for screen readers.
 * - Falls back to a static wrapped row under prefers-reduced-motion (CSS in globals.css).
 */
export function Marquee({
  items,
  separator = "/",
  durationMs = 28000,
  pauseOnHover = true,
  className = "",
  ariaLabel = "FitVision capabilities",
}: MarqueeProps) {
  if (!items.length) return null;

  return (
    <div
      className={`fv-marquee-container w-full overflow-hidden bg-bg-base border-y border-border-subtle py-4 sm:py-5 select-none ${className}`.trim()}
      role="region"
      aria-label={ariaLabel}
      aria-live="off"
      data-pause-on-hover={pauseOnHover ? "true" : "false"}
    >
      <div
        className="fv-marquee-track flex w-max will-change-transform"
        style={{ animationDuration: `${durationMs}ms` }}
      >
        {/* Primary track visible to assistive tech */}
        <ul
          className="fv-marquee-content flex items-center shrink-0 list-none m-0 p-0"
          aria-label={ariaLabel}
        >
          {items.map((item, idx) => (
            <li
              key={`primary-${idx}`}
              className="inline-flex items-center whitespace-nowrap"
            >
              <span className="px-4 sm:px-6 font-display text-xs sm:text-sm font-black uppercase tracking-[0.16em] text-white">
                {item}
              </span>
              <span
                aria-hidden="true"
                className="font-display text-sm sm:text-base font-black text-brand select-none"
              >
                {separator}
              </span>
            </li>
          ))}
        </ul>

        {/* Duplicate track hidden from screen readers for seamless looping */}
        <ul
          className="fv-marquee-content fv-marquee-duplicate flex items-center shrink-0 list-none m-0 p-0"
          aria-hidden="true"
        >
          {items.map((item, idx) => (
            <li
              key={`duplicate-${idx}`}
              className="inline-flex items-center whitespace-nowrap"
            >
              <span className="px-4 sm:px-6 font-display text-xs sm:text-sm font-black uppercase tracking-[0.16em] text-white">
                {item}
              </span>
              <span
                aria-hidden="true"
                className="font-display text-sm sm:text-base font-black text-brand select-none"
              >
                {separator}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Marquee;
