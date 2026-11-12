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

// Biomechanical dimension constants (in meters)
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

  // Group references for dynamic mesh transforms
  const rootGroupRef = useRef<THREE.Group>(null);
  const pelvisGroupRef = useRef<THREE.Group>(null);
  const torsoGroupRef = useRef<THREE.Group>(null);

  // Thigh and shank meshes
  const leftThighRef = useRef<THREE.Mesh>(null);
  const rightThighRef = useRef<THREE.Mesh>(null);
  const leftShankRef = useRef<THREE.Mesh>(null);
  const rightShankRef = useRef<THREE.Mesh>(null);

  // Joint node spheres
  const leftHipSphereRef = useRef<THREE.Mesh>(null);
  const rightHipSphereRef = useRef<THREE.Mesh>(null);
  const leftKneeSphereRef = useRef<THREE.Mesh>(null);
  const rightKneeSphereRef = useRef<THREE.Mesh>(null);
  const leftAnkleSphereRef = useRef<THREE.Mesh>(null);
  const rightAnkleSphereRef = useRef<THREE.Mesh>(null);

  // Angle arc line
  const angleArcLineRef = useRef<THREE.Line>(null);

  // Reusable math objects (avoid garbage collection in useFrame)
  const mathObjects = useMemo(() => {
    return {
      vUp: new THREE.Vector3(0, 1, 0),
      vDir: new THREE.Vector3(),
      vMid: new THREE.Vector3(),
      qRot: new THREE.Quaternion(),
      pHip: new THREE.Vector3(),
      pKnee: new THREE.Vector3(),
      pAnkle: new THREE.Vector3(),
      arcPoints: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()],
    };
  }, []);

  // Shared Materials
  const materials = useMemo(() => {
    return {
      // Matte athletic graphite/slate finish (strictly non-metallic, roughness 0.75)
      graphiteBody: new THREE.MeshStandardMaterial({
        color: '#2C2D35',
        roughness: 0.75,
        metalness: 0.0,
      }),
      // Slightly deeper matte carbon for torso & spine
      carbonTorso: new THREE.MeshStandardMaterial({
        color: '#24252C',
        roughness: 0.78,
        metalness: 0.0,
      }),
      // Articulated pelvis/hip connector tone
      pelvisMaterial: new THREE.MeshStandardMaterial({
        color: '#363842',
        roughness: 0.72,
        metalness: 0.0,
      }),
      // Signal-Rose joint node beacons
      signalRoseJoint: new THREE.MeshBasicMaterial({
        color: '#FF4D6D',
      }),
      // Angle arc line material
      angleLine: new THREE.LineBasicMaterial({
        color: '#FF4D6D',
        linewidth: 2,
      }),
      // Muted foot sole
      footMaterial: new THREE.MeshStandardMaterial({
        color: '#222329',
        roughness: 0.82,
        metalness: 0.0,
      }),
    };
  }, []);

  // Helper to orient a cylinder segment between point A and point B
  const orientSegment = (
    mesh: THREE.Mesh | null,
    pA: THREE.Vector3,
    pB: THREE.Vector3,
    length: number
  ) => {
    if (!mesh) return;
    const { vUp, vDir, vMid, qRot } = mathObjects;
    vMid.addVectors(pA, pB).multiplyScalar(0.5);
    mesh.position.copy(vMid);

    vDir.subVectors(pB, pA).normalize();
    qRot.setFromUnitVectors(vUp, vDir);
    mesh.quaternion.copy(qRot);

    // Ensure scale matches true distance
    const dist = pA.distanceTo(pB);
    mesh.scale.set(1, dist / length, 1);
  };

  useFrame((_, delta) => {
    if (isPlaying) {
      // 7.0-second total cycle
      timeRef.current = (timeRef.current + delta) % 7.0;
    }

    // Pure 5-phase parametric squat trajectory evaluation (C0 & C1 continuous)
    const { yHip, zHip, progress, phaseName } = evaluateSquatTrajectory(timeRef.current);

    // Analytical 2-segment planar IK for both legs
    const ik = solveTwoSegmentPlanarIK(yHip, zHip, ANKLE_Y, ANKLE_Z, L1_THIGH, L2_SHANK);

    // Update Pelvis Group (Anchors hip, spine, and torso)
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
    const { pHip, pKnee, pAnkle } = mathObjects;

    // Right Leg (Primary in Profile View)
    const rightHip = pHip.set(halfW, yHip, zHip);
    const rightKnee = pKnee.set(halfW, ik.kneeY, ik.kneeZ);
    const rightAnkle = pAnkle.set(halfW, ANKLE_Y, ANKLE_Z);

    // Orient Right Thigh & Shank
    orientSegment(rightThighRef.current, rightHip, rightKnee, L1_THIGH);
    orientSegment(rightShankRef.current, rightKnee, rightAnkle, L2_SHANK);

    // Position Right Joint Spheres
    if (rightHipSphereRef.current) rightHipSphereRef.current.position.copy(rightHip);
    if (rightKneeSphereRef.current) rightKneeSphereRef.current.position.copy(rightKnee);
    if (rightAnkleSphereRef.current) rightAnkleSphereRef.current.position.copy(rightAnkle);

    // Left Leg (Symmetrical bilateral movement)
    const leftHip = new THREE.Vector3(-halfW, yHip, zHip);
    const leftKnee = new THREE.Vector3(-halfW, ik.kneeY, ik.kneeZ);
    const leftAnkle = new THREE.Vector3(-halfW, ANKLE_Y, ANKLE_Z);

    orientSegment(leftThighRef.current, leftHip, leftKnee, L1_THIGH);
    orientSegment(leftShankRef.current, leftKnee, leftAnkle, L2_SHANK);

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
      // Ray toward hip
      const rHip = new THREE.Vector3().subVectors(rightHip, rightKnee).normalize().multiplyScalar(0.12);
      // Ray toward ankle
      const rAnkle = new THREE.Vector3().subVectors(rightAnkle, rightKnee).normalize().multiplyScalar(0.12);

      const p1 = new THREE.Vector3().addVectors(rightKnee, rHip);
      const p2 = rightKnee.clone();
      const p3 = new THREE.Vector3().addVectors(rightKnee, rAnkle);

      geo.setFromPoints([p1, p2, p3]);
    }

    // Throttle React state update to ~10Hz or integer degree changes to avoid 60Hz React re-renders
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
      {/* 1. Ground Plane Stationary Feet (Strictly clamped at y = 0.0, zero translation) */}
      {/* Left Foot */}
      <mesh
        position={[-halfW, ANKLE_Y / 2, 0.04]}
        material={materials.footMaterial}
      >
        <boxGeometry args={[0.09, ANKLE_Y, 0.22]} />
      </mesh>
      {/* Right Foot */}
      <mesh
        position={[halfW, ANKLE_Y / 2, 0.04]}
        material={materials.footMaterial}
      >
        <boxGeometry args={[0.09, ANKLE_Y, 0.22]} />
      </mesh>

      {/* 2. Pelvis Group (Moves dynamically with hip trajectory) */}
      <group ref={pelvisGroupRef} position={[0, Y_HIP_STAND, Z_HIP_STAND]}>
        {/* Pelvic Core Box */}
        <mesh position={[0, 0, 0]} material={materials.pelvisMaterial}>
          <cylinderGeometry args={[HIP_WIDTH / 2.2, HIP_WIDTH / 2.4, 0.12, 16]} />
        </mesh>

        {/* 3. Torso & Spine Group (Pivots at hip to lean forward during squat) */}
        <group ref={torsoGroupRef} position={[0, 0.06, 0]}>
          {/* Lower Lumbar Spine */}
          <mesh position={[0, 0.1, 0]} material={materials.carbonTorso}>
            <cylinderGeometry args={[0.07, 0.08, 0.18, 16]} />
          </mesh>
          {/* Ribcage / Thorax */}
          <mesh position={[0, 0.26, 0]} material={materials.graphiteBody}>
            <cylinderGeometry args={[0.13, 0.09, 0.22, 16]} />
          </mesh>
          {/* Clavicle / Shoulder Yoke */}
          <mesh position={[0, 0.38, 0]} material={materials.graphiteBody}>
            <boxGeometry args={[0.34, 0.06, 0.12]} />
          </mesh>
          {/* Cervical Neck */}
          <mesh position={[0, 0.44, 0]} material={materials.carbonTorso}>
            <cylinderGeometry args={[0.045, 0.05, 0.08, 12]} />
          </mesh>
          {/* Cranium / Head */}
          <mesh position={[0, 0.54, 0]} material={materials.graphiteBody}>
            <sphereGeometry args={[0.085, 20, 20]} />
          </mesh>

          {/* Athletic Guard Counterbalance Arms */}
          {/* Left Upper Arm & Forearm */}
          <mesh position={[-0.19, 0.28, 0.08]} rotation={[0.6, 0, 0.1]} material={materials.graphiteBody}>
            <capsuleGeometry args={[0.035, 0.22, 8, 12]} />
          </mesh>
          {/* Right Upper Arm & Forearm */}
          <mesh position={[0.19, 0.28, 0.08]} rotation={[0.6, 0, -0.1]} material={materials.graphiteBody}>
            <capsuleGeometry args={[0.035, 0.22, 8, 12]} />
          </mesh>
        </group>
      </group>

      {/* 4. Connected Leg Segments (Oriented directly between joint coordinates) */}
      {/* Left Thigh (Femur) */}
      <mesh ref={leftThighRef} material={materials.graphiteBody}>
        <cylinderGeometry args={[0.052, 0.045, L1_THIGH, 16]} />
      </mesh>
      {/* Left Shank (Tibia) */}
      <mesh ref={leftShankRef} material={materials.graphiteBody}>
        <cylinderGeometry args={[0.042, 0.035, L2_SHANK, 16]} />
      </mesh>

      {/* Right Thigh (Femur) */}
      <mesh ref={rightThighRef} material={materials.graphiteBody}>
        <cylinderGeometry args={[0.052, 0.045, L1_THIGH, 16]} />
      </mesh>
      {/* Right Shank (Tibia) */}
      <mesh ref={rightShankRef} material={materials.graphiteBody}>
        <cylinderGeometry args={[0.042, 0.035, L2_SHANK, 16]} />
      </mesh>

      {/* 5. Signal-Rose (#FF4D6D) Biomechanical Joint Beacons */}
      {/* Hip Nodes */}
      <mesh ref={leftHipSphereRef} material={materials.signalRoseJoint}>
        <sphereGeometry args={[0.038, 16, 16]} />
      </mesh>
      <mesh ref={rightHipSphereRef} material={materials.signalRoseJoint}>
        <sphereGeometry args={[0.038, 16, 16]} />
      </mesh>

      {/* Knee Nodes */}
      <mesh ref={leftKneeSphereRef} material={materials.signalRoseJoint}>
        <sphereGeometry args={[0.042, 16, 16]} />
      </mesh>
      <mesh ref={rightKneeSphereRef} material={materials.signalRoseJoint}>
        <sphereGeometry args={[0.042, 16, 16]} />
      </mesh>

      {/* Ankle Nodes */}
      <mesh ref={leftAnkleSphereRef} material={materials.signalRoseJoint}>
        <sphereGeometry args={[0.032, 16, 16]} />
      </mesh>
      <mesh ref={rightAnkleSphereRef} material={materials.signalRoseJoint}>
        <sphereGeometry args={[0.032, 16, 16]} />
      </mesh>

      {/* 6. Dynamic Sagittal Angle Arc Line on Right Knee */}
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
