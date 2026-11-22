"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { MenuOverlay } from "@/components/layout/MenuOverlay";

export default function LandingNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const desktopMenuBtnRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuBtnRef = useRef<HTMLButtonElement | null>(null);
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null);

  const openMenu = (source: "desktop" | "mobile") => {
    activeTriggerRef.current =
      source === "desktop" ? desktopMenuBtnRef.current : mobileMenuBtnRef.current;
    setMenuOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-gradient-to-b from-bg-base via-bg-base/95 to-bg-base/80 backdrop-blur-md border-b border-border-subtle">
        {/* Tier 1 (Desktop Utility Bar) */}
        <div className="hidden md:block border-b border-border-subtle bg-bg-base/90">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.14em] text-text-muted">
            <span className="text-white/60">On-Device Pose Tracking</span>
            <div className="flex items-center gap-6">
              <a
                href="#motion-lab"
                className="hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Motion Lab
              </a>
              <a
                href="#architecture"
                className="hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Architecture
              </a>
              <a
                href="#privacy"
                className="hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Privacy
              </a>
              <span aria-hidden="true" className="h-3 w-px bg-border-subtle" />
              <button
                type="button"
                onClick={() => openMenu("desktop")}
                data-testid="navbar-account-slot"
                className="inline-flex items-center gap-1.5 text-white/80 hover:text-accent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
                aria-label="Account options in menu"
              >
                <svg
                  className="w-3.5 h-3.5 text-accent"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span>Account</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tier 2 (Main Navigation Bar) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
          {/* Left: Brand Wordmark */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shrink-0"
            aria-label="FitVision Home"
          >
            <span className="font-display text-base sm:text-xl lg:text-2xl font-black text-white tracking-wider uppercase">
              FITVISION
            </span>
          </Link>

          {/* Center: 3 Desktop Links */}
          <nav
            className="hidden md:flex items-center gap-8 text-xs font-display font-bold uppercase tracking-[0.14em] text-text-muted"
            aria-label="Main Navigation"
          >
            <a
              href="#experience"
              className="hover:text-white transition-colors duration-150 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Experience
            </a>
            <a
              href="#workflow"
              className="hover:text-white transition-colors duration-150 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Workflow
            </a>
            <a
              href="#exercises"
              className="hover:text-white transition-colors duration-150 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Exercises
            </a>
          </nav>

          {/* Right (Desktop): Signature CTA + Circular Menu Trigger */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <Button variant="primary" size="sm" href="/workout?exercise=squat">
              START TRAINING
            </Button>
            <button
              ref={desktopMenuBtnRef}
              type="button"
              onClick={() => openMenu("desktop")}
              aria-expanded={menuOpen}
              aria-controls="site-menu-overlay"
              aria-label="Open navigation menu"
              data-testid="navbar-menu-button-desktop"
              className="w-11 h-11 rounded-full bg-surface border border-white/30 hover:border-accent hover:bg-brand text-white inline-flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base cursor-pointer shrink-0"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" d="M4 8h16M4 16h16" />
              </svg>
              <span className="font-display text-[7px] font-bold uppercase tracking-widest leading-none">
                MENU
              </span>
            </button>
          </div>

          {/* Right (Mobile): Compact Signature CTA + Circular Menu Trigger */}
          <div className="flex md:hidden items-center gap-2 shrink-0">
            <Button variant="primary" size="sm" href="/workout?exercise=squat">
              TRAIN
            </Button>
            <button
              ref={mobileMenuBtnRef}
              type="button"
              onClick={() => openMenu("mobile")}
              aria-expanded={menuOpen}
              aria-controls="site-menu-overlay"
              aria-label="Open navigation menu"
              data-testid="navbar-menu-button-mobile"
              className="w-10 h-10 rounded-full bg-surface border border-white/30 hover:border-accent hover:bg-brand text-white inline-flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base cursor-pointer shrink-0"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" d="M4 8h16M4 16h16" />
              </svg>
              <span className="font-display text-[7px] font-bold uppercase tracking-widest leading-none">
                MENU
              </span>
            </button>
          </div>
        </div>
      </header>

      <MenuOverlay
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        triggerRef={activeTriggerRef}
      />
    </>
  );
}
