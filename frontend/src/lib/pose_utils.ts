/**
 * pose_utils.ts
 *
 * MediaPipe landmark geometry and angle computation ported from src/pose_utils.py.
 */

import { ExerciseConfig, NormalizedLandmark, LandmarkPoint } from "./types";

export const POSE_LANDMARKS: Record<string, number> = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

/**
 * Computes 2D angle at point b between line segments (b->a) and (b->c).
 * Range: [0, 180] degrees.
 */
export function calculateAngle(
  a: LandmarkPoint,
  b: LandmarkPoint,
  c: LandmarkPoint
): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360.0 - angle;
  }
  return angle;
}

export function midpoint(p1: LandmarkPoint, p2: LandmarkPoint): LandmarkPoint {
  return {
    x: (p1.x + p2.x) / 2.0,
    y: (p1.y + p2.y) / 2.0,
  };
}

/**
 * Angle at hip between (hip->shoulder) and (hip->straight-up).
 * 0 when upright, increases as torso tilts.
 */
export function verticalLeanAngle(
  shoulder: LandmarkPoint,
  hip: LandmarkPoint
): number {
  const verticalReference: LandmarkPoint = { x: hip.x, y: hip.y - 0.1 };
  return calculateAngle(shoulder, hip, verticalReference);
}

/**
 * Extracts all angles/signals configured in exerciseConfig.signals and extra_signals.
 * Returns null if any required landmark falls below visibility_threshold.
 */
export function extractSignals(
  landmarks: NormalizedLandmark[],
  exerciseConfig: ExerciseConfig
): Record<string, number> | null {
  const combinedCfg: Record<string, any> = {
    ...exerciseConfig.signals,
    ...(exerciseConfig.extra_signals || {}),
  };
  const visibilityThreshold = exerciseConfig.visibility_threshold ?? 0.3;

  // Collect all distinct landmark IDs
  const neededNames = new Set<string>();
  for (const sig of Object.values(combinedCfg)) {
    for (const pointRef of sig.points) {
      if (pointRef !== "MID_HIP") {
        neededNames.add(pointRef);
      }
    }
  }

  const points: Record<string, LandmarkPoint> = {};
  for (const name of neededNames) {
    const idx = POSE_LANDMARKS[name];
    if (idx === undefined || !landmarks[idx]) {
      return null;
    }
    const lm = landmarks[idx];
    if (lm.visibility !== undefined && lm.visibility < visibilityThreshold) {
      return null;
    }
    points[name] = { x: lm.x, y: lm.y };
  }

  // Calculate MID_HIP if needed
  const needsMidHip = Object.values(combinedCfg).some((sig) =>
    sig.points.includes("MID_HIP")
  );
  if (needsMidHip) {
    if (!points["LEFT_HIP"] || !points["RIGHT_HIP"]) {
      return null;
    }
    points["MID_HIP"] = midpoint(points["LEFT_HIP"], points["RIGHT_HIP"]);
  }

  const results: Record<string, number> = {};

  for (const [signalName, sig] of Object.entries(combinedCfg)) {
    const sigType = sig.type || "angle";

    if (sigType === "angle") {
      const [aRef, bRef, cRef] = sig.points;
      if (!points[aRef] || !points[bRef] || !points[cRef]) return null;
      results[signalName] = calculateAngle(points[aRef], points[bRef], points[cRef]);
    } else if (sigType === "lean") {
      const [shoulderRef, hipRef] = sig.points;
      if (!points[shoulderRef] || !points[hipRef]) return null;
      results[signalName] = verticalLeanAngle(points[shoulderRef], points[hipRef]);
    } else if (sigType === "lean_avg") {
      const [lShoulderRef, lHipRef, rShoulderRef, rHipRef] = sig.points;
      if (
        !points[lShoulderRef] ||
        !points[lHipRef] ||
        !points[rShoulderRef] ||
        !points[rHipRef]
      ) {
        return null;
      }
      const leftVal = verticalLeanAngle(points[lShoulderRef], points[lHipRef]);
      const rightVal = verticalLeanAngle(points[rShoulderRef], points[rHipRef]);
      results[signalName] = (leftVal + rightVal) / 2.0;
    } else {
      throw new Error(`Unknown signal type '${sigType}' for signal '${signalName}'`);
    }
  }

  return results;
}

/**
 * Builds the ordered 1D feature array expected by the model.
 * Matches insertion order of exerciseConfig.signals.
 */
export function buildFeatureVector(
  signals: Record<string, number>,
  exerciseConfig: ExerciseConfig
): number[] {
  const features: number[] = [];
  for (const signalName of Object.keys(exerciseConfig.signals)) {
    if (signals[signalName] === undefined) {
      throw new Error(`Missing required signal '${signalName}'`);
    }
    features.push(signals[signalName]);
  }
  return features;
}

