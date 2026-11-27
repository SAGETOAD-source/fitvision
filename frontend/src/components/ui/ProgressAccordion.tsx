"use client";

import React, { useEffect, useReducer, useRef, useCallback, useState } from "react";
import Image from "next/image";

export interface AccordionState {
  openIndex: number;
  paused: boolean;
  progress: number; // 0..100
}

export type AccordionAction =
  | { type: "TICK"; delta: number }
  | { type: "SELECT"; index: number }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "RESET" }
  | { type: "NEXT"; count: number };

export interface AccordionConfig {
  itemCount: number;
  progressDuration: number;
  autoAdvance?: boolean;
}

export const initialAccordionState: AccordionState = {
  openIndex: 0,
  paused: false,
  progress: 0,
};

export function accordionReducer(
  state: AccordionState,
  action: AccordionAction,
  config: AccordionConfig
): AccordionState {
  const { itemCount, progressDuration } = config;
  if (itemCount <= 0) return state;

  const progressPerMs = progressDuration > 0 ? 100 / progressDuration : 100;

  switch (action.type) {
    case "TICK": {
      if (state.paused) return state;
      const nextProgress = Math.min(100, state.progress + action.delta * progressPerMs);
      return {
        ...state,
        progress: nextProgress,
      };
    }

    case "SELECT": {
      const clamped = ((action.index % itemCount) + itemCount) % itemCount;
      return {
        openIndex: clamped,
        paused: false,
        progress: 0,
      };
    }

    case "PAUSE":
      return { ...state, paused: true };

    case "RESUME":
      return { ...state, paused: false };

    case "RESET":
      return { ...state, progress: 0 };

    case "NEXT": {
      const nextIndex = (((state.openIndex + action.count) % itemCount) + itemCount) % itemCount;
      return {
        openIndex: nextIndex,
        paused: false,
        progress: 0,
      };
    }

    default:
      return state;
  }
}

export interface ProgressAccordionItem {
  num: string;
  title: string;
  description: string;
  tag: string;
  imageSrc?: string;
  imageAlt?: string;
  placeholderLabel?: string;
}

export interface ProgressAccordionProps {
  items: ProgressAccordionItem[];
  progressDuration?: number;
  autoAdvance?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * ProgressAccordion (FITVISION_DESIGN_SPEC.md section 8):
 * - Left: angled/skewed placeholder visual with a slanted burgundy accent bar along the edge.
 * - Right: interactive titles with + / - icons, body text, and ~6s progress bar that advances automatically.
 * - Click jumps and restarts bar; pauses on hover/focus; supports ArrowUp/ArrowDown/Home/End.
 * - Auto-advance disabled under prefers-reduced-motion: reduce (opens on click/keyboard only).
 */
export function ProgressAccordion({
  items,
  progressDuration = 6000,
  autoAdvance = true,
  className = "",
  ariaLabel = "How FitVision works",
}: ProgressAccordionProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const effectiveAutoAdvance = autoAdvance && !prefersReducedMotion;

  const [state, dispatch] = useReducer(
    (s: AccordionState, a: AccordionAction) =>
      accordionReducer(s, a, {
        itemCount: items.length,
        progressDuration,
        autoAdvance: effectiveAutoAdvance,
      }),
    initialAccordionState
  );

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lastTimeRef = useRef<number | null>(null);

  // Drive progress bar when autoAdvance is active and not paused
  useEffect(() => {
    if (!effectiveAutoAdvance || state.paused || items.length <= 1) {
      lastTimeRef.current = null;
      return;
    }

    let rafId = 0;
    const step = (now: number) => {
      if (lastTimeRef.current !== null) {
        const delta = Math.min(200, Math.max(0, now - lastTimeRef.current));
        dispatch({ type: "TICK", delta });
      }
      lastTimeRef.current = now;
      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => {
      window.cancelAnimationFrame(rafId);
      lastTimeRef.current = null;
    };
  }, [effectiveAutoAdvance, state.paused, items.length, state.openIndex]);

  // Auto-advance once progress hits 100%
  useEffect(() => {
    if (effectiveAutoAdvance && state.progress >= 100 && items.length > 1) {
      dispatch({ type: "NEXT", count: 1 });
    }
  }, [effectiveAutoAdvance, state.progress, items.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!items.length) return;
      let nextIdx: number | null = null;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          nextIdx = (state.openIndex + 1) % items.length;
          dispatch({ type: "SELECT", index: nextIdx });
          break;
        case "ArrowUp":
          e.preventDefault();
          nextIdx = (state.openIndex - 1 + items.length) % items.length;
          dispatch({ type: "SELECT", index: nextIdx });
          break;
        case "Home":
          e.preventDefault();
          nextIdx = 0;
          dispatch({ type: "SELECT", index: 0 });
          break;
        case "End":
          e.preventDefault();
          nextIdx = items.length - 1;
          dispatch({ type: "SELECT", index: nextIdx });
          break;
        default:
          return;
      }
      if (nextIdx !== null) {
        tabRefs.current[nextIdx]?.focus();
      }
    },
    [items.length, state.openIndex]
  );

  if (!items.length) return null;

  const activeItem = items[state.openIndex] ?? items[0];

