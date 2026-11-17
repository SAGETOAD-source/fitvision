"use client";

import React from "react";
import { ChevronIcon } from "./ChevronIcon";

/** Shared props for both button and anchor variants */
interface ArrowButtonSharedProps {
  children: React.ReactNode;
  variant?: "primary" | "outline";
  size?: "md" | "lg";
  chevronPosition?: "end" | "start";
  disabled?: boolean;
  className?: string;
}

/** Props when rendering as button (default) */
interface ArrowButtonProps extends ArrowButtonSharedProps {
  as?: "button";
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  href?: string; // When provided, renders as <a>
  elementRef?: (el: HTMLButtonElement | HTMLAnchorElement | null) => void;
}

/**
 * ArrowButton - Rectangular button with text + chevron square
 * - On hover/focus: accent fill wipes across (250ms), chevron nudges right 4px, square inverts color
 * - Pressed state scales to 0.98
 * - Visible focus ring
 * - Works as <button> (default) or <a> (when href provided)
 * - Min height 48px
 * - Example: "START FREE >>" in burgundy with white chevron square
 */
export function ArrowButton({
  children,
  variant = "primary",
  size = "md",
  chevronPosition = "end",
  href,
  className = "",
  disabled = false,
  elementRef,
  ...props
}: ArrowButtonProps) {
  const isPrimary = variant === "primary";
  const isAnchor = !!href;
  const Component = isAnchor ? "a" : "button";

  const baseClasses = `
    inline-flex items-center justify-center gap-3
    font-display font-black uppercase tracking-wider
    rounded-[var(--radius-cta)]
    transition-all duration-[var(--duration-nudge)] var(--ease-out-expo)
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fv-border-focus)]
    focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fv-bg)]
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:bg-current
    active:scale-[0.98] active:transition-[transform_50ms]
    min-h-[48px] px-6
    relative overflow-hidden
  `;

  const sizeClasses = size === "lg"
    ? "text-sm py-4 px-8"
    : "text-xs sm:text-sm py-3 px-6";

  const variantClasses = isPrimary
    ? `
      bg-[var(--fv-burgundy)] text-white
      hover:bg-[var(--fv-burgundy-hover)]
      shadow-md shadow-[var(--fv-burgundy)]/30
    `
    : `
      bg-[var(--fv-bg-elevated)] text-white border border-[var(--fv-border)]
      hover:bg-[var(--fv-bg)] hover:border-[var(--fv-rose)]
    `;

  const chevronSquareClasses = `
    flex items-center justify-center
    w-8 h-8 rounded-[var(--radius-cta)]
    transition-all duration-[var(--duration-nudge)] var(--ease-out-expo)
    ${isPrimary
      ? "bg-white text-[var(--fv-burgundy)] hover:bg-[var(--fv-rose)] hover:text-white"
      : "bg-[var(--fv-border)] text-[var(--fv-rose)] hover:bg-[var(--fv-rose)] hover:text-white"
    }
  `;

  const wipeClasses = `
    absolute inset-0
    transform -translate-x-full
    transition-transform duration-[var(--duration-wipe)] var(--ease-out-expo)
    ${isPrimary
      ? "bg-[var(--fv-burgundy-hover)]"
      : "bg-[var(--fv-rose)]"
    }
    pointer-events-none
    group-hover:translate-x-0 group-focus-visible:translate-x-0
  `;

  const chevronClasses = `
    transition-transform duration-[var(--duration-nudge)] var(--ease-out-expo)
    group-hover:translate-x-1 group-focus-visible:translate-x-1
  `;

  if (isAnchor) {
    return (
      <a
        ref={elementRef}
        href={href}
        className={`group relative ${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
        aria-disabled={disabled}
        onClick={props.onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>}
      >
        <span className={wipeClasses} aria-hidden="true" />
        <span className="relative flex items-center gap-3">
          {chevronPosition === "start" && (
            <span className={chevronSquareClasses} aria-hidden="true">
              <ChevronIcon size={16} className={chevronClasses} />
            </span>
          )}
          <span className="relative z-10">{children}</span>
          {chevronPosition === "end" && (
            <span className={chevronSquareClasses} aria-hidden="true">
              <ChevronIcon size={16} className={chevronClasses} />
            </span>
          )}
        </span>
      </a>
    );
  }

  return (
    <button
      ref={elementRef}
      type={(props as any).type ?? "button"}
      className={`group relative ${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      aria-disabled={disabled}
      onClick={props.onClick}
    >
      <span className={wipeClasses} aria-hidden="true" />
      <span className="relative flex items-center gap-3">
        {chevronPosition === "start" && (
          <span className={chevronSquareClasses} aria-hidden="true">
            <ChevronIcon size={16} className={chevronClasses} />
          </span>
        )}
        <span className="relative z-10">{children}</span>
        {chevronPosition === "end" && (
          <span className={chevronSquareClasses} aria-hidden="true">
            <ChevronIcon size={16} className={chevronClasses} />
          </span>
        )}
      </span>
    </button>
  );
}