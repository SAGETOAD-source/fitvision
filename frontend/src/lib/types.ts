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

