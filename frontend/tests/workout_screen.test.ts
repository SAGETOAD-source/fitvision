/**
 * workout_screen.test.ts
 *
 * Pure unit tests for WorkoutScreen helper logic and lifecycle functions:
 * - Feedback coloring classifier (green positive vs amber warning)
 * - Body visibility detector
 * - Camera stream teardown cleanup
 *
 * Runs in standard node environment without requiring jsdom or new dependencies.
 */

import { describe, it, expect, vi } from "vitest";
import {
  getFeedbackVariant,
  isBodyVisible,
  stopMediaStream,
} from "../src/components/WorkoutScreen";
import { ExerciseConfig, NormalizedLandmark } from "../src/lib/types";

describe("WorkoutScreen Feedback Classification", () => {
  it("classifies positive messages as 'good' (green)", () => {
    expect(getFeedbackVariant("Good depth!")).toBe("good");
    expect(getFeedbackVariant("Great rep!")).toBe("good");
    expect(getFeedbackVariant("Rep counted")).toBe("good");
    expect(getFeedbackVariant("rep completed")).toBe("good");
  });

  it("classifies corrective form warnings as 'warning' (amber)", () => {
    expect(getFeedbackVariant("Go lower next time")).toBe("warning");
    expect(getFeedbackVariant("Avoid leaning back")).toBe("warning");
    expect(getFeedbackVariant("Keep your back straight")).toBe("warning");
    expect(getFeedbackVariant("Move knees outward")).toBe("warning");
  });

  it("returns 'neutral' for empty or null feedback", () => {
    expect(getFeedbackVariant(null)).toBe("neutral");
    expect(getFeedbackVariant("")).toBe("neutral");
  });
});

describe("WorkoutScreen Body Visibility Detection", () => {
  const squatConfig: ExerciseConfig = {
    display_name: "Squat",
    signals: {
      left: {
        points: ["LEFT_HIP", "LEFT_KNEE", "LEFT_ANKLE"],
        feature_name: "left_knee_angle",
      },
      right: {
        points: ["RIGHT_HIP", "RIGHT_KNEE", "RIGHT_ANKLE"],
        feature_name: "right_knee_angle",
      },
    },
    down_state: "squat_down",
    up_states: ["squat_up"],
    count_on: "up",
    primary_signal: "left",
    min_valid_range: 40,
    visibility_threshold: 0.3,
  };

  it("returns false when landmarks are null or empty", () => {
    expect(isBodyVisible(null, squatConfig)).toBe(false);
    expect(isBodyVisible([], squatConfig)).toBe(false);
    expect(isBodyVisible(undefined, squatConfig)).toBe(false);
  });

  it("returns false when config is null", () => {
    const landmarks: NormalizedLandmark[] = new Array(33).fill({
      x: 0.5,
      y: 0.5,
      visibility: 0.9,
    });
    expect(isBodyVisible(landmarks, null)).toBe(false);
  });

  it("returns true when all required landmarks are visible", () => {
    const landmarks: NormalizedLandmark[] = new Array(33).fill(null).map(() => ({
      x: 0.5,
      y: 0.5,
      visibility: 0.9,
    }));
    expect(isBodyVisible(landmarks, squatConfig)).toBe(true);
  });

  it("returns false when a required landmark falls below visibility threshold", () => {
    const landmarks: NormalizedLandmark[] = new Array(33).fill(null).map(() => ({
      x: 0.5,
      y: 0.5,
      visibility: 0.9,
    }));
    // LEFT_KNEE = 25
    landmarks[25] = { x: 0.5, y: 0.5, visibility: 0.1 }; // Below 0.3
    expect(isBodyVisible(landmarks, squatConfig)).toBe(false);
  });
});

describe("WorkoutScreen Camera Stream Teardown", () => {
  it("stops all tracks when stopping a MediaStream", () => {
    const stopTrack1 = vi.fn();
    const stopTrack2 = vi.fn();

    const mockStream = {
      getTracks: () => [
        { stop: stopTrack1, kind: "video" },
        { stop: stopTrack2, kind: "audio" },
      ],
    } as unknown as MediaStream;

    stopMediaStream(mockStream);

    expect(stopTrack1).toHaveBeenCalledTimes(1);
    expect(stopTrack2).toHaveBeenCalledTimes(1);
  });

  it("handles null stream gracefully without error", () => {
    expect(() => stopMediaStream(null)).not.toThrow();
  });
});
