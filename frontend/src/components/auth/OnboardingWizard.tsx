"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
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
    summary:
      "Higher-repetition circuits designed around sustained cadence and full-body movement volume.",
  },
  {
    value: "muscular",
    title: "Muscular",
    tag: "Balanced Hypertrophy",
    summary:
      "Structured multi-set blocks across compound pulling, pushing, lower-body, and core exercises.",
  },
  {
    value: "bulk",
    title: "Bulk",
    tag: "Compound Strength",
    summary:
      "Higher-set strength plans centered on controlled lower-rep compound repetitions.",
  },
];

const FOCUS_OPTIONS: ReadonlyArray<{
  value: FocusSelection;
  title: string;
  tag: string;
  summary: string;
}> = [
  {
    value: "legs",
    title: "Legs",
    tag: "Lower Body",
    summary: "Prioritizes squat volume paired with conditioning work.",
  },
  {
    value: "upper_body",
    title: "Upper Body",
    tag: "Push & Pull",
    summary: "Focuses on push-ups, pull-ups, and lat pulldown volume.",
  },
  {
    value: "core",
    title: "Core",
    tag: "Trunk & Stability",
    summary: "Centers on sit-up sets supported by compound movements.",
  },
  {
    value: "balanced",
    title: "Balanced",
    tag: "Full Body",
    summary: "Even distribution across upper body, lower body, and core.",
  },
];

export function OnboardingWizard() {
  const router = useRouter();
  const {
    user,
    profile,
    isLoading,
    error: authError,
    sessionExpired,
    updateProfile,
    refresh,
  } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedGoal, setSelectedGoal] = useState<BodyGoal | null>(null);
  const [selectedFocus, setSelectedFocus] = useState<FocusSelection>("balanced");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pre-populate if returning to update preferences
  useEffect(() => {
    if (profile?.body_goal && selectedGoal === null) {
      setSelectedGoal(profile.body_goal);
      setSelectedFocus(profile.focus_area ?? "balanced");
    }
  }, [profile, selectedGoal]);

  // Redirect ONLY on confirmed session expiry (never on backend 5xx/unreachable)
  useEffect(() => {
    if (sessionExpired) {
      router.replace("/login?next=%2Fonboarding");
    }
  }, [sessionExpired, router]);

  const handleSave = async () => {
    if (!selectedGoal) {
      setStep(1);
      return;
    }

    setSubmitError(null);
    setSaving(true);
    try {
      const focusArea: FocusArea | null =
        selectedFocus === "balanced" ? null : selectedFocus;
      const result = await updateProfile({
        body_goal: selectedGoal,
        focus_area: focusArea,
      });

      if (!result.success) {
        if (result.status === 401) {
          router.replace("/login?next=%2Fonboarding");
          return;
        }
        setSubmitError(
          result.error || "Could not save your preferences. Please try again."
        );
        return;
      }

      router.push("/routines");
      router.refresh();
    } finally {
      setSaving(false);
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
              Server Unavailable
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

  const progressPercent = step === 1 ? 50 : 100;

  return (
    <section className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-20">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header & Step Progress */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionLabel>Training Setup</SectionLabel>
            <span
              data-testid="onboarding-step-indicator"
              className="font-mono text-xs font-bold uppercase tracking-widest text-text-muted"
            >
              Step {step} of 2
            </span>
          </div>

          <div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white">
              {step === 1
                ? "Select Your Body Goal"
                : "Choose Your Focus Area"}
            </h1>
            <div aria-hidden="true" className="w-14 h-1 bg-brand mt-4" />
          </div>

          <p className="text-sm sm:text-base text-text-muted font-sans leading-relaxed max-w-2xl">
            {step === 1
              ? "Your goal determines recommended sets and repetition targets across FitVision's 6 tracked exercises."
              : "Target one region or choose Balanced for a full-body exercise plan."}
          </p>

          {/* Thin Burgundy Step Progress Bar */}
          <div
            className="w-full h-1 bg-border-subtle overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="h-full bg-brand transition-all duration-300 motion-reduce:transition-none"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {submitError && (
          <div
            role="alert"
            data-testid="onboarding-error"
            className="p-4 rounded-2xl bg-brand/25 border border-accent/60 text-sm text-white font-sans"
          >
            {submitError}
          </div>
        )}

        {/* Step 1: Goal Selection */}
        {step === 1 ? (
          <div className="space-y-8">
            <div
              role="radiogroup"
              aria-label="Body goal"
              className="grid grid-cols-1 md:grid-cols-3 gap-5"
            >
              {GOAL_OPTIONS.map((option) => {
                const isSelected = selectedGoal === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    data-testid={`goal-option-${option.value}`}
                    onClick={() => setSelectedGoal(option.value)}
                    className={`text-left rounded-3xl p-6 border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer flex flex-col justify-between gap-4 ${
                      isSelected
                        ? "bg-brand/25 border-accent text-white"
                        : "bg-surface-elevated border-border-subtle text-white hover:border-white/40"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent">
                          {option.tag}
                        </span>
                        <span
                          aria-hidden="true"
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? "border-accent bg-accent" : "border-white/30"
                          }`}
                        />
                      </div>
                      <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">
                        {option.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-text-muted font-sans leading-relaxed">
                        {option.summary}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <span className="font-mono text-xs text-text-muted">
                {selectedGoal
                  ? `Selected: ${selectedGoal.toUpperCase()}`
                  : "Pick one goal to continue."}
              </span>
              <Button
                variant="primary"
                size="md"
                disabled={!selectedGoal}
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            </div>
          </div>
        ) : (
          /* Step 2: Focus Area Selection */
          <div className="space-y-8">
            <div
              role="radiogroup"
              aria-label="Focus area"
              className="grid grid-cols-1 sm:grid-cols-2 gap-5"
            >
              {FOCUS_OPTIONS.map((option) => {
                const isSelected = selectedFocus === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    data-testid={`focus-option-${option.value}`}
                    onClick={() => setSelectedFocus(option.value)}
                    className={`text-left rounded-3xl p-6 border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? "bg-brand/25 border-accent text-white"
                        : "bg-surface-elevated border-border-subtle text-white hover:border-white/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent">
                        {option.tag}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? "border-accent bg-accent" : "border-white/30"
                        }`}
                      />
                    </div>
                    <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">
                      {option.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-text-muted font-sans leading-relaxed">
                      {option.summary}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setStep(1)}
                disabled={saving}
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="md"
                loading={saving}
                loadingText="Saving plan"
                onClick={handleSave}
              >
                Save & View Routine
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default OnboardingWizard;
