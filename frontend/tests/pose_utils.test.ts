/**
 * pose_utils.test.ts
 *
 * Unit tests for geometric angle calculations and signal extraction.
 */

import { describe, it, expect } from "vitest";
import {
  calculateAngle,
  verticalLeanAngle,
  midpoint,
  extractSignals,
  buildFeatureVector,
} from "../src/lib/pose_utils";
import { ExerciseConfig, NormalizedLandmark } from "../src/lib/types";

describe("Pose Utilities", () => {
  it("calculates 90-degree right angle", () => {
    const a = { x: 0, y: 1 };
    const b = { x: 0, y: 0 };
    const c = { x: 1, y: 0 };
    const angle = calculateAngle(a, b, c);
    expect(angle).toBeCloseTo(90.0, 3);
  });

  it("calculates 180-degree straight line angle", () => {
    const a = { x: -1, y: 0 };
    const b = { x: 0, y: 0 };
    const c = { x: 1, y: 0 };
    const angle = calculateAngle(a, b, c);
    expect(angle).toBeCloseTo(180.0, 3);
  });

  it("calculates 45-degree angle", () => {
    const a = { x: 1, y: 1 };
    const b = { x: 0, y: 0 };
    const c = { x: 1, y: 0 };
    const angle = calculateAngle(a, b, c);
    expect(angle).toBeCloseTo(45.0, 3);
  });

  it("computes midpoint correctly", () => {
    const p1 = { x: 2, y: 4 };
    const p2 = { x: 6, y: 8 };
    const mid = midpoint(p1, p2);
    expect(mid.x).toBe(4);
    expect(mid.y).toBe(6);
  });

  it("calculates vertical lean angle (0 deg when upright)", () => {
    const shoulder = { x: 0.5, y: 0.2 };
    const hip = { x: 0.5, y: 0.6 }; // directly below shoulder
    const lean = verticalLeanAngle(shoulder, hip);
    expect(lean).toBeCloseTo(0.0, 3);
  });

  it("extracts signals and builds feature vector for squat", () => {
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
      up_states: ["squat_up", "standing"],
      count_on: "up",
      primary_signal: "left",
      min_valid_range: 40,
      visibility_threshold: 0.3,
    };

    // Construct dummy landmark array (33 landmarks)
    const landmarks: NormalizedLandmark[] = new Array(33).fill(null).map(() => ({
      x: 0,
      y: 0,
      visibility: 0.9,
    }));

    // LEFT_HIP=23, LEFT_KNEE=25, LEFT_ANKLE=27
    landmarks[23] = { x: 0, y: 1, visibility: 0.9 };
    landmarks[25] = { x: 0, y: 0, visibility: 0.9 };
    landmarks[27] = { x: 1, y: 0, visibility: 0.9 };

    // RIGHT_HIP=24, RIGHT_KNEE=26, RIGHT_ANKLE=28
    landmarks[24] = { x: 0, y: 1, visibility: 0.9 };
    landmarks[26] = { x: 0, y: 0, visibility: 0.9 };
    landmarks[28] = { x: 1, y: 0, visibility: 0.9 };

    const signals = extractSignals(landmarks, squatConfig);
    expect(signals).not.toBeNull();
    expect(signals!["left"]).toBeCloseTo(90.0, 3);
    expect(signals!["right"]).toBeCloseTo(90.0, 3);

    const featVec = buildFeatureVector(signals!, squatConfig);
    expect(featVec).toHaveLength(2);
    expect(featVec[0]).toBeCloseTo(90.0, 3);
    expect(featVec[1]).toBeCloseTo(90.0, 3);
  });

  it("returns null if landmark visibility is below threshold", () => {
    const squatConfig: ExerciseConfig = {
      display_name: "Squat",
      signals: {
        left: {
          points: ["LEFT_HIP", "LEFT_KNEE", "LEFT_ANKLE"],
          feature_name: "left_knee_angle",
        },
      },
      down_state: "squat_down",
      up_states: ["squat_up"],
      count_on: "up",
      primary_signal: "left",
      min_valid_range: 40,
      visibility_threshold: 0.5,
    };

    const landmarks: NormalizedLandmark[] = new Array(33).fill(null).map(() => ({
      x: 0,
      y: 0,
      visibility: 0.9,
    }));
    landmarks[25] = { x: 0, y: 0, visibility: 0.2 }; // Left knee below threshold

    const signals = extractSignals(landmarks, squatConfig);
    expect(signals).toBeNull();
  });
});

