import { describe, expect, it } from 'vitest';
import {
  calculateInteriorKneeAngle,
  solveTwoSegmentPlanarIK,
  evaluateSquatTrajectory,
  Y_HIP_STAND,
  Z_HIP_STAND,
  Y_HIP_BOTTOM,
  Z_HIP_BOTTOM,
} from '../src/components/motion-lab/joint_math';

describe('joint_math - calculateInteriorKneeAngle', () => {
  it('calculates 180° for a perfectly straight collinear leg', () => {
    const hip: [number, number, number] = [0, 1.0, 0];
    const knee: [number, number, number] = [0, 0.5, 0];
    const ankle: [number, number, number] = [0, 0.0, 0];

    const angle = calculateInteriorKneeAngle(hip, knee, ankle);
    expect(angle).toBeCloseTo(180.0, 2);
  });

  it('calculates 90° for an orthogonal right angle', () => {
    const hip = { x: 0, y: 1.0, z: 0 };
    const knee = { x: 0, y: 0.0, z: 0 };
    const ankle = { x: 0, y: 0.0, z: 1.0 };

    const angle = calculateInteriorKneeAngle(hip, knee, ankle);
    expect(angle).toBeCloseTo(90.0, 2);
  });

  it('calculates 45° for an acute angle', () => {
    const hip = { x: 0, y: 1.0, z: 0 };
    const knee = { x: 0, y: 0.0, z: 0 };
    const ankle = { x: 0, y: 1.0, z: 1.0 }; // 45° between (0,1,0) and (0,1,1)

    const angle = calculateInteriorKneeAngle(hip, knee, ankle);
    expect(angle).toBeCloseTo(45.0, 2);
  });

  it('calculates 0° for collinear overlapping rays', () => {
    const hip = { x: 0, y: 1.0, z: 0 };
    const knee = { x: 0, y: 0.0, z: 0 };
    const ankle = { x: 0, y: 2.0, z: 0 };

    const angle = calculateInteriorKneeAngle(hip, knee, ankle);
    expect(angle).toBeCloseTo(0.0, 2);
  });

  it('safely handles degenerate zero-length vectors without crashing or NaN', () => {
    const hip = { x: 0, y: 0, z: 0 };
    const knee = { x: 0, y: 0, z: 0 }; // knee coincident with hip
    const ankle = { x: 0, y: 0, z: 1 };

    const angle = calculateInteriorKneeAngle(hip, knee, ankle);
    expect(angle).toBe(180.0);
    expect(Number.isFinite(angle)).toBe(true);
  });

  it('clamps numerical floating-point inaccuracies to valid cosine domain', () => {
    const hip = { x: 0, y: 0.44, z: 0 };
    const knee = { x: 0, y: 0, z: 0 };
    const ankle = { x: 0, y: -0.42, z: 0 };

    const angle = calculateInteriorKneeAngle(hip, knee, ankle);
    expect(angle).toBeCloseTo(180.0, 4);
    expect(Number.isFinite(angle)).toBe(true);
  });
});

