"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth_context";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner group-hover:border-emerald-500/60 transition">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <div className="font-black text-xl tracking-tight text-white flex items-center gap-1.5 font-sans">
              <span>FITVISION</span>
              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 tracking-wider">
                AI
              </span>
            </div>
            <p className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 -mt-0.5">
              Performance Vision Coach
            </p>
          </div>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-zinc-400">
          <Link
            href="/#features"
            className="hover:text-emerald-400 transition"
          >
            Features
          </Link>
          <Link
            href="/#how-it-works"
            className="hover:text-emerald-400 transition"
          >
            How it Works
          </Link>
          <Link
            href="/exercises"
            className={`transition hover:text-emerald-400 ${
              pathname === "/exercises" ? "text-emerald-400" : ""
            }`}
          >
            Exercises
          </Link>
          <Link
            href="/routines"
            className={`transition hover:text-emerald-400 ${
              pathname === "/routines" ? "text-emerald-400" : ""
            }`}
          >
            Routines
          </Link>
          {isAuthenticated && (
            <Link
              href="/dashboard"
              className={`transition hover:text-emerald-400 ${
                pathname === "/dashboard" ? "text-emerald-400" : ""
              }`}
            >
              Dashboard
            </Link>
          )}
        </nav>

        {/* Desktop CTA / Auth */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                href="/workout?exercise=squat"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Live Workout</span>
              </Link>
              <button
                onClick={logout}
                className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <span>Get Started</span>
                <span className="text-sm">→</span>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
          className="md:hidden p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {mobileOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="md:hidden border-b border-zinc-800 bg-zinc-950 p-6 space-y-4">
          <nav className="flex flex-col gap-3 font-bold text-xs uppercase tracking-wider">
            <Link
              href="/#features"
              onClick={() => setMobileOpen(false)}
              className="text-zinc-300 hover:text-emerald-400 py-1"
            >
              Features
            </Link>
            <Link
              href="/#how-it-works"
              onClick={() => setMobileOpen(false)}
              className="text-zinc-300 hover:text-emerald-400 py-1"
            >
              How it Works
            </Link>
            <Link
              href="/exercises"
              onClick={() => setMobileOpen(false)}
              className="text-zinc-300 hover:text-emerald-400 py-1"
            >
              Exercises
            </Link>
            <Link
              href="/routines"
              onClick={() => setMobileOpen(false)}
              className="text-zinc-300 hover:text-emerald-400 py-1"
            >
              Routines
            </Link>
            {isAuthenticated && (
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="text-emerald-400 font-bold py-1"
              >
                Dashboard
              </Link>
            )}
          </nav>
          <div className="pt-4 border-t border-zinc-800/80 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  href="/workout?exercise=squat"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-3 text-center bg-emerald-500 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  Start Live Workout
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileOpen(false);
                  }}
                  className="w-full py-2.5 text-center text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-2.5 text-center text-xs font-bold uppercase tracking-wider text-zinc-300 border border-zinc-800 rounded-xl"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-3 text-center bg-emerald-500 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
