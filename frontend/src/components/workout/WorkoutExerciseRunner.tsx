"use client";

import React, { useEffect, useRef, useState } from "react";
import { useWorkoutEngine } from "@/hooks/useWorkoutEngine";
import { getFeedbackVariant } from "@/components/WorkoutScreen";
import { Button, Card, LoadingSpinner } from "@/components/ui";
import { type ValidExerciseKey } from "@/lib/workout_reducer";

export interface WorkoutExerciseRunnerProps {
  exerciseKey: ValidExerciseKey;
  displayName: string;
  onRepsChange: (reps: number) => void;
  onStopRequested: (finalReps: number) => void;
  topBarSlot?: React.ReactNode;
  bottomControlsSlot?: (args: {
    repCount: number;
    stopWorkout: () => void;
  }) => React.ReactNode;
  slowLoadingTimeoutMs?: number;
}

/**
 * Inner runner component mounted with `key={activeExercise}` by WorkoutScreen.
 * Consumes `useWorkoutEngine` (read-only) so every exercise switch naturally
 * triggers the hook's Strict Mode cancellation and camera/landmarker/wakeLock cleanup.
 */
export function WorkoutExerciseRunner({
  exerciseKey,
  displayName,
  onRepsChange,
  onStopRequested,
  topBarSlot,
  bottomControlsSlot,
  slowLoadingTimeoutMs = 10000,
}: WorkoutExerciseRunnerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [slowLoading, setSlowLoading] = useState(false);

  const { state, stopWorkout, retry } = useWorkoutEngine({
    exerciseKey,
    videoRef,
    canvasRef,
  });

  // Sync live rep count up to the session wrapper
  useEffect(() => {
    onRepsChange(state.repCount);
  }, [state.repCount, onRepsChange]);

  // 10-second slow-camera hint while loading
  useEffect(() => {
    if (state.status !== "loading") {
      setSlowLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      setSlowLoading(true);
    }, slowLoadingTimeoutMs);
    return () => clearTimeout(timer);
  }, [state.status, slowLoadingTimeoutMs]);

  const handleStopAndFinish = () => {
    const finalReps = state.repCount;
    stopWorkout();
    onStopRequested(finalReps);
  };

  const handleRetry = () => {
    setSlowLoading(false);
    retry();
  };

  const feedbackVariant = getFeedbackVariant(state.feedback);
  const activeDisplayName = state.config?.display_name || displayName;

  return (
    <div
      data-testid="workout-exercise-runner"
      data-exercise={exerciseKey}
      className="relative h-[100dvh] w-screen bg-bg-base overflow-hidden select-none flex flex-col justify-between font-sans"
    >
      {/* Camera Viewport + Skeleton Overlay */}
      <div className="absolute inset-0 w-full h-full">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-cover scale-x-[-1]"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      </div>

      {/* Top Overlay: Session bar + Giant 2m-readable Unbounded Rep Counter */}
      <div className="relative z-20 w-full bg-gradient-to-b from-bg-base/95 via-bg-base/60 to-transparent">
        {topBarSlot}

        <div className="w-full pt-2 pb-4 px-4 sm:px-6 flex flex-col items-center text-center pointer-events-none">
          {/* Exercise & Confirmed State Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface/90 border border-border-subtle text-xs font-mono font-bold uppercase tracking-widest text-text-muted backdrop-blur-md shadow-lg mb-2">
            <span className="text-accent font-extrabold">
              {activeDisplayName}
            </span>
            <span className="text-white/40" aria-hidden="true">
              /
            </span>
            <span className="text-white">{state.confirmedState}</span>
          </div>

          {/* Giant 2-Meter Readable Rep Counter (Unbounded display font) */}
          <div
            data-testid="live-rep-count"
            className="font-display text-7xl sm:text-9xl font-black tracking-tighter text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.9)] leading-none my-1"
          >
            {state.repCount}
          </div>

          {/* Form Feedback Pill (Burgundy / Rose palette) */}
          {state.feedback && (
            <div
              data-testid="live-feedback-pill"
              className={`mt-2 px-5 py-1.5 rounded-full text-sm sm:text-base font-display font-bold tracking-wide uppercase backdrop-blur-md transition-colors duration-200 motion-reduce:transition-none border inline-flex items-center gap-2 ${
                feedbackVariant === "good"
                  ? "bg-brand/90 text-white border-accent shadow-lg"
                  : "bg-surface-elevated/95 text-accent border-accent/70 shadow-lg"
              }`}
            >
              {feedbackVariant === "good" ? (
                <svg
                  className="w-4 h-4 text-white shrink-0"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.4}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 8.5L6.5 12L13 4.5"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-accent shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              )}
              <span>{state.feedback}</span>
            </div>
          )}

          {/* Non-blocking Body Visibility Hint */}
          {state.status === "body_not_visible" && (
            <div
              role="status"
              className="mt-3 px-4 py-2 rounded-xl bg-surface-elevated/95 border border-accent/70 text-white text-xs sm:text-sm font-mono font-bold shadow-2xl backdrop-blur-md animate-pulse motion-reduce:animate-none inline-flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 text-accent shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
              </svg>
              <span>Step back — keep your full body in frame</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Controls */}
      <div className="relative z-20 w-full pb-6 sm:pb-8 pt-4 px-4 sm:px-6 bg-gradient-to-t from-bg-base/95 via-bg-base/65 to-transparent">
        {bottomControlsSlot ? (
          bottomControlsSlot({
            repCount: state.repCount,
            stopWorkout: handleStopAndFinish,
          })
        ) : (
          <div className="flex justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={handleStopAndFinish}
            >
              Stop Workout
            </Button>
          </div>
        )}
      </div>

      {/* Overlay: Camera & AI Loading */}
      {state.status === "loading" && (
        <div
          data-testid="workout-loading-overlay"
          className="absolute inset-0 z-30 bg-bg-base/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white"
        >
          <LoadingSpinner
            size="lg"
            label={`Loading ${activeDisplayName} camera and AI`}
          />
          <h2 className="font-display text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-6">
            Starting Camera & AI
          </h2>
          <p className="text-xs sm:text-sm text-text-muted max-w-xs mt-2 font-sans">
            Loading MediaPipe Pose and {activeDisplayName} classifier locally in your browser.
          </p>

          {slowLoading && (
            <div
              data-testid="slow-loading-hint"
              className="mt-6 max-w-sm rounded-2xl bg-surface border border-border-subtle p-4 space-y-3"
            >
              <p className="text-xs font-mono text-text-muted leading-relaxed">
                Taking longer than usual. Check that camera access is allowed or retry initialization.
              </p>
              <Button variant="secondary" size="sm" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          )}

          <div className="mt-8">
            <Button variant="ghost" size="sm" onClick={handleStopAndFinish}>
              Cancel Session
            </Button>
          </div>
        </div>
      )}

      {/* Overlay: Camera Permission Denied */}
      {state.status === "permission_denied" && (
        <div
          data-testid="workout-permission-overlay"
          className="absolute inset-0 z-30 bg-bg-base/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white"
        >
          <Card variant="default" padding="lg" className="max-w-md w-full space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-brand/30 border border-accent/50 flex items-center justify-center text-accent">
              <svg
                className="w-7 h-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 3l18 18M5 18h8a2 2 0 002-2v-1M9 6h4a2 2 0 012 2v1"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-2xl font-black uppercase tracking-tight text-white">
                Camera Access Denied
              </h2>
              <p className="text-xs sm:text-sm text-text-muted mt-2 font-sans">
                FitVision processes your video locally in your browser. No video frames are transmitted.
              </p>
            </div>
            <ol className="bg-surface-elevated border border-border-subtle rounded-2xl p-4 text-xs text-text-muted text-left space-y-1.5 font-mono list-decimal list-inside">
              <li>Open camera permissions in your browser address bar.</li>
              <li>Allow Camera access for this site.</li>
              <li>Select Try Again below.</li>
            </ol>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <Button variant="primary" size="md" onClick={handleRetry}>
                Try Again
              </Button>
              <Button variant="secondary" size="md" onClick={handleStopAndFinish}>
                Exit
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Overlay: Engine Error */}
      {state.status === "error" && (
        <div
          data-testid="workout-error-overlay"
          className="absolute inset-0 z-30 bg-bg-base/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white"
        >
          <Card variant="default" padding="lg" className="max-w-md w-full space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-brand/30 border border-accent/50 flex items-center justify-center text-accent">
              <svg
                className="w-7 h-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                Unable to Start Workout
              </h2>
              <p className="text-xs text-text-muted mt-2 font-mono break-words">
                {state.errorMessage || "Camera or pose model initialization failed."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <Button variant="primary" size="md" onClick={handleRetry}>
                Retry
              </Button>
              <Button variant="secondary" size="md" onClick={handleStopAndFinish}>
                Finish
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default WorkoutExerciseRunner;
