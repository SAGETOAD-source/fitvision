"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { EXERCISES_LIST } from "@/lib/exercises_data";

function ExerciseIcon({ exerciseKey }: { exerciseKey: string }) {
  switch (exerciseKey) {
    case "squat":
      return (
        <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a2 2 0 100 4 2 2 0 000-4zM6 10l3 4-2 7M18 10l-3 4 2 7M9 14h6M9 9h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "pushup":
      return (
        <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 18h16M7 14l5-4 5 4M12 4v6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "situp":
      return (
        <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19h16M6 15l6-6 4 3 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "pullup":
      return (
        <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 5h18M7 5v5l5 4 5-4V5M12 14v6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "jumpingjack":
      return (
        <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3a2 2 0 100 4 2 2 0 000-4zM6 9l6 3 6-3M7 21l5-7 5 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "latpulldown":
    default:
      return (
        <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16M6 4l4 6v8M18 4l-4 6v8M9 14h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

export default function ExercisesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["All", "Lower Body", "Upper Body", "Core", "Full Body"];

  const filteredExercises = EXERCISES_LIST.filter((ex) => {
    const matchesCategory =
      selectedCategory === "All" || ex.category === selectedCategory;
    const matchesSearch =
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.primaryMuscle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <AppShell
      title="Exercise Catalog"
      subtitle="Calibrated biomechanical movements with real-time pose estimation and repetition verification."
    >
      <div className="space-y-6">
        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  selectedCategory === cat
                    ? "bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20"
                    : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="w-full sm:w-72 relative">
            <svg
              className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Filter by exercise or muscle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>
        </div>

        {/* Exercise Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.map((ex) => (
            <div
              key={ex.key}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-zinc-700 hover:shadow-2xl transition duration-200 group"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-inner group-hover:border-emerald-500/40 transition">
                      <ExerciseIcon exerciseKey={ex.key} />
                    </span>
                    <div>
                      <h2 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-emerald-400 transition-colors">
                        {ex.name}
                      </h2>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                        {ex.category}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                      ex.difficulty === "Beginner"
                        ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/60"
                        : ex.difficulty === "Intermediate"
                        ? "bg-amber-950/80 text-amber-400 border-amber-800/60"
                        : "bg-red-950/80 text-red-400 border-red-800/60"
                    }`}
                  >
                    {ex.difficulty}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-300 leading-relaxed mb-4">
                  {ex.description}
                </p>

                {/* Muscles Targeted */}
                <div className="space-y-2 mb-4 pt-3 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Primary:</span>
                    <span className="text-xs font-bold text-emerald-400">{ex.primaryMuscle}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ex.secondaryMuscles.map((m) => (
                      <span
                        key={m}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-950 text-zinc-400 border border-zinc-800 font-mono"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Biomechanical Coaching Cue */}
                <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-[11px] text-zinc-400 mb-6 flex items-start gap-2">
                  <span className="font-black text-emerald-400 text-xs">AI:</span>
                  <p className="leading-snug">{ex.tips}</p>
                </div>
              </div>

              {/* Action & Count Direction */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-3">
                  <span>Count trigger:</span>
                  <span className="text-zinc-300">On {ex.countDirection}</span>
                </div>

                <Link
                  href={`/workout?exercise=${ex.key}`}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <span>Start {ex.name}</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
