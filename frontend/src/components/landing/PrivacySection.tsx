import React from 'react';

export default function PrivacySection() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20" id="privacy">
      <div className="rounded-3xl bg-[#0B0B0C] card-border p-6 sm:p-10 lg:p-12 relative overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-[#6D001A]/20 blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Header Column */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#6D001A] flex items-center justify-center neon-glow">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="font-headline text-2xl sm:text-3xl lg:text-4xl text-white font-extrabold tracking-tight">
              Your video never leaves your device
            </h2>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF4D6D]/10 border border-[#FF4D6D]/30 w-fit">
              <span className="w-2 h-2 rounded-full bg-[#FF4D6D]" />
              <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
                CLIENT-SIDE PRIVACY ARCHITECTURE
              </span>
            </div>
            <p className="text-sm text-neutral-300 leading-relaxed pt-2">
              FitVision is architected around on-device computer vision. We strictly separate camera processing from account data synchronization.
            </p>
          </div>

          {/* Cards Column */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Local Camera Execution */}
            <div className="p-6 rounded-2xl bg-[#131314] card-border flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3 text-white font-headline text-lg font-bold">
                  <span className="w-8 h-8 rounded-lg bg-[#201F20] flex items-center justify-center text-[#FF4D6D]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </span>
                  In-Browser Camera Processing
                </div>
                <p className="text-xs sm:text-sm text-[#DEBFBF] leading-relaxed">
                  Camera frames are processed entirely inside your local browser session using WebAssembly pose models. No video stream, raw pixel buffer, or camera recording is ever uploaded or transmitted across the network.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#1A1A1E] text-[11px] font-mono text-[#FF4D6D] font-semibold">
                ✓ No Video Frames Transmitted
              </div>
            </div>

            {/* Card 2: Workout Summary Sync */}
            <div className="p-6 rounded-2xl bg-[#131314] card-border flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3 text-white font-headline text-lg font-bold">
                  <span className="w-8 h-8 rounded-lg bg-[#201F20] flex items-center justify-center text-[#FF4D6D]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </span>
                  Workout Summary Sync
                </div>
                <p className="text-xs sm:text-sm text-[#DEBFBF] leading-relaxed">
                  Only verified session metadata—such as total repetition counts, completed exercise identifiers, and workout duration—is synchronized to your account profile to track personal progress and streaks.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#1A1A1E] text-[11px] font-mono text-white/70">
                ✓ Numeric Summary Only
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
