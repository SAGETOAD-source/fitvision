'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-[#1A1A1E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        {/* Brand Mark */}
        <Link
          href="/"
          className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D6D] rounded-lg p-1"
          aria-label="FitVision Home"
        >
          <span className="font-headline text-xl sm:text-2xl font-black text-white tracking-wider uppercase">
            FITVISION
            <span className="text-[#FF4D6D] text-xs align-super ml-0.5 font-mono">®</span>
          </span>
        </Link>

        {/* Desktop Nav Items */}
        <nav
          className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-neutral-300"
          aria-label="Main Navigation"
        >
          <a
            href="#experience"
            className="hover:text-white transition-colors duration-150 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4D6D] rounded"
          >
            Experience
          </a>
          <a
            href="#workflow"
            className="hover:text-white transition-colors duration-150 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4D6D] rounded"
          >
            Workflow
          </a>
          <a
            href="#exercises"
            className="hover:text-white transition-colors duration-150 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4D6D] rounded"
          >
            Exercises
          </a>
          <a
            href="#motion-lab"
            className="hover:text-white transition-colors duration-150 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4D6D] rounded"
          >
            Motion Lab
          </a>
          <a
            href="#architecture"
            className="hover:text-white transition-colors duration-150 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4D6D] rounded"
          >
            Architecture
          </a>
          <a
            href="#privacy"
            className="hover:text-white transition-colors duration-150 py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4D6D] rounded"
          >
            Privacy
          </a>
        </nav>

        {/* Trailing CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/workout?exercise=squat"
            className="h-10 px-6 rounded-full bg-[#6D001A] hover:bg-[#851630] text-white text-xs font-bold tracking-wider uppercase transition-all duration-150 active:scale-95 shadow-md shadow-[#6D001A]/30 border border-[#FF4D6D]/30 inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D6D] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            START TRAINING ↗
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/workout?exercise=squat"
            className="h-9 px-4 rounded-full bg-[#6D001A] hover:bg-[#851630] text-white text-[11px] font-bold tracking-wider uppercase inline-flex items-center justify-center border border-[#FF4D6D]/30"
          >
            TRAIN ↗
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-[#1A1A1E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D6D]"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle Navigation Menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {mobileMenuOpen ? (
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
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0B0B0C] border-b border-[#1A1A1E] px-4 py-5 flex flex-col gap-4 text-sm font-semibold uppercase tracking-wider text-neutral-300">
          <a
            href="#experience"
            onClick={() => setMobileMenuOpen(false)}
            className="hover:text-white py-1 transition-colors"
          >
            Experience
          </a>
          <a
            href="#workflow"
            onClick={() => setMobileMenuOpen(false)}
            className="hover:text-white py-1 transition-colors"
          >
            Workflow
          </a>
          <a
            href="#exercises"
            onClick={() => setMobileMenuOpen(false)}
            className="hover:text-white py-1 transition-colors"
          >
            Exercises
          </a>
          <a
            href="#motion-lab"
            onClick={() => setMobileMenuOpen(false)}
            className="hover:text-white py-1 transition-colors"
          >
            Motion Lab
          </a>
          <a
            href="#architecture"
            onClick={() => setMobileMenuOpen(false)}
            className="hover:text-white py-1 transition-colors"
          >
            Architecture
          </a>
          <a
            href="#privacy"
            onClick={() => setMobileMenuOpen(false)}
            className="hover:text-white py-1 transition-colors"
          >
            Privacy
          </a>
          <div className="pt-2 border-t border-[#1A1A1E]">
            <Link
              href="/workout?exercise=squat"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full h-11 rounded-full bg-[#6D001A] text-white text-xs font-bold tracking-wider uppercase inline-flex items-center justify-center border border-[#FF4D6D]/30"
            >
              START TRAINING ↗
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

