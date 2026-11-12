import { describe, expect, it } from 'vitest';
import {
  calculateInteriorKneeAngle,
  solveTwoSegmentPlanarIK,
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
    expect(Number.isNaN(angle)).toBe(false);
  });

  it('clamps numerical floating-point inaccuracies to valid cosine domain', () => {
    // Normal vectors that might produce 1.0000000000000002
    const hip = { x: 0, y: 0.44, z: 0 };
    const knee = { x: 0, y: 0, z: 0 };
    const ankle = { x: 0, y: -0.42, z: 0 };

    const angle = calculateInteriorKneeAngle(hip, knee, ankle);
    expect(angle).toBeCloseTo(180.0, 4);
    expect(Number.isNaN(angle)).toBe(false);
  });
});

describe('joint_math - solveTwoSegmentPlanarIK', () => {
  const L1 = 0.44; // Thigh length (m)
  const L2 = 0.42; // Shank length (m)

  it('solves reconciled standing posture (yh = 0.9331m) with 165.5° knee angle and forward flexion', () => {
    const yh = 0.9331;
    const zh = 0.0;
    const ya = 0.08;
    const za = 0.0;

    const ik = solveTwoSegmentPlanarIK(yh, zh, ya, za, L1, L2);
    expect(ik.valid).toBe(true);
    expect(ik.actualThighLength).toBeCloseTo(L1, 4);
    expect(ik.actualShankLength).toBeCloseTo(L2, 4);

    // Actual coordinates: knee forward offset ~5.43 cm
    expect(ik.kneeY).toBeCloseTo(0.4965, 3);
    expect(ik.kneeZ).toBeCloseTo(0.0543, 3);
    expect(ik.kneeZ).toBeGreaterThan(za);

    const angle = calculateInteriorKneeAngle(
      [0, yh, zh],
      [0, ik.kneeY, ik.kneeZ],
      [0, ya, za]
    );
    expect(angle).toBeCloseTo(165.5, 1);
  });

  it('documents historical posture (yh = 0.92m) yielding 155.2° knee angle', () => {
    const yh = 0.92;
    const zh = 0.0;
    const ya = 0.08;
    const za = 0.0;

    const ik = solveTwoSegmentPlanarIK(yh, zh, ya, za, L1, L2);
    expect(ik.valid).toBe(true);
    expect(ik.actualThighLength).toBeCloseTo(L1, 4);
    expect(ik.actualShankLength).toBeCloseTo(L2, 4);

    const angle = calculateInteriorKneeAngle(
      [0, yh, zh],
      [0, ik.kneeY, ik.kneeZ],
      [0, ya, za]
    );
    expect(angle).toBeCloseTo(155.2, 1);
  });

  it('solves squat bottom depth (yh = 0.54m, zh = -0.16m) preserving 68.9° angle', () => {
    const yh = 0.54;
    const zh = -0.16;
    const ya = 0.08;
    const za = 0.0;

    const ik = solveTwoSegmentPlanarIK(yh, zh, ya, za, L1, L2);
    expect(ik.valid).toBe(true);
    expect(ik.actualThighLength).toBeCloseTo(L1, 4);
    expect(ik.actualShankLength).toBeCloseTo(L2, 4);
    expect(ik.kneeZ).toBeGreaterThan(0.2); // Forward knee travel ~0.26m

    const angle = calculateInteriorKneeAngle(
      [0, yh, zh],
      [0, ik.kneeY, ik.kneeZ],
      [0, ya, za]
    );
    expect(angle).toBeCloseTo(68.9, 1);
  });

  it('preserves numerical stability and prevents NaN or branch flips near extension boundary', () => {
    // Exactly at maximum reach D = L1 + L2 = 0.86m (yh = 0.94m)
    const ikAtMax = solveTwoSegmentPlanarIK(0.94, 0.0, 0.08, 0.0, L1, L2);
    expect(Number.isNaN(ikAtMax.kneeY)).toBe(false);
    expect(Number.isNaN(ikAtMax.kneeZ)).toBe(false);
    expect(ikAtMax.actualThighLength).toBeCloseTo(L1, 3);
    expect(ikAtMax.actualShankLength).toBeCloseTo(L2, 3);

    // Over-extension boundary (beyond physical reach D > 0.86m)
    const ikOver = solveTwoSegmentPlanarIK(0.95, 0.0, 0.08, 0.0, L1, L2);
    expect(ikOver.valid).toBe(false);
    expect(Number.isNaN(ikOver.kneeY)).toBe(false);
    expect(Number.isNaN(ikOver.kneeZ)).toBe(false);
  });

  it('prevents knee flipping and ensures C0/C1 continuity throughout complete trajectory', () => {
    const steps = 100;
    let prevKneeZ = -1;
    let prevAngle = -1;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Interpolate hip from standing (0.9331, 0.0) to bottom (0.54, -0.16)
      const yh = 0.9331 - t * (0.9331 - 0.54);
      const zh = 0.0 - t * 0.16;

      const ik = solveTwoSegmentPlanarIK(yh, zh, 0.08, 0.0, L1, L2);
      expect(Number.isNaN(ik.kneeY)).toBe(false);
      expect(Number.isNaN(ik.kneeZ)).toBe(false);
      expect(ik.kneeZ).toBeGreaterThan(0); // Knee strictly in forward (+z) branch

      const angle = calculateInteriorKneeAngle(
        [0, yh, zh],
        [0, ik.kneeY, ik.kneeZ],
        [0, 0.08, 0.0]
      );
      expect(Number.isNaN(angle)).toBe(false);
      expect(angle).toBeGreaterThanOrEqual(68.8);
      expect(angle).toBeLessThanOrEqual(165.6);

      if (i > 0) {
        // Continuous, smooth trajectory without step discontinuities or jumps
        expect(Math.abs(ik.kneeZ - prevKneeZ)).toBeLessThan(0.015);
        // Near extension (theta ~ 165.5°), d(theta)/dD = D/(L1*L2*sin(theta)) is steeper (~3.68° max at 1% step)
        expect(Math.abs(angle - prevAngle)).toBeLessThan(4.0);
      }
      prevKneeZ = ik.kneeZ;
      prevAngle = angle;
    }
  });
});
