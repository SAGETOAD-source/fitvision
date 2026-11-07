"use client";

import React, { useRef } from "react";
import { useWorkoutEngine } from "@/hooks/useWorkoutEngine";

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
 * Render-only WorkoutScreen. Consumes state and handlers from useWorkoutEngine.
 */
export default function WorkoutScreen({
  exerciseKey = "squat",
  onBack,
}: WorkoutScreenProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { state, stopWorkout, retry } = useWorkoutEngine({
    exerciseKey,
    videoRef,
    canvasRef,
  });

  const feedbackVariant = getFeedbackVariant(state.feedback);

  // 1. State: Stopped / Finished (shows final rep count and exercise name with Back button)
  if (state.status === "stopped") {
    return (
      <main className="h-[100dvh] w-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-3xl mb-4">
            🏁
          </div>
          <h1 className="text-2xl font-black text-emerald-400 mb-1 uppercase tracking-tight">
            Workout Stopped
          </h1>
          <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-6">
            {state.config?.display_name || state.exerciseKey.toUpperCase()}
          </p>

          <div className="w-full bg-zinc-950 border border-zinc-800/80 rounded-2xl py-6 mb-6">
            <div className="text-6xl font-black font-mono text-white tracking-tighter">
              {state.repCount}
            </div>
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
              Final Reps
            </div>
          </div>

          <button
            onClick={onBack}
            className="w-full h-14 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-extrabold text-base rounded-xl border border-zinc-700 transition"
          >
            Back
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

      {/* Top HUD: 2-meter readable rep counter & dynamic feedback */}
      <div className="relative z-10 w-full pt-8 pb-4 px-6 flex flex-col items-center text-center pointer-events-none bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Minimal Exercise & State Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-700/80 text-xs font-bold uppercase tracking-widest text-zinc-300 backdrop-blur-md shadow-lg mb-2">
          <span className="text-emerald-400 font-extrabold">
            {state.config?.display_name || state.exerciseKey.toUpperCase()}
          </span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-200">{state.confirmedState}</span>
        </div>

        {/* Huge Rep Counter (Readable from 2 meters) */}
        <div className="text-8xl sm:text-9xl font-black font-mono tracking-tighter text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.9)] leading-none my-1">
          {state.repCount}
        </div>

        {/* Short Feedback Line: Green for good, amber for warning */}
        {state.feedback && (
          <div
            className={`mt-2 px-5 py-1.5 rounded-full text-base sm:text-lg font-black tracking-wide uppercase backdrop-blur-md transition-all duration-200 border ${
              feedbackVariant === "good"
                ? "bg-emerald-950/85 text-emerald-400 border-emerald-500/60 shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                : "bg-amber-950/85 text-amber-400 border-amber-500/60 shadow-[0_0_24px_rgba(245,158,11,0.35)]"
            }`}
          >
            {state.feedback}
          </div>
        )}

        {/* Live Warning State: Body Not Fully Visible */}
        {state.status === "body_not_visible" && (
          <div className="mt-4 px-4 py-2 rounded-xl bg-amber-950/90 border border-amber-500/70 text-amber-300 text-xs sm:text-sm font-bold shadow-2xl backdrop-blur-md animate-pulse flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>Step back — ensure your full body is visible</span>
          </div>
        )}
      </div>

      {/* Bottom Action Bar: Big Stop Button */}
      <div className="relative z-10 w-full pb-8 pt-4 px-6 flex justify-center bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <button
          onClick={stopWorkout}
          className="w-full max-w-xs h-16 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-lg uppercase tracking-wider rounded-2xl shadow-[0_8px_30px_rgba(220,38,38,0.5)] border border-red-500 transition-all flex items-center justify-center gap-2"
        >
          <span className="w-3.5 h-3.5 bg-white rounded-sm inline-block"></span>
          <span>Stop Workout</span>
        </button>
      </div>

      {/* State: Camera Loading */}
      {state.status === "loading" && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping"></div>
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
          </div>
          <h2 className="text-xl font-extrabold text-emerald-400 mb-2">
            Starting Camera & AI
          </h2>
          <p className="text-sm text-zinc-400 max-w-xs">
            Loading MediaPipe Pose and {state.exerciseKey} classifier...
          </p>
        </div>
      )}

      {/* State: Camera Permission Denied */}
      {state.status === "permission_denied" && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="w-20 h-20 rounded-full bg-red-950/80 border border-red-500/50 flex items-center justify-center text-3xl mb-6 shadow-2xl">
            📷🚫
          </div>
          <h2 className="text-2xl font-black text-red-400 mb-2">
            Camera Access Denied
          </h2>
          <p className="text-sm text-zinc-300 max-w-xs mb-4">
            FitVision processes your video 100% locally on your device. Video never leaves your phone or computer.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 text-left max-w-xs mb-6 space-y-1">
            <p className="font-bold text-zinc-200 mb-1">To enable camera:</p>
            <p>1. Tap the lock/tune icon in your browser address bar.</p>
            <p>2. Allow "Camera" permission.</p>
            <p>3. Tap "Try Again" below.</p>
          </div>
          <button
            onClick={retry}
            className="w-full max-w-xs h-14 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-black font-extrabold text-base rounded-xl shadow-lg transition"
          >
            Try Again
          </button>
        </div>
      )}

      {/* State: Error */}
      {state.status === "error" && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="w-16 h-16 rounded-full bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-2xl mb-4">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-amber-400 mb-2">
            Unable to Start Workout
          </h2>
          <p className="text-sm text-zinc-400 max-w-xs mb-6 font-mono">
            {state.errorMessage}
          </p>
          <button
            onClick={retry}
            className="w-full max-w-xs h-14 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-bold text-base rounded-xl border border-zinc-700 transition"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
