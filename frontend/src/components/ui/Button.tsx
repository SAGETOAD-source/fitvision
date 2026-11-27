"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

const TEXT_CELL_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-xs min-h-[38px]",
  md: "px-6 py-2.5 text-xs sm:text-sm min-h-[46px]",
  lg: "px-8 py-3.5 text-sm sm:text-base min-h-[54px]",
};

const ICON_CELL_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "w-[38px] min-h-[38px]",
  md: "w-[46px] min-h-[46px]",
  lg: "w-[54px] min-h-[54px]",
};

const GHOST_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "py-1.5 text-xs gap-1.5",
  md: "py-2 text-xs sm:text-sm gap-2",
  lg: "py-2.5 text-sm sm:text-base gap-2.5",
};

function DoubleChevron({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      aria-hidden="true"
      data-testid="button-double-chevron"
    >
      {/* First chevron (leads) */}
      <svg
        className="w-3.5 h-3.5 -mr-1.5 transition-transform duration-200 ease-out group-hover:translate-x-1 group-focus-visible:translate-x-1 group-active:translate-x-1 group-data-[tap-active=true]:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-focus-visible:translate-x-0 motion-reduce:group-data-[tap-active=true]:translate-x-0"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 3.5L10 8L5 12.5" />
      </svg>
      {/* Second chevron (follows the first with a slight delay) */}
      <svg
        className="w-3.5 h-3.5 transition-transform duration-200 delay-75 ease-out group-hover:translate-x-1 group-focus-visible:translate-x-1 group-active:translate-x-1 group-data-[tap-active=true]:translate-x-1 motion-reduce:transition-none motion-reduce:delay-0 motion-reduce:group-hover:translate-x-0 motion-reduce:group-focus-visible:translate-x-0 motion-reduce:group-data-[tap-active=true]:translate-x-0"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 3.5L10 8L5 12.5" />
      </svg>
    </span>
  );
}

/**
 * FitVision shared Button primitive:
 * - Uses shared .fv-btn-interactive press/hover/focus/disabled state contract.
 * - Primary & Secondary: Two cells in one outlined shape (text cell + black square chevron cell).
 * - Desktop hover / focus-visible / active press / mobile touch tap all trigger the burgundy fill
 *   sweep and staggered double-chevron slide cleanly.
 * - On touch taps with href, marks data-fv-touch-tap so tap sweep overlaps with page transition.
 * - Ghost: inline label + double chevron with underline sweep.
 */
