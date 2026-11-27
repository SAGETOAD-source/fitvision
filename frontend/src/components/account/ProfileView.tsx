"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { usePageTransition } from "@/components/layout/PageTransition";
import { Button, Card, LoadingSpinner, SectionLabel } from "@/components/ui";
import { type BodyGoal, type FocusArea } from "@/lib/auth_contracts";

type FocusSelection = FocusArea | "balanced";

const GOAL_OPTIONS: ReadonlyArray<{
  value: BodyGoal;
  title: string;
  tag: string;
  summary: string;
}> = [
  {
    value: "slim",
    title: "Slim",
    tag: "Endurance & Conditioning",
    summary: "Higher-repetition circuits focused on sustained movement volume.",
  },
  {
    value: "muscular",
    title: "Muscular",
    tag: "Balanced Hypertrophy",
    summary: "Multi-set compound blocks across pushing, pulling, legs, and core.",
  },
  {
    value: "bulk",
    title: "Bulk",
    tag: "Compound Strength",
    summary: "Higher-set strength plans centered on controlled compound reps.",
  },
];

const FOCUS_OPTIONS: ReadonlyArray<{
  value: FocusSelection;
  title: string;
  tag: string;
}> = [
  { value: "legs", title: "Legs", tag: "Lower Body" },
  { value: "upper_body", title: "Upper Body", tag: "Push & Pull" },
  { value: "core", title: "Core", tag: "Trunk & Stability" },
  { value: "balanced", title: "Balanced", tag: "Full Body" },
];

