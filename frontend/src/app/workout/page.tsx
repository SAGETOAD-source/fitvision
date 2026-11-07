"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import WorkoutScreen from "@/components/WorkoutScreen";

function WorkoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const exercise = searchParams.get("exercise") || "squat";
  const [completedStats, setCompletedStats] = useState<{
    reps: number;
    exercise: string;
  } | null>(null);

  const handleStop = (stats: { reps: number; exercise: string }) => {
    setCompletedStats(stats);
  };

  if (completedStats) {
    return (
      <main className="h-[100dvh] w-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-3xl mb-4">
            💪
          </div>
          <h1 className="text-2xl font-black text-emerald-400 mb-1 uppercase tracking-tight">
            Workout Completed!
          </h1>
          <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-6">
            {completedStats.exercise}
          </p>

          <div className="w-full bg-zinc-950 border border-zinc-800/80 rounded-2xl py-6 mb-6">
            <div className="text-6xl font-black font-mono text-white tracking-tighter">
              {completedStats.reps}
            </div>
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">
              Reps Counted
            </div>
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={() => setCompletedStats(null)}
              className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-black font-extrabold text-base rounded-xl shadow-lg transition"
            >
              Start Another Set
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full h-14 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-bold text-base rounded-xl border border-zinc-700 transition"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  return <WorkoutScreen exerciseKey={exercise} onStop={handleStop} />;
}

export default function WorkoutPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[100dvh] w-screen bg-black text-white flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <WorkoutContent />
    </Suspense>
  );
}
