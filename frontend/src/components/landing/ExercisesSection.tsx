import React from "react";
import { VALID_EXERCISE_KEYS, type ValidExerciseKey } from "@/lib/workout_reducer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";

interface ExerciseCardData {
  key: ValidExerciseKey;
  name: string;
  category: string;
  badge: string;
  description: string;
  formCue: string;
  measuredAngle: string;
  bentoSpan: string;
  hasVisualPlaceholder: boolean;
  placeholderNote?: string;
}

const EXERCISES: ExerciseCardData[] = [
  {
    key: "squat",
    name: "Squat",
    category: "Quads & Glutes",
    badge: "Knee Tracking",
    description:
      "Drive hips down until thighs reach parallel with the floor, maintaining knee tracking over toes and an upright chest.",
    formCue: "Parallel depth check",
    measuredAngle: "Hip & Knee Flexion",
    bentoSpan: "md:col-span-4",
    hasVisualPlaceholder: true,
    placeholderNote: "TODO: Approved female athlete squat photo (women-only asset)",
  },
  {
    key: "pushup",
    name: "Push-up",
    category: "Chest & Core",
    badge: "Chest Lockout",
    description:
      "Lower chest smoothly while maintaining a rigid core and neutral spine, finishing each rep with complete elbow lockout.",
    formCue: "Full push lockout",
    measuredAngle: "Elbow Flexion",
    bentoSpan: "md:col-span-2",
    hasVisualPlaceholder: false,
  },
  {
    key: "situp",
    name: "Sit-up",
    category: "Abdominals",
    badge: "Trunk Flexion",
    description:
      "Engage abdominal core to rise through full spinal flexion and lower with steady, controlled eccentric cadence.",
    formCue: "Controlled trunk rise",
    measuredAngle: "Hip & Torso Angle",
    bentoSpan: "md:col-span-2",
    hasVisualPlaceholder: false,
  },
  {
    key: "pullup",
    name: "Pull-up",
    category: "Lats & Biceps",
    badge: "Bar Clearance",
    description:
      "Pull vertically until chin clears the bar, descending smoothly to a complete dead-hang elbow extension.",
    formCue: "Dead-hang to chin-over-bar",
    measuredAngle: "Shoulder & Arm Extension",
    bentoSpan: "md:col-span-4",
    hasVisualPlaceholder: true,
    placeholderNote: "TODO: Approved female athlete pull-up photo (women-only asset)",
  },
  {
    key: "jumpingjack",
    name: "Jumping Jack",
    category: "Full Body Conditioning",
    badge: "Coordination",
    description:
      "Perform synchronized lateral stride jumps with full overhead arm sweeps and tight rhythm matching.",
    formCue: "Synchronous arm & leg reach",
    measuredAngle: "Shoulder & Hip Stance",
    bentoSpan: "md:col-span-3",
    hasVisualPlaceholder: false,
  },
  {
    key: "latpulldown",
    name: "Lat Pulldown",
    category: "Upper Back",
    badge: "Torso Stability",
    description:
      "Drive elbows downward to activate lats while keeping torso steady without excessive backward leaning.",
    formCue: "Scapular retraction & no lean",
    measuredAngle: "Elbow Pull & Torso Lean",
    bentoSpan: "md:col-span-3",
    hasVisualPlaceholder: true,
    placeholderNote: "TODO: Approved female athlete lat pulldown photo (women-only asset)",
  },
];

// Compile-time check that every configured exercise key is represented
const _assertValidKeys: readonly ValidExerciseKey[] = VALID_EXERCISE_KEYS;
void _assertValidKeys;

export default function ExercisesSection() {
  return (
    <section
      className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-16 sm:py-24"
      id="exercises"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-6">
        <div className="space-y-3">
          <SectionLabel>Movement Library</SectionLabel>
          <div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white font-black uppercase tracking-tight">
              Supported Exercises
            </h2>
            <div aria-hidden="true" className="w-14 h-1 bg-brand mt-4" />
          </div>
        </div>
        <p className="text-xs sm:text-sm text-text-muted max-w-md font-sans leading-relaxed">
          Each movement is evaluated with dedicated biomechanical angle thresholds, multi-frame debounce gates, and local state classifiers.
        </p>
      </div>

      {/* Asymmetric Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        {EXERCISES.map((ex) => (
          <Card
            key={ex.key}
            variant="interactive"
            padding="none"
            className={`${ex.bentoSpan} overflow-hidden flex flex-col justify-between group`}
          >
            {/* Optional Photo Placeholder Bento Panel with Bottom-Left Caption & Dark Scrim */}
            {ex.hasVisualPlaceholder && (
              <div className="relative h-44 sm:h-52 w-full bg-gradient-to-br from-surface-container via-surface to-bg-base border-b border-border-subtle overflow-hidden">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-10 -top-10 w-44 h-44 rounded-full bg-brand/30 blur-3xl"
                />
                {/* Top-right TODO asset tag */}
                <div className="absolute top-3.5 right-3.5 px-2.5 py-1 bg-bg-base/80 border border-border-subtle font-mono text-[10px] uppercase tracking-wider text-text-muted">
                  TODO: PHOTO
                </div>
                {/* Dark gradient scrim for caption readability */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-base/95 via-bg-base/40 to-transparent"
                />
                {/* Bottom-left caption */}
                <div className="absolute bottom-3.5 left-4 right-4 z-10 flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-accent font-bold">
                    {ex.category}
                  </span>
                  <span className="font-mono text-[11px] text-text-muted/90 truncate">
                    {ex.placeholderNote}
                  </span>
                </div>
              </div>
            )}

            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <span className="text-[10px] sm:text-xs font-mono px-3 py-1 rounded-full bg-surface border border-border-subtle text-text-muted font-semibold">
                    {ex.badge}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-accent uppercase tracking-wider">
                    {ex.category}
                  </span>
                </div>

                <h3 className="font-display text-xl sm:text-2xl text-white font-black uppercase tracking-tight mb-2">
                  {ex.name}
                </h3>

                <p className="text-xs sm:text-sm text-text-muted leading-relaxed mb-6 font-sans">
                  {ex.description}
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5 border-t border-border-subtle pt-3.5 text-xs text-text-muted font-mono">
                  <div className="flex justify-between gap-3">
                    <span>Target Cue:</span>
                    <span className="text-white font-medium text-right">{ex.formCue}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Signal Tracked:</span>
                    <span className="text-white/80 text-right">{ex.measuredAngle}</span>
                  </div>
                </div>

                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    href={`/workout?exercise=${ex.key}`}
                  >
                    START {ex.name.toUpperCase()}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
