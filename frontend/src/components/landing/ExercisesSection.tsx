import React from "react";
import Image from "next/image";
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
  visualType: "photo" | "pullup-diagram" | "latpulldown-diagram" | "none";
  imageSrc?: string;
  imageAlt?: string;
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
    visualType: "photo",
    imageSrc: "/images/editorial/exercise-squat.png",
    imageAlt:
      "Female athlete performing a parallel bodyweight squat in a dark performance studio",
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
    visualType: "none",
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
    visualType: "none",
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
    visualType: "pullup-diagram",
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
    visualType: "none",
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
    visualType: "latpulldown-diagram",
  },
];

// Compile-time check that every configured exercise key is represented
const _assertValidKeys: readonly ValidExerciseKey[] = VALID_EXERCISE_KEYS;
void _assertValidKeys;

function BiomechanicalPlate({
  variant,
}: {
  variant: "pullup-diagram" | "latpulldown-diagram";
}) {
  if (variant === "pullup-diagram") {
    return (
      <svg
        viewBox="0 0 480 200"
        className="w-full h-full object-contain"
        aria-hidden="true"
      >
        {/* Subtle studio grid */}
        <g className="text-white/5" stroke="currentColor" strokeWidth="1">
          <line x1="0" y1="40" x2="480" y2="40" />
          <line x1="0" y1="100" x2="480" y2="100" />
          <line x1="0" y1="160" x2="480" y2="160" />
          <line x1="160" y1="0" x2="160" y2="200" />
          <line x1="320" y1="0" x2="320" y2="200" />
        </g>

        {/* Overhead pull-up bar */}
        <line
          x1="210"
          y1="34"
          x2="430"
          y2="34"
          className="text-white/50"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Kinematic stick figure silhouette (chin-over-bar pull phase) */}
        <g
          className="text-white/80"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          {/* Head */}
          <circle cx="320" cy="48" r="12" className="fill-surface-elevated" />
          {/* Torso */}
          <line x1="320" y1="62" x2="320" y2="124" />
          {/* Shoulders */}
          <line x1="288" y1="74" x2="352" y2="74" />
          {/* Left arm (gripping bar) */}
          <polyline points="288,74 268,94 274,34" />
          {/* Right arm (gripping bar) */}
          <polyline points="352,74 372,94 366,34" />
          {/* Lower body */}
          <polyline points="320,124 308,164 314,188" />
          <polyline points="320,124 332,164 326,188" />
        </g>

        {/* Tracked elbow flexion arcs */}
        <path
          d="M 277 82 A 14 14 0 0 1 284 68"
          className="text-accent"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeDasharray="3 3"
        />
        <path
          d="M 363 82 A 14 14 0 0 0 356 68"
          className="text-accent"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeDasharray="3 3"
        />

        {/* Highlighted MediaPipe tracked joint nodes */}
        <g className="text-accent" fill="currentColor">
          <circle cx="288" cy="74" r="5" />
          <circle cx="352" cy="74" r="5" />
          <circle cx="268" cy="94" r="5.5" />
          <circle cx="372" cy="94" r="5.5" />
          <circle cx="274" cy="34" r="4" />
          <circle cx="366" cy="34" r="4" />
        </g>

        {/* Telemetry callout tag */}
        <text
          x="394"
          y="96"
          className="fill-accent font-mono text-[10px] font-bold uppercase"
        >
          ELBOW ARC
        </text>
        <text
          x="394"
          y="110"
          className="fill-text-muted font-mono text-[9px] uppercase"
        >
          COUNT ON DOWN
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 420 200"
      className="w-full h-full object-contain"
      aria-hidden="true"
    >
      {/* Subtle studio grid */}
      <g className="text-white/5" stroke="currentColor" strokeWidth="1">
        <line x1="0" y1="40" x2="420" y2="40" />
        <line x1="0" y1="100" x2="420" y2="100" />
        <line x1="0" y1="160" x2="420" y2="160" />
        <line x1="140" y1="0" x2="140" y2="200" />
        <line x1="280" y1="0" x2="280" y2="200" />
      </g>

      {/* Vertical torso stability reference axis (18° ceiling guard) */}
      <line
        x1="280"
        y1="30"
        x2="280"
        y2="164"
        className="text-accent/50"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />

      {/* Pulldown cable & handle bar */}
      <line
        x1="280"
        y1="10"
        x2="280"
        y2="68"
        className="text-white/35"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="224"
        y1="68"
        x2="336"
        y2="68"
        className="text-white/65"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Seated upright athlete biomechanics */}
      <g
        className="text-white/80"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <circle cx="280" cy="48" r="11" className="fill-surface-elevated" />
        <line x1="280" y1="60" x2="280" y2="128" />
        <line x1="252" y1="76" x2="308" y2="76" />
        <polyline points="252,76 232,102 232,68" />
        <polyline points="308,76 328,102 328,68" />
        {/* Bench */}
        <line x1="246" y1="138" x2="314" y2="138" className="text-white/35" />
        <polyline points="280,128 260,152 260,182" />
        <polyline points="280,128 300,152 300,182" />
      </g>

      {/* Tracked joints */}
      <g className="text-accent" fill="currentColor">
        <circle cx="280" cy="76" r="4.5" />
        <circle cx="280" cy="128" r="4.5" />
        <circle cx="232" cy="102" r="5.5" />
        <circle cx="328" cy="102" r="5.5" />
      </g>

      <text
        x="342"
        y="88"
        className="fill-accent font-mono text-[10px] font-bold uppercase"
      >
        TORSO GUARD
      </text>
      <text
        x="342"
        y="102"
        className="fill-text-muted font-mono text-[9px] uppercase"
      >
        LEAN &lt;= 18°
      </text>
    </svg>
  );
}

