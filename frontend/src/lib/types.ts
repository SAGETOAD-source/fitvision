/**
 * types.ts
 *
 * Core TypeScript definitions for FitVision frontend:
 * - ModelData and TreeData for in-browser Random Forest evaluation
 * - API schemas matching GET /v1/exercises
 * - Landmark and signal types for pose extraction
 */

export interface TreeData {
  children_left: number[];
  children_right: number[];
  feature: number[];
  threshold: number[];
  value: number[][]; // normalized class probability distribution per node
}

export interface ModelData {
  classes: string[];
  n_features: number;
  trees: TreeData[];
}

export interface SignalConfig {
  points: string[];
  feature_name: string;
  type?: "angle" | "lean" | "lean_avg";
}

export interface ExtraSignalConfig {
  points: string[];
  type?: "angle" | "lean" | "lean_avg";
}

export interface FormWarningCheck {
  ceiling: number;
  message: string;
}

export interface ExerciseConfig {
  display_name: string;
  signals: Record<string, SignalConfig>;
  extra_signals?: Record<string, ExtraSignalConfig>;
  down_state: string;
  up_states: string[];
  count_on: "up" | "down";
  primary_signal: string;
  min_valid_range: number;
  good_depth_threshold?: number | null;
  extra_range_checks?: Record<string, number>;
  form_warnings?: Record<string, FormWarningCheck>;
  visibility_threshold: number;
  rotate_frame?: string | null;
}

export interface ExercisesApiResponse {
  exercises: Record<string, ExerciseConfig>;
}

export interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface LandmarkPoint {
  x: number;
  y: number;
}

// --- Auth Schemas (matching Backend/app/models/schemas.py) ---

export interface UserPublic {
  id: number;
  email: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
}

// --- Profile & Onboarding ---

export type BodyGoal = "slim" | "muscular" | "bulk";
export type FocusArea = "legs" | "upper_body" | "core";

export interface ProfileResponse {
  body_goal: BodyGoal | null;
  focus_area: FocusArea | null;
  onboarding_completed: boolean;
}

export interface UpdateProfileRequest {
  body_goal: BodyGoal;
  focus_area?: FocusArea | null;
}

// --- Routines ---

export interface RoutineExercise {
  exercise: string;
  sets: number;
  reps: number;
}

export interface RoutineResponse {
  goal: string;
  focus: string | null;
  exercises: RoutineExercise[];
}

// --- Workouts & History ---

export interface CreateWorkoutRequest {
  exercise: string;
  rep_count: number;
  started_at: string;
  ended_at: string;
}

export interface WorkoutResponse {
  id: number;
  session_id: string;
  exercise: string;
  rep_count: number;
  started_at: string;
  ended_at: string;
}

export interface WorkoutListResponse {
  workouts: WorkoutResponse[];
  total: number;
  limit: number;
  offset: number;
}

// --- Statistics ---

export interface DailyReps {
  date: string;
  reps: number;
}

export interface StatsResponse {
  total_workouts: number;
  total_reps: number;
  reps_per_exercise: Record<string, number>;
  current_streak_days: number;
  reps_last_7_days: DailyReps[];
}
