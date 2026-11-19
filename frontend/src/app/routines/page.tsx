"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { apiClient } from "@/lib/api/client";
import { BodyGoal, FocusArea, ProfileResponse, RoutineResponse } from "@/lib/types";
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

export default function RoutinesPage() {
  const [selectedGoal, setSelectedGoal] = useState<BodyGoal>("muscular");
  const [selectedFocus, setSelectedFocus] = useState<FocusArea | null>("upper_body");
  const [routine, setRoutine] = useState<RoutineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync with user's profile on mount if available
  useEffect(() => {
    async function loadInitialProfile() {
      try {
        const prof = await apiClient.get<ProfileResponse>("/v1/profile");
        if (prof.body_goal) setSelectedGoal(prof.body_goal);
        if (prof.focus_area) setSelectedFocus(prof.focus_area);
      } catch {
        // Fallback to default muscular / upper_body
      }
    }
    loadInitialProfile();
  }, []);

  // Fetch routine whenever goal or focus changes
  useEffect(() => {
    async function fetchRoutine() {
      setLoading(true);
      setError(null);
      try {
        const focusParam = selectedFocus ? `&focus=${selectedFocus}` : "";
        const data = await apiClient.get<RoutineResponse>(
          `/v1/routines?goal=${selectedGoal}${focusParam}`
        );
        setRoutine(data);
      } catch {
        setError("Unable to load workout routine. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchRoutine();
  }, [selectedGoal, selectedFocus]);

  const goals: Array<{ id: BodyGoal; label: string; desc: string; icon: React.ReactNode }> = [
    {
      id: "slim",
      label: "Slim & Tone",
      desc: "Metabolic conditioning & agility",
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7z" />
        </svg>
      ),
    },
    {
      id: "muscular",
      label: "Athletic Muscular",
      desc: "Hypertrophy & progressive volume",
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
    },
    {
      id: "bulk",
      label: "Power & Bulk",
      desc: "Maximum force & heavy compounds",
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" />
        </svg>
      ),
    },
  ];

  const focusOptions: Array<{ id: FocusArea | null; label: string }> = [
    { id: "upper_body", label: "Upper Body" },
    { id: "legs", label: "Lower Body (Legs)" },
    { id: "core", label: "Core & Abs" },
    { id: null, label: "Full Body (Balanced)" },
  ];

  return (
    <AppShell
      title="Workout Routines"
      subtitle="Engineered multi-exercise training circuits calibrated for your physiological targets."
    >
      <div className="space-y-8">
        {/* Goal & Focus Selector Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          {/* Goal Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-3">
              1. Training Goal
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {goals.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGoal(g.id)}
                  className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition duration-200 ${
                    selectedGoal === g.id
                      ? "bg-emerald-950/70 border-emerald-500 text-emerald-400 ring-1 ring-emerald-500 shadow-lg shadow-emerald-950/40"
                      : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                  }`}
                >
                  <div className={`mt-0.5 ${selectedGoal === g.id ? "text-emerald-400" : "text-zinc-500"}`}>
                    {g.icon}
                  </div>
                  <div>
                    <span className="block text-sm font-black uppercase tracking-tight">{g.label}</span>
                    <span className="block text-xs text-zinc-400 mt-0.5">{g.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Focus Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-3">
              2. Target Emphasis Area
            </label>
            <div className="flex flex-wrap gap-2">
              {focusOptions.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => setSelectedFocus(f.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border transition ${
                    selectedFocus === f.id
                      ? "bg-emerald-500 text-zinc-950 border-emerald-500 shadow-md shadow-emerald-500/20"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Routine Exercises Display */}
        {loading ? (
          <div className="py-16 flex justify-center items-center">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-950/80 border border-red-500 text-red-300 text-sm">
            {error}
          </div>
        ) : routine ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white capitalize tracking-tight">
                  {routine.goal} • {routine.focus?.replace("_", " ") || "Full Body"} Circuit
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Execute sets in prescribed order. Computer vision automatically counts validated reps.
                </p>
              </div>
              <span className="text-xs font-mono font-black text-emerald-400 px-3.5 py-1.5 rounded-full bg-emerald-950 border border-emerald-800 self-start sm:self-auto">
                {routine.exercises.length} Exercises Prescribed
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {routine.exercises.map((item, index) => {
                const meta = EXERCISES_META[item.exercise];
                return (
                  <div
                    key={item.exercise}
                    className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-zinc-700 transition group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono">
                          Set #{index + 1}
                        </span>
                        <span className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                          <ExerciseIcon exerciseKey={item.exercise} />
                        </span>
                      </div>

                      <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1 group-hover:text-emerald-400 transition-colors">
                        {meta?.name || item.exercise}
                      </h3>
                      <p className="text-xs text-zinc-400 mb-6 line-clamp-2 leading-relaxed">
                        {meta?.description || "Biomechanical repetition sequence tracked by computer vision."}
                      </p>

                      <div className="grid grid-cols-2 gap-3 mb-6 p-3 rounded-2xl bg-zinc-950 border border-zinc-800/80 text-center">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Target Sets</p>
                          <p className="text-2xl font-black font-mono text-white">{item.sets}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Reps / Set</p>
                          <p className="text-2xl font-black font-mono text-emerald-400">{item.reps}</p>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/workout?exercise=${item.exercise}`}
                      className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-500/20 text-center flex items-center justify-center gap-2"
                    >
                      <span>Start {meta?.name || item.exercise}</span>
                      <span>→</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