export default function ExercisesSection() {
  return (
    <section
      className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-16 sm:py-24 scroll-mt-28 md:scroll-mt-32"
      id="exercises"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-6">
        <div className="space-y-3">
          <SectionLabel>Chapter 04 · Movement Library</SectionLabel>
          <div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white font-black uppercase tracking-tight fv-text-balance">
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
            {/* Visual Bento Header Panel: Real Editorial Photo or Precision Biomechanical Plate */}
            {ex.visualType !== "none" && (
              <div className="relative h-48 sm:h-56 w-full bg-surface border-b border-border-subtle overflow-hidden">
                {ex.visualType === "photo" && ex.imageSrc ? (
                  <Image
                    src={ex.imageSrc}
                    alt={ex.imageAlt || ex.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 66vw"
                    className="object-cover object-[center_22%] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                ) : (
                  <div className="relative w-full h-full bg-gradient-to-br from-surface-elevated via-surface to-bg-base flex items-center justify-center p-4">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-10 -top-10 w-44 h-44 rounded-full bg-brand/30 blur-3xl"
                    />
                    <BiomechanicalPlate
                      variant={
                        ex.visualType === "pullup-diagram"
                          ? "pullup-diagram"
                          : "latpulldown-diagram"
                      }
                    />
                  </div>
                )}

                {/* Dark gradient scrim for crisp caption readability (Spec section 7) */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-base/95 via-bg-base/35 to-transparent"
                />

                {/* Bottom-left editorial caption */}
                <div className="absolute bottom-3.5 left-4 right-4 z-10 flex items-end justify-between gap-3">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-accent font-bold">
                      {ex.category}
                    </span>
                    <span className="font-display text-xs sm:text-sm font-black uppercase tracking-wider text-white truncate">
                      {ex.measuredAngle}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 bg-bg-base/80 backdrop-blur-sm border border-border-subtle font-mono text-[10px] uppercase tracking-wider text-white/90 shrink-0">
                    {ex.badge}
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