describe('joint_math - solveTwoSegmentPlanarIK Singularity & Reach', () => {
  const L1 = 0.44; // Thigh length (m)
  const L2 = 0.42; // Shank length (m)
  const ya = 0.08;
  const za = 0.0;

  it('solves near-singular extension (D = 0.8599m) with valid, finite solution and forward flexion', () => {
    const D = 0.8599; // 0.1mm below collinear limit 0.86m
    const yh = ya + D;
    const zh = za;

    const ik = solveTwoSegmentPlanarIK(yh, zh, ya, za, L1, L2);
    expect(ik.valid).toBe(true);
    expect(ik.isSingular).toBe(false);
    expect(Number.isFinite(ik.kneeY)).toBe(true);
    expect(Number.isFinite(ik.kneeZ)).toBe(true);
    expect(ik.kneeZ).toBeGreaterThan(za); // Strict forward branch (+z)
    expect(ik.actualThighLength).toBeCloseTo(L1, 4);
    expect(ik.actualShankLength).toBeCloseTo(L2, 4);

    const angle = calculateInteriorKneeAngle([0, yh, zh], [0, ik.kneeY, ik.kneeZ], [0, ya, za]);
    expect(Number.isFinite(angle)).toBe(true);
    expect(angle).toBeCloseTo(178.25, 1);
  });

  it('explicitly identifies exact singular collinear 180° configuration (D = 0.86m)', () => {
    const D = L1 + L2; // Exactly 0.8600m
    const yh = ya + D;
    const zh = za;

    const ik = solveTwoSegmentPlanarIK(yh, zh, ya, za, L1, L2);
    expect(ik.valid).toBe(true);
    expect(ik.isSingular).toBe(true);
    expect(Number.isFinite(ik.kneeY)).toBe(true);
    expect(Number.isFinite(ik.kneeZ)).toBe(true);

    // Exact collinear coordinates: knee positioned precisely at distance L2 along ray
    expect(ik.kneeY).toBeCloseTo(ya + L2, 6);
    expect(ik.kneeZ).toBeCloseTo(za, 6);
    expect(ik.actualThighLength).toBeCloseTo(L1, 6);
    expect(ik.actualShankLength).toBeCloseTo(L2, 6);

    const angle = calculateInteriorKneeAngle([0, yh, zh], [0, ik.kneeY, ik.kneeZ], [0, ya, za]);
    expect(Number.isFinite(angle)).toBe(true);
    // Verified exact collinear 180° configuration, not a clamped approximation
    expect(angle).toBeCloseTo(180.0, 4);
  });

  it('explicitly rejects over-extension (D = 0.90m) with valid: false, finite coordinates, and true geometric distances', () => {
    const D = 0.90; // Over-extension beyond 0.86m
    const yh = ya + D;
    const zh = za;

    const ik = solveTwoSegmentPlanarIK(yh, zh, ya, za, L1, L2);
    expect(ik.valid).toBe(false);
    expect(ik.isSingular).toBe(true);
    expect(Number.isFinite(ik.kneeY)).toBe(true);
    expect(Number.isFinite(ik.kneeZ)).toBe(true);
    expect(Number.isFinite(ik.actualThighLength)).toBe(true);
    expect(Number.isFinite(ik.actualShankLength)).toBe(true);

    // Returned lengths must equal true geometric Euclidean distances from returned coordinates
    const trueThighDistance = Math.hypot(yh - ik.kneeY, zh - ik.kneeZ);
    const trueShankDistance = Math.hypot(ik.kneeY - ya, ik.kneeZ - za);
    expect(ik.actualThighLength).toBeCloseTo(trueThighDistance, 6);
    expect(ik.actualShankLength).toBeCloseTo(trueShankDistance, 6);

    // Specifically: clamped knee at ya + L2 = 0.50m yields 0.48m thigh distance and 0.42m shank distance
    expect(ik.actualThighLength).toBeCloseTo(0.48, 4);
    expect(ik.actualShankLength).toBeCloseTo(0.42, 4);
  });

  it('explicitly rejects under-extension collapse (D = 0.01m) with valid: false, finite coordinates, and true geometric distances', () => {
    const D = 0.01; // Below minReach |L1 - L2| = 0.02m
    const yh = ya + D;
    const zh = za;

    const ik = solveTwoSegmentPlanarIK(yh, zh, ya, za, L1, L2);
    expect(ik.valid).toBe(false);
    expect(ik.isSingular).toBe(true);
    expect(Number.isFinite(ik.kneeY)).toBe(true);
    expect(Number.isFinite(ik.kneeZ)).toBe(true);
    expect(Number.isFinite(ik.actualThighLength)).toBe(true);
    expect(Number.isFinite(ik.actualShankLength)).toBe(true);

    // Returned lengths must equal true geometric Euclidean distances from returned coordinates
    const trueThighDistance = Math.hypot(yh - ik.kneeY, zh - ik.kneeZ);
    const trueShankDistance = Math.hypot(ik.kneeY - ya, ik.kneeZ - za);
    expect(ik.actualThighLength).toBeCloseTo(trueThighDistance, 6);
    expect(ik.actualShankLength).toBeCloseTo(trueShankDistance, 6);

    // Clamped knee at ya + L2 = 0.50m yields |0.09 - 0.50| = 0.41m thigh distance and 0.42m shank distance
    expect(ik.actualThighLength).toBeCloseTo(0.41, 4);
    expect(ik.actualShankLength).toBeCloseTo(0.42, 4);
  });
});

