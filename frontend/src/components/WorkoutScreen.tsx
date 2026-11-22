"use client";

import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useOptionalAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui";
import { type BodyGoal, type FocusArea } from "@/lib/auth_contracts";
import { type ValidExerciseKey } from "@/lib/workout_reducer";
import {
  createInitialWorkoutSession,
  getCurrentRoutineItem,
  getCurrentSetNumber,
  getPendingSegmentsToSave,
  workoutSessionReducer,
  type RoutineQueueItem,
  type SessionMode,
  type WorkoutSegment,
} from "@/lib/workout_session";
import { WorkoutExerciseRunner } from "@/components/workout/WorkoutExerciseRunner";
import {
  DesktopExerciseTabs,
  ExercisePickerSheet,
  getExerciseDisplayName,
} from "@/components/workout/ExercisePicker";
import { WorkoutSummary } from "@/components/workout/WorkoutSummary";

export interface WorkoutScreenProps {
  exerciseKey?: string;
  mode?: SessionMode;
  routineQueue?: RoutineQueueItem[];
  routineGoal?: BodyGoal | null;
  routineFocus?: FocusArea | null;
  onBack?: () => void;
  slowLoadingTimeoutMs?: number;
}

/**
 * Determines whether feedback text represents positive form ("good") or a warning ("warning").
 * Exported contract tested by tests/workout_screen.test.ts.
 */
export function getFeedbackVariant(
  feedback: string | null
): "good" | "warning" | "neutral" {
  if (!feedback) return "neutral";
  const lower = feedback.toLowerCase();
  if (
    lower.includes("good") ||
    lower.includes("great") ||
    lower.includes("completed") ||
    lower.includes("counted")
  ) {
    return "good";
  }
  return "warning";
}

function buildWorkoutUrl(
  mode: SessionMode,
  activeExercise: ValidExerciseKey,
  routineGoal: BodyGoal | null,
  routineFocus: FocusArea | null
): string {
  if (mode === "routine" && routineGoal) {
    const params = new URLSearchParams({
      routine: "1",
      goal: routineGoal,
    });
    if (routineFocus) {
      params.set("focus", routineFocus);
    }
    params.set("exercise", activeExercise);
    return `/workout?${params.toString()}`;
  }
  return `/workout?exercise=${activeExercise}`;
}

/**
 * Session wrapper owning multi-exercise switching, Routine Mode progression,
 * URL synchronization via history.replaceState, and authenticated segment saving.
 * Mounts `<WorkoutExerciseRunner key={activeExercise} />` so useWorkoutEngine's
 * unmount cleanup releases camera, landmarker, and wake lock on every switch.
 */
