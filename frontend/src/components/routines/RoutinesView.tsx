"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button, Card, LoadingSpinner, SectionLabel } from "@/components/ui";
import {
  BODY_GOALS,
  type BodyGoal,
  type FocusArea,
  type RoutineResponse,
} from "@/lib/auth_contracts";
import {
  isValidExerciseKey,
  type ValidExerciseKey,
} from "@/lib/workout_reducer";
import exercisesSnapshot from "../../../public/exercises_snapshot.json";

type FocusOptionValue = FocusArea | null;

interface SnapshotExerciseEntry {
  display_name: string;
  signals: Record<string, { feature_name: string }>;
  count_on: string;
  min_valid_range: number;
  good_depth_threshold: number | null;
  form_warnings: Record<string, { message?: string }>;
}

const SNAPSHOT_EXERCISES = exercisesSnapshot.exercises as Record<
  ValidExerciseKey,
  SnapshotExerciseEntry
>;

const GOAL_LABELS: Record<BodyGoal, string> = {
  slim: "Slim",
  muscular: "Muscular",
  bulk: "Bulk",
};

const FOCUS_TABS: ReadonlyArray<{ value: FocusOptionValue; label: string }> = [
  { value: null, label: "Balanced" },
  { value: "legs", label: "Legs" },
  { value: "upper_body", label: "Upper Body" },
  { value: "core", label: "Core" },
];

function getExerciseCue(entry: SnapshotExerciseEntry): string {
  if (typeof entry.good_depth_threshold === "number") {
    return `Depth cue <= ${entry.good_depth_threshold}°`;
  }
  const warningMsg = Object.values(entry.form_warnings || {}).find(
    (w) => typeof w?.message === "string"
  )?.message;
  if (warningMsg) {
    return `Form cue: ${warningMsg}`;
  }
  return `Min range >= ${entry.min_valid_range}°`;
}

/**
 * Public Recommendation Hub (/routines):
 * - Open to guests and signed-in users (GET /v1/routines is public).
 * - Guests browse all goal x focus recommendations and start immediately.
 * - Signed-in users get their saved profile pre-loaded and can save updates.
 */
