"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth_context";
import { apiClient, isApiError } from "@/lib/api/client";
import { BodyGoal, FocusArea, ProfileResponse, UpdateProfileRequest } from "@/lib/types";

const GOALS: Array<{
  id: BodyGoal;
  title: string;
  tagline: string;
  icon: React.ReactNode;
  recommended: string;
}> = [
  {
    id: "slim",
    title: "Lean & Agile",
    tagline: "High-cadence conditioning, core definition, and bodyweight endurance.",
    icon: (
      <svg className="w-6 h-6 fill-current text-emerald-400" viewBox="0 0 24 24">
        <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7z" />
      </svg>
    ),
    recommended: "Jumping Jacks, Push-ups & Sit-ups",
  },
  {
    id: "muscular",
    title: "Athletic Muscle",
    tagline: "Balanced functional hypertrophy across pressing, pulling, and squats.",
    icon: (
      <svg className="w-6 h-6 fill-current text-emerald-400" viewBox="0 0 24 24">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    recommended: "Squats, Pull-ups & Push-ups",
  },
  {
    id: "bulk",
    title: "Power & Volume",
    tagline: "Maximum compound strength, back thickness, and explosive reps.",
    icon: (
      <svg className="w-6 h-6 fill-current text-emerald-400" viewBox="0 0 24 24">
        <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" />
      </svg>
    ),
    recommended: "Squats, Pull-ups & Lat Pulldown",
  },
];

const FOCUS_AREAS: Array<{
  id: FocusArea;
  title: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    id: "legs",
    title: "Lower Body (Legs)",
    desc: "Quad drive, glute power, and hamstring flexibility via deep squat mechanics.",
    icon: (
      <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a2 2 0 100 4 2 2 0 000-4zM6 10l3 4-2 7M18 10l-3 4 2 7M9 14h6M9 9h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "upper_body",
    title: "Upper Body",
    desc: "Chest pressing, lat pulling, and shoulder stability tracking.",
    icon: (
      <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 18h16M7 14l5-4 5 4M12 4v6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "core",
    title: "Core & Stability",
    desc: "Abdominal endurance, trunk flexion, and midline resistance.",
    icon: (
      <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19h16M6 15l6-6 4 3 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { token } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedGoal, setSelectedGoal] = useState<BodyGoal>("muscular");
  const [selectedFocus, setSelectedFocus] = useState<FocusArea | null>("upper_body");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fetch profile if authenticated
  useEffect(() => {
    async function loadCurrentProfile() {
      if (!token) return;
      try {
        const profile = await apiClient.get<ProfileResponse>("/v1/profile");
        if (profile.body_goal) setSelectedGoal(profile.body_goal);
        if (profile.focus_area) setSelectedFocus(profile.focus_area);
      } catch {
        // Safe to ignore if no profile row yet
      }
    }
    loadCurrentProfile();
  }, [token]);

  const handleFinish = async () => {
    setIsSaving(true);
    setError(null);

    const payload: UpdateProfileRequest = {
      body_goal: selectedGoal,
      focus_area: selectedFocus,
    };

    try {
      await apiClient.put<ProfileResponse>("/v1/profile", payload);
      router.push("/dashboard");
    } catch (err: unknown) {
      if (isApiError(err)) {
        setError(err.detail || "Unable to save preferences. Please try again.");
      } else {
        setError("Network error. Please try again.");
      }
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans">
      {/* Top Header */}
      <header className="max-w-3xl w-full mx-auto flex items-center justify-between pb-6 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <span className="font-black text-lg tracking-tight text-white">FitVision Setup</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
          <span>Step {step} of 2</span>
          <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: step === 1 ? "50%" : "100%" }}
            />
          </div>
        </div>
      </header>

      {/* Main Wizard Form */}
      <main className="max-w-3xl w-full mx-auto my-auto py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* STEP 1: Body Goal */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                What is your primary body goal?
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 mt-2">
                This configures your target rep ranges, routine recommendations, and coaching focus.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              {GOALS.map((g) => {
                const isSelected = selectedGoal === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGoal(g.id)}
                    className={`text-left p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? "bg-emerald-950/40 border-emerald-500 shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-500"
                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                          {g.icon}
                        </span>
                        <span
                          className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                            isSelected
                              ? "bg-emerald-500 text-zinc-950 border-emerald-500"
                              : "border-zinc-700 text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      </div>
                      <h2 className="text-lg font-black text-white mb-1.5">{g.title}</h2>
                      <p className="text-xs text-zinc-400 leading-relaxed">{g.tagline}</p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-zinc-800/80">
                      <p className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-500 mb-1">
                        Recommended
                      </p>
                      <p className="text-xs font-bold text-emerald-400">{g.recommended}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Focus Area */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Select your emphasis area
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 mt-2">
                Choose a specific muscular zone or opt for full-body compound distribution.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              {FOCUS_AREAS.map((f) => {
                const isSelected = selectedFocus === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFocus(f.id)}
                    className={`text-left p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? "bg-emerald-950/40 border-emerald-500 shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-500"
                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                          {f.icon}
                        </span>
                        <span
                          className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                            isSelected
                              ? "bg-emerald-500 text-zinc-950 border-emerald-500"
                              : "border-zinc-700 text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      </div>
                      <h2 className="text-lg font-black text-white mb-1.5">{f.title}</h2>
                      <p className="text-xs text-zinc-400 leading-relaxed">{f.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Optional None / Full-body toggle */}
            <div className="pt-2 text-center sm:text-left">
              <button
                type="button"
                onClick={() => setSelectedFocus(null)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                  selectedFocus === null
                    ? "bg-zinc-800 text-emerald-400 border-emerald-500/50"
                    : "text-zinc-400 border-zinc-800 hover:text-white"
                }`}
              >
                No single focus — balanced full body
              </button>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-6 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-sm rounded-xl border border-zinc-800 transition"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={isSaving}
                className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-50 text-zinc-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    <span>Saving Preferences...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Setup</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-3xl w-full mx-auto pt-6 border-t border-zinc-800/80 text-center text-xs text-zinc-500">
        Preferences can be customized anytime from your Profile settings.
      </footer>
    </div>
  );
}
