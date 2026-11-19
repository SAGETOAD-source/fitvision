"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import StatCard from "@/components/ui/StatCard";
import { apiClient } from "@/lib/api/client";
import { WorkoutListResponse, StatsResponse } from "@/lib/types";
import { EXERCISES_META } from "@/lib/exercises_data";

function ExerciseIcon({ exerciseKey }: { exerciseKey: string }) {
  switch (exerciseKey) {
    case "squat":
      return (
        <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a2 2 0 100 4 2 2 0 000-4zM6 10l3 4-2 7M18 10l-3 4 2 7M9 14h6M9 9h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "pushup":
      return (
        <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 18h16M7 14l5-4 5 4M12 4v6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "situp":
      return (
        <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19h16M6 15l6-6 4 3 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "pullup":
      return (
        <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 5h18M7 5v5l5 4 5-4V5M12 14v6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "jumpingjack":
      return (
        <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3a2 2 0 100 4 2 2 0 000-4zM6 9l6 3 6-3M7 21l5-7 5 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "latpulldown":
    default:
      return (
        <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16M6 4l4 6v8M18 4l-4 6v8M9 14h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

export default function HistoryPage() {
  const [workoutsData, setWorkoutsData] = useState<WorkoutListResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 15;

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      try {
        const offset = page * pageSize;
        const [workoutsRes, statsRes] = await Promise.allSettled([
          apiClient.get<WorkoutListResponse>(`/v1/workouts?limit=${pageSize}&offset=${offset}`),
          apiClient.get<StatsResponse>("/v1/stats"),
        ]);

        if (workoutsRes.status === "fulfilled") setWorkoutsData(workoutsRes.value);
        if (statsRes.status === "fulfilled") setStats(statsRes.value);
      } catch {
        // Fallback gracefully
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [page]);

  const totalPages = workoutsData ? Math.ceil(workoutsData.total / pageSize) : 1;

  function formatDuration(startedAt: string, endedAt: string): string {
    const start = new Date(startedAt).getTime();
    const end = new Date(endedAt).getTime();
    const diffSec = Math.max(0, Math.round((end - start) / 1000));
    if (diffSec < 60) return `${diffSec}s`;
    const min = Math.floor(diffSec / 60);
    const sec = diffSec % 60;
    return `${min}m ${sec}s`;
  }

  return (
    <AppShell
      title="Workout History & Analytics"
      subtitle="Complete chronological log of verified repetitions, movement cadence, and training sessions."
    >
      <div className="space-y-8">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Reps"
            value={(stats?.total_reps ?? 0).toLocaleString()}
            subtext="Lifetime verified reps"
            icon={
              <svg className="w-5 h-5 fill-current text-emerald-400" viewBox="0 0 24 24">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            }
          />
          <StatCard
            label="Completed Sessions"
            value={stats?.total_workouts ?? 0}
            subtext="Validated workout sets"
            icon={
              <svg className="w-5 h-5 fill-current text-emerald-400" viewBox="0 0 24 24">
                <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />
          <StatCard
            label="Current Streak"
            value={`${stats?.current_streak_days ?? 0} days`}
            subtext="Consecutive days active"
            icon={
              <svg className="w-5 h-5 fill-current text-emerald-400" viewBox="0 0 24 24">
                <path d="M17.55 11.2C17.32 10.9 17 10.64 16.63 10.42C16.32 8.7 15.35 7.17 13.9 6.2C13.88 7.37 13.34 8.5 12.44 9.25C11.53 10 10.3 10.33 9.1 10.13C9.42 8.9 9.25 7.57 8.58 6.45C7.9 5.33 6.8 4.54 5.54 4.25C5.86 6.37 5.12 8.5 3.65 9.94C2.17 11.38 1.48 13.44 1.78 15.48C2.08 17.5 3.32 19.28 5.1 20.25C6.88 21.22 9.03 21.28 10.87 20.4C13.56 21.57 16.7 20.88 18.63 18.72C20.57 16.55 20.9 13.38 19.45 10.88L17.55 11.2Z" />
              </svg>
            }
          />
          <StatCard
            label="Exercises Active"
            value={`${Object.keys(stats?.reps_per_exercise ?? {}).length} / 6`}
            subtext="Trained movements"
            icon={
              <svg className="w-5 h-5 fill-current text-emerald-400" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
              </svg>
            }
          />
        </div>

        {/* Exercise Distribution Breakdown */}
        {stats && Object.keys(stats.reps_per_exercise).length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-4">
              Repetitions by Exercise
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(stats.reps_per_exercise).map(([exKey, count]) => {
                const meta = EXERCISES_META[exKey];
                return (
                  <div
                    key={exKey}
                    className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 text-center flex flex-col items-center justify-between"
                  >
                    <span className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-2">
                      <ExerciseIcon exerciseKey={exKey} />
                    </span>
                    <p className="text-xs font-bold text-white truncate max-w-full">{meta?.name || exKey}</p>
                    <p className="text-xl font-black font-mono text-emerald-400 mt-1">{count}</p>
                    <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold">reps</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* History Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                Session Log
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {workoutsData?.total || 0} total sessions recorded
              </p>
            </div>
            <Link
              href="/exercises"
              className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl transition"
            >
              + New Workout
            </Link>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center items-center">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
          ) : workoutsData && workoutsData.workouts.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400 font-mono">
                      <th className="pb-3 font-black">Exercise</th>
                      <th className="pb-3 font-black">Reps</th>
                      <th className="pb-3 font-black">Duration</th>
                      <th className="pb-3 font-black">Timestamp</th>
                      <th className="pb-3 font-black text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {workoutsData.workouts.map((w) => {
                      const meta = EXERCISES_META[w.exercise];
                      const dateFormatted = new Date(w.started_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <tr key={w.id} className="hover:bg-zinc-850/50 transition">
                          <td className="py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                                <ExerciseIcon exerciseKey={w.exercise} />
                              </span>
                              <div>
                                <span className="font-bold text-white block uppercase tracking-tight text-xs">
                                  {meta?.name || w.exercise}
                                </span>
                                <span className="text-[10px] text-zinc-500 uppercase font-mono">
                                  {meta?.category || "Workout"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 font-mono font-black text-emerald-400">
                            {w.rep_count} reps
                          </td>
                          <td className="py-3.5 text-xs text-zinc-300 font-mono">
                            {formatDuration(w.started_at, w.ended_at)}
                          </td>
                          <td className="py-3.5 text-xs text-zinc-400 font-mono">
                            {dateFormatted}
                          </td>
                          <td className="py-3.5 text-right">
                            <Link
                              href={`/workout?exercise=${w.exercise}`}
                              className="px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg bg-zinc-800 hover:bg-emerald-500 hover:text-zinc-950 text-zinc-200 transition"
                            >
                              Repeat Set
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="px-4 py-2 bg-zinc-800 text-xs font-bold rounded-xl disabled:opacity-40 hover:bg-zinc-700 transition"
                  >
                    ← Previous
                  </button>
                  <span className="text-xs text-zinc-400 font-mono">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-4 py-2 bg-zinc-800 text-xs font-bold rounded-xl disabled:opacity-40 hover:bg-zinc-700 transition"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center text-zinc-400 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-emerald-400 mb-3">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-sm font-bold text-white mb-1">No workout history logged</p>
              <p className="text-xs text-zinc-500 mb-4">Complete an exercise session to see your telemetry appear here.</p>
              <Link
                href="/exercises"
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition"
              >
                Browse Exercises
              </Link>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
