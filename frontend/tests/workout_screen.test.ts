/**
 * workout_screen.test.ts
 *
 * Tests for:
 * 1. workoutReducer state transitions (loading, active, permission_denied, body_not_visible, error, stopped)
 * 2. Exercise query parameter validation (valid keys vs fallback)
 * 3. Feedback color variant classifier
 * 4. Real cleanupWorkoutEngine teardown function from useWorkoutEngine hook
 *
 * Runs in standard Node environment without requiring jsdom or external mocking libraries.
 */

import { describe, it, expect, vi } from "vitest";
import {
  workoutReducer,
  initialWorkoutState,
  isValidExerciseKey,
  VALID_EXERCISE_KEYS,
} from "../src/lib/workout_reducer";
import { cleanupWorkoutEngine } from "../src/hooks/useWorkoutEngine";
import { getFeedbackVariant } from "../src/components/WorkoutScreen";
import { ExerciseConfig, ModelData } from "../src/lib/types";

describe("Workout Reducer State Transitions", () => {
  it("initial state defaults to loading for a valid exercise", () => {
    const state = initialWorkoutState("squat");
    expect(state.status).toBe("loading");
    expect(state.exerciseKey).toBe("squat");
    expect(state.repCount).toBe(0);
    expect(state.confirmedState).toBe("READY");
  });

  it("handles INIT_START and falls back to squat on invalid exercise key", () => {
    const state = initialWorkoutState("squat");
    const nextState = workoutReducer(state, {
      type: "INIT_START",
      exerciseKey: "invalid_exercise",
    });
    expect(nextState.status).toBe("loading");
    expect(nextState.exerciseKey).toBe("squat");
  });

  it("transitions CONFIG_LOADED by saving config and model", () => {
    const state = initialWorkoutState("squat");
    const dummyConfig = { display_name: "Squat" } as ExerciseConfig;
    const dummyModel = { classes: ["squat_down", "squat_up"] } as ModelData;

    const nextState = workoutReducer(state, {
      type: "CONFIG_LOADED",
      config: dummyConfig,
      model: dummyModel,
    });
    expect(nextState.config).toBe(dummyConfig);
    expect(nextState.model).toBe(dummyModel);
    expect(nextState.status).toBe("loading");
  });

  it("transitions to 'active' on CAMERA_READY", () => {
    const state = initialWorkoutState("squat");
    const activeState = workoutReducer(state, { type: "CAMERA_READY" });
    expect(activeState.status).toBe("active");
  });

  it("transitions to 'permission_denied' on PERMISSION_DENIED", () => {
    const state = initialWorkoutState("squat");
    const deniedState = workoutReducer(state, { type: "PERMISSION_DENIED" });
    expect(deniedState.status).toBe("permission_denied");
  });

  it("transitions to 'error' on ERROR with message", () => {
    const state = initialWorkoutState("squat");
    const errorState = workoutReducer(state, {
      type: "ERROR",
      message: "Camera device not found",
    });
    expect(errorState.status).toBe("error");
    expect(errorState.errorMessage).toBe("Camera device not found");
  });

  it("transitions to 'body_not_visible' when frame has no valid landmarks", () => {
    const activeState = {
      ...initialWorkoutState("squat"),
      status: "active" as const,
    };

    const notVisibleState = workoutReducer(activeState, {
      type: "FRAME_UPDATE",
      bodyVisible: false,
    });
    expect(notVisibleState.status).toBe("body_not_visible");
  });

  it("transitions back to 'active' and updates reps/feedback on valid frame", () => {
    const notVisibleState = {
      ...initialWorkoutState("squat"),
      status: "body_not_visible" as const,
    };

    const updatedState = workoutReducer(notVisibleState, {
      type: "FRAME_UPDATE",
      bodyVisible: true,
      confirmedState: "SQUAT_DOWN",
      repCount: 1,
      feedback: "Good depth!",
    });

    expect(updatedState.status).toBe("active");
    expect(updatedState.confirmedState).toBe("SQUAT_DOWN");
    expect(updatedState.repCount).toBe(1);
    expect(updatedState.feedback).toBe("Good depth!");
  });

  it("transitions to 'stopped' on STOP action (preserving final counts)", () => {
    const activeState = {
      ...initialWorkoutState("squat"),
      status: "active" as const,
      repCount: 12,
      confirmedState: "STANDING",
    };

    const stoppedState = workoutReducer(activeState, { type: "STOP" });
    expect(stoppedState.status).toBe("stopped");
    expect(stoppedState.repCount).toBe(12);
  });

  it("resets rep counts and feedback on RESET_REPS", () => {
    const activeState = {
      ...initialWorkoutState("squat"),
      status: "active" as const,
      repCount: 5,
      feedback: "Good depth!",
    };

    const resetState = workoutReducer(activeState, { type: "RESET_REPS" });
    expect(resetState.repCount).toBe(0);
    expect(resetState.feedback).toBeNull();
    expect(resetState.confirmedState).toBe("READY");
  });
});

