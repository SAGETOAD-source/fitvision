"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import StatCard from "@/components/ui/StatCard";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth/auth_context";
import { apiClient } from "@/lib/api/client";
import {
  StatsResponse,
  WorkoutListResponse,
  ProfileResponse,
  RoutineResponse,
} from "@/lib/types";
import { EXERCISES_META } from "@/lib/exercises_data";

export default function DashboardPage() {
  const { user } = useAuth();

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutListResponse | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [routine, setRoutine] = useState<RoutineResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);

      try {
        const [statsRes, workoutsRes, profileRes] = await Promise.allSettled([
          apiClient.get<StatsResponse>("/v1/stats"),
          apiClient.get<WorkoutListResponse>("/v1/workouts?limit=5&offset=0"),
          apiClient.get<ProfileResponse>("/v1/profile"),
        ]);

        if (statsRes.status === "fulfilled") setStats(statsRes.value);
        if (workoutsRes.status === "fulfilled") setWorkouts(workoutsRes.value);

        let userGoal = "muscular";
        let userFocus: string | null = "upper_body";

        if (profileRes.status === "fulfilled") {
          setProfile(profileRes.value);
          if (profileRes.value.body_goal) userGoal = profileRes.value.body_goal;
          if (profileRes.value.focus_area) userFocus = profileRes.value.focus_area;
        }

        try {
          const focusParam = userFocus ? `&focus=${userFocus}` : "";
          const routineRes = await apiClient.get<RoutineResponse>(
            `/v1/routines?goal=${userGoal}${focusParam}`
          );
          setRoutine(routineRes);
        } catch {
          // Fallback routine
        }
      } catch {
        // Silently handle error
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const totalWorkouts = stats?.total_workouts ?? 0;
  const totalReps = stats?.total_reps ?? 0;
  const streak = stats?.current_streak_days ?? 0;
  const exercisesTracked = Object.keys(stats?.reps_per_exercise ?? {}).length;

  return (
    <AppShell
      title="Performance Dashboard"
      subtitle="Biomechanical repetition metrics, active streaks, and routine targets."
    >
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-8">
          {/* Athlete Focus Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-zinc-900 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-3">
                  <span>⚡</span>
                  <span>
                    TARGET: {profile?.body_goal?.toUpperCase() || "ATHLETIC"} • {profile?.focus_area?.toUpperCase() || "BALANCED FULL BODY"}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                  Welcome back{user?.email ? `, ${user.email.split("@")[0].toUpperCase()}` : ""}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-xl">
                  AI computer-vision coach ready. Launch a verified set or follow your targeted physiological routine.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/workout?exercise=squat"
                  className="w-full sm:w-auto px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Quick Squat Session</span>
                </Link>
                <Link
                  href="/exercises"
                  className="w-full sm:w-auto px-5 py-3.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-xl border border-zinc-700 transition flex items-center justify-center"
                >
                  Movement Catalog
                </Link>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Verified Reps"
              value={totalReps.toLocaleString()}
              subtext="Form-validated repetitions"
              icon={
                <svg className="w-5 h-5 fill-current text-emerald-400" viewBox="0 0 24 24">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              }
            />
            <StatCard
              label="Completed Sessions"
              value={totalWorkouts}
              subtext="Full training sets"
              icon={
                <svg className="w-5 h-5 fill-current text-emerald-400" viewBox="0 0 24 24">
                  <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
            />
            <StatCard
              label="Day Streak"
              value={`${streak} ${streak === 1 ? "day" : "days"}`}
              subtext="Consecutive UTC activity"
              icon={
                <svg className="w-5 h-5 fill-current text-emerald-400" viewBox="0 0 24 24">
                  <path d="M17.55 11.2C17.32 10.9 17 10.64 16.63 10.42C16.32 8.7 15.35 7.17 13.9 6.2C13.88 7.37 13.34 8.5 12.44 9.25C11.53 10 10.3 10.33 9.1 10.13C9.42 8.9 9.25 7.57 8.58 6.45C7.9 5.33 6.8 4.54 5.54 4.25C5.86 6.37 5.12 8.5 3.65 9.94C2.17 11.38 1.48 13.44 1.78 15.48C2.08 17.5 3.32 19.28 5.1 20.25C6.88 21.22 9.03 21.28 10.87 20.4C13.56 21.57 16.7 20.88 18.63 18.72C20.57 16.55 20.9 13.38 19.45 10.88L17.55 11.2Z" />
                </svg>
              }
              trend={streak > 0 ? "Active" : "Ready"}
              trendPositive={streak > 0}
            />
            <StatCard
              label="Movement Coverage"
              value={`${exercisesTracked} / 6`}
              subtext="Calibrated movement patterns"
              icon={
                <svg className="w-5 h-5 fill-none stroke-current text-emerald-400" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" strokeWidth="2" />
                  <circle cx="12" cy="12" r="5" strokeWidth="2" />
                  <circle cx="12" cy="12" r="1" strokeWidth="2" />
                </svg>
              }
            />
          </div>

          {/* Main Grid: Activity Visualization & Recommended Routine */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 7-Day Rolling Activity (2 cols) */}
            <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    7-Day Training Volume
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Total repetitions per calendar day</p>
                </div>
                <span className="text-xs font-bold text-zinc-400 font-mono">
                  {stats?.reps_last_7_days?.reduce((a, b) => a + b.reps, 0) || 0} reps this week
                </span>
              </div>

              {stats?.reps_last_7_days && stats.reps_last_7_days.length > 0 ? (
                <div className="grid grid-cols-7 gap-2 sm:gap-4 pt-4">
                  {stats.reps_last_7_days.map((day) => {
                    const maxReps = Math.max(
                      ...stats.reps_last_7_days.map((d) => d.reps),
                      10
                    );
                    const heightPercent = Math.min(100, Math.round((day.reps / maxReps) * 100));
                    const dayLabel = new Date(day.date).toLocaleDateString("en-US", {
                      weekday: "short",
                    });

                    return (
                      <div key={day.date} className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          {day.reps > 0 ? day.reps : ""}
                        </span>
                        <div className="w-full bg-zinc-950 rounded-xl h-36 flex items-end p-1 border border-zinc-800/80">
                          <div
                            className={`w-full rounded-lg transition-all duration-500 ${
                              day.reps > 0
                                ? "bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-lg shadow-emerald-500/20"
                                : "bg-zinc-800/40"
                            }`}
                            style={{ height: `${Math.max(6, heightPercent)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                          {dayLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-44 flex flex-col items-center justify-center text-center p-6 text-zinc-400 border border-dashed border-zinc-800 rounded-2xl">
                  <p className="text-sm font-bold text-white mb-1">No activity logged this week</p>
                  <p className="text-xs text-zinc-500">Complete an exercise session to track your 7-day volume.</p>
                </div>
              )}
            </div>

            {/* Recommended Routine Card (1 col) */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    Recommended Routine
                  </h3>
                  <Link
                    href="/routines"
                    className="text-xs font-black uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition"
                  >
                    View Plan →
                  </Link>
                </div>

                {routine ? (
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-400 mb-3">
                      Targeted for <span className="text-white font-bold uppercase">{routine.goal}</span> physique.
                    </p>
                    {routine.exercises.slice(0, 3).map((ex) => {
                      const meta = EXERCISES_META[ex.exercise];
                      return (
                        <div
                          key={ex.exercise}
                          className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{meta?.icon || "🏋️"}</span>
                            <div>
                              <p className="text-xs font-bold text-white uppercase">
                                {meta?.name || ex.exercise}
                              </p>
                              <p className="text-[10px] text-zinc-400 font-mono">
                                {ex.sets} sets × {ex.reps} reps
                              </p>
                            </div>
                          </div>
                          <Link
                            href={`/workout?exercise=${ex.exercise}`}
                            className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider bg-zinc-800 hover:bg-emerald-500 hover:text-zinc-950 text-zinc-200 rounded-lg transition"
                          >
                            Launch
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-500 text-xs">
                    Loading targeted routine...
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800">
                <Link
                  href="/onboarding"
                  className="text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition flex items-center justify-between"
                >
                  <span>Update Goal & Focus Area</span>
                  <span>⚙️</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Workouts List */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  Recent Workout Logs
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Verified completed exercise sets</p>
              </div>
              <Link
                href="/history"
                className="text-xs font-black uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition"
              >
                Full History →
              </Link>
            </div>

            {workouts && workouts.workouts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400">
                      <th className="pb-3 font-black">Exercise</th>
                      <th className="pb-3 font-black">Completed Reps</th>
                      <th className="pb-3 font-black">Timestamp</th>
                      <th className="pb-3 font-black text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {workouts.workouts.map((w) => {
                      const meta = EXERCISES_META[w.exercise];
                      const dateStr = new Date(w.started_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <tr key={w.id} className="hover:bg-zinc-800/30 transition">
                          <td className="py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{meta?.icon || "🏋️"}</span>
                              <span className="font-bold text-white uppercase">{meta?.name || w.exercise}</span>
                            </div>
                          </td>
                          <td className="py-3.5 font-mono font-bold text-emerald-400">
                            {w.rep_count} reps
                          </td>
                          <td className="py-3.5 text-xs text-zinc-400 font-mono">
                            {dateStr}
                          </td>
                          <td className="py-3.5 text-right">
                            <Link
                              href={`/workout?exercise=${w.exercise}`}
                              className="text-xs font-black uppercase tracking-wider text-zinc-300 hover:text-emerald-400 transition"
                            >
                              Repeat →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-zinc-400 flex flex-col items-center">
                <p className="text-base font-black text-white uppercase mb-1">No completed workouts yet</p>
                <p className="text-xs text-zinc-500 max-w-sm mb-6">
                  Select an exercise, enable your camera, and let the AI vision engine count your reps live.
                </p>
                <Link
                  href="/workout?exercise=squat"
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition"
                >
                  Start First Workout Set
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
