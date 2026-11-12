'use client';

import React, { useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import ProceduralMannequin from './ProceduralMannequin';
import { CameraPreset } from './MotionLabControls';

interface MotionLabCanvasProps {
  isVisible: boolean;
  isPlaying: boolean;
  currentView: CameraPreset;
  onAngleUpdate: (angle: number, phase: string) => void;
}

// Camera Target Coordinates for Presets
const CAMERA_PRESETS: Record<CameraPreset, [number, number, number]> = {
  profile: [2.8, 0.95, 0.0],     // Right sagittal profile (default)
  isometric: [2.0, 1.35, 2.0],   // 45° athletic perspective
  front: [0.0, 0.95, 2.8],       // Direct frontal view
};

const LOOK_AT_TARGET = new THREE.Vector3(0, 0.85, 0);

function CameraAndControls({ currentView }: { currentView: CameraPreset }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);

  // Transition state tracking
  const isTransitioningRef = useRef<boolean>(false);
  const startPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const targetPosRef = useRef<THREE.Vector3>(
    new THREE.Vector3(...CAMERA_PRESETS[currentView])
  );
  const transitionProgressRef = useRef<number>(0);
  const isFirstMountRef = useRef<boolean>(true);

  // Initialize native OrbitControls with interaction cancellation listener
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enablePan = false; // Disable panning per spec
    controls.minDistance = 1.8;
    controls.maxDistance = 5.0;
    controls.minPolarAngle = Math.PI / 6; // ~30° from zenith
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // ~87° to prevent going under ground
    controls.target.copy(LOOK_AT_TARGET);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    // Manual pointer interaction immediately cancels any active preset transition
    const onInteractionStart = () => {
      isTransitioningRef.current = false;
    };

    controls.addEventListener('start', onInteractionStart);
    controlsRef.current = controls;

    return () => {
      controls.removeEventListener('start', onInteractionStart);
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl.domElement]);

  // Trigger smooth transition from current camera position when a preset button is selected
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return; // Do not lerp on initial mount; camera already initialized at profile preset
    }

    const [x, y, z] = CAMERA_PRESETS[currentView];
    startPosRef.current.copy(camera.position);
    targetPosRef.current.set(x, y, z);
    transitionProgressRef.current = 0;
    isTransitioningRef.current = true;
  }, [currentView, camera]);

  // Frame update: animate active preset transition, then delegate 100% control to OrbitControls
  useFrame((_, delta) => {
    if (isTransitioningRef.current) {
      // Smooth ~0.65s transition (1.0 / 0.65 ≈ 1.54 rate)
      transitionProgressRef.current += delta * 1.6;
      const alpha = Math.min(1.0, transitionProgressRef.current);

      // Smooth cubic ease-in-out
      const easedAlpha =
        alpha < 0.5 ? 4 * alpha * alpha * alpha : 1 - Math.pow(-2 * alpha + 2, 3) / 2;

      camera.position.lerpVectors(startPosRef.current, targetPosRef.current, easedAlpha);

      // Once transition completes, OrbitControls fully owns the camera
      if (alpha >= 1.0 || camera.position.distanceTo(targetPosRef.current) < 0.005) {
        camera.position.copy(targetPosRef.current);
        isTransitioningRef.current = false;
      }
    }

    if (controlsRef.current) {
      controlsRef.current.update();
    }
  });

  return null;
}

export default function MotionLabCanvas({
  isVisible,
  isPlaying,
  currentView,
  onAngleUpdate,
}: MotionLabCanvasProps) {
  return (
    <div className="relative w-full h-full min-h-[460px] sm:min-h-[520px] rounded-3xl bg-[#000000] border border-[#1A1A1E] overflow-hidden select-none touch-pan-y shadow-2xl">
      <Canvas
        camera={{
          position: CAMERA_PRESETS.profile,
          fov: 38,
          near: 0.1,
          far: 20,
        }}
        frameloop={isVisible ? 'always' : 'never'}
        dpr={[1, typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 1.5) : 1]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
        }}
      >
        {/* Studio Lighting Setup */}
        {/* Soft Neutral Key Light */}
        <directionalLight position={[3.5, 5.0, 3.5]} intensity={2.2} color="#FFFFFF" />
        {/* Dedicated Front-Left Studio Fill Light (prevents dark side shadow crushing) */}
        <directionalLight position={[-3.2, 3.2, 3.0]} intensity={1.1} color="#D4D8E2" />
        {/* Restrained Burgundy / Signal-Rose Contour Rim Light */}
        <directionalLight position={[-3.5, 4.0, -3.5]} intensity={1.8} color="#D8385A" />
        {/* Secondary Lateral Contour */}
        <directionalLight position={[3.0, 2.0, -2.5]} intensity={0.6} color="#464A58" />
        {/* Hemisphere Ambient Ground/Sky Balance */}
        <hemisphereLight args={['#505466', '#1A1B22', 0.85]} />
        {/* Ambient Base Fill */}
        <ambientLight intensity={0.35} color="#2A2B34" />

        {/* Studio Ground Reference Disc */}
        <group position={[0, -0.001, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.5, 36]} />
            <meshBasicMaterial color="#0C0C0E" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.48, 1.5, 36]} />
            <meshBasicMaterial color="#26262E" />
          </mesh>
        </group>

        {/* Procedural Kinematic Mannequin */}
        <ProceduralMannequin
          isPlaying={isPlaying}
          onAngleUpdate={onAngleUpdate}
        />

        {/* Orbit Controls & Camera Preset Transitions */}
        <CameraAndControls currentView={currentView} />
      </Canvas>
    </div>
  );
}
