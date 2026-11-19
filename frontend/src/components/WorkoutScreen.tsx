"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useWorkoutEngine } from "@/hooks/useWorkoutEngine";
import { useAuth } from "@/lib/auth/auth_context";
import { apiClient } from "@/lib/api/client";
import { CreateWorkoutRequest, WorkoutResponse } from "@/lib/types";

export interface WorkoutScreenProps {
  exerciseKey?: string;
  onBack?: () => void;
}

/**
 * Determines whether feedback text represents positive form ("good") or a warning ("warning").
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

/**
 * Formats seconds into MM:SS string
 */
function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Render-only WorkoutScreen. Consumes state and handlers from useWorkoutEngine.
 */
export default function WorkoutScreen({
  exerciseKey = "squat",
  onBack,
}: WorkoutScreenProps) {
  const { isAuthenticated } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());

  // Elapsed timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Duplicate-save protection state
  const [isSaving, setIsSaving] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { state, stopWorkout, retry } = useWorkoutEngine({
    exerciseKey,
    videoRef,
    canvasRef,
  });

  const feedbackVariant = getFeedbackVariant(state.feedback);

  // Session elapsed timer ticker while active or body_not_visible
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (state.status === "active" || state.status === "body_not_visible") {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [state.status]);

  // Save completed workout with client-side duplicate protection
  const handleSaveWorkout = async () => {
    if (isSaving || savedSessionId !== null) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const payload: CreateWorkoutRequest = {
        exercise: state.exerciseKey,
        rep_count: state.repCount,
        started_at: startedAtRef.current,
        ended_at: new Date().toISOString(),
      };
      const res = await apiClient.post<WorkoutResponse>("/v1/workouts", payload);
      setSavedSessionId(res.id);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string; message?: string };
      setSaveError(apiErr.detail || apiErr.message || "Failed to save workout session.");
    } finally {
      setIsSaving(false);
    }
  };

  // 1. State: Stopped / Finished
  if (state.status === "stopped") {
    return (
      <main className="h-[100dvh] w-screen bg-black text-white flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none font-sans">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
            <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
              <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
            </svg>
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight uppercase">
            Workout Complete
          </h1>
          <p className="text-[11px] text-zinc-400 uppercase tracking-widest font-black mt-0.5 mb-6">
            {state.config?.display_name || state.exerciseKey.toUpperCase()}
          </p>

          {/* Performance Summary Metrics */}
          <div className="w-full grid grid-cols-2 gap-3 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mb-6">
            <div className="text-center border-r border-zinc-800/80 pr-2">
              <div className="text-4xl sm:text-5xl font-black font-mono text-emerald-400 tracking-tight">
                {state.repCount}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1">
                Completed Reps
              </div>
            </div>
            <div className="text-center pl-2 flex flex-col justify-center">
              <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                {formatTimer(elapsedSeconds)}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1">
                Total Duration
              </div>
            </div>
          </div>

          {/* Save & Confirmation Section */}
          {savedSessionId !== null ? (
            <div className="w-full space-y-3 mb-4">
              <div className="w-full p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                <span>✓</span>
                <span>Workout logged successfully (Session #{savedSessionId})</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/history"
                  className="h-11 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl flex items-center justify-center text-xs uppercase tracking-wider transition"
                >
                  View History
                </Link>
                <Link
                  href="/dashboard"
                  className="h-11 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-xl flex items-center justify-center text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/20"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          ) : isAuthenticated ? (
            <div className="w-full mb-4">
              {saveError && (
                <div className="w-full p-2.5 mb-2.5 rounded-lg bg-red-950/80 border border-red-500/60 text-red-300 text-xs font-medium">
                  {saveError}
                </div>
              )}
              <button
                onClick={handleSaveWorkout}
                disabled={isSaving}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    <span>Saving Workout...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
                    </svg>
                    <span>Save to Performance History</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="w-full mb-4 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 text-center">
              <Link
                href={`/login?redirect=/workout?exercise=${state.exerciseKey}`}
                className="text-emerald-400 hover:underline font-bold"
              >
                Sign in
              </Link>{" "}
              to save completed sessions to your personal streak and history.
            </div>
          )}

          <button
            onClick={onBack}
            className="w-full h-11 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-zinc-700 transition"
          >
            Back to Exercises
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="relative h-[100dvh] w-screen bg-black overflow-hidden select-none flex flex-col justify-between font-sans">
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

      {/* Top HUD: Athletic Header & High-Visibility Rep Counter */}
      <div className="relative z-10 w-full pt-6 pb-4 px-4 sm:px-6 flex flex-col items-center text-center pointer-events-none bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        {/* Top telemetry bar */}
        <div className="flex items-center gap-2 mb-2">
          {/* Exercise pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950/90 border border-zinc-700 text-xs font-black uppercase tracking-wider text-white backdrop-blur-md shadow-lg">
            <span className="text-emerald-400">⚡</span>
            <span>{state.config?.display_name || state.exerciseKey.toUpperCase()}</span>
          </div>

          {/* Movement Phase */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-700/80 text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-300 backdrop-blur-md shadow-lg">
            <span className="text-zinc-500">PHASE:</span>
            <span className="text-emerald-400">{state.confirmedState}</span>
          </div>

          {/* Session Timer */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950/90 border border-zinc-700 text-xs font-mono font-bold text-zinc-300 backdrop-blur-md shadow-lg">
            <span>⏱</span>
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>
        </div>

        {/* Massive 2-Meter Readable Rep Counter */}
        <div className="text-8xl sm:text-9xl font-black font-mono tracking-tighter text-white drop-shadow-[0_8px_30px_rgba(0,0,0,0.95)] leading-none my-1">
          {state.repCount}
        </div>

        {/* Dynamic Form Feedback Pill */}
        {state.feedback && (
          <div
            className={`mt-2 px-5 py-1.5 rounded-full text-sm sm:text-base font-black tracking-wide uppercase backdrop-blur-md transition-all duration-200 border ${
              feedbackVariant === "good"
                ? "bg-emerald-950/90 text-emerald-400 border-emerald-500/70 shadow-[0_0_24px_rgba(16,185,129,0.4)]"
                : "bg-amber-950/90 text-amber-400 border-amber-500/70 shadow-[0_0_24px_rgba(245,158,11,0.4)]"
            }`}
          >
            {state.feedback}
          </div>
        )}

        {/* Camera Positioning Notice: Full Body Visibility Required */}
        {state.status === "body_not_visible" && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-amber-950/90 border border-amber-500/70 text-amber-300 text-xs font-bold shadow-2xl backdrop-blur-md animate-pulse flex items-center gap-2">
            <span>⚠️</span>
            <span>POSITIONING: Step back until your full body is in frame</span>
          </div>
        )}
      </div>

      {/* Bottom Action Bar: Prominent Stop Button */}
      <div className="relative z-10 w-full pb-8 pt-4 px-6 flex justify-center bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        <button
          onClick={stopWorkout}
          className="w-full max-w-xs h-14 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-[0_8px_30px_rgba(220,38,38,0.5)] border border-red-500 transition-all flex items-center justify-center gap-2"
        >
          <span className="w-3.5 h-3.5 bg-white rounded-sm inline-block"></span>
          <span>End Workout Session</span>
        </button>
      </div>

      {/* State: Camera Loading */}
      {state.status === "loading" && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="relative w-16 h-16 mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping"></div>
            <div className="w-14 h-14 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight uppercase mb-2">
            Initializing Vision AI
          </h2>
          <p className="text-xs text-zinc-400 max-w-xs">
            Loading MediaPipe Pose and {state.exerciseKey} biomechanical model...
          </p>
        </div>
      )}

      {/* State: Camera Permission Denied */}
      {state.status === "permission_denied" && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-500/50 flex items-center justify-center text-2xl mb-6 shadow-2xl">
            📷🚫
          </div>
          <h2 className="text-2xl font-black text-red-400 mb-2 uppercase tracking-tight">
            Camera Access Required
          </h2>
          <p className="text-xs text-zinc-300 max-w-xs mb-4 leading-relaxed">
            FitVision processes your video 100% locally on your device. Video frames are never recorded, uploaded, or transmitted.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 text-left max-w-xs mb-6 space-y-1.5">
            <p className="font-bold text-zinc-200">How to allow camera:</p>
            <p>1. Tap the site settings/lock icon in your browser address bar.</p>
            <p>2. Set Camera to "Allow".</p>
            <p>3. Tap "Try Again" below.</p>
          </div>
          <button
            onClick={retry}
            className="w-full max-w-xs h-12 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition"
          >
            Try Again
          </button>
        </div>
      )}

      {/* State: Error */}
      {state.status === "error" && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="w-14 h-14 rounded-2xl bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-2xl mb-4">
            ⚠️
          </div>
          <h2 className="text-xl font-black text-amber-400 mb-2 uppercase tracking-tight">
            Camera Initialization Error
          </h2>
          <p className="text-xs text-zinc-400 max-w-xs mb-6 font-mono">
            {state.errorMessage}
          </p>
          <button
            onClick={retry}
            className="w-full max-w-xs h-12 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-zinc-700 transition"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
