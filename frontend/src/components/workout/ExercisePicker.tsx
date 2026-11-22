"use client";

import React, { useEffect } from "react";
import {
  VALID_EXERCISE_KEYS,
  type ValidExerciseKey,
} from "@/lib/workout_reducer";
import exercisesSnapshot from "../../../public/exercises_snapshot.json";

interface SnapshotExerciseInfo {
  display_name: string;
  count_on: string;
}

const SNAPSHOT_MAP = exercisesSnapshot.exercises as Record<
  ValidExerciseKey,
  SnapshotExerciseInfo
>;

export function getExerciseDisplayName(key: ValidExerciseKey): string {
  return SNAPSHOT_MAP[key]?.display_name ?? key;
}

export interface ExercisePickerProps {
  activeExercise: ValidExerciseKey;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exercise: ValidExerciseKey) => void;
}

/**
 * Responsive 6-exercise selector:
 * - Always-accessible horizontal tab strip on desktop (md+).
 * - Slide-up bottom sheet on mobile (< md) and slide-over side drawer on desktop when toggled open.
 */
export function DesktopExerciseTabs({
  activeExercise,
  onSelect,
}: {
  activeExercise: ValidExerciseKey;
  onSelect: (exercise: ValidExerciseKey) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Switch exercise"
      data-testid="desktop-exercise-tabs"
      className="hidden md:flex items-center gap-1.5 bg-surface/90 backdrop-blur-md border border-border-subtle rounded-2xl p-1"
    >
      {VALID_EXERCISE_KEYS.map((key) => {
        const isActive = key === activeExercise;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-testid={`exercise-tab-${key}`}
            onClick={() => onSelect(key)}
            className={`px-3 py-1.5 rounded-xl font-display text-[10px] font-bold uppercase tracking-wider transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer whitespace-nowrap ${
              isActive
                ? "bg-brand text-white border border-accent"
                : "text-text-muted hover:text-white hover:bg-surface-elevated border border-transparent"
            }`}
          >
            {getExerciseDisplayName(key)}
          </button>
        );
      })}
    </div>
  );
}

export function ExercisePickerSheet({
  activeExercise,
  isOpen,
  onClose,
  onSelect,
}: ExercisePickerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end bg-bg-base/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Choose exercise"
      data-testid="exercise-picker-sheet"
    >
      {/* Backdrop click target */}
      <button
        type="button"
        aria-label="Close exercise picker"
        onClick={onClose}
        className="absolute inset-0 w-full h-full cursor-default"
      />

      {/* Bottom Sheet (mobile) / Side Drawer (desktop) */}
      <div className="relative z-10 w-full md:w-96 bg-surface border-t md:border-t-0 md:border-l border-border-subtle rounded-t-3xl md:rounded-none p-6 flex flex-col gap-5 max-h-[82dvh] md:max-h-full overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle pb-4">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
              Switch Exercise
            </span>
            <h2 className="font-display text-lg font-black uppercase tracking-tight text-white mt-0.5">
              6 Tracked Movements
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close exercise picker"
            className="w-9 h-9 rounded-full bg-surface-elevated border border-border-subtle hover:border-accent text-white inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {VALID_EXERCISE_KEYS.map((key, idx) => {
            const isActive = key === activeExercise;
            const info = SNAPSHOT_MAP[key];
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isActive}
                data-testid={`picker-option-${key}`}
                onClick={() => {
                  onSelect(key);
                  onClose();
                }}
                className={`w-full text-left px-4 py-3.5 rounded-2xl border transition-colors duration-150 motion-reduce:transition-none flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer ${
                  isActive
                    ? "bg-brand/30 border-accent text-white"
                    : "bg-surface-elevated border-border-subtle text-white hover:border-white/40"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs font-bold text-accent shrink-0">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <div className="font-display text-sm font-black uppercase tracking-tight text-white truncate">
                      {info.display_name}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                      Count on {info.count_on}
                    </div>
                  </div>
                </div>

                {isActive && (
                  <span className="px-2.5 py-0.5 rounded-full bg-brand border border-accent font-mono text-[10px] font-bold uppercase tracking-wider text-white shrink-0">
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
