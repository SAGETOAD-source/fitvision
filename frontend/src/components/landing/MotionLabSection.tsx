"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import StaticFallback from "@/components/motion-lab/StaticFallback";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";

// Dynamically import MotionLabClient with ssr: false so neither Three.js
// nor MotionLabClient code is bundled into the initial static payload
const MotionLabClient = dynamic(
  () => import("@/components/motion-lab/MotionLabClient"),
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
    if (!el || typeof IntersectionObserver === "undefined") {
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
      { rootMargin: "250px" }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-16 sm:py-24"
      id="motion-lab"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-6">
        <div className="space-y-3">
          <SectionLabel>Interactive 3D Prototype</SectionLabel>
          <div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white font-black uppercase tracking-tight">
              Procedural Kinematic Mannequin
            </h2>
            <div aria-hidden="true" className="w-14 h-1 bg-brand mt-4" />
          </div>
        </div>

        <div className="flex flex-col md:items-end gap-3">
          <p className="text-xs sm:text-sm text-text-muted max-w-md font-sans leading-relaxed md:text-right">
            Continuous inverse kinematics, vector-derived knee angles, and interactive camera orbits running in WebGL.
          </p>
          <Button variant="ghost" size="sm" href="/motion-lab">
            Open Standalone Lab
          </Button>
        </div>
      </div>

      {/* Embedded Motion Lab Client Stage: Genuinely deferred until within 250px of viewport */}
      <Card variant="default" padding="none" className="p-4 sm:p-6 lg:p-8">
        {isNearViewport ? (
          <MotionLabClient />
        ) : (
          <StaticFallback
            message="Interactive 3D Biomechanics Lab (Scroll into view to load WebGL)"
            onActivate={() => setIsNearViewport(true)}
          />
        )}
      </Card>
    </section>
  );
}
