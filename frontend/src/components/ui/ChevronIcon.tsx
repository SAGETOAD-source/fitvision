"use client";

import React from "react";

interface ChevronIconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

/**
 * Clean chevron right icon.
 * Consistent stroke weight, works at all sizes.
 */
export function ChevronIcon({ className = "", size = 20, strokeWidth }: ChevronIconProps) {
  const stroke = strokeWidth ?? Math.max(1.5, size / 12);

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export default ChevronIcon;