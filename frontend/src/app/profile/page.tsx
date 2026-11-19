"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth/auth_context";
import { apiClient } from "@/lib/api/client";
import { BodyGoal, FocusArea, ProfileResponse, UpdateProfileRequest } from "@/lib/types";

const GOAL_OPTIONS: { id: BodyGoal; title: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: "slim",
    title: "Lean & Athletic",
    desc: "Burn fat, build high-stamina endurance, and tone lean muscle.",
    icon: (
      <svg className="w-5 h-5 fill-current text-emerald-400" viewBox="0 0 24 24">
        <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7z" />
      </svg>
    ),
  },
  {
    id: "muscular",
    title: "Muscle Definition",
    desc: "Sculpt balanced physique with progressive functional reps.",
    icon: (
      <svg className="w-5 h-5 fill-current text-emerald-400" viewBox="0 0 24 24">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    id: "bulk",
    title: "Hypertrophy & Strength",
    desc: "Build maximum muscle mass, raw power, and joint resilience.",
    icon: (
      <svg className="w-5 h-5 fill-current text-emerald-400" viewBox="0 0 24 24">
        <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" />
      </svg>
    ),
  },
];

const FOCUS_OPTIONS: { id: FocusArea | null; title: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: "legs",
    title: "Lower Body (Legs)",
    desc: "Target quads, glutes, and hamstrings with squats and jumps.",
    icon: (
      <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a2 2 0 100 4 2 2 0 000-4zM6 10l3 4-2 7M18 10l-3 4 2 7M9 14h6M9 9h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "upper_body",
    title: "Upper Body (Push/Pull)",
    desc: "Target chest, back, and shoulders with pushups and pullups.",
    icon: (
      <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 18h16M7 14l5-4 5 4M12 4v6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "core",
    title: "Core & Abs",
    desc: "Target abdominals, obliques, and lumbar stability.",
    icon: (
      <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19h16M6 15l6-6 4 3 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: null,
    title: "Full Body (Balanced)",
    desc: "No single focus — cycle through all major compound exercises.",
    icon: (
      <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3a2 2 0 100 4 2 2 0 000-4zM6 9l6 3 6-3M7 21l5-7 5 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();

  const [bodyGoal, setBodyGoal] = useState<BodyGoal>("muscular");
  const [focusArea, setFocusArea] = useState<FocusArea | null>("legs");
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/profile");
      return;
    }

    if (isAuthenticated) {
      fetchProfile();
    }
  }, [authLoading, isAuthenticated]);

  async function fetchProfile() {
    try {
      setProfileLoading(true);
      const res = await apiClient.get<ProfileResponse>("/v1/profile");
      if (res) {
        if (res.body_goal) setBodyGoal(res.body_goal);
        setFocusArea(res.focus_area);
      }
    } catch {
      // Profile may not exist yet if skipped onboarding, keep defaults
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);
    setSaving(true);

    try {
      const payload: UpdateProfileRequest = {
        body_goal: bodyGoal,
        focus_area: focusArea,
      };
      await apiClient.put<ProfileResponse>("/v1/profile", payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      const apiErr = err as { detail?: string; message?: string };
      setErrorMessage(apiErr.detail || apiErr.message || "Failed to update profile settings.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || (isAuthenticated && profileLoading)) {
    return (
      <AppShell title="Profile & Settings">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-400">Loading your profile details...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Profile & Settings">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Account Info Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-zinc-800">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-zinc-950 font-black text-2xl shadow-lg shadow-emerald-500/20">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">{user?.email}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-xs font-medium text-emerald-400">Active Member</span>
                  <span className="text-xs text-zinc-500">•</span>
                  <span className="text-xs text-zinc-400">
                    Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Recently"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="px-5 py-2.5 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 active:scale-95 text-sm font-semibold transition"
            >
              Sign Out
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Account ID</p>
              <p className="text-sm font-mono text-zinc-300 mt-1 truncate">{user?.id || "N/A"}</p>
            </div>
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Security Mode</p>
              <p className="text-sm font-semibold text-emerald-400 mt-1">In-Memory JWT</p>
            </div>
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Pose Engine</p>
              <p className="text-sm font-semibold text-zinc-300 mt-1">100% On-Device AI</p>
            </div>
          </div>
        </div>

        {/* Training Preferences Form */}
        <form onSubmit={handleSaveProfile} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-8">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Fitness Goals & Focus</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Personalize your recommended routines, target volume, and rep goals.
            </p>
          </div>

          {/* Body Goal Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Primary Body Goal
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {GOAL_OPTIONS.map((goal) => {
                const selected = bodyGoal === goal.id;
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setBodyGoal(goal.id)}
                    className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                      selected
                        ? "bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10"
                        : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div>
                      <div className="text-2xl mb-2">{goal.icon}</div>
                      <div className={`font-bold text-sm ${selected ? "text-emerald-400" : "text-white"}`}>
                        {goal.title}
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{goal.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Focus Area Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Target Muscle Focus Area
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {FOCUS_OPTIONS.map((focus) => {
                const selected = focusArea === focus.id;
                return (
                  <button
                    key={focus.id ?? "none"}
                    type="button"
                    onClick={() => setFocusArea(focus.id)}
                    className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                      selected
                        ? "bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10"
                        : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div>
                      <div className="text-2xl mb-2">{focus.icon}</div>
                      <div className={`font-bold text-sm ${selected ? "text-emerald-400" : "text-white"}`}>
                        {focus.title}
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{focus.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notifications / Alerts */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-sm">
              {errorMessage}
            </div>
          )}

          {saveSuccess && (
            <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-sm flex items-center gap-2">
              <span>✓</span>
              <span>Preferences saved successfully. Your recommendations have been updated.</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-zinc-400 hover:text-white transition"
            >
              ← Back to Dashboard
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Preferences</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
