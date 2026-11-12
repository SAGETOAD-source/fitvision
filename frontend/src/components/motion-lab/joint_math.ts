/**
 * Vector and Biomechanical Joint Angle Mathematics
 *
 * Implements pure vector mathematics for calculating interior joint angles
 * and 2-segment analytical planar inverse kinematics (IK) for the
 * procedural squat mannequin.
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type PointInput = Point3D | [number, number, number];

function toPoint3D(p: PointInput): Point3D {
  if (Array.isArray(p)) {
    return { x: p[0], y: p[1], z: p[2] };
  }
  return p;
}

/**
 * Calculates the interior angle (in degrees) formed at a vertex (knee) by two rays
 * originating from the vertex:
 *   u = hip - knee
 *   v = ankle - knee
 *
 * Full extension (straight line) returns ~180°.
 * As the joint flexes (bends), the interior angle decreases.
 *
 * Safe against zero-length vectors (returns 180°) and numerical floating-point
 * domain errors outside [-1.0, 1.0].
 */
export function calculateInteriorKneeAngle(
  hipInput: PointInput,
  kneeInput: PointInput,
  ankleInput: PointInput
): number {
  const hip = toPoint3D(hipInput);
  const knee = toPoint3D(kneeInput);
  const ankle = toPoint3D(ankleInput);

  // Vectors originating at the knee
  const ux = hip.x - knee.x;
  const uy = hip.y - knee.y;
  const uz = hip.z - knee.z;

  const vx = ankle.x - knee.x;
  const vy = ankle.y - knee.y;
  const vz = ankle.z - knee.z;

  const lenU = Math.sqrt(ux * ux + uy * uy + uz * uz);
  const lenV = Math.sqrt(vx * vx + vy * vy + vz * vz);

  // Degenerate zero-length vector protection
  if (lenU < 1e-6 || lenV < 1e-6) {
    return 180.0;
  }

  // Dot product
  const dot = ux * vx + uy * vy + uz * vz;
  const cosAngle = dot / (lenU * lenV);

  // Numerical clamp to strict [-1.0, 1.0] domain
  const clampedCos = Math.max(-1.0, Math.min(1.0, cosAngle));

  // Convert radians to degrees
  return Math.acos(clampedCos) * (180.0 / Math.PI);
}

export interface IKSolution {
  kneeY: number;
  kneeZ: number;
  actualThighLength: number;
  actualShankLength: number;
  valid: boolean;
  isSingular: boolean;
}

/**
 * Smooth cubic ease-in-out profile ensuring zero first-derivative (velocity)
 * at progression start (t=0) and end (t=1).
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export interface SquatTrajectoryPoint {
  yHip: number;
  zHip: number;
  progress: number; // 0 = standing lockout, 1 = bottom parallel depth
  phaseName: string;
}

// Biomechanical trajectory endpoints (in meters)
export const Y_HIP_STAND = 0.9331;
export const Z_HIP_STAND = 0.0;
export const Y_HIP_BOTTOM = 0.54;
export const Z_HIP_BOTTOM = -0.16;

/**
 * Pure evaluation function for the 5-phase parametric squat cycle (7.0s total cycle).
 * Ensures C0 positional continuity and C1 velocity continuity across all 5 phase boundaries.
 */
export function evaluateSquatTrajectory(t: number): SquatTrajectoryPoint {
  const cycleTime = ((t % 7.0) + 7.0) % 7.0;
  let progress = 0;
  let phaseName = 'Phase 1: Standing Base';

  if (cycleTime < 1.0) {
    // Phase 1: Standing Base (1.0s)
    progress = 0;
    phaseName = 'Phase 1: Standing Base';
  } else if (cycleTime < 3.0) {
    // Phase 2: Controlled Descent (2.0s)
    const norm = (cycleTime - 1.0) / 2.0;
    progress = easeInOutCubic(norm);
    phaseName = 'Phase 2: Controlled Descent';
  } else if (cycleTime < 4.0) {
    // Phase 3: Parallel Depth (1.0s)
    progress = 1.0;
    phaseName = 'Phase 3: Parallel Depth';
  } else if (cycleTime < 6.0) {
    // Phase 4: Concentric Ascent (2.0s)
    const norm = (cycleTime - 4.0) / 2.0;
    progress = 1.0 - easeInOutCubic(norm);
    phaseName = 'Phase 4: Concentric Ascent';
  } else {
    // Phase 5: Lockout Pause (1.0s)
    progress = 0;
    phaseName = 'Phase 5: Lockout Pause';
  }

  const yHip = Y_HIP_STAND - progress * (Y_HIP_STAND - Y_HIP_BOTTOM);
  const zHip = Z_HIP_STAND + progress * Z_HIP_BOTTOM;

  return { yHip, zHip, progress, phaseName };
}