  return (
    <div
      className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center ${className}`.trim()}
      role="region"
      aria-label={ariaLabel}
      onMouseEnter={() => dispatch({ type: "PAUSE" })}
      onMouseLeave={() => dispatch({ type: "RESUME" })}
      onFocus={() => dispatch({ type: "PAUSE" })}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          dispatch({ type: "RESUME" });
        }
      }}
    >
      {/* Left: Angled / skewed editorial visual with slanted burgundy accent bar */}
      <div className="lg:col-span-5 px-2 sm:px-4">
        <div
          className="relative aspect-[4/3] w-full overflow-hidden"
          data-testid="accordion-angled-visual"
        >
          {/* Slanted burgundy accent bar hugging left angled edge */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-3 sm:w-4 bg-brand z-20 origin-bottom-left -skew-x-6"
          />
          {/* Angled/skewed crop container */}
          <div
            className="relative w-full h-full bg-surface border border-border-subtle flex flex-col justify-between p-6 sm:p-8 pl-10 sm:pl-12 overflow-hidden"
            style={{
              clipPath: "polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)",
            }}
          >
            {items.some((it) => Boolean(it.imageSrc)) ? (
              <>
                {items.map((item, idx) =>
                  item.imageSrc ? (
                    <Image
                      key={item.num}
                      src={item.imageSrc}
                      alt={item.imageAlt || item.title}
                      fill
                      loading="eager"
                      sizes="(max-width: 1024px) 100vw, 42vw"
                      aria-hidden={idx !== state.openIndex}
                      className={`object-cover object-center transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                        idx === state.openIndex
                          ? "opacity-100"
                          : "opacity-0 pointer-events-none"
                      }`}
                    />
                  ) : null
                )}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-base/90 via-bg-base/30 to-bg-base/55"
                />
              </>
            ) : (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-12 w-48 h-48 rounded-full bg-brand/25 blur-3xl"
              />
            )}

            <div className="relative z-10 flex items-center justify-between gap-2">
              <span className="px-2.5 py-1 bg-bg-base/80 backdrop-blur-sm border border-border-subtle font-mono text-[11px] font-bold uppercase tracking-widest text-accent fv-tabular">
                STEP {activeItem.num}
              </span>
            </div>

            {!activeItem.imageSrc && (
              <div className="relative z-10 my-auto py-4">
                <div className="font-display text-5xl sm:text-6xl font-black text-white/10 select-none leading-none mb-2 fv-tabular">
                  {activeItem.num}
                </div>
                {activeItem.placeholderLabel && (
                  <p className="font-mono text-xs uppercase tracking-wider text-text-muted leading-relaxed max-w-xs">
                    {activeItem.placeholderLabel}
                  </p>
                )}
              </div>
            )}

            <div className="relative z-10 pt-3 border-t border-white/15 flex items-center justify-between gap-3 text-[11px] font-mono text-white">
              <span className="font-semibold uppercase tracking-wider">{activeItem.title}</span>
              <span className="text-accent uppercase tracking-widest shrink-0">{activeItem.tag}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Accordion list with + / - icons & progress bar */}
      <div
        className="lg:col-span-7 flex flex-col divide-y divide-border-subtle border-y border-border-subtle"
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
      >
        {items.map((item, idx) => {
          const isOpen = idx === state.openIndex;
          const headerId = `workflow-accordion-tab-${idx}`;
          const panelId = `workflow-accordion-panel-${idx}`;
          const barWidth = isOpen ? (prefersReducedMotion ? 100 : state.progress) : 0;

          return (
            <div key={item.num} className="relative">
              <button
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                id={headerId}
                type="button"
                role="tab"
                aria-selected={isOpen}
                aria-expanded={isOpen}
                aria-controls={panelId}
                tabIndex={isOpen ? 0 : -1}
                onClick={() => dispatch({ type: "SELECT", index: idx })}
                className="fv-btn-interactive w-full py-5 sm:py-6 px-2 flex items-center justify-between gap-4 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset cursor-pointer"
              >
                <div className="flex items-baseline gap-4 min-w-0">
                  <span
                    className={`font-mono text-xs sm:text-sm font-bold shrink-0 ${
                      isOpen ? "text-accent" : "text-text-muted/60"
                    }`}
                  >
                    {item.num}
                  </span>
                  <span
                    className={`font-display text-lg sm:text-2xl font-extrabold uppercase tracking-tight transition-colors duration-150 ${
                      isOpen ? "text-white" : "text-white/70 group-hover:text-white"
                    }`}
                  >
                    {item.title}
                  </span>
                </div>

                {/* + / - icon */}
                <span
                  aria-hidden="true"
                  className={`w-8 h-8 shrink-0 inline-flex items-center justify-center border transition-colors duration-150 ${
                    isOpen
                      ? "bg-brand border-brand text-white"
                      : "bg-surface border-border-subtle text-white/70 group-hover:border-accent group-hover:text-white"
                  }`}
                >
                  {isOpen ? (
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M3.5 8H12.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M8 3.5V12.5M3.5 8H12.5" strokeLinecap="round" />
                    </svg>
                  )}
                </span>
              </button>

              <div
                id={panelId}
                role="tabpanel"
                aria-labelledby={headerId}
                hidden={!isOpen}
                className="px-2 pb-6 pl-10 sm:pl-12"
              >
                <p className="text-sm sm:text-base text-text-muted leading-relaxed font-sans max-w-xl">
                  {item.description}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true" />
                  <span>{item.tag}</span>
                </div>

                {/* Thin progress bar filling across the open item */}
                <div
                  className="mt-5 w-full h-1 bg-border-subtle overflow-hidden"
                  aria-hidden="true"
                >
                  <div
                    data-testid={`accordion-progress-${idx}`}
                    className="h-full bg-brand transition-none"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProgressAccordion;