describe("Exercise Query Validation", () => {
  it("validates all 6 configured exercises", () => {
    expect(VALID_EXERCISE_KEYS).toEqual([
      "squat",
      "pushup",
      "situp",
      "pullup",
      "jumpingjack",
      "latpulldown",
    ]);

    for (const key of VALID_EXERCISE_KEYS) {
      expect(isValidExerciseKey(key)).toBe(true);
    }
  });

  it("rejects invalid, unknown, or empty exercise keys", () => {
    expect(isValidExerciseKey("bicep_curl")).toBe(false);
    expect(isValidExerciseKey("bench_press")).toBe(false);
    expect(isValidExerciseKey("")).toBe(false);
    expect(isValidExerciseKey("SQUAT")).toBe(false); // keys are lowercase
    expect(isValidExerciseKey("random123")).toBe(false);
  });
});

describe("Feedback Classification Helper", () => {
  it("classifies positive feedback as good", () => {
    expect(getFeedbackVariant("Good depth!")).toBe("good");
    expect(getFeedbackVariant("Great rep!")).toBe("good");
    expect(getFeedbackVariant("Rep counted")).toBe("good");
  });

  it("classifies form warnings as warning", () => {
    expect(getFeedbackVariant("Go lower")).toBe("warning");
    expect(getFeedbackVariant("Avoid leaning back")).toBe("warning");
  });

  it("classifies null or empty as neutral", () => {
    expect(getFeedbackVariant(null)).toBe("neutral");
    expect(getFeedbackVariant("")).toBe("neutral");
  });
});

describe("Real cleanupWorkoutEngine Teardown", () => {
  it("calls the real cleanupWorkoutEngine with fake resources and executes all stops", () => {
    const stopTrack1 = vi.fn();
    const stopTrack2 = vi.fn();
    const releaseWakeLock = vi.fn();
    const cancelAnimFrame = vi.fn();

    const fakeStream = {
      getTracks: () => [
        { stop: stopTrack1 },
        { stop: stopTrack2 },
      ],
    };

    const fakeWakeLock = {
      release: releaseWakeLock,
    };

    const animId = 42;

    // Call the REAL exported function from useWorkoutEngine.ts
    cleanupWorkoutEngine(fakeStream, animId, fakeWakeLock, cancelAnimFrame);

    expect(cancelAnimFrame).toHaveBeenCalledWith(42);
    expect(stopTrack1).toHaveBeenCalledTimes(1);
    expect(stopTrack2).toHaveBeenCalledTimes(1);
    expect(releaseWakeLock).toHaveBeenCalledTimes(1);
  });

  it("handles null resources gracefully without throwing", () => {
    expect(() => cleanupWorkoutEngine(null, null, null, vi.fn())).not.toThrow();
  });
});
