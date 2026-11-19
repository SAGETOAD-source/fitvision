/**
 * exercises_data.ts
 *
 * Client UI metadata for the 6 trained and supported FitVision exercises.
 * Strictly adheres to supported exercises: squat, pushup, situp, pullup, jumpingjack, latpulldown.
 */

export interface ExerciseMeta {
  key: string;
  name: string;
  category: "Lower Body" | "Upper Body" | "Core" | "Full Body";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  primaryMuscle: string;
  secondaryMuscles: string[];
  description: string;
  instructions: string[];
  tips: string;
  icon: string;
  color: string;
  countDirection: "up" | "down";
}

export const EXERCISES_META: Record<string, ExerciseMeta> = {
  squat: {
    key: "squat",
    name: "Squats",
    category: "Lower Body",
    difficulty: "Beginner",
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Glutes", "Hamstrings", "Core"],
    description: "Fundamental compound exercise building lower body power, hip mobility, and knee stability.",
    instructions: [
      "Stand with feet shoulder-width apart, chest upright.",
      "Hinge hips back and descend until thighs are at or below parallel.",
      "Drive through heels and return to fully standing position."
    ],
    tips: "Ensure full depth below 90° knee angle for rep confirmation.",
    icon: "🦵",
    color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
    countDirection: "up",
  },
  pushup: {
    key: "pushup",
    name: "Push-ups",
    category: "Upper Body",
    difficulty: "Beginner",
    primaryMuscle: "Chest (Pectorals)",
    secondaryMuscles: ["Triceps", "Anterior Deltoids", "Core"],
    description: "Classic bodyweight pressing movement for upper body chest strength and core stiffness.",
    instructions: [
      "Place hands slightly wider than shoulder-width in a solid high plank.",
      "Lower body until chest is close to the ground, keeping elbows at ~45°.",
      "Press through palms to lockout at the top."
    ],
    tips: "Maintain a straight spine from head to heels throughout the movement.",
    icon: "💪",
    color: "from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30",
    countDirection: "up",
  },
  situp: {
    key: "situp",
    name: "Sit-ups",
    category: "Core",
    difficulty: "Beginner",
    primaryMuscle: "Rectus Abdominis",
    secondaryMuscles: ["Hip Flexors", "Obliques"],
    description: "Core conditioning exercise targeting abdominal flexion and trunk stamina.",
    instructions: [
      "Lie on back with knees bent at ~90° and feet flat on the ground.",
      "Engage abdominal muscles to lift torso toward thighs.",
      "Lower back down under control to complete cycle."
    ],
    tips: "Count triggers upon returning to the down phase under control.",
    icon: "🧘",
    color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
    countDirection: "down",
  },
  pullup: {
    key: "pullup",
    name: "Pull-ups",
    category: "Upper Body",
    difficulty: "Advanced",
    primaryMuscle: "Latissimus Dorsi",
    secondaryMuscles: ["Biceps", "Rhomboids", "Core"],
    description: "Vertical pulling powerhouse that builds a wide V-taper and grip strength.",
    instructions: [
      "Grip bar with overhand grip slightly wider than shoulders.",
      "Pull elbows down toward hips until chin clearly clears the bar.",
      "Lower under control to full dead-hang extension."
    ],
    tips: "Achieve full dead-hang at bottom to reset the rep detection cycle.",
    icon: "🏋️",
    color: "from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30",
    countDirection: "down",
  },
  jumpingjack: {
    key: "jumpingjack",
    name: "Jumping Jacks",
    category: "Full Body",
    difficulty: "Beginner",
    primaryMuscle: "Cardiovascular System",
    secondaryMuscles: ["Calves", "Deltoids", "Adductors"],
    description: "High-cadence plyometric conditioning that boosts aerobic capacity and coordination.",
    instructions: [
      "Start standing straight with arms by your sides and feet together.",
      "Jump feet outward while sweeping arms overhead to touch.",
      "Jump feet back together and return arms to sides."
    ],
    tips: "Dual-signal verification checks both arm sweep and leg abduction.",
    icon: "⚡",
    color: "from-yellow-500/20 to-amber-500/20 text-yellow-400 border-yellow-500/30",
    countDirection: "down",
  },
  latpulldown: {
    key: "latpulldown",
    name: "Lat Pulldown",
    category: "Upper Body",
    difficulty: "Intermediate",
    primaryMuscle: "Latissimus Dorsi",
    secondaryMuscles: ["Biceps", "Rear Deltoids", "Teres Major"],
    description: "Controlled vertical traction exercise strengthening the back with posture monitoring.",
    instructions: [
      "Grip bar or band wide, sit tall with slight natural arch in lower back.",
      "Drive elbows downward to bring bar to upper chest level.",
      "Extend arms upward slowly under control."
    ],
    tips: "Avoid excessive torso lean back (>18°) to maintain correct posture feedback.",
    icon: "🎯",
    color: "from-rose-500/20 to-pink-500/20 text-rose-400 border-rose-500/30",
    countDirection: "down",
  },
};

export const EXERCISES_LIST = Object.values(EXERCISES_META);
