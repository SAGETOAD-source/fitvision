"use client";

import React from "react";

export interface MarqueeProps {
  /** Array of text items to display */
  items: string[];
  /** Separator between items */
  separator?: string;
  /** Animation duration in milliseconds */
  duration?: number;
  /** Pause on hover/focus */
  pauseOnHover?: boolean;
  /** Additional className */
  className?: string;
  /** ARIA label for the marquee region */
  ariaLabel?: string;
}

export function Marquee({
  items,
  separator = " / ",
  duration = 30000,
  pauseOnHover = true,
  className = "",
  ariaLabel = "Featured highlights",
}: MarqueeProps) {
  if (!items.length) return null;

  // Build the content array: original items + separators
  const displayItems = items.flatMap((item, index) => [
    item,
    index < items.length - 1 ? separator : "",
  ]).filter(Boolean);

  return (
    <div
      className={`marquee-container ${className}`}
      role="region"
      aria-label={ariaLabel}
      aria-live="off"
      data-pause-on-hover={pauseOnHover}
    >
      <div className="marquee-track" style={{ animationDuration: `${duration}ms` }}>
        {/* First set - visible to screen readers */}
        <div className="marquee-content" role="list" aria-label={ariaLabel}>
          {displayItems.map((item, index) => (
            <span key={`primary-${index}`} className="marquee-item" role="listitem">
              {item}
            </span>
          ))}
        </div>

        {/* Duplicate set - hidden from screen readers for seamless loop */}
        <div className="marquee-content" aria-hidden="true" role="list">
          {displayItems.map((item, index) => (
            <span key={`duplicate-${index}`} className="marquee-item" role="listitem">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}