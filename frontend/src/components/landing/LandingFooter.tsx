"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useOptionalAuth } from "@/components/auth/AuthProvider";

export default function LandingFooter() {
  const { user } = useOptionalAuth();
  const accountHref = user ? "/routines" : "/login";

  return (
    <footer className="bg-surface border-t border-border-subtle pt-14 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top Row: Brand left, 2 link columns middle, primary CTA + My account right */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-border-subtle">
          {/* Left: Logo & honest privacy copy */}
          <div className="md:col-span-4 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="FitVision Home"
            >
              <span className="font-display text-xl font-black text-white uppercase tracking-wider">
                FITVISION
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-text-muted font-sans leading-relaxed max-w-xs">
              On-device computer vision fitness coaching. No video frames transmitted. Camera frames never leave your device.
            </p>
          </div>

          {/* Middle Column 1: Training links */}
          <div className="md:col-span-2 space-y-3">
            <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
              Training
            </h2>
            <ul className="space-y-2.5 text-xs font-mono text-text-muted list-none m-0 p-0">
              <li>
                <a
                  href="/#experience"
                  className="hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Experience
                </a>
              </li>
              <li>
                <a
                  href="/#workflow"
                  className="hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Workflow
                </a>
              </li>
              <li>
                <a
                  href="/#exercises"
                  className="hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Exercises
                </a>
              </li>
              <li>
                <Link
                  href="/motion-lab"
                  className="hover:text-accent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Motion Lab Prototype
                </Link>
              </li>
            </ul>
          </div>

          {/* Middle Column 2: System links */}
          <div className="md:col-span-2 space-y-3">
            <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
              System
            </h2>
            <ul className="space-y-2.5 text-xs font-mono text-text-muted list-none m-0 p-0">
              <li>
                <a
                  href="/#architecture"
                  className="hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Architecture
                </a>
              </li>
              <li>
                <a
                  href="/#privacy"
                  className="hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Privacy Architecture
                </a>
              </li>
              <li>
                <Link
                  href="/workout?exercise=squat"
                  className="hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Live Workout
                </Link>
              </li>
            </ul>
          </div>

          {/* Right: Signature Primary CTA + Underlined "My account" link */}
          <div className="md:col-span-4 flex flex-col items-start md:items-end justify-between gap-5">
            <Button variant="primary" size="md" href="/workout?exercise=squat">
              START TRAINING
            </Button>

            <Link
              href={accountHref}
              data-testid="footer-account-slot"
              className="text-xs font-mono uppercase tracking-wider text-text-muted hover:text-white underline underline-offset-4 decoration-brand hover:decoration-accent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              My account
            </Link>
          </div>
        </div>

        {/* Bottom Legal Row: legal links, copyright, Back to top */}
        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono text-text-muted">
          <p>© 2026 FitVision. No video frames transmitted.</p>

          <div className="flex flex-wrap items-center gap-6">
            <a
              href="/#privacy"
              className="hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Privacy Policy
            </a>
            <a
              href="/#architecture"
              className="hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              On-Device Guarantee
            </a>
            <a
              href="#top"
              className="inline-flex items-center gap-1.5 text-white hover:text-accent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span>Back to top</span>
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 13V3M3.5 7.5L8 3l4.5 4.5" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
