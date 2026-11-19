import React from "react";

export interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
}

export default function StatCard({
  label,
  value,
  subtext,
  icon,
  trend,
  trendPositive = true,
}: StatCardProps) {
  return (
    <div className="relative overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-zinc-750 hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] uppercase font-black tracking-widest text-zinc-400">
          {label}
        </span>
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-emerald-400 select-none">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
          {value}
        </div>
        {trend && (
          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
              trendPositive
                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50"
                : "bg-red-950/80 text-red-400 border border-red-800/50"
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {subtext && (
        <p className="text-xs text-zinc-400 mt-2 font-medium">
          {subtext}
        </p>
      )}
    </div>
  );
}
