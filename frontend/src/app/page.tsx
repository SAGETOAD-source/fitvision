import React from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { EXERCISES_META } from "@/lib/exercises_data";

export default function Home() {
  const exerciseList = Object.values(EXERCISES_META);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col selection:bg-emerald-500 selection:text-black font-sans">
      <Navbar />

      <main className="flex-1">
        {/* ATHLETIC HERO SECTION */}
        <section className="relative overflow-hidden pt-20 pb-20 sm:pt-28 sm:pb-28 border-b border-zinc-900">
          {/* Athletic neon green backlight glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-emerald-500/10 rounded-full blur-[160px] pointer-events-none -z-10" />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Athletic Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider mb-8 shadow-lg shadow-emerald-950/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>BIOMECHANICAL COMPUTER VISION COACH</span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.06] uppercase">
              ELITE AI COACHING.{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                ZERO WEARABLES.
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Real-time rep counting and biomechanical form warnings powered by in-browser pose extraction and a 4-frame stabilized state classifier.
              <strong className="text-zinc-200 font-semibold block mt-1.5">
                100% on-device vision processing. Your video never leaves your device.
              </strong>
            </p>

            {/* High-Impact Athletic CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/workout?exercise=squat"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Launch Camera & Start Set</span>
              </Link>
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white font-black text-sm uppercase tracking-wider border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-center"
              >
                Create Athlete Account
              </Link>
            </div>

            {/* Performance Telemetry Strip */}
            <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto pt-10 border-t border-zinc-850">
              <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-850">
                <p className="text-2xl sm:text-3xl font-black text-white font-mono">6</p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black mt-1">Movement Models</p>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-850">
                <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">4-FRAME</p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black mt-1">Debounced Logic</p>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-850">
                <p className="text-2xl sm:text-3xl font-black text-white font-mono">100%</p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black mt-1">Local Camera</p>
              </div>
              <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-850">
                <p className="text-2xl sm:text-3xl font-black text-teal-400 font-mono">30+ FPS</p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black mt-1">Browser Tracking</p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-20 bg-zinc-950 border-b border-zinc-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-2">Training Architecture</h2>
              <p className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">How FitVision Operates</p>
              <p className="text-zinc-400 text-xs sm:text-sm mt-3">
                Zero wearables, zero calibration delays, and zero cloud video streaming.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 relative hover:border-zinc-700 transition">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-lg flex items-center justify-center mb-6">
                  01
                </div>
                <h3 className="text-lg font-black text-white uppercase mb-2">Position in Frame</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Open any exercise on your laptop or phone. FitVision loads Google MediaPipe directly in your browser's WebAssembly GPU memory.
                </p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 relative hover:border-zinc-700 transition">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-lg flex items-center justify-center mb-6">
                  02
                </div>
                <h3 className="text-lg font-black text-white uppercase mb-2">Execute Repetitions</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Our Random Forest model classifies rep phases with a 4-frame stabilization debounce, displaying giant 2-meter readable digits and real-time form cues.
                </p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 relative hover:border-zinc-700 transition">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black text-lg flex items-center justify-center mb-6">
                  03
                </div>
                <h3 className="text-lg font-black text-white uppercase mb-2">Log Verified Sets</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Save finished workout sets to your profile. Monitor 7-day activity volume, maintain consistency streaks, and progress toward your target physique.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SUPPORTED EXERCISES GRID */}
        <section id="features" className="py-20 border-b border-zinc-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-2">Movement Catalog</h2>
                <p className="text-3xl font-black text-white tracking-tight uppercase">Calibrated Movement Patterns</p>
                <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                  Biomechanical angles calibrated on real athletic training footage.
                </p>
              </div>
              <Link
                href="/exercises"
                className="mt-4 sm:mt-0 text-xs font-black uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1.5"
              >
                <span>Full Catalog</span>
                <span>→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {exerciseList.map((ex) => (
                <div
                  key={ex.key}
                  className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-lg">
                        {ex.icon}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-400 border border-zinc-700/50">
                        {ex.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white uppercase group-hover:text-emerald-400 transition">
                      {ex.name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed line-clamp-2">
                      {ex.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-4">
                      <span className="px-2 py-0.5 rounded bg-zinc-950 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                        {ex.primaryMuscle}
                      </span>
                      {ex.secondaryMuscles.slice(0, 2).map((muscle) => (
                        <span
                          key={muscle}
                          className="px-2 py-0.5 rounded bg-zinc-950 text-[10px] font-medium text-zinc-400 border border-zinc-800"
                        >
                          {muscle}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-zinc-500 tracking-wider">
                      Count on {ex.countDirection}
                    </span>
                    <Link
                      href={`/workout?exercise=${ex.key}`}
                      className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-zinc-950 font-black text-xs uppercase tracking-wider active:scale-95 transition"
                    >
                      Start Set
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRIVACY GUARANTEE */}
        <section className="py-20 border-b border-zinc-900">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-emerald-500/30 rounded-3xl p-8 sm:p-12 relative overflow-hidden">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider mb-6">
                  <span>🔒</span>
                  <span>Zero Cloud Video Transmission</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                  Your Video Never Leaves Your Device.
                </h2>

                <p className="mt-4 text-zinc-400 text-xs sm:text-sm leading-relaxed">
                  Unlike traditional fitness apps that stream your private webcam feed to third-party cloud servers, FitVision runs the entire pose-estimation model locally in your browser's WebAssembly memory.
                </p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Video frames are processed on-device via WebAssembly/WebGL</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>No audio or video streams are ever uploaded or transmitted</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-300">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Only final completed rep numbers and timestamps save to your profile</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA BANNER */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase">
              Ready to Upgrade Your Form?
            </h2>
            <p className="mt-4 text-zinc-400 text-xs sm:text-sm max-w-xl mx-auto">
              Jump straight into a live workout without an account, or sign up in seconds to track workouts and build streaks.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/workout?exercise=squat"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/25 transition"
              >
                Start Live Workout Now
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-sm uppercase tracking-wider border border-zinc-800 transition"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ATHLETIC FOOTER */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center text-black font-black text-[10px]">
              FV
            </span>
            <span className="font-black text-zinc-300 uppercase tracking-wider">FITVISION</span>
            <span>— Biomechanical AI Fitness Engine</span>
          </div>

          <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-wider">
            <Link href="/exercises" className="hover:text-zinc-300 transition">
              Exercises
            </Link>
            <Link href="/routines" className="hover:text-zinc-300 transition">
              Routines
            </Link>
            <Link href="/history" className="hover:text-zinc-300 transition">
              History
            </Link>
            <Link href="/m0" className="hover:text-zinc-300 transition">
              M0 Benchmark
            </Link>
          </div>

          <p>© {new Date().getFullYear()} FitVision. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
