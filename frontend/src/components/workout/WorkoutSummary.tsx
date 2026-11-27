"use client";

import React from "react";
import { Button, Card, SectionLabel } from "@/components/ui";
import {
  formatDurationSeconds,
  type WorkoutSegment,
  type WorkoutSessionState,
} from "@/lib/workout_session";
import {
  VALID_EXERCISE_KEYS,
  type ValidExerciseKey,
} from "@/lib/workout_reducer";
import { getExerciseDisplayName } from "@/components/workout/ExercisePicker";

export interface WorkoutSummaryProps {
  session: WorkoutSessionState;
  isAuthenticated: boolean;
  returnPath: string;
  onRetrySave: (segmentId: string) => void;
  onStartExercise: (exercise: ValidExerciseKey) => void;
  onBack?: () => void;
}

function formatTotalDuration(segments: WorkoutSegment[]): string {
  if (!segments.length) return "0:00";
  const firstStart = segments[0].startedAt;
  const lastEnd = segments[segments.length - 1].endedAt;
  return formatDurationSeconds(firstStart, lastEnd);
}

export function WorkoutSummary({
  session,
  isAuthenticated,
  returnPath,
  onRetrySave,
  onStartExercise,
  onBack,
}: WorkoutSummaryProps) {
  const totalReps = session.segments.reduce((sum, seg) => sum + seg.reps, 0);
  const totalDuration = formatTotalDuration(session.segments);
  const encodedReturn = encodeURIComponent(returnPath);

  return (
    <main
      data-testid="workout-summary"
      className="min-h-[100dvh] w-full bg-bg-base text-white px-4 sm:px-6 py-10 sm:py-16 font-sans"
    >
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Heading */}
        <div className="space-y-3">
          <SectionLabel>Session Complete</SectionLabel>
          <div>
            <h1 className="font-display text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
              Workout Summary
            </h1>
            <div aria-hidden="true" className="w-14 h-1 bg-brand mt-4" />
          </div>
          <p className="text-sm text-text-muted font-sans">
            Camera stream stopped. Video frames were processed strictly on your device.
          </p>
        </div>

        {/* Totals Grid */}
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          <Card variant="elevated" padding="sm" className="text-center">
            <div className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-text-muted">
              Total Reps
            </div>
            <div
              data-testid="summary-total-reps"
              className="font-display text-2xl sm:text-4xl font-black text-accent mt-1"
            >
              {totalReps}
            </div>
          </Card>

          <Card variant="elevated" padding="sm" className="text-center">
            <div className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-text-muted">
              Segments
            </div>
            <div className="font-display text-2xl sm:text-4xl font-black text-white mt-1">
              {session.segments.length}
            </div>
          </Card>

          <Card variant="elevated" padding="sm" className="text-center">
            <div className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-text-muted">
              Duration
            </div>
            <div className="font-display text-2xl sm:text-4xl font-black text-white mt-1">
              {totalDuration}
            </div>
          </Card>
        </div>

        {/* Guest Banner */}
        {!isAuthenticated && (
          <Card
            variant="default"
            padding="md"
            data-testid="summary-guest-notice"
            className="border-brand flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
                Guest Session — Reps Not Saved
              </div>
              <p className="text-xs sm:text-sm text-text-muted font-sans">
                Log in or create an account to save future workout segments and track progress.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button
                variant="primary"
                size="sm"
                href={`/login?next=${encodedReturn}`}
              >
                Log In
              </Button>
              <Button
                variant="secondary"
                size="sm"
                href={`/signup?next=${encodedReturn}`}
              >
                Sign Up
              </Button>
            </div>
          </Card>
        )}

        {/* Per-Exercise Segments Breakdown */}
        <div className="space-y-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-text-muted">
            Completed Exercises
          </h2>

          <div className="space-y-3">
            {session.segments.map((seg, idx) => {
              const duration = formatDurationSeconds(seg.startedAt, seg.endedAt);
              const name = getExerciseDisplayName(seg.exercise);

              return (
                <Card
                  key={seg.id}
                  variant="elevated"
                  padding="md"
                  data-testid={`summary-segment-${seg.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-baseline gap-3.5 min-w-0">
                    <span className="font-mono text-xs font-bold text-accent shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <div className="font-display text-lg font-black uppercase tracking-tight text-white">
                        {name}
                      </div>
                      <div className="font-mono text-xs text-text-muted mt-0.5">
                        Duration: {duration}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4">
                    <div className="text-left sm:text-right">
                      <span className="font-display text-2xl font-black text-white">
                        {seg.reps}
                      </span>
                      <span className="font-mono text-xs uppercase tracking-wider text-text-muted ml-1.5">
                        reps
                      </span>
                    </div>

                    {/* Save Status */}
                    <div
                      data-testid={`segment-save-status-${seg.id}`}
                      className="flex items-center gap-2"
                    >
                      {!isAuthenticated ? (
                        <span className="px-2.5 py-1 rounded-full bg-surface border border-border-subtle font-mono text-[11px] text-text-muted">
                          Not saved
                        </span>
                      ) : seg.reps === 0 ? (
                        <span className="px-2.5 py-1 rounded-full bg-surface border border-border-subtle font-mono text-[11px] text-text-muted">
                          0 reps (skipped)
                        </span>
                      ) : seg.saveStatus === "saving" ? (
                        <span className="px-2.5 py-1 rounded-full bg-surface border border-border-subtle font-mono text-[11px] text-white">
                          Saving...
                        </span>
                      ) : seg.saveStatus === "saved" ? (
                        <span className="px-2.5 py-1 rounded-full bg-brand/30 border border-accent/60 font-mono text-[11px] font-bold text-white inline-flex items-center gap-1.5">
                          <svg
                            className="w-3.5 h-3.5 text-accent"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.2}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 8.5L6.5 12L13 4.5"
                            />
                          </svg>
                          <span>Saved</span>
                        </span>
                      ) : seg.saveStatus === "failed" ? (
                        <div className="flex items-center gap-2">
                          <span
                            role="alert"
                            className="px-2.5 py-1 rounded-full bg-brand/25 border border-accent font-mono text-[11px] text-accent"
                          >
                            Save failed
                          </span>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onRetrySave(seg.id)}
                          >
                            Retry
                          </Button>
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-surface border border-border-subtle font-mono text-[11px] text-text-muted">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Start Another Exercise Quick Launcher */}
        <Card variant="default" padding="md" className="space-y-4">
          <div className="font-mono text-xs font-bold uppercase tracking-widest text-accent">
            Start Another Exercise
          </div>
          <div className="flex flex-wrap gap-2">
            {VALID_EXERCISE_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                data-testid={`summary-start-${key}`}
                onClick={() => onStartExercise(key)}
                className="fv-btn-interactive px-3.5 py-2 rounded-xl bg-surface-elevated border border-border-subtle hover:border-accent hover:bg-brand/20 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
              >
                {getExerciseDisplayName(key)}
              </button>
            ))}
          </div>
        </Card>

        {/* Bottom Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap items-center gap-3">
            {isAuthenticated ? (
              <Button variant="primary" size="md" href="/routines">
                View Routine
              </Button>
            ) : (
              <Button variant="primary" size="md" href="/">
                Back to Home
              </Button>
            )}
            {onBack && isAuthenticated && (
              <Button variant="secondary" size="md" onClick={onBack}>
                Home
              </Button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default WorkoutSummary;