export default function WorkoutScreen({
  exerciseKey = "squat",
  mode = "free",
  routineQueue = [],
  routineGoal = null,
  routineFocus = null,
  onBack,
  slowLoadingTimeoutMs,
}: WorkoutScreenProps) {
  const { user } = useOptionalAuth();
  const isAuthenticated = Boolean(user);

  const [session, dispatch] = useReducer(
    workoutSessionReducer,
    {
      mode,
      initialExercise: exerciseKey,
      routineQueue,
      routineGoal,
      routineFocus,
    },
    createInitialWorkoutSession
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const latestRepsRef = useRef(0);
  const inFlightSaveIdsRef = useRef<Set<string>>(new Set());

  // Keep latestRepsRef synced for synchronous capture prior to runner unmount
  const handleRepsChange = useCallback((reps: number) => {
    latestRepsRef.current = reps;
    dispatch({ type: "REPS_UPDATE", reps });
  }, []);

  // Sync browser URL without reload or remounting this wrapper
  const prevUrlExerciseRef = useRef<ValidExerciseKey>(session.activeExercise);
  useEffect(() => {
    if (prevUrlExerciseRef.current === session.activeExercise) return;
    prevUrlExerciseRef.current = session.activeExercise;
    if (typeof window !== "undefined" && window.history?.replaceState) {
      const nextUrl = buildWorkoutUrl(
        session.mode,
        session.activeExercise,
        session.routineGoal,
        session.routineFocus
      );
      window.history.replaceState(null, "", nextUrl);
    }
  }, [
    session.activeExercise,
    session.mode,
    session.routineGoal,
    session.routineFocus,
  ]);

  const saveSegment = useCallback(async (segment: WorkoutSegment) => {
    if (!segment.endedAt || segment.reps <= 0) return;
    if (inFlightSaveIdsRef.current.has(segment.id)) return;

    inFlightSaveIdsRef.current.add(segment.id);
    dispatch({ type: "SAVE_START", segmentId: segment.id });

    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise: segment.exercise,
          rep_count: segment.reps,
          started_at: segment.startedAt,
          ended_at: segment.endedAt,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        dispatch({
          type: "SAVE_FAIL",
          segmentId: segment.id,
          error: data?.detail || "Could not save workout segment.",
        });
        return;
      }

      const workoutId =
        typeof data?.workout?.id === "number" ? data.workout.id : undefined;
      dispatch({
        type: "SAVE_OK",
        segmentId: segment.id,
        workoutId,
      });
    } catch {
      dispatch({
        type: "SAVE_FAIL",
        segmentId: segment.id,
        error: "Network error while saving workout segment.",
      });
    } finally {
      inFlightSaveIdsRef.current.delete(segment.id);
    }
  }, []);

  // Automatically save closed segments with reps > 0 when logged in
  useEffect(() => {
    if (!isAuthenticated) return;
    const pending = getPendingSegmentsToSave(session);
    for (const seg of pending) {
      saveSegment(seg);
    }
  }, [isAuthenticated, session, saveSegment]);

  const handleSwitchExercise = useCallback((nextExercise: ValidExerciseKey) => {
    const capturedReps = latestRepsRef.current;
    latestRepsRef.current = 0;
    dispatch({
      type: "SWITCH",
      exercise: nextExercise,
      finalReps: capturedReps,
    });
  }, []);

  const handleNext = useCallback(() => {
    const capturedReps = latestRepsRef.current;
    latestRepsRef.current = 0;
    dispatch({ type: "NEXT", finalReps: capturedReps });
  }, []);

  const handlePrevious = useCallback(() => {
    const capturedReps = latestRepsRef.current;
    latestRepsRef.current = 0;
    dispatch({ type: "PREVIOUS", finalReps: capturedReps });
  }, []);

  const handleSkip = useCallback(() => {
    const capturedReps = latestRepsRef.current;
    latestRepsRef.current = 0;
    dispatch({ type: "SKIP", finalReps: capturedReps });
  }, []);

  const handleFinishSession = useCallback((finalReps?: number) => {
    const capturedReps =
      finalReps !== undefined ? finalReps : latestRepsRef.current;
    latestRepsRef.current = 0;
    setPickerOpen(false);
    dispatch({ type: "END", finalReps: capturedReps });
  }, []);

  const handleRetrySave = useCallback(
    (segmentId: string) => {
      if (!isAuthenticated) return;
      const seg = session.segments.find((s) => s.id === segmentId);
      if (seg && seg.saveStatus === "failed") {
        saveSegment(seg);
      }
    },
    [isAuthenticated, session.segments, saveSegment]
  );

  // Summary screen (unmounts WorkoutExerciseRunner -> releases camera immediately)
  if (session.status === "summary") {
    const currentReturnUrl = buildWorkoutUrl(
      session.mode,
      session.activeExercise,
      session.routineGoal,
      session.routineFocus
    );
    return (
      <WorkoutSummary
        session={session}
        isAuthenticated={isAuthenticated}
        returnPath={currentReturnUrl}
        onRetrySave={handleRetrySave}
        onStartExercise={handleSwitchExercise}
        onBack={onBack}
      />
    );
  }

  const currentRoutineItem = getCurrentRoutineItem(session);
  const currentSet = getCurrentSetNumber(session);
  const isRoutine = session.mode === "routine" && currentRoutineItem !== null;
  const isFirstRoutineItem = session.routineIndex <= 0;
  const isLastRoutineItem =
    session.routineIndex >= session.routineQueue.length - 1;
  const activeDisplayName = getExerciseDisplayName(session.activeExercise);

  const topBar = (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-4 pb-1 flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        {/* Back / Brand */}
        <button
          type="button"
          onClick={() => handleFinishSession()}
          aria-label="Exit workout to summary"
          className="px-3 py-2 rounded-xl bg-surface/90 backdrop-blur-md border border-border-subtle hover:border-accent text-xs font-display font-bold uppercase tracking-wider text-white inline-flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer shrink-0"
        >
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
              d="M10 3.5L5.5 8L10 12.5"
            />
          </svg>
          <span>Exit</span>
        </button>

        {/* Desktop Exercise Tabs */}
        <DesktopExerciseTabs
          activeExercise={session.activeExercise}
          onSelect={handleSwitchExercise}
        />

        {/* Picker Sheet Trigger (mobile bottom sheet / desktop side drawer) */}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-expanded={pickerOpen}
          data-testid="open-exercise-picker"
          className="px-3.5 py-2 rounded-xl bg-surface/90 backdrop-blur-md border border-border-subtle hover:border-accent text-xs font-display font-bold uppercase tracking-wider text-white inline-flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer shrink-0"
        >
          <span>Exercises</span>
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
              d="M3.5 6L8 10.5L12.5 6"
            />
          </svg>
        </button>
      </div>

      {/* Routine Mode Progress Header */}
      {isRoutine && currentRoutineItem && (
        <div
          data-testid="routine-progress-header"
          className="w-full rounded-2xl bg-surface/90 backdrop-blur-md border border-brand px-4 py-2.5 flex flex-wrap items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 bg-brand font-mono text-[10px] font-bold uppercase tracking-widest text-white">
              Routine
            </span>
            <span className="font-mono text-xs sm:text-sm font-bold text-white">
              Exercise {session.routineIndex + 1} of {session.routineQueue.length}, Set{" "}
              {currentSet} of {currentRoutineItem.targetSets}
            </span>
          </div>
          <span className="font-mono text-xs text-accent font-bold uppercase tracking-wider">
            Target: {currentRoutineItem.targetSets} x {currentRoutineItem.targetReps}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <>
      <WorkoutExerciseRunner
        key={session.activeExercise}
        exerciseKey={session.activeExercise}
        displayName={activeDisplayName}
        onRepsChange={handleRepsChange}
        onStopRequested={handleFinishSession}
        slowLoadingTimeoutMs={slowLoadingTimeoutMs}
        topBarSlot={topBar}
        bottomControlsSlot={({ stopWorkout }) => (
          <div className="max-w-3xl mx-auto flex flex-col gap-3">
            {isRoutine && (
              <div
                data-testid="routine-controls"
                className="flex flex-wrap items-center justify-center gap-2.5"
              >
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isFirstRoutineItem}
                  onClick={handlePrevious}
                >
                  Previous
                </Button>
                <Button variant="secondary" size="sm" onClick={handleSkip}>
                  Skip
                </Button>
                <Button variant="primary" size="sm" onClick={handleNext}>
                  {isLastRoutineItem ? "Complete Routine" : "Next Exercise"}
                </Button>
              </div>
            )}

            <div className="flex justify-center">
              <Button
                variant={isRoutine ? "secondary" : "primary"}
                size="md"
                onClick={stopWorkout}
              >
                {isRoutine ? "Finish Session" : "Stop Workout"}
              </Button>
            </div>
          </div>
        )}
      />

      <ExercisePickerSheet
        activeExercise={session.activeExercise}
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSwitchExercise}
      />
    </>
  );
}
