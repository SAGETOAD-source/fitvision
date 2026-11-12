import React from 'react';
import Link from 'next/link';

export default function CtaSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <div className="rounded-3xl bg-[#6D001A] p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden shadow-2xl border border-[#FF4D6D]/30">
        {/* Glow backdrop */}
        <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-40" />

        <div className="max-w-2xl mx-auto relative z-10 flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-6 neon-glow border border-white/20">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h2 className="font-headline text-3xl sm:text-4xl lg:text-5xl text-white font-black tracking-tight mb-4">
            Ready to Train in Private?
          </h2>

          <p className="text-sm sm:text-base text-white/90 mb-8 max-w-xl font-sans leading-relaxed">
            Launch your camera-guided session with complete on-device privacy. Real-time form cues, instant rep counting, and zero video transmission.
          </p>

          <Link
            href="/workout?exercise=squat"
            className="h-[52px] px-8 rounded-full bg-white text-[#6D001A] font-headline text-sm font-black flex items-center gap-3 hover:bg-white/90 active:scale-95 transition-all shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#6D001A]"
            aria-label="Start Live Squat Workout"
          >
            <span>START TRAINING ↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
