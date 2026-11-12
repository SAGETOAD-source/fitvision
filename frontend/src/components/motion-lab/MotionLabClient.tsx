'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import MotionLabControls, { CameraPreset } from './MotionLabControls';
import StaticFallback from './StaticFallback';

// Dynamically import the WebGL Canvas with ssr: false to prevent SSR hydration errors
const MotionLabCanvas = dynamic(() => import('./MotionLabCanvas'), {
  ssr: false,
  loading: () => <StaticFallback message="Initializing 3D Canvas..." />,
});

export default function MotionLabClient() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Perspective state: profile is default per specification
  const [currentView, setCurrentView] = useState<CameraPreset>('profile');

  // Playback & Reduced Motion state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);

  // Real-time kinematic state
  const [calculatedAngle, setCalculatedAngle] = useState<number>(165);
  const [currentPhase, setCurrentPhase] = useState<string>('Phase 1: Standing Base');

  // Viewport visibility state (gating frameloop)
  const [isVisible, setIsVisible] = useState<boolean>(true);

  // WebGL support and runtime context state
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [contextLost, setContextLost] = useState<boolean>(false);

  // 1. Detect prefers-reduced-motion and WebGL support on mount
  useEffect(() => {
    // Check reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
      setIsReducedMotion(true);
      setIsPlaying(false); // Initialize paused in standing posture per spec
    }

    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsReducedMotion(true);
        setIsPlaying(false);
      } else {
        setIsReducedMotion(false);
      }
    };
    motionQuery.addEventListener('change', handleMotionChange);

    // Check WebGL availability
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
      if (!gl) {
        setWebglSupported(false);
      }
    } catch {
      setWebglSupported(false);
    }

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  // 2. IntersectionObserver to gate frameloop when scrolled out of view
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  // 3. WebGL context loss listeners on canvas container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };

    const handleContextRestored = () => {
      setContextLost(false);
    };

    el.addEventListener('webglcontextlost', handleContextLost);
    el.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      el.removeEventListener('webglcontextlost', handleContextLost);
      el.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, []);

  // Throttled angle and phase update callback from ProceduralMannequin
  const handleAngleUpdate = useCallback((angle: number, phase: string) => {
    setCalculatedAngle(angle);
    setCurrentPhase(phase);
  }, []);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-5xl mx-auto flex flex-col gap-6"
    >
      {/* 3D Viewport or Static Fallback Container */}
      <div className="w-full aspect-[4/3] sm:aspect-[16/10] max-h-[580px] relative">
        {!webglSupported || contextLost ? (
          <StaticFallback
            isError={true}
            message={
              contextLost
                ? 'WebGL context was lost. Displaying 2D kinematic schematic.'
                : 'WebGL is unavailable in this environment. Displaying 2D kinematic schematic.'
            }
          />
        ) : (
          <MotionLabCanvas
            isVisible={isVisible}
            isPlaying={isPlaying}
            currentView={currentView}
            onAngleUpdate={handleAngleUpdate}
          />
        )}
      </div>

      {/* Accessible Control Panel */}
      <MotionLabControls
        currentView={currentView}
        onViewChange={setCurrentView}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        calculatedAngle={calculatedAngle}
        currentPhase={currentPhase}
      />
    </div>
  );
}
