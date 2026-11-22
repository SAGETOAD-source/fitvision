"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button, Card, LoadingSpinner, SectionLabel } from "@/components/ui";
import {
  type RoutineResponse,
  type StatsResponse,
  type WorkoutListResponse,
} from "@/lib/auth_contracts";
import {
  isValidExerciseKey,
  VALID_EXERCISE_KEYS,
  type ValidExerciseKey,
} from "@/lib/workout_reducer";
import { formatDurationSeconds } from "@/lib/workout_session";
import exercisesSnapshot from "../../../public/exercises_snapshot.json";

const SNAPSHOT_EXERCISES = exercisesSnapshot.exercises as Record<
  ValidExerciseKey,
  { display_name: string }
>;

function getDisplayName(key: string): string {
  return isValidExerciseKey(key)
    ? SNAPSHOT_EXERCISES[key].display_name
    : key;
}

function formatUtcDayLabel(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    d.getUTCDay()
  ];
  return `${weekday} ${parts[2]}`;
}

function formatUtcDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

export function DashboardView() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const {
    user,
    profile,
    isLoading: authLoading,
    error: authError,
    sessionExpired,
    refresh,
  } = useAuth();

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [recentWorkouts, setRecentWorkouts] =
    useState<WorkoutListResponse | null>(null);
  const [routine, setRoutine] = useState<RoutineResponse | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionExpired) {
      routerRef.current.replace("/login?next=%2Fdashboard");
    }
  }, [sessionExpired]);

  const profileGoal = profile?.body_goal ?? "muscular";
  const profileFocus = profile?.focus_area ?? null;

  const loadDashboard = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);

    const routineParams = new URLSearchParams({ goal: profileGoal });
    if (profileFocus) routineParams.set("focus", profileFocus);

    try {
      const [statsRes, workoutsRes, routineRes] = await Promise.all([
        fetch("/api/stats", { cache: "no-store" }),
        fetch("/api/workouts?limit=5&offset=0", { cache: "no-store" }),
        fetch(`/api/routines?${routineParams.toString()}`, {
          cache: "no-store",
        }),
      ]);

      if (statsRes.status === 401 || workoutsRes.status === 401) {
        routerRef.current.replace("/login?next=%2Fdashboard");
        return;
      }

      if (!statsRes.ok || !workoutsRes.ok) {
        setDataError("Unable to load your training statistics right now.");
        return;
      }

      const [statsJson, workoutsJson, routineJson] = await Promise.all([
        statsRes.json().catch(() => null),
        workoutsRes.json().catch(() => null),
        routineRes.ok ? routineRes.json().catch(() => null) : Promise.resolve(null),
      ]);

      setStats((statsJson?.stats as StatsResponse | undefined) ?? null);
      setRecentWorkouts(
        (workoutsJson as WorkoutListResponse | undefined) ?? null
      );
      setRoutine((routineJson?.routine as RoutineResponse | undefined) ?? null);
    } catch {
      setDataError("Unable to reach the FitVision server. Please retry.");
    } finally {
      setDataLoading(false);
    }
  }, [profileGoal, profileFocus]);

  useEffect(() => {
    if (authLoading) return;
    if (authError && !user) return;
    if (!user) return;
    loadDashboard();
  }, [authLoading, authError, user, loadDashboard]);

  if (authLoading || (user && dataLoading)) {
    return (
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-24 flex justify-center">
        <LoadingSpinner label="Loading your training dashboard..." showLabel />
      </section>
    );
  }

  if ((authError && !user) || dataError) {
    return (
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-16">
        <div className="max-w-xl mx-auto">
          <Card variant="default" padding="lg" className="space-y-5">
            <SectionLabel>Connection Error</SectionLabel>
            <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              Dashboard Unavailable
            </h1>
            <p role="alert" className="text-sm text-text-muted font-sans">
              {authError || dataError}
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => (authError && !user ? refresh() : loadDashboard())}
            >
              Retry
            </Button>
          </Card>
        </div>
      </section>
    );
  }

  const totalWorkouts = stats?.total_workouts ?? 0;
  const totalReps = stats?.total_reps ?? 0;
  const streakDays = stats?.current_streak_days ?? 0;
  const dailySeries = stats?.reps_last_7_days ?? [];
  const maxDailyReps = Math.max(1, ...dailySeries.map((d) => d.reps));
  const repsPerExercise = stats?.reps_per_exercise ?? {};
  const maxExerciseReps = Math.max(
    1,
    ...VALID_EXERCISE_KEYS.map((k) => repsPerExercise[k] ?? 0)
  );

  const activeGoalLabel = profile?.body_goal
    ? profile.body_goal.toUpperCase()
    : "NOT SET";
  const activeFocusLabel = profile?.focus_area
    ? profile.focus_area.replace("_", " ").toUpperCase()
    : "BALANCED";

  const fullRoutineHref = `/workout?routine=1&goal=${
    profile?.body_goal ?? "muscular"
  }${profile?.focus_area ? `&focus=${profile.focus_area}` : ""}`;

  return (
    <section
      data-testid="dashboard-view"
      className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <SectionLabel>Performance Overview</SectionLabel>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white">
              Training Dashboard
            </h1>
            <div aria-hidden="true" className="w-14 h-1 bg-brand mt-4" />
          </div>
          {user && (
            <p className="text-xs sm:text-sm font-mono text-text-muted">
              Signed in as <span className="text-white">{user.email}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="md" href={fullRoutineHref}>
            Start Full Routine
          </Button>
          <Button variant="secondary" size="md" href="/routines">
            Browse Routines
          </Button>
        </div>
      </div>

      {/* 4 KPI Bento Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card variant="elevated" padding="md" className="space-y-2">
          <div className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
            Total Workouts
          </div>
          <div
            data-testid="stat-total-workouts"
            className="font-display text-3xl sm:text-4xl font-black text-white"
          >
            {totalWorkouts}
          </div>
        </Card>

        <Card variant="elevated" padding="md" className="space-y-2">
          <div className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
            Total Reps
          </div>
          <div
            data-testid="stat-total-reps"
            className="font-display text-3xl sm:text-4xl font-black text-accent"
          >
            {totalReps}
          </div>
        </Card>

        <Card variant="elevated" padding="md" className="space-y-2">
          <div className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
            Active Streak
          </div>
          <div
            data-testid="stat-streak"
            className="font-display text-3xl sm:text-4xl font-black text-white"
          >
            {streakDays}
            <span className="text-sm font-mono text-text-muted ml-1">
              {streakDays === 1 ? "DAY" : "DAYS"}
            </span>
          </div>
        </Card>

        <Card variant="elevated" padding="md" className="space-y-2">
          <div className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
            Active Plan
          </div>
          <div className="font-display text-base sm:text-2xl font-black text-white uppercase leading-tight break-words">
            {activeGoalLabel}
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-accent">
            <span>{activeFocusLabel}</span>
            <Link
              href="/profile"
              className="text-text-muted hover:text-white underline underline-offset-4 decoration-brand"
            >
              Edit
            </Link>
          </div>
        </Card>
      </div>

      {/* Middle Row: 7-Day Activity Chart + Reps by Exercise */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-Day UTC Bar Chart */}
        <Card
          variant="default"
          padding="lg"
          data-testid="dashboard-7day-chart"
          className="lg:col-span-7 flex flex-col justify-between gap-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent">
                Last 7 Days (UTC)
              </div>
              <h2 className="font-display text-xl font-black uppercase tracking-tight text-white mt-1">
                Daily Repetition Volume
              </h2>
            </div>
            <span className="font-mono text-xs text-text-muted">
              Peak: {Math.max(0, ...dailySeries.map((d) => d.reps))} reps
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 pt-6 border-b border-border-subtle pb-2">
            {dailySeries.map((day) => {
              const pct =
                day.reps > 0
                  ? Math.max(12, Math.round((day.reps / maxDailyReps) * 100))
                  : 4;
              return (
                <div
                  key={day.date}
                  className="h-full flex flex-col items-center justify-end gap-2"
                >
                  <span className="font-mono text-[10px] sm:text-xs font-bold text-white/85">
                    {day.reps > 0 ? day.reps : ""}
                  </span>
                  <div className="w-full max-w-[38px] flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 motion-reduce:transition-none ${
                        day.reps > 0
                          ? "bg-brand border-t-2 border-accent"
                          : "bg-surface-elevated border border-border-subtle"
                      }`}
                      style={{ height: `${pct}%` }}
                      title={`${day.date}: ${day.reps} reps`}
                    />
                  </div>
                  <span className="font-mono text-[9px] sm:text-[10px] text-text-muted uppercase whitespace-nowrap">
                    {formatUtcDayLabel(day.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Reps Per Exercise */}
        <Card
          variant="default"
          padding="lg"
          className="lg:col-span-5 space-y-5"
        >
          <div>
            <div className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent">
              Movement Breakdown
            </div>
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white mt-1">
              Reps By Exercise
            </h2>
          </div>

          <div className="space-y-3.5">
            {VALID_EXERCISE_KEYS.map((key) => {
              const count = repsPerExercise[key] ?? 0;
              const widthPct =
                count > 0
                  ? Math.max(8, Math.round((count / maxExerciseReps) * 100))
                  : 0;
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white font-semibold uppercase">
                      {getDisplayName(key)}
                    </span>
                    <span className="text-text-muted">{count} reps</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden">
                    {widthPct > 0 && (
                      <div
                        className="h-full bg-brand border-r-2 border-accent transition-all duration-300 motion-reduce:transition-none"
                        style={{ width: `${widthPct}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Bottom Row: Routine Preview + Recent Workouts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Routine Card */}
        <Card
          variant="default"
          padding="lg"
          className="lg:col-span-5 flex flex-col justify-between gap-6"
        >
          <div className="space-y-4">
            <div>
              <div className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent">
                Up Next
              </div>
              <h2 className="font-display text-xl font-black uppercase tracking-tight text-white mt-1">
                Your Prescribed Circuit
              </h2>
            </div>

            {routine && routine.exercises.length > 0 ? (
              <ul className="space-y-2.5 list-none m-0 p-0">
                {routine.exercises.map((item, idx) => (
                  <li
                    key={`${item.exercise}-${idx}`}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-surface-elevated border border-border-subtle text-xs font-mono"
                  >
                    <span className="text-white font-bold uppercase">
                      {String(idx + 1).padStart(2, "0")} ·{" "}
                      {getDisplayName(item.exercise)}
                    </span>
                    <span className="text-accent font-bold">
                      {item.sets} x {item.reps}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-text-muted font-sans">
                Open Routines to choose a goal and launch a guided workout.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm" href={fullRoutineHref}>
              Launch Routine
            </Button>
            <Button variant="ghost" size="sm" href="/routines">
              Customize
            </Button>
          </div>
        </Card>

        {/* Recent Workouts */}
        <Card
          variant="default"
          padding="lg"
          className="lg:col-span-7 flex flex-col justify-between gap-6"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent">
                  Activity Log
                </div>
                <h2 className="font-display text-xl font-black uppercase tracking-tight text-white mt-1">
                  Recent Workouts
                </h2>
              </div>
              <Button variant="ghost" size="sm" href="/history">
                Full History
              </Button>
            </div>

            {recentWorkouts && recentWorkouts.workouts.length > 0 ? (
              <div className="space-y-2.5">
                {recentWorkouts.workouts.map((w) => (
                  <div
                    key={w.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-surface-elevated border border-border-subtle"
                  >
                    <div>
                      <div className="font-display text-sm font-black uppercase text-white">
                        {getDisplayName(w.exercise)}
                      </div>
                      <div className="font-mono text-[11px] text-text-muted">
                        {formatUtcDateShort(w.started_at)} ·{" "}
                        {formatDurationSeconds(w.started_at, w.ended_at)}
                      </div>
                    </div>
                    <div className="font-display text-lg font-black text-accent">
                      {w.rep_count}{" "}
                      <span className="font-mono text-[11px] text-text-muted uppercase">
                        reps
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-surface-elevated border border-border-subtle p-6 text-center space-y-3">
                <p className="text-sm text-text-muted font-sans">
                  No workouts logged yet. Complete a live workout while signed in to populate your stats.
                </p>
                <Button variant="primary" size="sm" href="/routines">
                  Start First Session
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}

export default DashboardView;
