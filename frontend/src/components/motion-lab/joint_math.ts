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
}

/**
 * 2-Segment Analytical Planar Inverse Kinematics in the Sagittal Plane (Y-Z).
 *
 * Given fixed ankle (ya, za) and moving hip (yh, zh), computes the exact
 * knee position (yk, zk) that preserves constant thigh length L1 (femur)
 * and shank length L2 (tibia).
 *
 * Enforces the forward-bending branch (+z knee direction) to maintain C0/C1
 * continuity and eliminate knee-flipping singularities throughout the squat cycle.
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
  let D = Math.sqrt(dy * dy + dz * dz);

  // Clamp D to reachable physical limits to prevent triangle inequality breakdown
  const maxReach = L1 + L2 - 1e-4;
  const minReach = Math.abs(L1 - L2) + 1e-4;
  const valid = D <= maxReach && D >= minReach;

  D = Math.max(minReach, Math.min(maxReach, D));

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
    valid,
  };
}
