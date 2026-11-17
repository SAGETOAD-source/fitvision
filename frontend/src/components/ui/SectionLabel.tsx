"use client";

import React from "react";

export interface SectionLabelProps {
  children: React.ReactNode;
  /** Color variant */
  variant?: "rose" | "white";
  /** Additional className */
  className?: string;
}

/**
 * SectionLabel - Bracketed uppercase label for section headers
 * Example: "[ HOW IT WORKS ]" — uppercase, tracked, rose color by default
 * Uses design tokens: colors, font, tracking from CSS variables
 */
export function SectionLabel({
  children,
  variant = "rose",
  className = "",
}: SectionLabelProps) {
  const variantClasses = variant === "rose"
    ? "text-[var(--fv-rose)]"
    : "text-white";

  return (
    <span
      className={`
        inline-flex items-center gap-1
        font-display font-black uppercase tracking-widest
        text-xs sm:text-sm
        ${variantClasses}
        ${className}
      `}
      aria-hidden="true"
    >
      <span aria-hidden="true">[</span>
      <span>{children}</span>
      <span aria-hidden="true">]</span>
    </span>
  );
}