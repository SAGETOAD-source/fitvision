import React from 'react';
import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="bg-[#0B0B0C] border-t border-[#1A1A1E] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand & Copy */}
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <Link
            href="/"
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4D6D] rounded"
            aria-label="FitVision Home"
          >
            <span className="font-headline text-lg font-black text-white uppercase tracking-wider">
              FITVISION<span className="text-[#FF4D6D] text-xs align-super ml-0.5 font-mono">®</span>
            </span>
          </Link>
          <span className="hidden sm:inline text-neutral-600 font-mono">•</span>
          <p className="text-xs text-neutral-400 font-sans">
            © 2026 FitVision. No video frames transmitted. Camera frames never leave your device.
          </p>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-wrap justify-center items-center gap-6 text-xs font-mono text-neutral-400">
          <a
            href="#privacy"
            className="hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4D6D] rounded"
          >
            Privacy Architecture
          </a>
          <a
            href="#workflow"
            className="hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4D6D] rounded"
          >
            Workflow
          </a>
          <a
            href="#exercises"
            className="hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4D6D] rounded"
          >
            Exercises
          </a>
          <Link
            href="/motion-lab"
            className="hover:text-[#FF4D6D] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4D6D] rounded"
          >
            Motion Lab Prototype
          </Link>
          <a
            href="#architecture"
            className="hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FF4D6D] rounded"
          >
            Architecture
          </a>
        </div>
      </div>
    </footer>
  );
}

