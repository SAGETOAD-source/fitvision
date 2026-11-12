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
  const L1 = 0.44; // Thigh length
  const L2 = 0.42; // Shank length

  it('solves standing posture with forward knee flexion and invariant segment lengths', () => {
    const yh = 0.92;
    const zh = 0.0;
    const ya = 0.08;
    const za = 0.0;

    const ik = solveTwoSegmentPlanarIK(yh, zh, ya, za, L1, L2);
    expect(ik.valid).toBe(true);
    expect(ik.actualThighLength).toBeCloseTo(L1, 4);
    expect(ik.actualShankLength).toBeCloseTo(L2, 4);
    expect(ik.kneeZ).toBeGreaterThan(za); // Forward knee flexion (+z)

    const angle = calculateInteriorKneeAngle(
      [0, yh, zh],
      [0, ik.kneeY, ik.kneeZ],
      [0, ya, za]
    );
    expect(angle).toBeGreaterThan(150);
    expect(angle).toBeLessThan(175);
  });

  it('solves squat bottom depth with forward knee flexion and invariant segment lengths', () => {
    const yh = 0.54;
    const zh = -0.16;
    const ya = 0.08;
    const za = 0.0;

    const ik = solveTwoSegmentPlanarIK(yh, zh, ya, za, L1, L2);
    expect(ik.valid).toBe(true);
    expect(ik.actualThighLength).toBeCloseTo(L1, 4);
    expect(ik.actualShankLength).toBeCloseTo(L2, 4);
    expect(ik.kneeZ).toBeGreaterThan(0.2); // Forward knee travel

    const angle = calculateInteriorKneeAngle(
      [0, yh, zh],
      [0, ik.kneeY, ik.kneeZ],
      [0, ya, za]
    );
    expect(angle).toBeCloseTo(68.9, 1);
  });

  it('prevents knee flipping throughout a continuous trajectory', () => {
    const steps = 20;
    let prevKneeZ = -1;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Interpolate hip from standing (0.92, 0.0) to bottom (0.54, -0.16)
      const yh = 0.92 - t * (0.92 - 0.54);
      const zh = 0.0 - t * 0.16;

      const ik = solveTwoSegmentPlanarIK(yh, zh, 0.08, 0.0, L1, L2);
      expect(ik.kneeZ).toBeGreaterThan(0); // Always forward
      if (i > 0) {
        // Knee position changes smoothly
        expect(Math.abs(ik.kneeZ - prevKneeZ)).toBeLessThan(0.05);
      }
      prevKneeZ = ik.kneeZ;
    }
  });
});
