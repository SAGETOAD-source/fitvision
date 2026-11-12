'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import StaticFallback from '@/components/motion-lab/StaticFallback';

// Dynamically import MotionLabClient with ssr: false so neither Three.js
// nor MotionLabClient code is bundled into the initial static payload
const MotionLabClient = dynamic(
  () => import('@/components/motion-lab/MotionLabClient'),
  {
    ssr: false,
    loading: () => <StaticFallback message="Initializing 3D Biomechanics..." />,
  }
);

export default function MotionLabSection() {
  const [isNearViewport, setIsNearViewport] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsNearViewport(true);
          observer.disconnect(); // One-shot trigger: disconnects immediately! Zero duplicate observers!
        }
      },
      { rootMargin: '250px' }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20"
      id="motion-lab"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-10 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF4D6D]/10 border border-[#FF4D6D]/30 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#FF4D6D]" />
            <span className="text-[11px] font-mono font-bold text-[#FF4D6D] uppercase tracking-wider">
              INTERACTIVE 3D PROTOTYPE
            </span>
          </div>
          <h2 className="font-headline text-3xl sm:text-4xl text-white font-extrabold tracking-tight">
            Procedural Kinematic Mannequin
          </h2>
        </div>
        <div className="flex flex-col md:items-end gap-2">
          <p className="text-xs sm:text-sm text-neutral-300 max-w-md font-sans">
            Continuous inverse kinematics, vector-derived knee angles, and interactive camera orbits running in WebGL.
          </p>
          <Link
            href="/motion-lab"
            className="text-xs font-mono text-[#FF4D6D] hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4D6D] rounded"
          >
            Open Standalone Lab ↗
          </Link>
        </div>
      </div>

      {/* Embedded Motion Lab Client Stage: Genuinely deferred until within 250px of viewport */}
      <div className="rounded-3xl bg-[#0B0B0C] card-border p-4 sm:p-6 lg:p-8">
        {isNearViewport ? (
          <MotionLabClient />
        ) : (
          <StaticFallback
            message="Interactive 3D Biomechanics Lab (Scroll into view to load WebGL)"
            onActivate={() => setIsNearViewport(true)}
          />
        )}
      </div>
    </section>
  );
}


