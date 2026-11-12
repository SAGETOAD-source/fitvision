import React from 'react';
import Link from 'next/link';
import { VALID_EXERCISE_KEYS, ValidExerciseKey } from '@/lib/workout_reducer';

interface ExerciseCardData {
  key: ValidExerciseKey;
  name: string;
  category: string;
  badge: string;
  description: string;
  formCue: string;
  measuredAngle: string;
}

const EXERCISES: ExerciseCardData[] = [
  {
    key: 'squat',
    name: 'Squat',
    category: 'Quads & Glutes',
    badge: 'Knee Tracking',
    description:
      'Drive hips down until thighs reach parallel with the floor, maintaining knee tracking over toes and an upright chest.',
    formCue: 'Parallel depth check',
    measuredAngle: 'Hip & Knee Flexion',
  },
  {
    key: 'pushup',
    name: 'Push-up',
    category: 'Chest & Core',
    badge: 'Chest Lockout',
    description:
      'Lower chest smoothly while maintaining a rigid core and neutral spine, finishing each rep with complete elbow lockout.',
    formCue: 'Full push lockout',
    measuredAngle: 'Elbow Flexion',
  },
  {
    key: 'situp',
    name: 'Sit-up',
    category: 'Abdominals',
    badge: 'Trunk Flexion',
    description:
      'Engage abdominal core to rise through full spinal flexion and lower with steady, controlled eccentric cadence.',
    formCue: 'Controlled trunk rise',
    measuredAngle: 'Hip & Torso Angle',
  },
  {
    key: 'pullup',
    name: 'Pull-up',
    category: 'Lats & Biceps',
    badge: 'Bar Clearance',
    description:
      'Pull vertically until chin clears the bar, descending smoothly to a complete dead-hang elbow extension.',
    formCue: 'Dead-hang to chin-over-bar',
    measuredAngle: 'Shoulder & Arm Extension',
  },
  {
    key: 'jumpingjack',
    name: 'Jumping Jack',
    category: 'Full Body Conditioning',
    badge: 'Coordination',
    description:
      'Perform synchronized lateral stride jumps with full overhead arm sweeps and tight rhythm matching.',
    formCue: 'Synchronous arm & leg reach',
    measuredAngle: 'Shoulder & Hip Stance',
  },
  {
    key: 'latpulldown',
    name: 'Lat Pulldown',
    category: 'Upper Back',
    badge: 'Torso Stability',
    description:
      'Drive elbows downward to activate lats while keeping torso steady without excessive backward leaning.',
    formCue: 'Scapular retraction & no lean',
    measuredAngle: 'Elbow Pull & Torso Lean',
  },
];

export default function ExercisesSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20" id="exercises">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-[#FF4D6D] font-bold mb-2">
            Movement Library
          </div>
          <h2 className="font-headline text-3xl sm:text-4xl text-white font-extrabold tracking-tight">
            Supported Exercises
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-neutral-300 max-w-md font-sans">
          Each movement is evaluated with dedicated biomechanical angle thresholds, multi-frame debounce gates, and local state classifiers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {EXERCISES.map((ex) => (
          <div
            key={ex.key}
            className="rounded-3xl bg-[#0B0B0C] card-border p-6 flex flex-col justify-between hover:border-[#FF4D6D]/40 transition-colors duration-200 group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] sm:text-xs font-mono px-3 py-1 rounded-full bg-[#1A1A1E] text-neutral-300 font-semibold border border-white/5">
                  {ex.badge}
                </span>
                <span className="text-[11px] font-mono font-bold text-[#FF4D6D] uppercase">
                  {ex.category}
                </span>
              </div>

              <h3 className="font-headline text-2xl text-white font-bold mb-2">
                {ex.name}
              </h3>

              <p className="text-xs text-neutral-300 leading-relaxed mb-6 font-sans">
                {ex.description}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5 border-t border-[#1A1A1E] pt-3 text-xs text-neutral-400 font-mono">
                <div className="flex justify-between">
                  <span>Target Cue:</span>
                  <span className="text-white font-medium">{ex.formCue}</span>
                </div>
                <div className="flex justify-between">
                  <span>Signal Tracked:</span>
                  <span className="text-white/70">{ex.measuredAngle}</span>
                </div>
              </div>

              <Link
                href={`/workout?exercise=${ex.key}`}
                className="w-full h-10 rounded-xl bg-[#131314] hover:bg-[#6D001A] text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 border border-[#1A1A1E] hover:border-[#FF4D6D]/40 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D6D]"
                aria-label={`Start ${ex.name} workout session`}
              >
                <span>START {ex.name.toUpperCase()}</span>
                <span className="text-sm">↗</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