describe('joint_math - Standing and Bottom Postures', () => {
  const L1 = 0.44;
  const L2 = 0.42;

  it('solves reconciled standing posture (yh = 0.9331m) yielding 165.5° knee angle', () => {
    const yh = Y_HIP_STAND;
    const zh = Z_HIP_STAND;
    const ya = 0.08;
    const za = 0.0;

    const ik = solveTwoSegmentPlanarIK(yh, zh, ya, za, L1, L2);
    expect(ik.valid).toBe(true);
    expect(ik.isSingular).toBe(false);
    expect(ik.kneeY).toBeCloseTo(0.4965, 3);
    expect(ik.kneeZ).toBeCloseTo(0.0543, 3); // 5.43 cm forward knee offset
    expect(ik.kneeZ).toBeGreaterThan(za);

    const angle = calculateInteriorKneeAngle([0, yh, zh], [0, ik.kneeY, ik.kneeZ], [0, ya, za]);
    expect(angle).toBeCloseTo(165.5, 1);
  });

  it('documents historical posture (yh = 0.92m) yielding 155.2° knee angle', () => {
    const yh = 0.92;
    const zh = 0.0;
    const ya = 0.08;
    const za = 0.0;

    const ik = solveTwoSegmentPlanarIK(yh, zh, ya, za, L1, L2);
    expect(ik.valid).toBe(true);
    const angle = calculateInteriorKneeAngle([0, yh, zh], [0, ik.kneeY, ik.kneeZ], [0, ya, za]);
    expect(angle).toBeCloseTo(155.2, 1);
  });

  it('solves squat bottom depth (yh = 0.54m, zh = -0.16m) preserving 68.9° angle', () => {
    const yh = Y_HIP_BOTTOM;
    const zh = Z_HIP_BOTTOM;
    const ya = 0.08;
    const za = 0.0;

    const ik = solveTwoSegmentPlanarIK(yh, zh, ya, za, L1, L2);
    expect(ik.valid).toBe(true);
    expect(ik.kneeZ).toBeGreaterThan(0.2); // Forward knee travel ~0.26m

    const angle = calculateInteriorKneeAngle([0, yh, zh], [0, ik.kneeY, ik.kneeZ], [0, ya, za]);
    expect(angle).toBeCloseTo(68.9, 1);
  });
});

