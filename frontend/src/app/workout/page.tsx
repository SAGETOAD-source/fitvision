"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import WorkoutScreen from "@/components/WorkoutScreen";
import { usePageTransition } from "@/components/layout/PageTransition";
import { Button, Card, LoadingSpinner, SectionLabel } from "@/components/ui";
import {
  isBodyGoal,
  isFocusArea,
  type BodyGoal,
  type FocusArea,
  type RoutineResponse,
} from "@/lib/auth_contracts";
import { type RoutineQueueItem } from "@/lib/workout_session";

function WorkoutContent() {
  const searchParams = useSearchParams();
  const { transitionPush } = usePageTransition();

  const exerciseParam = searchParams.get("exercise") || "squat";
  const isRoutineMode = searchParams.get("routine") === "1";
  const rawGoal = searchParams.get("goal");
  const rawFocus = searchParams.get("focus");

  const validGoal: BodyGoal | null = isBodyGoal(rawGoal) ? rawGoal : null;
  const validFocus: FocusArea | null = isFocusArea(rawFocus) ? rawFocus : null;

  const [routineQueue, setRoutineQueue] = useState<RoutineQueueItem[] | null>(
    null
  );
  const [routineLoading, setRoutineLoading] = useState(isRoutineMode);
  const [routineError, setRoutineError] = useState<string | null>(null);

  const loadRoutine = useCallback(async () => {
    if (!isRoutineMode) return;
    if (!validGoal) {
      setRoutineLoading(false);
      setRoutineError("Missing or invalid routine goal parameter.");
      return;
    }

    setRoutineLoading(true);
    setRoutineError(null);
    try {
      const params = new URLSearchParams({ goal: validGoal });
      if (validFocus) {
        params.set("focus", validFocus);
      }
      const res = await fetch(`/api/routines?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.routine) {
        setRoutineError(
          data?.detail || "Unable to load your routine. Please retry."
        );
        return;
      }

      const routine = data.routine as RoutineResponse;
      const queue: RoutineQueueItem[] = routine.exercises.map((item) => ({
        exercise: item.exercise,
        targetSets: item.sets,
        targetReps: item.reps,
      }));
      setRoutineQueue(queue);
    } catch {
      setRoutineError("Unable to reach the FitVision server. Please retry.");
    } finally {
      setRoutineLoading(false);
    }
  }, [isRoutineMode, validGoal, validFocus]);

  useEffect(() => {
    if (isRoutineMode) {
      loadRoutine();
    }
  }, [isRoutineMode, loadRoutine]);

  if (isRoutineMode) {
    if (routineLoading) {
      return (
        <div className="h-[100dvh] w-screen bg-bg-base text-white flex items-center justify-center p-6">
          <LoadingSpinner
            size="lg"
            label="Loading routine exercises..."
            showLabel
          />
        </div>
      );
    }

    if (routineError || !routineQueue || routineQueue.length === 0) {
      return (
        <main className="min-h-[100dvh] w-full bg-bg-base text-white flex items-center justify-center p-6">
          <Card variant="default" padding="lg" className="max-w-md w-full space-y-5">
            <SectionLabel>Routine Mode</SectionLabel>
            <h1 className="font-display text-2xl font-black uppercase tracking-tight text-white">
              Unable to Load Routine
            </h1>
            <p role="alert" className="text-sm text-text-muted font-sans">
              {routineError || "No exercises were returned for this routine."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" size="md" onClick={loadRoutine}>
                Retry
              </Button>
              <Button
                variant="secondary"
                size="md"
                href="/workout?exercise=squat"
              >
                Free Workout
              </Button>
            </div>
          </Card>
        </main>
      );
    }

    return (
      <WorkoutScreen
        mode="routine"
        exerciseKey={searchParams.get("exercise") || routineQueue[0].exercise}
        routineQueue={routineQueue}
        routineGoal={validGoal}
        routineFocus={validFocus}
        onBack={() => {
          void transitionPush("/routines");
        }}
      />
    );
  }

  return (
    <WorkoutScreen
      mode="free"
      exerciseKey={exerciseParam}
      onBack={() => {
        void transitionPush("/");
      }}
    />
  );
}

export default function WorkoutPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[100dvh] w-screen bg-bg-base text-white flex items-center justify-center">
          <LoadingSpinner size="lg" label="Loading live workout..." />
        </div>
      }
    >
      <WorkoutContent />
    </Suspense>
  );
}
