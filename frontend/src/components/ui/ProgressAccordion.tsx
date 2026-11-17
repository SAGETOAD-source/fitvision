"use client";

import React, { useEffect, useReducer, useRef, useCallback } from "react";
import { ChevronIcon } from "./ChevronIcon";

/* ==========================================================================
 * Pure Reducer (exported for unit testing)
 * ========================================================================== */

export interface AccordionState {
  openIndex: number;
  paused: boolean;
  progress: number; // 0-100
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
  progressDuration: number; // ms for 0-100%
  autoAdvance?: boolean;
}

export function accordionReducer(
  state: AccordionState,
  action: AccordionAction,
  config: AccordionConfig
): AccordionState {
  const { itemCount, progressDuration } = config;
  const progressPerMs = 100 / progressDuration;

  switch (action.type) {
    case "TICK": {
      if (state.paused) return state;
      const newProgress = Math.min(100, state.progress + action.delta * progressPerMs);
      if (newProgress >= 100 && config.autoAdvance) {
        // Auto-advance handled by effect, not reducer
        return { ...state, progress: 100 };
      }
      return { ...state, progress: newProgress };
    }

    case "SELECT": {
      const clampedIndex = ((action.index % itemCount) + itemCount) % itemCount;
      return {
        openIndex: clampedIndex,
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
      const nextIndex = (state.openIndex + action.count) % itemCount;
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

export const initialAccordionState: AccordionState = {
  openIndex: 0,
  paused: false,
  progress: 0,
};

/* ==========================================================================
 * Component Props
 * ========================================================================== */

export interface AccordionItem {
  title: string;
  content: React.ReactNode;
  image?: string;
  imageAlt?: string;
}

export interface ProgressAccordionProps {
  items: AccordionItem[];
  /** Progress fill duration in ms (default 6000) */
  progressDuration?: number;
  /** Enable auto-advance (default true) */
  autoAdvance?: boolean;
  /** Additional className */
  className?: string;
  /** ARIA label for the accordion region */
  ariaLabel?: string;
}

/* ==========================================================================
 * Component
 * ========================================================================== */

export function ProgressAccordion({
  items,
  progressDuration = 6000,
  autoAdvance = true,
  className = "",
  ariaLabel = "Features",
}: ProgressAccordionProps) {
  const config: AccordionConfig = {
    itemCount: items.length,
    progressDuration,
    autoAdvance,
  };

  const [state, dispatch] = useReducer(
    (s: AccordionState, a: AccordionAction) => accordionReducer(s, a, config),
    initialAccordionState
  );

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Animation loop for progress
  useEffect(() => {
    if (!autoAdvance) return;

    const animate = (time: number) => {
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;
      dispatch({ type: "TICK", delta });
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [autoAdvance]);

  // Auto-advance when progress reaches 100%
  useEffect(() => {
    if (!autoAdvance) return;
    if (state.progress >= 100 && !state.paused) {
      dispatch({ type: "NEXT", count: 1 });
    }
  }, [state.progress, state.paused, autoAdvance]);

  // Pause on hover/focus
  const handleMouseEnter = useCallback(() => dispatch({ type: "PAUSE" }), []);
  const handleMouseLeave = useCallback(() => dispatch({ type: "RESUME" }), []);
  const handleFocus = useCallback(() => dispatch({ type: "PAUSE" }), []);
  const handleBlur = useCallback(() => dispatch({ type: "RESUME" }), []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          dispatch({ type: "NEXT", count: 1 });
          break;
        case "ArrowUp":
          e.preventDefault();
          dispatch({ type: "NEXT", count: -1 });
          break;
        case "Home":
          e.preventDefault();
          dispatch({ type: "SELECT", index: 0 });
          break;
        case "End":
          e.preventDefault();
          dispatch({ type: "SELECT", index: items.length - 1 });
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          // Let button handle click
          break;
      }
    },
    [items.length]
  );

  return (
    <div
      className={`progress-accordion ${className}`}
      role="region"
      aria-label={ariaLabel}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <div className="accordian-grid">
        {/* Accordion List */}
        <div className="accordion-list" role="tablist">
          {items.map((item, index) => (
            <AccordionItemComponent
              key={index}
              index={index}
              item={item}
              isOpen={index === state.openIndex}
              progress={index === state.openIndex ? state.progress : 0}
              onSelect={() => dispatch({ type: "SELECT", index })}
            />
          ))}
        </div>

        {/* Image Area */}
        <div className="accordion-image-area" aria-hidden="true">
          {items.map((item, index) => (
            <div
              key={index}
              className={`accordion-image ${index === state.openIndex ? "active" : ""}`}
              style={{
                backgroundImage: item.image ? `url(${item.image})` : "none",
                transition: `opacity var(--duration-crossfade) var(--ease-in-out)`,
              }}
            >
              {!item.image && (
                <div className="accordion-image-fallback" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
 * Accordion Item Sub-component
 * ========================================================================== */

interface AccordionItemComponentProps {
  index: number;
  item: AccordionItem;
  isOpen: boolean;
  progress: number;
  onSelect: () => void;
}

function AccordionItemComponent({
  index,
  item,
  isOpen,
  progress,
  onSelect,
}: AccordionItemComponentProps) {
  const headerId = `accordion-header-${index}`;
  const panelId = `accordion-panel-${index}`;

  return (
    <div className="accordion-item">
      <button
        id={headerId}
        role="tab"
        aria-selected={isOpen}
        aria-controls={panelId}
        aria-expanded={isOpen}
        className="accordion-header"
        onClick={onSelect}
        tabIndex={isOpen ? 0 : -1}
      >
        <span className="accordion-title">{item.title}</span>
        <ChevronIcon
          size={20}
          className={`accordion-chevron ${isOpen ? "open" : ""}`}
          aria-hidden="true"
        />
      </button>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={headerId}
        className="accordion-panel"
        hidden={!isOpen}
      >
        <div className="accordion-content">
          {item.content}
          {/* Progress line */}
          <div
            className="accordion-progress"
            style={{ width: `${progress}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}