/**
 * 2-Segment Analytical Planar Inverse Kinematics in the Sagittal Plane (Y-Z).
 *
 * Given fixed ankle (ya, za) and moving hip (yh, zh), computes the exact
 * knee position (yk, zk) that preserves constant thigh length L1 (femur)
 * and shank length L2 (tibia).
 *
 * Boundary and singularity specifications:
 * - Non-singular / near-singular (|L1 - L2| < D < L1 + L2): computes unique forward-bending
 *   knee (+z) with valid = true, isSingular = false.
 * - Exact singular (D = L1 + L2): explicitly identifies the collinear 180° extension configuration,
 *   positioning the knee directly along the line connecting ankle to hip (valid = true, isSingular = true).
 * - Beyond reach (D > L1 + L2 or D < |L1 - L2|): explicitly rejected with valid = false, isSingular = true,
 *   returning safe clamped boundary coordinates to prevent NaN or division by zero.
 */
export function solveTwoSegmentPlanarIK(
  yh: number,
  zh: number,
  ya: number,
  za: number,
  L1: number,
  L2: number
): IKSolution {
  const dy = yh - ya;
  const dz = zh - za;
  const D = Math.sqrt(dy * dy + dz * dz);

  const eps = 1e-6;
  const maxReach = L1 + L2;
  const minReach = Math.abs(L1 - L2);

  // 1. Beyond reach (over-extension): D > L1 + L2
  if (D > maxReach + eps) {
    const uy = dy / D;
    const uz = dz / D;
    const kneeY = ya + L2 * uy;
    const kneeZ = za + L2 * uz;
    return {
      kneeY,
      kneeZ,
      actualThighLength: Math.sqrt((yh - kneeY) ** 2 + (zh - kneeZ) ** 2),
      actualShankLength: Math.sqrt((kneeY - ya) ** 2 + (kneeZ - za) ** 2),
      valid: false,
      isSingular: true,
    };
  }

  // 2. Beyond reach (under-extension / self-intersection collapse): D < |L1 - L2|
  if (D < minReach - eps) {
    const uy = D > eps ? dy / D : 1;
    const uz = D > eps ? dz / D : 0;
    const kneeY = ya + L2 * uy;
    const kneeZ = za + L2 * uz;
    return {
      kneeY,
      kneeZ,
      actualThighLength: Math.sqrt((yh - kneeY) ** 2 + (zh - kneeZ) ** 2),
      actualShankLength: Math.sqrt((kneeY - ya) ** 2 + (kneeZ - za) ** 2),
      valid: false,
      isSingular: true,
    };
  }

  // 3. Exact Collinear Singularity: D = L1 + L2 (straight leg, exactly 180°)
  if (Math.abs(D - maxReach) <= eps) {
    const uy = dy / D;
    const uz = dz / D;
    return {
      kneeY: ya + L2 * uy,
      kneeZ: za + L2 * uz,
      actualThighLength: L1,
      actualShankLength: L2,
      valid: true,
      isSingular: true,
    };
  }

  // 4. General Triangulated Solution (including valid near-singular configurations)
  // Distance from ankle along line toward hip to projection of knee
  const da = (D * D + L2 * L2 - L1 * L1) / (2 * D);

  // Perpendicular height of knee from line
  const h = Math.sqrt(Math.max(0, L2 * L2 - da * da));

  // Unit vector along ankle -> hip
  const uy = dy / D;
  const uz = dz / D;

  // Normal vector pointing forward (+z). Since dy > 0 (hip is above ankle),
  // normal [-uz, uy] has positive z component (+uy > 0), locking the forward branch.
  const ny = -uz;
  const nz = uy;

  const kneeY = ya + da * uy + h * ny;
  const kneeZ = za + da * uz + h * nz;

  const actualShankLength = Math.sqrt((kneeY - ya) ** 2 + (kneeZ - za) ** 2);
  const actualThighLength = Math.sqrt((yh - kneeY) ** 2 + (zh - kneeZ) ** 2);

  return {
    kneeY,
    kneeZ,
    actualThighLength,
    actualShankLength,
    valid: true,
    isSingular: false,
  };
}
