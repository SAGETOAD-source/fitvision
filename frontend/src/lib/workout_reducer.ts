/**
 * workout_reducer.ts
 *
 * Pure state reducer and action definitions for the live workout screen.
 * Manages UI states: loading, active, permission_denied, body_not_visible, error, stopped.
 */

import { ExerciseConfig, ModelData } from "./types";

export const VALID_EXERCISE_KEYS = [
  "squat",
  "pushup",
  "situp",
  "pullup",
  "jumpingjack",
  "latpulldown",
] as const;

export type ValidExerciseKey = (typeof VALID_EXERCISE_KEYS)[number];

export function isValidExerciseKey(key: string): key is ValidExerciseKey {
  return VALID_EXERCISE_KEYS.includes(key as ValidExerciseKey);
}

export type WorkoutStatus =
  | "loading"
  | "active"
  | "permission_denied"
  | "body_not_visible"
  | "error"
  | "stopped";

export interface WorkoutState {
  status: WorkoutStatus;
  exerciseKey: string;
  config: ExerciseConfig | null;
  model: ModelData | null;
  repCount: number;
  confirmedState: string;
  feedback: string | null;
  errorMessage: string;
}

export type WorkoutAction =
  | { type: "INIT_START"; exerciseKey: string }
  | { type: "CONFIG_LOADED"; config: ExerciseConfig; model: ModelData }
  | { type: "CAMERA_READY" }
  | { type: "PERMISSION_DENIED" }
  | { type: "ERROR"; message: string }
  | {
      type: "FRAME_UPDATE";
      bodyVisible: boolean;
      confirmedState?: string;
      repCount?: number;
      feedback?: string | null;
    }
  | { type: "STOP" }
  | { type: "RESET_REPS" };

export const initialWorkoutState = (exerciseKey: string): WorkoutState => ({
  status: "loading",
  exerciseKey: isValidExerciseKey(exerciseKey) ? exerciseKey : "squat",
  config: null,
  model: null,
  repCount: 0,
  confirmedState: "READY",
  feedback: null,
  errorMessage: "",
});

export function workoutReducer(
  state: WorkoutState,
  action: WorkoutAction
): WorkoutState {
  switch (action.type) {
    case "INIT_START":
      return {
        ...initialWorkoutState(action.exerciseKey),
        exerciseKey: isValidExerciseKey(action.exerciseKey)
          ? action.exerciseKey
          : "squat",
      };

    case "CONFIG_LOADED":
      return {
        ...state,
        config: action.config,
        model: action.model,
      };

    case "CAMERA_READY":
      return {
        ...state,
        status: "active",
      };

    case "PERMISSION_DENIED":
      return {
        ...state,
        status: "permission_denied",
      };

    case "ERROR":
      return {
        ...state,
        status: "error",
        errorMessage: action.message,
      };

    case "FRAME_UPDATE": {
      // If workout is stopped or in error/permission denied, ignore frame updates
      if (
        state.status === "stopped" ||
        state.status === "permission_denied" ||
        state.status === "error"
      ) {
        return state;
      }

      // If body is not visible, transition status to body_not_visible (while retaining active counts)
      const nextStatus: WorkoutStatus = action.bodyVisible
        ? "active"
        : "body_not_visible";

      return {
        ...state,
        status: nextStatus,
        confirmedState: action.confirmedState ?? state.confirmedState,
        repCount: action.repCount !== undefined ? action.repCount : state.repCount,
        feedback:
          action.feedback !== undefined ? action.feedback : state.feedback,
      };
    }

    case "STOP":
      return {
        ...state,
        status: "stopped",
      };

    case "RESET_REPS":
      return {
        ...state,
        repCount: 0,
        feedback: null,
        confirmedState: "READY",
      };

    default:
      return state;
  }
}

