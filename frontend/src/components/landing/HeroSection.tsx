import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function HeroSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-20 sm:pb-24" id="experience">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Athletic Campaign Messaging */}
        <div className="lg:col-span-6 flex flex-col space-y-6 sm:space-y-8">
          {/* Status Pill Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#FF4D6D]/10 border border-[#FF4D6D]/40 w-fit">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D6D] animate-pulse" />
            <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase text-white font-mono">
              YOUR VIDEO NEVER LEAVES YOUR DEVICE
            </span>
          </div>

          {/* Approved Headline Hierarchy */}
          <h1 className="flex flex-col tracking-tight text-white">
            <span className="font-headline text-5xl sm:text-6xl lg:text-[76px] leading-[0.96] font-black uppercase tracking-tight text-white">
              YOUR BODY.
            </span>
            <span className="font-headline text-5xl sm:text-6xl lg:text-[76px] leading-[0.96] font-black uppercase tracking-tight text-white mt-1">
              YOUR DATA.
            </span>
            <span className="font-serif italic text-4xl sm:text-5xl lg:text-[68px] leading-[1.08] text-white/90 font-normal mt-2 uppercase tracking-tight">
              YOUR EVOLUTION.
            </span>
          </h1>

          {/* Subhead */}
          <p className="text-base sm:text-lg text-neutral-300 leading-relaxed max-w-xl font-sans">
            Train with intelligence. Improve with every repetition. Real-time computer vision fitness coaching directly in your browser with private, on-device pose tracking.
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/workout?exercise=squat"
              className="h-[52px] px-8 rounded-full bg-[#6D001A] hover:bg-[#851630] text-white text-xs font-bold tracking-wider uppercase flex items-center gap-2 transition-all duration-150 active:scale-95 shadow-xl shadow-[#6D001A]/40 border border-[#FF4D6D]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D6D] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <span>START TRAINING</span>
              <span className="text-base leading-none">↗</span>
            </Link>
            <a
              href="#workflow"
              className="h-[52px] px-7 rounded-full bg-[#0B0B0C] border border-white/20 hover:border-white/50 text-white text-xs font-semibold tracking-wider uppercase flex items-center justify-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D6D]"
            >
              EXPLORE WORKFLOW
            </a>
          </div>

          {/* Telemetry Chips */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="px-3.5 py-1.5 rounded-full bg-[#131314] card-border flex items-center gap-2">
              <span className="text-xs text-white font-medium">⚡ Real-Time Pose Tracking</span>
            </div>
            <div className="px-3.5 py-1.5 rounded-full bg-[#131314] card-border flex items-center gap-2">
              <span className="text-xs text-white font-medium">🔒 In-Browser Processing</span>
            </div>
            <div className="px-3.5 py-1.5 rounded-full bg-[#131314] card-border flex items-center gap-2">
              <span className="text-xs text-white font-medium">🎯 33 Skeletal Keypoints</span>
            </div>
          </div>
        </div>

        {/* Right Column: HUD Visual Showcase */}
        <div className="lg:col-span-6">
          <div className="relative rounded-3xl overflow-hidden card-border bg-[#0B0B0C] shadow-2xl">
            {/* Visual Hero Photograph & Live HUD Overlay */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
              <Image
                src="/images/hero-athlete.png"
                alt="FitVision real-time pose tracking HUD athletic preview"
                fill
                priority
                className="object-cover object-center filter contrast-105 brightness-95"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />

              {/* Top Telemetry Status Bar */}
              <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md card-border">
                  <span className="w-2 h-2 rounded-full bg-[#FF4D6D] animate-pulse" />
                  <span className="text-[10px] sm:text-xs font-mono font-bold text-white tracking-wider">
                    LIVE CAMERA (LOCAL ONLY)
                  </span>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md card-border text-[10px] sm:text-xs font-mono font-semibold text-[#FF4D6D] tracking-wider uppercase">
                  ILLUSTRATIVE PREVIEW
                </div>
              </div>

              {/* Illustrative Knee Angle Node */}
              <div className="absolute bottom-20 sm:bottom-24 left-4 sm:left-6 bg-black/85 backdrop-blur-md card-border rounded-2xl p-3 flex items-center gap-3 pointer-events-none">
                <div className="w-8 h-8 rounded-full border-2 border-[#FF4D6D] flex items-center justify-center text-xs font-mono font-bold text-[#FF4D6D]">
                  88°
                </div>
                <div>
                  <div className="text-[10px] font-mono text-[#DEBFBF] font-medium">Joint Angle (Illustrative)</div>
                  <div className="text-xs text-white font-bold">Good Squat Depth</div>
                </div>
              </div>

              {/* Illustrative Giant 2-Meter Readable Rep Counter Card */}
              <div className="absolute top-16 right-4 sm:right-6 bg-[#6D001A]/90 backdrop-blur-md border border-[#FF4D6D]/40 rounded-2xl px-5 py-3 text-center shadow-lg pointer-events-none">
                <div className="text-[10px] font-mono text-white/80 uppercase tracking-widest font-bold">
                  Active Set (Preview)
                </div>
                <div className="font-headline text-3xl sm:text-4xl text-white font-black leading-none mt-0.5">
                  12
                </div>
                <div className="text-[10px] font-mono text-[#FF4D6D] font-bold mt-1">REP COUNT</div>
              </div>

              {/* Form Quality Badge */}
              <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 bg-black/85 backdrop-blur-md card-border rounded-full px-4 py-2 flex items-center gap-2.5 pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-[#FF4D6D] ring-2 ring-[#FF4D6D]/30" />
                <span className="text-xs text-white font-semibold">Form: Good Depth (Preview)</span>
              </div>
            </div>

            {/* Bottom Telemetry Strip */}
            <div className="px-5 py-3 sm:py-4 bg-[#0B0B0C] border-t border-[#1A1A1E] flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#DEBFBF] text-xs font-mono">
                <svg className="w-4 h-4 text-[#FF4D6D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <span>On-Device Canvas Pipeline</span>
              </div>
              <div className="flex items-center gap-2 text-white text-xs font-mono font-bold">
                <svg className="w-4 h-4 text-[#FF4D6D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>NO VIDEO FRAMES TRANSMITTED</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
