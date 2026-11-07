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
      <Link
        href="/m0"
        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg shadow-lg transition"
      >
        Launch Milestone 0 (M0) Prototype
      </Link>
    </main>
  );
}

