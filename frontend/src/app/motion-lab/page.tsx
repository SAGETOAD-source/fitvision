import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import MotionLabClient from '@/components/motion-lab/MotionLabClient';

export const metadata: Metadata = {
  title: 'Motion Lab — FitVision Procedural 3D Squat Prototype',
  description:
    'Isolated prototype demonstrating procedural 3D squat kinematics with mathematical joint-angle evaluation and accessible controls.',
};

export default function MotionLabPage() {
  return (
    <div className="min-h-screen bg-black text-white antialiased flex flex-col selection:bg-[#6D001A] selection:text-white">
      {/* Top Header */}
      <header className="w-full border-b border-[#1A1A1E] bg-[#0B0B0C]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-mono text-base font-extrabold tracking-wider text-white uppercase hover:opacity-80 transition-opacity"
            >
              FITVISION<span className="text-[#FF4D6D] text-xs align-super ml-0.5">®</span>
            </Link>
            <span className="text-[#1A1A1E] font-mono">•</span>
            <span className="font-mono text-xs text-[#FF4D6D] tracking-widest uppercase font-semibold">
              MOTION LAB
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px] text-white/50 tracking-wider uppercase hidden sm:inline">
              PROTOTYPE V1.0
            </span>
            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-full bg-[#161618] hover:bg-[#202024] text-white text-xs font-mono font-medium border border-[#1A1A1E] transition-colors"
            >
              ← Back to App
            </Link>
          </div>
        </div>
      </header>

      {/* Main Prototype Stage */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        {/* Title and Intro */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#FF4D6D]/10 border border-[#FF4D6D]/30">
            <span className="w-2 h-2 rounded-full bg-[#FF4D6D]" />
            <span className="font-mono text-[10px] text-[#FF4D6D] uppercase tracking-wider font-bold">
              ISOLATED BIOMECHANICAL PROTOTYPE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono uppercase">
            Procedural Squat Demonstrator
          </h1>
          <p className="text-sm sm:text-base text-neutral-400 max-w-3xl leading-relaxed">
            Procedural articulated mannequin animated through a continuous 5-phase squat cycle via 2-segment analytical inverse kinematics. Joint angles are evaluated in real time from animated 3D coordinates.
          </p>
        </div>

        {/* 3D Motion Lab Client Component */}
        <MotionLabClient />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#1A1A1E] py-6 bg-[#0B0B0C] text-center">
        <p className="font-mono text-xs text-neutral-500">
          FitVision Motion Lab • Next.js 14 / React 18 / React Three Fiber v8 • Zero External GLTF Assets
        </p>
      </footer>
    </div>
  );
}