export function RoutinesView() {
  const router = useRouter();
  const {
    user,
    profile,
    isLoading: authLoading,
    updateProfile,
  } = useAuth();

  const [selectedGoal, setSelectedGoal] = useState<BodyGoal>("muscular");
  const [selectedFocus, setSelectedFocus] = useState<FocusOptionValue>(null);
  const [initializedSelection, setInitializedSelection] = useState(false);

  const [routine, setRoutine] = useState<RoutineResponse | null>(null);
  const [routineLoading, setRoutineLoading] = useState(true);
  const [routineError, setRoutineError] = useState<string | null>(null);

  const [savingDefault, setSavingDefault] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Sync initial selection once auth settles (pre-fill from profile if logged in; default for guests)
  useEffect(() => {
    if (authLoading || initializedSelection) return;
    setSelectedGoal(profile?.body_goal ?? "muscular");
    setSelectedFocus(profile?.focus_area ?? null);
    setInitializedSelection(true);
  }, [authLoading, profile, initializedSelection]);

  const fetchRoutine = useCallback(
    async (goal: BodyGoal, focus: FocusOptionValue) => {
      setRoutineLoading(true);
      setRoutineError(null);
      try {
        const params = new URLSearchParams({ goal });
        if (focus) {
          params.set("focus", focus);
        }
        const res = await fetch(`/api/routines?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setRoutine(null);
          setRoutineError(
            data?.detail || "Unable to load routine recommendations right now."
          );
          return;
        }

        setRoutine((data?.routine as RoutineResponse | undefined) ?? null);
      } catch {
        setRoutine(null);
        setRoutineError("Unable to reach the FitVision server. Please retry.");
      } finally {
        setRoutineLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!initializedSelection) return;
    fetchRoutine(selectedGoal, selectedFocus);
  }, [initializedSelection, selectedGoal, selectedFocus, fetchRoutine]);

  const isAuthenticated = Boolean(user);

  const hasUnsavedPreferenceChange =
    isAuthenticated &&
    profile !== null &&
    (profile.body_goal !== selectedGoal ||
      profile.focus_area !== selectedFocus);

  const handleSaveAsDefault = async () => {
    setSavingDefault(true);
    setSaveMessage(null);
    try {
      const res = await updateProfile({
        body_goal: selectedGoal,
        focus_area: selectedFocus,
      });
      if (res.success) {
        setSaveMessage("Saved to your profile.");
      } else if (res.status === 401) {
        router.replace("/login?next=%2Froutines");
      } else {
        setSaveMessage(res.error || "Could not save profile.");
      }
    } finally {
      setSavingDefault(false);
    }
  };

  if (authLoading) {
    return (
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-24 flex justify-center">
        <LoadingSpinner label="Loading workout recommendations..." showLabel />
      </section>
    );
  }

  const activeFocusLabel =
    FOCUS_TABS.find((t) => t.value === selectedFocus)?.label ?? "Balanced";

  return (
    <section className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
      {/* Top Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <SectionLabel>
            {isAuthenticated ? "Personalized Plan" : "Workout Recommendations"}
          </SectionLabel>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white">
              Recommended Routine
            </h1>
            <div aria-hidden="true" className="w-14 h-1 bg-brand mt-4" />
          </div>
          <p className="text-sm sm:text-base text-text-muted font-sans max-w-2xl leading-relaxed">
            Pick your training goal and focus area to view recommended sets and repetitions across FitVision&apos;s 6 tracked exercises, then start right away.
          </p>
        </div>

        {isAuthenticated && (
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="ghost" size="sm" href="/dashboard">
              Dashboard
            </Button>
            <Button variant="ghost" size="sm" href="/onboarding">
              Edit in Wizard
            </Button>
          </div>
        )}
      </div>

      {/* Guest Banner (non-blocking — full routine browsing & live workout available immediately) */}
      {!isAuthenticated && (
        <Card
          variant="elevated"
          padding="md"
          data-testid="routines-guest-banner"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-border-subtle"
        >
          <div className="space-y-1">
            <div className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent">
              Open Preview Mode
            </div>
            <p className="text-xs sm:text-sm text-text-muted font-sans leading-relaxed">
              Start any exercise or full routine right now without an account. Sign in to save your default goal and log completed reps.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button variant="secondary" size="sm" href="/login?next=%2Froutines">
              Log In
            </Button>
            <Button variant="ghost" size="sm" href="/signup">
              Sign Up
            </Button>
          </div>
        </Card>
      )}

      {/* Signed-in prompt if onboarding not completed yet */}
      {isAuthenticated && profile && !profile.onboarding_completed && (
        <Card
          variant="elevated"
          padding="md"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-brand"
        >
          <p className="text-xs sm:text-sm text-text-muted font-sans">
            You haven&apos;t saved a default goal yet. Complete the 2-step onboarding wizard or adjust your plan below.
          </p>
          <Button variant="secondary" size="sm" href="/onboarding">
            Complete Setup
          </Button>
        </Card>
      )}

      {/* Goal & Focus Controls */}
      <Card variant="default" padding="md" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Body Goal Selector */}
          <div className="space-y-3">
            <span className="block font-mono text-[11px] font-bold uppercase tracking-widest text-accent">
              Body Goal
            </span>
            <div
              role="group"
              aria-label="Select body goal"
              className="flex flex-wrap gap-2.5"
            >
              {BODY_GOALS.map((goal) => {
                const active = selectedGoal === goal;
                return (
                  <button
                    key={goal}
                    type="button"
                    aria-pressed={active}
                    data-testid={`routine-goal-${goal}`}
                    onClick={() => {
                      setSelectedGoal(goal);
                      setSaveMessage(null);
                    }}
                    className={`px-4 py-2.5 text-xs font-display font-bold uppercase tracking-wider border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer ${
                      active
                        ? "bg-brand border-accent text-white"
                        : "bg-surface-elevated border-border-subtle text-text-muted hover:text-white hover:border-white/40"
                    }`}
                  >
                    {GOAL_LABELS[goal]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Focus Area Selector */}
          <div className="space-y-3">
            <span className="block font-mono text-[11px] font-bold uppercase tracking-widest text-accent">
              Focus Area
            </span>
            <div
              role="group"
              aria-label="Select focus area"
              className="flex flex-wrap gap-2.5"
            >
              {FOCUS_TABS.map((tab) => {
                const active = selectedFocus === tab.value;
                const testKey = tab.value ?? "balanced";
                return (
                  <button
                    key={testKey}
                    type="button"
                    aria-pressed={active}
                    data-testid={`routine-focus-${testKey}`}
                    onClick={() => {
                      setSelectedFocus(tab.value);
                      setSaveMessage(null);
                    }}
                    className={`px-4 py-2.5 text-xs font-display font-bold uppercase tracking-wider border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer ${
                      active
                        ? "bg-brand border-accent text-white"
                        : "bg-surface-elevated border-border-subtle text-text-muted hover:text-white hover:border-white/40"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {(hasUnsavedPreferenceChange || saveMessage) && (
          <div className="pt-4 border-t border-border-subtle flex flex-wrap items-center justify-between gap-4">
            <span className="font-mono text-xs text-text-muted">
              {saveMessage
                ? saveMessage
                : `Previewing ${GOAL_LABELS[selectedGoal]} / ${activeFocusLabel}.`}
            </span>
            {hasUnsavedPreferenceChange && (
              <Button
                variant="secondary"
                size="sm"
                loading={savingDefault}
                loadingText="Saving"
                onClick={handleSaveAsDefault}
              >
                Save As Default
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Active Routine Mode Launcher */}
      <Card
        variant="elevated"
        padding="md"
        data-testid="routine-mode-slot"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-brand"
      >
        <div className="space-y-1">
          <div className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent">
            Guided Routine Mode
          </div>
          <p className="text-xs sm:text-sm text-text-muted font-sans leading-relaxed">
            Run all exercises in sequence with Next, Previous, Skip, and automatic per-exercise saving when signed in.
          </p>
        </div>
        <div className="shrink-0">
          <Button
            variant="primary"
            size="md"
            href={`/workout?routine=1&goal=${selectedGoal}${
              selectedFocus ? `&focus=${selectedFocus}` : ""
            }`}
          >
            START FULL ROUTINE
          </Button>
        </div>
      </Card>

      {/* Routine Exercise Cards */}
      {routineLoading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner label="Fetching routine..." showLabel />
        </div>
      ) : routineError ? (
        <Card variant="default" padding="lg" className="space-y-4">
          <p role="alert" className="text-sm text-white font-sans">
            {routineError}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => fetchRoutine(selectedGoal, selectedFocus)}
          >
            Retry
          </Button>
        </Card>
      ) : routine ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-4">
            <h2 className="font-display text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
              {GOAL_LABELS[routine.goal]} · {activeFocusLabel} Plan
            </h2>
            <span className="px-3 py-1 rounded-full bg-surface-elevated border border-border-subtle font-mono text-xs font-bold uppercase tracking-wider text-accent">
              {routine.exercises.length} Exercises
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routine.exercises.map((item, idx) => {
              const snapshotEntry = isValidExerciseKey(item.exercise)
                ? SNAPSHOT_EXERCISES[item.exercise]
                : undefined;
              const displayName = snapshotEntry?.display_name ?? item.exercise;
              const signalCount = snapshotEntry
                ? Object.keys(snapshotEntry.signals).length
                : 0;

              return (
                <Card
                  key={`${item.exercise}-${idx}`}
                  variant="interactive"
                  padding="md"
                  data-testid={`routine-card-${item.exercise}`}
                  className="flex flex-col justify-between gap-6"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-accent">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      {snapshotEntry && (
                        <span className="px-2.5 py-1 rounded-full bg-surface border border-border-subtle font-mono text-[10px] uppercase tracking-wider text-text-muted">
                          Count on {snapshotEntry.count_on}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-display text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                        {displayName}
                      </h3>
                      {snapshotEntry && (
                        <p className="text-xs font-mono text-text-muted mt-1">
                          {signalCount} angle signal{signalCount === 1 ? "" : "s"} ·{" "}
                          {getExerciseCue(snapshotEntry)}
                        </p>
                      )}
                    </div>

                    {/* Prescribed Volume (Sets x Reps) */}
                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-surface border border-border-subtle text-center">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                          Sets
                        </div>
                        <div className="font-display text-2xl sm:text-3xl font-black text-white mt-0.5">
                          {item.sets}
                        </div>
                      </div>
                      <div className="border-l border-border-subtle">
                        <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                          Reps / Set
                        </div>
                        <div className="font-display text-2xl sm:text-3xl font-black text-accent mt-0.5">
                          {item.reps}
                        </div>
                      </div>
                    </div>

                    <div className="font-mono text-xs text-text-muted">
                      Target:{" "}
                      <span className="text-white font-bold">
                        {item.sets} x {item.reps}
                      </span>
                    </div>
                  </div>

                  <div>
                    <Button
                      variant="primary"
                      size="sm"
                      href={`/workout?exercise=${item.exercise}`}
                    >
                      START
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default RoutinesView;
