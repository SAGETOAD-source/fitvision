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
  const targetPosRef = useRef<THREE.Vector3>(
    new THREE.Vector3(...CAMERA_PRESETS[currentView])
  );

  // Initialize native OrbitControls
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

    controlsRef.current = controls;

    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl.domElement]);

  // Update target coordinates when preset button is clicked
  useEffect(() => {
    const [x, y, z] = CAMERA_PRESETS[currentView];
    targetPosRef.current.set(x, y, z);
  }, [currentView]);

  // Smoothly interpolate camera position toward target preset in useFrame
  useFrame((_, delta) => {
    if (controlsRef.current) {
      // Lerp camera position toward preset position
      camera.position.lerp(targetPosRef.current, Math.min(1.0, delta * 4.5));
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
        {/* Directional Key Light */}
        <directionalLight position={[3, 5, 4]} intensity={1.1} color="#FFFFFF" />
        {/* Directional Rim Light (Subtle Burgundy Accent) */}
        <directionalLight position={[-3, 4, -3]} intensity={0.4} color="#6D001A" />
        {/* Ambient Fill */}
        <ambientLight intensity={0.3} color="#202024" />

        {/* Studio Ground Reference Disc */}
        <group position={[0, -0.001, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.5, 36]} />
            <meshBasicMaterial color="#0E0E10" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.48, 1.5, 36]} />
            <meshBasicMaterial color="#1A1A1E" />
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
