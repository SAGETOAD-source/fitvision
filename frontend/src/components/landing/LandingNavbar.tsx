"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { MenuOverlay } from "@/components/layout/MenuOverlay";
import { useOptionalAuth } from "@/components/auth/AuthProvider";

export default function LandingNavbar() {
  const [pathname, setPathname] = useState("/");
  const { user, logout } = useOptionalAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const desktopMenuBtnRef = useRef<HTMLButtonElement | null>(null);
  const mobileMenuBtnRef = useRef<HTMLButtonElement | null>(null);
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncPath = () => setPathname(window.location.pathname || "/");
    syncPath();
    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) return;

    let rafId = 0;
    const updateProgress = () => {
      rafId = 0;
      const bar = progressBarRef.current;
      if (!bar) return;
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const ratio = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      bar.style.transform = `scaleX(${ratio})`;
    };

    const onScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateProgress);
      }
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [pathname]);

  const openMenu = (source: "desktop" | "mobile") => {
    activeTriggerRef.current =
      source === "desktop" ? desktopMenuBtnRef.current : mobileMenuBtnRef.current;
    setMenuOpen(true);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      if (typeof window !== "undefined") {
        window.location.assign("/");
      }
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-gradient-to-b from-bg-base via-bg-base/95 to-bg-base/80 backdrop-blur-md border-b border-border-subtle">
        {/* Tier 1 (Desktop Utility Bar) */}
        <div className="hidden md:block border-b border-border-subtle bg-bg-base/90">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.14em] text-text-muted">
            <span className="text-white/60">On-Device Pose Tracking</span>
            <div className="flex items-center gap-6">
              <Link
                href="/routines"
                aria-current={pathname === "/routines" ? "page" : undefined}
                className={`transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  pathname === "/routines" ? "text-white font-bold" : "hover:text-white"
                }`}
              >
                Routines
              </Link>
              <a
                href="/#motion-lab"
                className="hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Motion Lab
              </a>
              <a
                href="/#architecture"
                className="hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Architecture
              </a>
              <a
                href="/#privacy"
                className="hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Privacy
              </a>
              <span aria-hidden="true" className="h-3 w-px bg-border-subtle" />

              {user ? (
                <div
                  data-testid="navbar-account-slot"
                  className="flex items-center gap-4"
                >
                  <Link
                    href="/dashboard"
                    aria-current={pathname === "/dashboard" ? "page" : undefined}
                    className={`transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      pathname === "/dashboard"
                        ? "text-white font-bold underline underline-offset-4 decoration-accent"
                        : "text-accent hover:text-white"
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/history"
                    aria-current={pathname === "/history" ? "page" : undefined}
                    className={`transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      pathname === "/history"
                        ? "text-white font-bold underline underline-offset-4 decoration-accent"
                        : "hover:text-white"
                    }`}
                  >
                    History
                  </Link>
                  <Link
                    href="/profile"
                    aria-current={pathname === "/profile" ? "page" : undefined}
                    className={`inline-flex items-center gap-1.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent max-w-[180px] truncate ${
                      pathname === "/profile"
                        ? "text-accent font-bold"
                        : "text-white hover:text-accent"
                    }`}
                    title={user.email}
                  >
                    <svg
                      className="w-3.5 h-3.5 text-accent shrink-0"
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
                    <span className="truncate normal-case tracking-normal">
                      {user.email}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    data-testid="navbar-logout-button"
                    className="text-text-muted hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer disabled:opacity-50"
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <div
                  data-testid="navbar-account-slot"
                  className="flex items-center gap-4"
                >
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-white/85 hover:text-accent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-accent shrink-0"
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
                    <span>Log in</span>
                  </Link>
                  <Link
                    href="/signup"
                    className="text-accent hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Sign up
                  </Link>
                </div>
              )}
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
              href="/#experience"
              className="hover:text-white transition-colors duration-150 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Experience
            </a>
            <a
              href="/#workflow"
              className="hover:text-white transition-colors duration-150 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Workflow
            </a>
            <a
              href="/#exercises"
              className="hover:text-white transition-colors duration-150 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Exercises
            </a>
          </nav>

          {/* Right (Desktop): Signature CTA + Circular Menu Trigger */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <Button variant="primary" size="sm" href="/routines">
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
            <Button variant="primary" size="sm" href="/routines">
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
        {/* Reading-progress hairline along sticky header edge */}
        <div
          aria-hidden="true"
          className="h-[2px] w-full bg-transparent overflow-hidden motion-reduce:hidden"
        >
          <div
            ref={progressBarRef}
            data-testid="navbar-scroll-progress"
            className="h-full w-full bg-gradient-to-r from-brand via-accent to-accent origin-left will-change-transform"
            style={{ transform: "scaleX(0)" }}
          />
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