export function Button({
  variant = "primary",
  size = "md",
  href,
  asChild = false,
  loading = false,
  loadingText,
  disabled = false,
  className = "",
  children,
  onClick,
  onPointerDown,
  onTouchStart,
  type = "button",
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const [tapActive, setTapActive] = useState(false);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  const flashTapFeedback = (targetAnchor: HTMLAnchorElement | null) => {
    if (isDisabled) return;
    if (targetAnchor) {
      targetAnchor.dataset.fvTouchTap = "true";
    }
    setTapActive(true);
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      tapTimerRef.current = null;
      setTapActive(false);
    }, 420);
  };

  const sharedInteractiveClasses = [
    "fv-btn-interactive",
    "group relative inline-flex items-stretch select-none",
    "font-display font-bold uppercase tracking-wider text-white",
    "active:scale-[0.95] motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:active:translate-y-0",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
    isDisabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer",
  ].join(" ");

  const labelContent = loading && loadingText ? loadingText : children;

  const spinnerNode = loading ? (
    <span
      className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-accent animate-spin motion-reduce:animate-none shrink-0"
      aria-hidden="true"
      data-testid="button-loading-spinner"
    />
  ) : null;

  let variantContainerClasses = "";
  let innerMarkup: React.ReactNode = null;

  if (variant === "ghost") {
    variantContainerClasses = `items-center ${GHOST_SIZE_CLASSES[size]} bg-transparent text-white hover:text-accent active:text-accent data-[tap-active=true]:text-accent motion-reduce:hover:text-accent`;
    innerMarkup = (
      <>
        <span className="relative z-10 inline-flex items-center gap-2">
          {spinnerNode}
          <span>{labelContent}</span>
        </span>
        <DoubleChevron className="relative z-10 text-accent" />
        {/* Underline sweep */}
        <span
          aria-hidden="true"
          data-testid="button-underline-sweep"
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] bg-brand origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100 group-active:scale-x-100 group-data-[tap-active=true]:scale-x-100 motion-reduce:hidden"
        />
      </>
    );
  } else {
    const isPrimary = variant === "primary";
    variantContainerClasses = isPrimary
      ? "overflow-hidden border border-brand hover:border-accent active:border-accent data-[tap-active=true]:border-accent bg-bg-base"
      : "overflow-hidden border border-white hover:border-accent active:border-accent data-[tap-active=true]:border-accent bg-bg-base";

    const textCellBaseClasses = isPrimary
      ? "bg-brand text-white motion-reduce:group-hover:bg-brand-hover motion-reduce:group-focus-visible:bg-brand-hover motion-reduce:group-active:bg-brand-hover motion-reduce:group-data-[tap-active=true]:bg-brand-hover"
      : "bg-bg-base text-white motion-reduce:group-hover:bg-brand motion-reduce:group-focus-visible:bg-brand motion-reduce:group-active:bg-brand motion-reduce:group-data-[tap-active=true]:bg-brand";

    const textCellSweepClasses = isPrimary ? "bg-brand-hover" : "bg-brand";

    const squareDividerClasses = isPrimary
      ? "border-l border-border-subtle"
      : "border-l border-white/40";

    innerMarkup = (
      <>
        {/* Cell 1: Text Cell */}
        <span
          data-testid="button-text-cell"
          className={`relative overflow-hidden inline-flex items-center justify-center gap-2 transition-colors duration-200 ${TEXT_CELL_SIZE_CLASSES[size]} ${textCellBaseClasses}`}
        >
          <span
            aria-hidden="true"
            data-testid="button-fill-sweep"
            className={`pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-200 ease-out group-hover:translate-x-0 group-focus-visible:translate-x-0 group-active:translate-x-0 group-data-[tap-active=true]:translate-x-0 motion-reduce:hidden ${textCellSweepClasses}`}
          />
          <span className="relative z-10 inline-flex items-center gap-2">
            {spinnerNode}
            <span>{labelContent}</span>
          </span>
        </span>

        {/* Cell 2: Black Square Cell with Double Chevron » */}
        <span
          data-testid="button-chevron-cell"
          className={`relative overflow-hidden inline-flex items-center justify-center shrink-0 bg-bg-base text-white transition-colors duration-200 motion-reduce:group-hover:bg-brand motion-reduce:group-focus-visible:bg-brand motion-reduce:group-active:bg-brand motion-reduce:group-data-[tap-active=true]:bg-brand ${ICON_CELL_SIZE_CLASSES[size]} ${squareDividerClasses}`}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -translate-x-full bg-brand transition-transform duration-200 ease-out group-hover:translate-x-0 group-focus-visible:translate-x-0 group-active:translate-x-0 group-data-[tap-active=true]:translate-x-0 motion-reduce:hidden"
          />
          <DoubleChevron className="relative z-10" />
        </span>
      </>
    );
  }

  const combinedClassName = `${sharedInteractiveClasses} ${variantContainerClasses} ${className}`.trim();

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    return React.cloneElement(child, {
      className: `${combinedClassName} ${(child.props.className as string) || ""}`.trim(),
      "aria-disabled": isDisabled || undefined,
      "aria-busy": loading || undefined,
    });
  }

  if (href) {
    return (
      <Link
        ref={linkRef}
        href={isDisabled ? "#" : href}
        data-fv-button="true"
        data-tap-active={tapActive ? "true" : undefined}
        className={combinedClassName}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        tabIndex={isDisabled ? -1 : undefined}
        onPointerDown={(e) => {
          if (e.pointerType === "touch" || e.pointerType === "pen") {
            flashTapFeedback(linkRef.current);
          }
        }}
        onTouchStart={() => {
          flashTapFeedback(linkRef.current);
        }}
        onClick={(e) => {
          if (isDisabled) {
            e.preventDefault();
            return;
          }
          const isTouchEnvironment =
            Boolean(
              typeof window !== "undefined" &&
                typeof window.matchMedia === "function" &&
                window.matchMedia("(hover: none)")?.matches
            ) || Boolean(linkRef.current?.dataset.fvTouchTap);
          if (isTouchEnvironment) {
            flashTapFeedback(linkRef.current);
          }
          if (onClick) {
            (onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>)(e);
          }
        }}
      >
        {innerMarkup}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      data-fv-button="true"
      data-tap-active={tapActive ? "true" : undefined}
      className={combinedClassName}
      onPointerDown={(e) => {
        if (e.pointerType === "touch" || e.pointerType === "pen") {
          flashTapFeedback(null);
        }
        onPointerDown?.(e);
      }}
      onTouchStart={(e) => {
        flashTapFeedback(null);
        onTouchStart?.(e);
      }}
      onClick={(e) => {
        if (isDisabled) {
          e.preventDefault();
          return;
        }
        if (
          typeof window !== "undefined" &&
          typeof window.matchMedia === "function" &&
          window.matchMedia("(hover: none)")?.matches
        ) {
          flashTapFeedback(null);
        }
        onClick?.(e);
      }}
      {...rest}
    >
      {innerMarkup}
    </button>
  );
}

export default Button;
