import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-zinc-800/60 rounded-xl ${className}`}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-28 bg-zinc-900 border border-zinc-800 rounded-3xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-zinc-900 border border-zinc-800 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 bg-zinc-900 border border-zinc-800 rounded-2xl" />
        <div className="h-72 bg-zinc-900 border border-zinc-800 rounded-2xl" />
      </div>
    </div>
  );
}
