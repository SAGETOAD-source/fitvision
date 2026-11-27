"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button, Card, LoadingSpinner, SectionLabel } from "@/components/ui";
import { type WorkoutListResponse } from "@/lib/auth_contracts";
import {
  isValidExerciseKey,
  VALID_EXERCISE_KEYS,
  type ValidExerciseKey,
} from "@/lib/workout_reducer";
import { formatDurationSeconds } from "@/lib/workout_session";
import exercisesSnapshot from "../../../public/exercises_snapshot.json";

const PAGE_SIZE = 15;

const SNAPSHOT_EXERCISES = exercisesSnapshot.exercises as Record<
  ValidExerciseKey,
  { display_name: string }
>;

function getDisplayName(key: string): string {
  return isValidExerciseKey(key)
    ? SNAPSHOT_EXERCISES[key].display_name
    : key;
}

function formatUtcTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

export function HistoryView() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const {
    user,
    isLoading: authLoading,
    error: authError,
    sessionExpired,
    refresh,
  } = useAuth();

  const [offset, setOffset] = useState(0);
  const [filterExercise, setFilterExercise] = useState<
    ValidExerciseKey | "all"
  >("all");
  const [data, setData] = useState<WorkoutListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionExpired) {
      routerRef.current.replace("/login?next=%2Fhistory");
    }
  }, [sessionExpired]);

  const fetchHistory = useCallback(async (pageOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/workouts?limit=${PAGE_SIZE}&offset=${pageOffset}`,
        { cache: "no-store" }
      );
      if (res.status === 401) {
        routerRef.current.replace("/login?next=%2Fhistory");
        return;
      }
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.detail || "Unable to load workout history.");
        return;
      }
      setData(json as WorkoutListResponse);
    } catch {
      setError("Unable to reach the FitVision server. Please retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchHistory(offset);
  }, [authLoading, user, offset, fetchHistory]);

  if (authLoading) {
    return (
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-24 flex justify-center">
        <LoadingSpinner label="Loading workout history..." showLabel />
      </section>
    );
  }

  if (authError && !user) {
    return (
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-16">
        <div className="max-w-xl mx-auto">
          <Card variant="default" padding="lg" className="space-y-5">
            <SectionLabel>Connection Error</SectionLabel>
            <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              History Unavailable
            </h1>
            <p role="alert" className="text-sm text-text-muted font-sans">
              {authError}
            </p>
            <Button variant="primary" size="md" onClick={() => refresh()}>
              Retry
            </Button>
          </Card>
        </div>
      </section>
    );
  }

  const allItems = data?.workouts ?? [];
  const filteredItems =
    filterExercise === "all"
      ? allItems
      : allItems.filter((w) => w.exercise === filterExercise);
  const total = data?.total ?? 0;
  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

  return (
    <section
      data-testid="history-view"
      className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <SectionLabel>Activity Log</SectionLabel>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white">
              Workout History
            </h1>
            <div aria-hidden="true" className="w-14 h-1 bg-brand mt-4" />
          </div>
          <p className="text-sm text-text-muted font-sans">
            Chronological log of your saved FitVision sessions (newest first).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" href="/dashboard">
            Dashboard
          </Button>
          <Button variant="primary" size="sm" href="/routines">
            Start Training
          </Button>
        </div>
      </div>

      {/* Filter Pills */}
      <div
        role="group"
        aria-label="Filter history by exercise"
        className="flex flex-wrap items-center gap-2"
      >
        <button
          type="button"
          aria-pressed={filterExercise === "all"}
          onClick={() => setFilterExercise("all")}
          className={`fv-btn-interactive px-3.5 py-2 text-xs font-display font-bold uppercase tracking-wider border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer ${
            filterExercise === "all"
              ? "bg-brand border-accent text-white"
              : "bg-surface-elevated border-border-subtle text-text-muted hover:text-white"
          }`}
        >
          All ({allItems.length})
        </button>
        {VALID_EXERCISE_KEYS.map((key) => {
          const active = filterExercise === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilterExercise(key)}
              className={`fv-btn-interactive px-3.5 py-2 text-xs font-display font-bold uppercase tracking-wider border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer ${
                active
                  ? "bg-brand border-accent text-white"
                  : "bg-surface-elevated border-border-subtle text-text-muted hover:text-white"
              }`}
            >
              {getDisplayName(key)}
            </button>
          );
        })}
      </div>

      {/* List / Loading / Error / Empty */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner label="Fetching workout history..." showLabel />
        </div>
      ) : error ? (
        <Card variant="default" padding="lg" className="space-y-4">
          <p role="alert" className="text-sm text-white font-sans">
            {error}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => fetchHistory(offset)}
          >
            Retry
          </Button>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card
          variant="default"
          padding="lg"
          data-testid="history-empty-state"
          className="text-center space-y-4 py-12"
        >
          <h2 className="font-display text-xl font-black uppercase text-white">
            {total === 0 ? "No Workouts Logged Yet" : "No Matching Sessions"}
          </h2>
          <p className="text-sm text-text-muted max-w-md mx-auto font-sans">
            {total === 0
              ? "Start a live workout from your recommended routine to record your first session."
              : "No sessions on this page match the selected exercise filter."}
          </p>
          <div className="pt-2">
            <Button variant="primary" size="md" href="/routines">
              Browse Routines
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-text-muted border-b border-border-subtle pb-3">
            <span>
              Showing {offset + 1}–{Math.min(offset + allItems.length, total)} of{" "}
              {total} saved session{total === 1 ? "" : "s"}
            </span>
          </div>

          <div className="space-y-3">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                variant="interactive"
                padding="md"
                data-testid={`history-row-${item.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="font-display text-lg font-black uppercase tracking-tight text-white">
                    {getDisplayName(item.exercise)}
                  </div>
                  <div className="font-mono text-xs text-text-muted">
                    {formatUtcTimestamp(item.started_at)} · Duration:{" "}
                    {formatDurationSeconds(item.started_at, item.ended_at)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-5">
                  <div>
                    <span className="font-display text-2xl font-black text-accent">
                      {item.rep_count}
                    </span>
                    <span className="font-mono text-xs uppercase text-text-muted ml-1.5">
                      reps
                    </span>
                  </div>

                  {isValidExerciseKey(item.exercise) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      href={`/workout?exercise=${item.exercise}`}
                    >
                      Train Again
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="pt-4 flex items-center justify-between gap-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={!hasPrev}
                onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
              >
                Previous
              </Button>
              <span className="font-mono text-xs text-text-muted">
                Page {Math.floor(offset / PAGE_SIZE) + 1} of{" "}
                {Math.ceil(total / PAGE_SIZE)}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={!hasNext}
                onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default HistoryView;
