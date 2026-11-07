import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-emerald-400 mb-4">
        FitVision AI Coach
      </h1>
      <p className="max-w-xl text-lg text-slate-300 mb-8">
        Privacy-first browser-based rep counter & form feedback engine powered by MediaPipe and Random Forest.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/workout?exercise=squat"
          className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold rounded-xl shadow-lg transition"
        >
          Start Live Workout
        </Link>
        <Link
          href="/m0"
          className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition"
        >
          M0 Parity Benchmark
        </Link>
      </div>
    </main>
  );
}

