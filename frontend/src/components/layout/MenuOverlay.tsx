"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useOptionalAuth } from "@/components/auth/AuthProvider";

export interface MenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

const OVERLAY_LINKS = [
  { label: "Routines", href: "/routines" },
  { label: "Experience", href: "/#experience" },
  { label: "Workflow", href: "/#workflow" },
  { label: "Exercises", href: "/#exercises" },
  { label: "Motion Lab", href: "/motion-lab" },
  { label: "Architecture", href: "/#architecture" },
  { label: "Privacy", href: "/#privacy" },
] as const;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Full-viewport black navigation overlay opened by the circular header Menu button.
 * - Escape key closes and restores focus to trigger.
 * - Traps keyboard focus while open and focuses the close button on mount.
 * - Shows Login / Sign up when logged out, or Routines / Onboarding / Log out when logged in.
 */
export function MenuOverlay({ isOpen, onClose, triggerRef }: MenuOverlayProps) {
  const { user, logout } = useOptionalAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        triggerRef?.current?.focus();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      onClose();
      if (typeof window !== "undefined") {
        window.location.assign("/");
      }
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div
      ref={dialogRef}
      id="site-menu-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Site navigation menu"
      data-testid="menu-overlay"
      className="fixed inset-0 z-50 bg-bg-base text-white flex flex-col justify-between overflow-y-auto transition-opacity duration-200 motion-reduce:transition-none"
    >
      {/* Top Overlay Bar */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 h-20 flex items-center justify-between border-b border-border-subtle shrink-0">
        <Link
          href="/"
          onClick={onClose}
          className="font-display text-xl sm:text-2xl font-black uppercase tracking-wider text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          FITVISION
        </Link>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={() => {
            onClose();
            triggerRef?.current?.focus();
          }}
          aria-label="Close navigation menu"
          className="w-11 h-11 rounded-full bg-surface border border-white/30 hover:border-accent hover:bg-brand text-white inline-flex items-center justify-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main Navigation Links */}
      <nav
        aria-label="Full screen navigation"
        className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 flex flex-col justify-center"
      >
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 list-none m-0 p-0">
          {OVERLAY_LINKS.map((item, index) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className="group flex items-baseline gap-4 py-2 border-b border-border-subtle hover:border-brand transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="font-mono text-xs text-accent font-bold">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white group-hover:text-accent transition-colors duration-150">
                  {item.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button
            variant="primary"
            size="lg"
            href="/routines"
            onClick={onClose}
          >
            Start Training
          </Button>
          {user && (
            <Button
              variant="secondary"
              size="lg"
              href="/dashboard"
              onClick={onClose}
            >
              Dashboard
            </Button>
          )}
        </div>
      </nav>

      {/* Bottom Account Section */}
      <div
        data-testid="menu-account-slot"
        className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 border-t border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0"
      >
        {user ? (
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono uppercase tracking-wider">
            <Link
              href="/profile"
              onClick={onClose}
              className="inline-flex items-center gap-2 text-white hover:text-accent normal-case tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <svg
                className="w-4 h-4 text-accent shrink-0"
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
              <span>{user.email}</span>
            </Link>
            <Link
              href="/dashboard"
              onClick={onClose}
              className="text-accent hover:text-white underline underline-offset-4 decoration-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Dashboard
            </Link>
            <Link
              href="/history"
              onClick={onClose}
              className="text-text-muted hover:text-white underline underline-offset-4 decoration-border-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              History
            </Link>
            <Link
              href="/profile"
              onClick={onClose}
              className="text-text-muted hover:text-white underline underline-offset-4 decoration-border-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Profile
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              data-testid="menu-logout-button"
              className="text-text-muted hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer disabled:opacity-50"
            >
              Log out
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-5 text-xs font-mono uppercase tracking-wider">
            <Link
              href="/login"
              onClick={onClose}
              className="inline-flex items-center gap-2 text-white hover:text-accent underline underline-offset-4 decoration-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <svg
                className="w-4 h-4 text-accent shrink-0"
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
              onClick={onClose}
              className="text-accent hover:text-white underline underline-offset-4 decoration-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Sign up
            </Link>
          </div>
        )}

        <span className="text-xs font-mono text-white/50">
          On-device vision processing. No video frames transmitted.
        </span>
      </div>
    </div>
  );
}

export default MenuOverlay;
