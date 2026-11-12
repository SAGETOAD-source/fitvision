import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  calculateInteriorKneeAngle,
  solveTwoSegmentPlanarIK,
  evaluateSquatTrajectory,
  Y_HIP_STAND,
  Z_HIP_STAND,
} from './joint_math';

interface ProceduralMannequinProps {
  isPlaying: boolean;
  onAngleUpdate?: (angle: number, phase: string) => void;
}

// Biomechanical dimension constants (in meters) - PRESERVED STRICTLY
const L1_THIGH = 0.44;
const L2_SHANK = 0.42;
const HIP_WIDTH = 0.28; // Distance between left and right hip pivots
const ANKLE_Y = 0.08;   // Ankle pivot height above ground
const ANKLE_Z = 0.0;    // Ankle pivot Z position (clamped in world space)

export default function ProceduralMannequin({
  isPlaying,
  onAngleUpdate,
}: ProceduralMannequinProps) {
  const timeRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(0);
  const lastAngleRef = useRef<number>(-1);

  // Group references for dynamic transforms
  const rootGroupRef = useRef<THREE.Group>(null);
  const pelvisGroupRef = useRef<THREE.Group>(null);
  const torsoGroupRef = useRef<THREE.Group>(null);

  // Leg segment groups (contain contoured thigh and shank geometries)
  const leftThighGroupRef = useRef<THREE.Group>(null);
  const rightThighGroupRef = useRef<THREE.Group>(null);
  const leftShankGroupRef = useRef<THREE.Group>(null);
  const rightShankGroupRef = useRef<THREE.Group>(null);

  // Signal-rose joint node spheres
  const leftHipSphereRef = useRef<THREE.Mesh>(null);
  const rightHipSphereRef = useRef<THREE.Mesh>(null);
  const leftKneeSphereRef = useRef<THREE.Mesh>(null);
  const rightKneeSphereRef = useRef<THREE.Mesh>(null);
  const leftAnkleSphereRef = useRef<THREE.Mesh>(null);
  const rightAnkleSphereRef = useRef<THREE.Mesh>(null);

  // Angle arc line
  const angleArcLineRef = useRef<THREE.Line>(null);

  // Reusable math objects (zero garbage collection in useFrame)
  const mathObjects = useMemo(() => {
    return {
      vUp: new THREE.Vector3(0, 1, 0),
      vDir: new THREE.Vector3(),
      vMid: new THREE.Vector3(),
      qRot: new THREE.Quaternion(),
      pHip: new THREE.Vector3(),
      pKnee: new THREE.Vector3(),
      pAnkle: new THREE.Vector3(),
      leftHip: new THREE.Vector3(),
      leftKnee: new THREE.Vector3(),
      leftAnkle: new THREE.Vector3(),
    };
  }, []);

  // Shared Materials (Matte, non-metallic, subtle athletic apparel styling)
  const materials = useMemo(() => {
    return {
      // Matte athletic skin tone (technical slate, elevated readability against dark studio)
      skin: new THREE.MeshStandardMaterial({
        color: '#6A6E7C',
        roughness: 0.72,
        metalness: 0.0,
      }),
      // Fitted athletic sports top (deep performance carbon)
      sportsTop: new THREE.MeshStandardMaterial({
        color: '#22232A',
        roughness: 0.80,
        metalness: 0.0,
      }),
      // Performance leggings (matte dark slate charcoal covering hips, glutes, thighs, shanks)
      leggings: new THREE.MeshStandardMaterial({
        color: '#343744',
        roughness: 0.76,
        metalness: 0.0,
      }),
      // Subtle waistband accent
      waistband: new THREE.MeshStandardMaterial({
        color: '#282A34',
        roughness: 0.82,
        metalness: 0.0,
      }),
      // Athletic training shoes
      shoes: new THREE.MeshStandardMaterial({
        color: '#1A1B22',
        roughness: 0.85,
        metalness: 0.0,
      }),
      shoeSole: new THREE.MeshStandardMaterial({
        color: '#383B46',
        roughness: 0.75,
        metalness: 0.0,
      }),
      // Sleek athletic hair
      hair: new THREE.MeshStandardMaterial({
        color: '#1A1B20',
        roughness: 0.85,
        metalness: 0.0,
      }),
      // Signal-Rose joint node beacons
      signalRoseJoint: new THREE.MeshBasicMaterial({
        color: '#FF4D6D',
      }),
      // Sagittal angle arc line
      angleLine: new THREE.LineBasicMaterial({
        color: '#FF4D6D',
        linewidth: 2,
      }),
    };
  }, []);

  // Helper to orient a compound segment group between point A and point B
  const orientSegment = (
    group: THREE.Group | null,
    pA: THREE.Vector3,
    pB: THREE.Vector3,
    length: number
  ) => {
    if (!group) return;
    const { vUp, vDir, vMid, qRot } = mathObjects;
    vMid.addVectors(pA, pB).multiplyScalar(0.5);
    group.position.copy(vMid);

    vDir.subVectors(pB, pA).normalize();
    qRot.setFromUnitVectors(vUp, vDir);
    group.quaternion.copy(qRot);

    // Scale Y strictly by true distance to ensure exact joint alignment
    const dist = pA.distanceTo(pB);
    group.scale.set(1, dist / length, 1);
  };

  useFrame((_, delta) => {
    if (isPlaying) {
      timeRef.current = (timeRef.current + delta) % 7.0;
    }

    // Pure 5-phase parametric squat trajectory evaluation (C0 & C1 continuous)
    const { yHip, zHip, progress, phaseName } = evaluateSquatTrajectory(timeRef.current);

    // Analytical 2-segment planar IK for both legs
    const ik = solveTwoSegmentPlanarIK(yHip, zHip, ANKLE_Y, ANKLE_Z, L1_THIGH, L2_SHANK);

    // Update Pelvis Group (Anchors hip, glutes, and torso base)
    if (pelvisGroupRef.current) {
      pelvisGroupRef.current.position.set(0, yHip, zHip);
    }

    // Torso incline forward during descent to maintain center of mass over midfoot
    if (torsoGroupRef.current) {
      const torsoInclineAngle = progress * 0.48; // ~27.5° forward lean
      torsoGroupRef.current.rotation.x = torsoInclineAngle;
    }

    const halfW = HIP_WIDTH / 2;

    // Joint Positions in World Coordinates
    const { pHip, pKnee, pAnkle, leftHip, leftKnee, leftAnkle } = mathObjects;

    // Right Leg (Primary in Sagittal Profile View)
    const rightHip = pHip.set(halfW, yHip, zHip);
    const rightKnee = pKnee.set(halfW, ik.kneeY, ik.kneeZ);
    const rightAnkle = pAnkle.set(halfW, ANKLE_Y, ANKLE_Z);

    // Orient Right Thigh & Shank Groups
    orientSegment(rightThighGroupRef.current, rightHip, rightKnee, L1_THIGH);
    orientSegment(rightShankGroupRef.current, rightKnee, rightAnkle, L2_SHANK);

    // Position Right Joint Spheres
    if (rightHipSphereRef.current) rightHipSphereRef.current.position.copy(rightHip);
    if (rightKneeSphereRef.current) rightKneeSphereRef.current.position.copy(rightKnee);
    if (rightAnkleSphereRef.current) rightAnkleSphereRef.current.position.copy(rightAnkle);

    // Left Leg (Symmetrical bilateral movement)
    leftHip.set(-halfW, yHip, zHip);
    leftKnee.set(-halfW, ik.kneeY, ik.kneeZ);
    leftAnkle.set(-halfW, ANKLE_Y, ANKLE_Z);

    orientSegment(leftThighGroupRef.current, leftHip, leftKnee, L1_THIGH);
    orientSegment(leftShankGroupRef.current, leftKnee, leftAnkle, L2_SHANK);

    if (leftHipSphereRef.current) leftHipSphereRef.current.position.copy(leftHip);
    if (leftKneeSphereRef.current) leftKneeSphereRef.current.position.copy(leftKnee);
    if (leftAnkleSphereRef.current) leftAnkleSphereRef.current.position.copy(leftAnkle);

    // Calculate live mathematical interior angle from actual animated coordinates
    const calculatedAngle = calculateInteriorKneeAngle(
      [rightHip.x, rightHip.y, rightHip.z],
      [rightKnee.x, rightKnee.y, rightKnee.z],
      [rightAnkle.x, rightAnkle.y, rightAnkle.z]
    );

    // Update 3D angle arc line on right knee
    if (angleArcLineRef.current) {
      const geo = angleArcLineRef.current.geometry;
      const rHip = new THREE.Vector3().subVectors(rightHip, rightKnee).normalize().multiplyScalar(0.12);
      const rAnkle = new THREE.Vector3().subVectors(rightAnkle, rightKnee).normalize().multiplyScalar(0.12);

      const p1 = new THREE.Vector3().addVectors(rightKnee, rHip);
      const p2 = rightKnee.clone();
      const p3 = new THREE.Vector3().addVectors(rightKnee, rAnkle);

      geo.setFromPoints([p1, p2, p3]);
    }

    // Throttle React state update to ~10Hz or integer degree changes
    const now = performance.now();
    if (now - lastUpdateRef.current > 100 || Math.abs(calculatedAngle - lastAngleRef.current) >= 1.0) {
      lastUpdateRef.current = now;
      lastAngleRef.current = calculatedAngle;
      if (onAngleUpdate) {
        onAngleUpdate(calculatedAngle, phaseName);
      }
    }
  });

  const halfW = HIP_WIDTH / 2;

  return (
    <group ref={rootGroupRef}>
      {/* =========================================================================
          1. STATIONARY ATHLETIC FOOTWEAR (Ground Plane Clamped at y = 0.0)
          ========================================================================= */}
      {/* Left Shoe */}
      <group position={[-halfW, 0, 0.03]}>
        {/* Sole */}
        <mesh position={[0, 0.015, 0.01]} material={materials.shoeSole}>
          <boxGeometry args={[0.096, 0.03, 0.24]} />
        </mesh>
        {/* Trainer Upper */}
        <mesh position={[0, 0.045, -0.01]} material={materials.shoes}>
          <boxGeometry args={[0.090, 0.05, 0.18]} />
        </mesh>
        {/* Forefoot Toe Box */}
        <mesh position={[0, 0.035, 0.07]} material={materials.shoes}>
          <cylinderGeometry args={[0.042, 0.045, 0.08, 16]} />
        </mesh>
      </group>

      {/* Right Shoe */}
      <group position={[halfW, 0, 0.03]}>
        <mesh position={[0, 0.015, 0.01]} material={materials.shoeSole}>
          <boxGeometry args={[0.096, 0.03, 0.24]} />
        </mesh>
        <mesh position={[0, 0.045, -0.01]} material={materials.shoes}>
          <boxGeometry args={[0.090, 0.05, 0.18]} />
        </mesh>
        <mesh position={[0, 0.035, 0.07]} material={materials.shoes}>
          <cylinderGeometry args={[0.042, 0.045, 0.08, 16]} />
        </mesh>
      </group>

      {/* =========================================================================
          2. PELVIS & GLUTES GROUP (Moves dynamically with hip trajectory)
          ========================================================================= */}
      <group ref={pelvisGroupRef} position={[0, Y_HIP_STAND, Z_HIP_STAND]}>
        {/* High-Waist Athletic Leggings Band */}
        <mesh position={[0, 0.07, -0.005]} material={materials.waistband}>
          <cylinderGeometry args={[0.112, 0.124, 0.05, 24]} />
        </mesh>

        {/* Central Pelvic Girdle */}
        <mesh position={[0, 0.01, -0.01]} material={materials.leggings}>
          <cylinderGeometry args={[0.132, 0.142, 0.13, 24]} />
        </mesh>

        {/* Sculpted Athletic Gluteal Curves (Left & Right Hamstring/Glute Tie-in) */}
        <mesh position={[-halfW * 0.72, -0.01, -0.055]} material={materials.leggings}>
          <sphereGeometry args={[0.082, 20, 20]} />
        </mesh>
        <mesh position={[halfW * 0.72, -0.01, -0.055]} material={materials.leggings}>
          <sphereGeometry args={[0.082, 20, 20]} />
        </mesh>

        {/* =========================================================================
            3. TORSO, SPORTS TOP, ARMS & HEAD (Pivots at hip for forward lean)
            ========================================================================= */}
        <group ref={torsoGroupRef} position={[0, 0.06, 0]}>
          {/* Tapered Athletic Waist (Exposed skin contour above leggings) */}
          <mesh position={[0, 0.06, 0]} material={materials.skin}>
            <cylinderGeometry args={[0.092, 0.106, 0.09, 24]} />
          </mesh>

          {/* Fitted Athletic Sports Top (Performance Carbon) */}
          <mesh position={[0, 0.155, 0]} material={materials.sportsTop}>
            <cylinderGeometry args={[0.124, 0.094, 0.12, 24]} />
          </mesh>

          {/* Anatomical Athletic Bust Contour (Integrated cleanly into sports bra) */}
          <mesh position={[-0.055, 0.165, 0.062]} material={materials.sportsTop}>
            <sphereGeometry args={[0.056, 18, 18]} />
          </mesh>
          <mesh position={[0.055, 0.165, 0.062]} material={materials.sportsTop}>
            <sphereGeometry args={[0.056, 18, 18]} />
          </mesh>

          {/* Upper Chest & Clavicle Arch */}
          <mesh position={[0, 0.235, 0]} material={materials.sportsTop}>
            <cylinderGeometry args={[0.128, 0.124, 0.06, 24]} />
          </mesh>

          {/* Athletic Deltoid Shoulders (Rounded caps replacing rectangular box) */}
          <mesh position={[-0.175, 0.255, 0]} material={materials.skin}>
            <sphereGeometry args={[0.046, 18, 18]} />
          </mesh>
          <mesh position={[0.175, 0.255, 0]} material={materials.skin}>
            <sphereGeometry args={[0.046, 18, 18]} />
          </mesh>

          {/* Cervical Neck */}
          <mesh position={[0, 0.315, 0]} material={materials.skin}>
            <cylinderGeometry args={[0.038, 0.046, 0.08, 16]} />
          </mesh>

          {/* Athletic Cranium / Head */}
          <mesh position={[0, 0.415, 0]} material={materials.skin}>
            <sphereGeometry args={[0.076, 24, 24]} />
          </mesh>

          {/* Sleek Athletic Hair & High Ponytail */}
          <mesh position={[0, 0.435, -0.018]} material={materials.hair}>
            <sphereGeometry args={[0.079, 20, 20]} />
          </mesh>
          {/* Ponytail Tie */}
          <mesh position={[0, 0.455, -0.085]} material={materials.hair}>
            <sphereGeometry args={[0.034, 16, 16]} />
          </mesh>
          {/* Trailing Ponytail Plume */}
          <mesh position={[0, 0.385, -0.11]} rotation={[-0.4, 0, 0]} material={materials.hair}>
            <capsuleGeometry args={[0.022, 0.12, 8, 12]} />
          </mesh>

          {/* Athletic Arms (Relaxed front counterbalancing guard posture) */}
          {/* Left Upper Arm */}
          <mesh position={[-0.185, 0.185, 0.05]} rotation={[0.60, 0.15, 0.22]} material={materials.skin}>
            <capsuleGeometry args={[0.029, 0.17, 8, 12]} />
          </mesh>
          {/* Left Forearm */}
          <mesh position={[-0.10, 0.10, 0.18]} rotation={[1.20, -0.42, 0.60]} material={materials.skin}>
            <capsuleGeometry args={[0.024, 0.16, 8, 12]} />
          </mesh>

          {/* Right Upper Arm */}
          <mesh position={[0.185, 0.185, 0.05]} rotation={[0.60, -0.15, -0.22]} material={materials.skin}>
            <capsuleGeometry args={[0.029, 0.17, 8, 12]} />
          </mesh>
          {/* Right Forearm */}
          <mesh position={[0.10, 0.10, 0.18]} rotation={[1.20, 0.42, -0.60]} material={materials.skin}>
            <capsuleGeometry args={[0.024, 0.16, 8, 12]} />
          </mesh>

          {/* Clapsed Hands */}
          <mesh position={[-0.03, 0.09, 0.23]} material={materials.skin}>
            <sphereGeometry args={[0.024, 12, 12]} />
          </mesh>
          <mesh position={[0.03, 0.09, 0.23]} material={materials.skin}>
            <sphereGeometry args={[0.024, 12, 12]} />
          </mesh>
        </group>
      </group>

      {/* =========================================================================
          4. CONTOURED THIGH GROUPS (L1 = 0.44m, Hip to Knee Vector)
          Local space: -Y is hip end, +Y is knee end.
          ========================================================================= */}
      {/* Left Thigh Group */}
      <group ref={leftThighGroupRef}>
        {/* Tapered Femur Core Leggings (radiusBottom at hip = 0.068m, radiusTop at knee = 0.046m) */}
        <mesh position={[0, 0, 0]} material={materials.leggings}>
          <cylinderGeometry args={[0.046, 0.068, L1_THIGH, 24]} />
        </mesh>
        {/* Anterior Quad Sweep Bulge (+Z anterior) */}
        <mesh position={[0, -0.05, 0.022]} material={materials.leggings}>
          <capsuleGeometry args={[0.040, 0.20, 8, 16]} />
        </mesh>
        {/* Posterior Hamstring Curve (-Z posterior) */}
        <mesh position={[0, -0.07, -0.024]} material={materials.leggings}>
          <capsuleGeometry args={[0.038, 0.18, 8, 16]} />
        </mesh>
      </group>

      {/* Right Thigh Group */}
      <group ref={rightThighGroupRef}>
        <mesh position={[0, 0, 0]} material={materials.leggings}>
          <cylinderGeometry args={[0.046, 0.068, L1_THIGH, 24]} />
        </mesh>
        <mesh position={[0, -0.05, 0.022]} material={materials.leggings}>
          <capsuleGeometry args={[0.040, 0.20, 8, 16]} />
        </mesh>
        <mesh position={[0, -0.07, -0.024]} material={materials.leggings}>
          <capsuleGeometry args={[0.038, 0.18, 8, 16]} />
        </mesh>
      </group>

      {/* =========================================================================
          5. CONTOURED SHANK GROUPS (L2 = 0.42m, Knee to Ankle Vector)
          Local space: -Y is knee end, +Y is ankle end.
          ========================================================================= */}
      {/* Left Shank Group */}
      <group ref={leftShankGroupRef}>
        {/* Tapered Tibia Core Leggings (radiusBottom at knee = 0.046m, radiusTop at ankle = 0.034m) */}
        <mesh position={[0, 0, 0]} material={materials.leggings}>
          <cylinderGeometry args={[0.034, 0.046, L2_SHANK, 24]} />
        </mesh>
        {/* Posterior Calf (Gastrocnemius) Curve (-Z posterior, upper shank) */}
        <mesh position={[0, -0.06, -0.020]} material={materials.leggings}>
          <capsuleGeometry args={[0.038, 0.16, 8, 16]} />
        </mesh>
      </group>

      {/* Right Shank Group */}
      <group ref={rightShankGroupRef}>
        <mesh position={[0, 0, 0]} material={materials.leggings}>
          <cylinderGeometry args={[0.034, 0.046, L2_SHANK, 24]} />
        </mesh>
        <mesh position={[0, -0.06, -0.020]} material={materials.leggings}>
          <capsuleGeometry args={[0.038, 0.16, 8, 16]} />
        </mesh>
      </group>

      {/* =========================================================================
          6. SIGNAL-ROSE (#FF4D6D) BIOMECHANICAL JOINT BEACONS
          Exact mathematical coordinate pivots: Hip, Knee, Ankle
          ========================================================================= */}
      {/* Hip Joint Spheres */}
      <mesh ref={leftHipSphereRef} material={materials.signalRoseJoint}>
        <sphereGeometry args={[0.034, 16, 16]} />
      </mesh>
      <mesh ref={rightHipSphereRef} material={materials.signalRoseJoint}>
        <sphereGeometry args={[0.034, 16, 16]} />
      </mesh>

      {/* Knee Joint Spheres */}
      <mesh ref={leftKneeSphereRef} material={materials.signalRoseJoint}>
        <sphereGeometry args={[0.038, 16, 16]} />
      </mesh>
      <mesh ref={rightKneeSphereRef} material={materials.signalRoseJoint}>
        <sphereGeometry args={[0.038, 16, 16]} />
      </mesh>

      {/* Ankle Joint Spheres */}
      <mesh ref={leftAnkleSphereRef} material={materials.signalRoseJoint}>
        <sphereGeometry args={[0.030, 16, 16]} />
      </mesh>
      <mesh ref={rightAnkleSphereRef} material={materials.signalRoseJoint}>
        <sphereGeometry args={[0.030, 16, 16]} />
      </mesh>

      {/* =========================================================================
          7. DYNAMIC SAGITTAL ANGLE ARC LINE (Right Knee Interior Angle)
          ========================================================================= */}
      <primitive
        object={
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(),
              new THREE.Vector3(),
              new THREE.Vector3(),
            ]),
            materials.angleLine
          )
        }
        ref={angleArcLineRef}
      />
    </group>
  );
}