describe('joint_math - C1 Velocity Continuity and Trajectory Finiteness', () => {
  const L1 = 0.44;
  const L2 = 0.42;
  const ya = 0.08;
  const za = 0.0;

  it('verifies C1 velocity continuity across all five phase boundaries', () => {
    const h = 0.005; // 5ms finite-difference sampling interval
    const eps = 1e-4; // 0.1ms boundary offset
    const boundaries = [1.0, 3.0, 4.0, 6.0, 7.0]; // Phase 1->2, 2->3, 3->4, 4->5, 5->1

    for (const tb of boundaries) {
      // Left side of boundary
      const pL1 = evaluateSquatTrajectory(tb - eps - h);
      const pL2 = evaluateSquatTrajectory(tb - eps);
      const vy_L = (pL2.yHip - pL1.yHip) / h;
      const vz_L = (pL2.zHip - pL1.zHip) / h;

      const ikL1 = solveTwoSegmentPlanarIK(pL1.yHip, pL1.zHip, ya, za, L1, L2);
      const ikL2 = solveTwoSegmentPlanarIK(pL2.yHip, pL2.zHip, ya, za, L1, L2);
      const vyk_L = (ikL2.kneeY - ikL1.kneeY) / h;
      const vzk_L = (ikL2.kneeZ - ikL1.kneeZ) / h;

      const angleL1 = calculateInteriorKneeAngle([0, pL1.yHip, pL1.zHip], [0, ikL1.kneeY, ikL1.kneeZ], [0, ya, za]);
      const angleL2 = calculateInteriorKneeAngle([0, pL2.yHip, pL2.zHip], [0, ikL2.kneeY, ikL2.kneeZ], [0, ya, za]);
      const omega_L = (angleL2 - angleL1) / h;

      // Right side of boundary
      const pR1 = evaluateSquatTrajectory(tb + eps);
      const pR2 = evaluateSquatTrajectory(tb + eps + h);
      const vy_R = (pR2.yHip - pR1.yHip) / h;
      const vz_R = (pR2.zHip - pR1.zHip) / h;

      const ikR1 = solveTwoSegmentPlanarIK(pR1.yHip, pR1.zHip, ya, za, L1, L2);
      const ikR2 = solveTwoSegmentPlanarIK(pR2.yHip, pR2.zHip, ya, za, L1, L2);
      const vyk_R = (ikR2.kneeY - ikR1.kneeY) / h;
      const vzk_R = (ikR2.kneeZ - ikR1.kneeZ) / h;

      const angleR1 = calculateInteriorKneeAngle([0, pR1.yHip, pR1.zHip], [0, ikR1.kneeY, ikR1.kneeZ], [0, ya, za]);
      const angleR2 = calculateInteriorKneeAngle([0, pR2.yHip, pR2.zHip], [0, ikR2.kneeY, ikR2.kneeZ], [0, ya, za]);
      const omega_R = (angleR2 - angleR1) / h;

      // Strict finiteness assertions
      expect(Number.isFinite(vy_L)).toBe(true);
      expect(Number.isFinite(vy_R)).toBe(true);
      expect(Number.isFinite(vz_L)).toBe(true);
      expect(Number.isFinite(vz_R)).toBe(true);
      expect(Number.isFinite(vyk_L)).toBe(true);
      expect(Number.isFinite(vyk_R)).toBe(true);
      expect(Number.isFinite(vzk_L)).toBe(true);
      expect(Number.isFinite(vzk_R)).toBe(true);
      expect(Number.isFinite(omega_L)).toBe(true);
      expect(Number.isFinite(omega_R)).toBe(true);

      // C1 velocity continuity comparisons: difference must be below specified tolerance
      const diff_vy = Math.abs(vy_R - vy_L);
      const diff_vz = Math.abs(vz_R - vz_L);
      const diff_vyk = Math.abs(vyk_R - vyk_L);
      const diff_vzk = Math.abs(vzk_R - vzk_L);
      const diff_omega = Math.abs(omega_R - omega_L);

      expect(diff_vy).toBeLessThan(0.005);   // < 5 mm/s linear velocity tolerance
      expect(diff_vz).toBeLessThan(0.005);
      expect(diff_vyk).toBeLessThan(0.005);
      expect(diff_vzk).toBeLessThan(0.005);
      expect(diff_omega).toBeLessThan(0.5);  // < 0.5 deg/s angular velocity tolerance
    }
  });

  it('guarantees finite coordinates, positive forward knee, and bounded angles across 350-step trajectory', () => {
    const totalSteps = 350; // 20ms steps over 7.0s cycle
    let prevKneeZ = -1;

    for (let i = 0; i <= totalSteps; i++) {
      const t = (i / totalSteps) * 7.0;
      const point = evaluateSquatTrajectory(t);

      expect(Number.isFinite(point.yHip)).toBe(true);
      expect(Number.isFinite(point.zHip)).toBe(true);
      expect(Number.isFinite(point.progress)).toBe(true);

      const ik = solveTwoSegmentPlanarIK(point.yHip, point.zHip, ya, za, L1, L2);
      expect(ik.valid).toBe(true);
      expect(Number.isFinite(ik.kneeY)).toBe(true);
      expect(Number.isFinite(ik.kneeZ)).toBe(true);
      expect(ik.kneeZ).toBeGreaterThan(0); // Forward knee branch strictly maintained

      const angle = calculateInteriorKneeAngle([0, point.yHip, point.zHip], [0, ik.kneeY, ik.kneeZ], [0, ya, za]);
      expect(Number.isFinite(angle)).toBe(true);
      expect(angle).toBeGreaterThanOrEqual(68.8);
      expect(angle).toBeLessThanOrEqual(165.6);

      if (i > 0) {
        expect(Math.abs(ik.kneeZ - prevKneeZ)).toBeLessThan(0.01);
      }
      prevKneeZ = ik.kneeZ;
    }
  });
});