export function ProfileView() {
  const router = useRouter();
  const { transitionPush, cancelTransition } = usePageTransition();
  const {
    user,
    profile,
    isLoading,
    error: authError,
    sessionExpired,
    updateProfile,
    logout,
    refresh,
  } = useAuth();

  const [bodyGoal, setBodyGoal] = useState<BodyGoal>("muscular");
  const [focusSelection, setFocusSelection] =
    useState<FocusSelection>("balanced");
  const [hydrated, setHydrated] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (sessionExpired) {
      router.replace("/login?next=%2Fprofile");
    }
  }, [sessionExpired, router]);

  useEffect(() => {
    if (!isLoading && profile && !hydrated) {
      if (profile.body_goal) setBodyGoal(profile.body_goal);
      setFocusSelection(profile.focus_area ?? "balanced");
      setHydrated(true);
    }
  }, [isLoading, profile, hydrated]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const focusArea: FocusArea | null =
        focusSelection === "balanced" ? null : focusSelection;
      const result = await updateProfile({
        body_goal: bodyGoal,
        focus_area: focusArea,
      });

      if (!result.success) {
        if (result.status === 401) {
          router.replace("/login?next=%2Fprofile");
          return;
        }
        setSaveError(result.error || "Could not save profile preferences.");
        return;
      }

      setSaveSuccess(true);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await transitionPush("/", {
        hardReload: true,
        onBeforeSwap: async () => {
          await logout();
        },
      });
    } catch {
      cancelTransition();
    } finally {
      setLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <section className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-24 flex justify-center">
        <LoadingSpinner label="Loading your profile..." showLabel />
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
              Profile Unavailable
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

  const joinedDate = user?.created_at
    ? user.created_at.slice(0, 10)
    : "—";

  return (
    <section
      data-testid="profile-view"
      className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16"
    >
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Heading */}
        <div className="space-y-3">
          <SectionLabel>Account & Goals</SectionLabel>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white">
              Profile Settings
            </h1>
            <div aria-hidden="true" className="w-14 h-1 bg-brand mt-4" />
          </div>
        </div>

        {/* Identity Card */}
        <Card
          variant="elevated"
          padding="lg"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-6"
        >
          <div className="space-y-1.5 min-w-0">
            <div className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent">
              Signed-In Account
            </div>
            <div
              data-testid="profile-email"
              className="font-display text-lg sm:text-xl font-black text-white break-all"
            >
              {user?.email}
            </div>
            <div className="font-mono text-xs text-text-muted">
              Member since {joinedDate} · Camera frames stay 100% on-device
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            loading={loggingOut}
            loadingText="Signing out"
            onClick={handleLogout}
            className="self-start sm:self-center shrink-0"
          >
            Log Out
          </Button>
        </Card>

        {/* Training Preferences Form */}
        <Card variant="default" padding="lg">
          <form onSubmit={handleSave} className="space-y-8">
            <div>
              <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">
                Training Preferences
              </h2>
              <p className="text-xs sm:text-sm text-text-muted mt-1 font-sans">
                Updating your body goal or focus area immediately refreshes your personalized workout routines.
              </p>
            </div>

            {/* Body Goal */}
            <div className="space-y-3">
              <span className="block font-mono text-xs font-bold uppercase tracking-widest text-accent">
                Body Goal
              </span>
              <div
                role="radiogroup"
                aria-label="Body goal"
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              >
                {GOAL_OPTIONS.map((opt) => {
                  const selected = bodyGoal === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      data-testid={`profile-goal-${opt.value}`}
                      onClick={() => {
                        setBodyGoal(opt.value);
                        setSaveSuccess(false);
                      }}
                      className={`fv-btn-interactive text-left rounded-2xl p-4 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer space-y-2 ${
                        selected
                          ? "bg-brand/25 border-accent text-white"
                          : "bg-surface-elevated border-border-subtle text-white hover:border-white/40"
                      }`}
                    >
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
                        {opt.tag}
                      </div>
                      <div className="font-display text-base font-black uppercase text-white">
                        {opt.title}
                      </div>
                      <p className="text-xs text-text-muted font-sans leading-relaxed">
                        {opt.summary}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Focus Area */}
            <div className="space-y-3">
              <span className="block font-mono text-xs font-bold uppercase tracking-widest text-accent">
                Focus Area
              </span>
              <div
                role="radiogroup"
                aria-label="Focus area"
                className="grid grid-cols-2 sm:grid-cols-4 gap-3"
              >
                {FOCUS_OPTIONS.map((opt) => {
                  const selected = focusSelection === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      data-testid={`profile-focus-${opt.value}`}
                      onClick={() => {
                        setFocusSelection(opt.value);
                        setSaveSuccess(false);
                      }}
                      className={`fv-btn-interactive text-left rounded-2xl p-4 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer space-y-1 ${
                        selected
                          ? "bg-brand/25 border-accent text-white"
                          : "bg-surface-elevated border-border-subtle text-white hover:border-white/40"
                      }`}
                    >
                      <div className="font-mono text-[10px] uppercase tracking-wider text-accent">
                        {opt.tag}
                      </div>
                      <div className="font-display text-sm font-black uppercase text-white">
                        {opt.title}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {saveError && (
              <div
                role="alert"
                className="p-4 rounded-2xl bg-brand/25 border border-accent text-sm text-white font-sans"
              >
                {saveError}
              </div>
            )}

            {saveSuccess && (
              <div
                role="status"
                data-testid="profile-save-success"
                className="p-4 rounded-2xl bg-surface-elevated border border-accent/60 text-sm text-white font-sans flex items-center gap-2.5"
              >
                <svg
                  className="w-4 h-4 text-accent shrink-0"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 8.5L6.5 12L13 4.5"
                  />
                </svg>
                <span>
                  Preferences saved. Your routine recommendations have been updated.
                </span>
              </div>
            )}

            <div className="pt-4 border-t border-border-subtle flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="ghost" size="sm" href="/dashboard">
                  Dashboard
                </Button>
                <Button variant="ghost" size="sm" href="/routines">
                  View Routine
                </Button>
              </div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={saving}
                loadingText="Saving"
              >
                Save Preferences
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </section>
  );
}

export default ProfileView;
